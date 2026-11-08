// Rerank backends read each source unit with its candidate pool and score every candidate.
//   qwen3-reranker-0.6b       in process (transformers.js, ONNX q8); no server, slowest
//   api:<url>#<model>         a Cohere/Jina-shaped rerank endpoint: llama.cpp llama-server, vLLM, TEI, Infinity
//   chat:<base-url>#<model>   an OpenAI-compatible chat model as judge: Ollama, LM Studio, mlx_lm.server
//   none                      keep the retrieval order (default)
import { auth } from './embed.js'
import type { Unit } from './units.js'
import { log } from './util.js'

export interface Reranker {
  name: string
  score(query: Unit, candidates: Unit[]): Promise<number[]>
}

// The q8 ONNX reranker scored below plain retrieval on the Kempis fixture (README, Results), so
// reranking is opt-in until a model beats retrieval there.
export const DEFAULT_RERANKER = 'none'
export const DEFAULT_TASK = 'Given a passage from one text, decide whether it quotes, paraphrases or alludes to this passage from another text'

export function makeReranker(spec: string, task = DEFAULT_TASK): Reranker | undefined {
  if (spec === 'none') return undefined
  if (spec === 'qwen3-reranker-0.6b') return qwenLocal('onnx-community/Qwen3-Reranker-0.6B-ONNX', spec, task)
  if (spec.startsWith('api:')) return rerankApi(spec, task)
  if (spec.startsWith('chat:')) return chatJudge(spec, task)
  throw new Error(`unknown reranker "${spec}"; use qwen3-reranker-0.6b, api:<url>#<model>, chat:<base-url>#<model> or none`)
}

// Qwen3-Reranker scores a pair as P("yes") for the next token after its fixed prompt.
const QWEN_PREFIX = '<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be "yes" or "no".<|im_end|>\n<|im_start|>user\n'
const QWEN_SUFFIX = '<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n'

function qwenLocal(id: string, name: string, task: string): Reranker {
  type Tok = ((t: string[], o: object) => { input_ids: { dims: number[] }; attention_mask: { data: ArrayLike<bigint | number>; dims: number[] } }) & { encode(t: string, o: object): number[] }
  type Model = (inputs: object) => Promise<{ logits: { data: Float32Array; dims: number[] } }>
  let tok: Tok | undefined
  let model: Model | undefined
  const batch = Number(process.env.LIGATURA_BATCH ?? 4)
  return {
    name,
    async score(query, candidates) {
      if (!tok || !model) {
        const t = await import('@huggingface/transformers')
        tok = (await t.AutoTokenizer.from_pretrained(id)) as unknown as Tok
        model = (await t.AutoModelForCausalLM.from_pretrained(id, { dtype: 'q8' })) as unknown as Model
      }
      const [yes] = tok.encode('yes', { add_special_tokens: false })
      const [no] = tok.encode('no', { add_special_tokens: false })
      const texts = candidates.map((c) => `${QWEN_PREFIX}<Instruct>: ${task}\n<Query>: ${query.text}\n<Document>: ${c.text}${QWEN_SUFFIX}`)
      const out: number[] = []
      for (let i = 0; i < texts.length; i += batch) {
        const enc = tok(texts.slice(i, i + batch), { padding: true })
        const { logits } = await model(enc)
        const [rows, len, vocab] = logits.dims
        const mask = enc.attention_mask
        for (let r = 0; r < rows; r++) {
          // The last real token of each row, whichever side the tokenizer pads.
          let last = len - 1
          while (last > 0 && Number(mask.data[r * len + last]) === 0) last--
          const base = (r * len + last) * vocab
          out.push(1 / (1 + Math.exp(logits.data[base + no] - logits.data[base + yes])))
        }
      }
      return out
    },
  }
}

// api:http://localhost:8080/v1/rerank#qwen3-reranker sends {model, query, documents} and reads
// results[].{index, relevance_score}, the shape Cohere, Jina, llama.cpp and vLLM share.
function rerankApi(spec: string, task: string): Reranker {
  const [url, model] = spec.slice('api:'.length).split('#')
  if (!url) throw new Error('api reranker needs api:<url>#<model>')
  return {
    name: spec,
    async score(query, candidates) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth() },
        body: JSON.stringify({ model, query: `${task}\n${query.text}`, documents: candidates.map((c) => c.text) }),
      })
      if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
      const body = (await res.json()) as { results: { index: number; relevance_score: number }[] }
      const out = new Array<number>(candidates.length).fill(0)
      for (const r of body.results) out[r.index] = r.relevance_score
      return out
    },
  }
}

const JUDGE = (task: string, query: Unit, candidates: Unit[]) => `${task}.

Below is a passage and candidate passages, listed in their own order, not by relevance. Pick the candidates the passage quotes, paraphrases, or alludes to: it takes their words, image, story or teaching. A shared common word or a general theme is NOT enough. Judge only from the texts given.

Return up to 5 refs, strongest first, or an empty list. Only use refs from the candidates. Reply with JSON only: {"refs": ["<ref>"], "why": "one short line per ref, ';'-separated, naming quote/paraphrase/allusion"}

Passage: ${query.text}

Candidates:
${candidates.map((c) => `${c.ref}: ${c.text}`).join('\n')}`

// chat:http://localhost:11434/v1#qwen3:8b asks the model to pick; picks score 1, 0.99, ...; the
// rest 0. Candidates go in their target order so retrieval rank doesn't lead the model.
function chatJudge(spec: string, task: string): Reranker {
  const [base, model] = spec.slice('chat:'.length).split('#')
  if (!base || !model) throw new Error('chat judge needs chat:<base-url>#<model>')
  return {
    name: spec,
    async score(query, candidates) {
      const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth() },
        body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content: JUDGE(task, query, candidates) }] }),
      })
      if (!res.ok) throw new Error(`${base}/chat/completions: ${res.status} ${await res.text()}`)
      const body = (await res.json()) as { choices: { message: { content: string } }[] }
      const text = body.choices[0]?.message.content.replace(/<think>[\s\S]*?<\/think>/, '') ?? ''
      let refs: string[] = []
      try {
        refs = (JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { refs?: string[] }).refs ?? []
      } catch {
        log(`judge: unreadable reply for ${query.ref}`)
      }
      return candidates.map((c) => { const k = refs.indexOf(c.ref); return k < 0 ? 0 : 1 - k / 100 })
    },
  }
}
