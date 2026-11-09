// Rerank backends read each source unit with its candidate pool and score every candidate.
//   qwen3-reranker-0.6b       in process (transformers.js, ONNX q8); no server, slowest
//   api:<url>#<model>         a Cohere/Jina-shaped rerank endpoint: llama.cpp llama-server, vLLM, TEI, Infinity
//   chat:<base-url>#<model>   an OpenAI-compatible chat model as judge: Ollama, LM Studio, mlx_lm.server
//   none                      keep the retrieval order (default)
import { auth } from './embed.js'
import { checkInt } from './util.js'
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

// Long passages are cut to a token budget so one long unit can't exhaust memory, and pairs are
// batched by length so a long pair doesn't pad its whole batch.
const QUERY_TOKENS = 256
const DOC_TOKENS = 384
const BATCH_TOKENS = 2048

function qwenLocal(id: string, name: string, task: string): Reranker {
  type Enc = { input_ids: { dims: number[] }; attention_mask: { data: ArrayLike<bigint | number>; dims: number[] } }
  type Tok = ((t: string[], o: object) => Enc) & { encode(t: string, o?: object): number[]; decode(ids: number[], o?: object): string }
  type Model = (inputs: object) => Promise<{ logits: { data: Float32Array; dims: number[] } }>
  let tok: Tok | undefined
  let model: Model | undefined
  const batch = checkInt('LIGATURA_BATCH', process.env.LIGATURA_BATCH === undefined ? undefined : Number(process.env.LIGATURA_BATCH), 1) ?? 4
  const clip = (t: string, max: number) => {
    const ids = tok!.encode(t, { add_special_tokens: false })
    return ids.length <= max ? t : tok!.decode(ids.slice(0, max), { skip_special_tokens: true })
  }
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
      const q = clip(query.text, QUERY_TOKENS)
      const texts = candidates.map((c) => `${QWEN_PREFIX}<Instruct>: ${task}\n<Query>: ${q}\n<Document>: ${clip(c.text, DOC_TOKENS)}${QWEN_SUFFIX}`)
      const lens = texts.map((t) => tok!.encode(t, { add_special_tokens: false }).length)
      const order = [...texts.keys()].sort((a, b) => lens[a] - lens[b])
      const out = new Array<number>(texts.length)
      for (let i = 0; i < order.length;) {
        // Grow the batch while it fits both the pair count and the token budget.
        let n = 1
        while (n < batch && i + n < order.length && (n + 1) * lens[order[i + n]] <= BATCH_TOKENS) n++
        const idx = order.slice(i, i + n)
        const enc = tok(idx.map((k) => texts[k]), { padding: true })
        const { logits } = await model(enc)
        const [rows, len, vocab] = logits.dims
        const mask = enc.attention_mask
        for (let r = 0; r < rows; r++) {
          // The last real token of each row, whichever side the tokenizer pads.
          let last = len - 1
          while (last > 0 && Number(mask.data[r * len + last]) === 0) last--
          const base = (r * len + last) * vocab
          out[idx[r]] = 1 / (1 + Math.exp(logits.data[base + no] - logits.data[base + yes]))
        }
        i += n
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
        headers: { 'content-type': 'application/json', ...auth('rerank', url) },
        body: JSON.stringify({ model, query: `${task}\n${query.text}`, documents: candidates.map((c) => c.text), top_n: candidates.length }),
      })
      if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
      const body = (await res.json()) as { results?: { index?: unknown; relevance_score?: unknown }[] }
      // Exactly one finite score per candidate; a missing one is an error, not a zero.
      const out = new Array<number | undefined>(candidates.length)
      for (const r of Array.isArray(body.results) ? body.results : []) {
        const k = r.index
        if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= candidates.length || out[k] !== undefined || typeof r.relevance_score !== 'number' || !Number.isFinite(r.relevance_score)) {
          throw new Error(`${url}: malformed or duplicate result at index ${String(k)}`)
        }
        out[k] = r.relevance_score
      }
      const lost = out.findIndex((x) => x === undefined)
      if (lost >= 0) throw new Error(`${url}: no score for candidate ${lost} (${candidates[lost].ref})`)
      return out as number[]
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
  const url = `${base.replace(/\/$/, '')}/chat/completions`
  return {
    name: spec,
    async score(query, candidates) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth('rerank', url) },
        body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content: JUDGE(task, query, candidates) }] }),
      })
      if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
      const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
      const content = body.choices?.[0]?.message?.content
      const refs = judgeRefs(typeof content === 'string' ? content : '', candidates.map((c) => c.ref))
      if (!refs) log(`judge: unreadable reply for ${query.ref}`)
      return candidates.map((c) => { const k = (refs ?? []).indexOf(c.ref); return k < 0 ? 0 : 1 - k / 100 })
    },
  }
}

// The refs a judge picked: the first JSON object in its reply with a "refs" array of strings,
// kept only if they name candidates, each once, in the judge's order. undefined if none parses.
export function judgeRefs(reply: string, candidates: string[]): string[] | undefined {
  const text = reply.replace(/<think>[\s\S]*?<\/think>/g, '')
  const allowed = new Set(candidates)
  for (const obj of jsonObjects(text)) {
    const refs = (obj as { refs?: unknown }).refs
    if (!Array.isArray(refs)) continue
    const picked: string[] = []
    for (const r of refs) if (typeof r === 'string' && allowed.has(r) && !picked.includes(r)) picked.push(r)
    return picked
  }
  return undefined
}

// Every balanced {...} in text that parses as a JSON object, in order. Braces inside strings
// don't count.
function* jsonObjects(text: string): Generator<object> {
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (inString) {
        if (ch === '\\') i++
        else if (ch === '"') inString = false
      } else if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) {
        try {
          const v = JSON.parse(text.slice(start, i + 1))
          if (v && typeof v === 'object' && !Array.isArray(v)) { yield v; start = i }
        } catch {}
        break
      }
    }
  }
}
