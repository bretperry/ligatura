// Cross-lingual probe: can a local embedder (or the Qwen3 reranker) match an English line to the
// Italian, Latin, Greek, French, German or Sanskrit original it quotes or alludes to?
//
//   node lab/multilingual-probe.mjs e5-small bge-m3 ...     embedders (default: all)
//   node lab/multilingual-probe.mjs --rerank q8 q4          Qwen3-Reranker-0.6B-ONNX
//
// Each English query is ranked against every original plus ~210 same-language distractors
// (rerank: against the gold plus the distractors in its own language). Prints MRR, hits@1,
// hits@5 overall and MRR per language; writes lab/multilingual-results/<model>.json.
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DISTRACTORS, PAIRS } from './multilingual-probe-data.mjs'

const QWEN_TASK = 'Given a line of English poetry, retrieve the passage in another language that it quotes, translates or alludes to'

// pooling, prefixes and dtype per model card. batch 1 for last-token pooling unless the
// tokenizer pads on the left (the pipeline takes the last position, padding or not).
export const MODELS = {
  'e5-small': { id: 'Xenova/multilingual-e5-small', pooling: 'mean', query: 'query: ', doc: 'passage: ', dtype: 'q8' },
  'e5-base': { id: 'Xenova/multilingual-e5-base', pooling: 'mean', query: 'query: ', doc: 'passage: ', dtype: 'q8' },
  'e5-large': { id: 'Xenova/multilingual-e5-large', pooling: 'mean', query: 'query: ', doc: 'passage: ', dtype: 'q8' },
  'e5-large-fp32': { id: 'Xenova/multilingual-e5-large', pooling: 'mean', query: 'query: ', doc: 'passage: ', dtype: 'fp32' },
  'bge-m3': { id: 'Xenova/bge-m3', pooling: 'cls', dtype: 'q8' },
  'bge-m3-fp32': { id: 'Xenova/bge-m3', pooling: 'cls', dtype: 'fp32' },
  'qwen3-embed-0.6b': { id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX', pooling: 'last_token', query: `Instruct: ${QWEN_TASK}\nQuery: `, dtype: 'q8', batch: 1 },
  'qwen3-embed-0.6b-fp32': { id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX', pooling: 'last_token', query: `Instruct: ${QWEN_TASK}\nQuery: `, dtype: 'fp32', batch: 1 },
  'minilm-l12-multi': { id: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', pooling: 'mean', dtype: 'q8' },
  'arctic-l-v2': { id: 'Snowflake/snowflake-arctic-embed-l-v2.0', pooling: 'cls', query: 'query: ', dtype: 'q8' },
  'granite-278m-multi': { id: 'onnx-community/granite-embedding-278m-multilingual-ONNX', pooling: 'cls', dtype: 'q8' },
  sphilberta: { id: 'SPhilBerta', local: join(homedir(), '.cache/ligatura/onnx/'), pooling: 'mean', dtype: 'fp32' },
}

const LANGS = [...new Set(PAIRS.map((p) => p.lang))]
const docs = [...PAIRS.map((p) => ({ text: p.orig, lang: p.lang, gold: p.id })), ...Object.entries(DISTRACTORS).flatMap(([lang, xs]) => xs.map((text) => ({ text, lang })))]
const outDir = new URL('./multilingual-results/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

function summarize(name, ranks, extra) {
  const mrr = (rs) => rs.reduce((s, r) => s + 1 / r.rank, 0) / rs.length
  const res = {
    name, ...extra,
    mrr: +mrr(ranks).toFixed(3),
    hits1: ranks.filter((r) => r.rank === 1).length,
    hits5: ranks.filter((r) => r.rank <= 5).length,
    n: ranks.length,
    byLang: Object.fromEntries(LANGS.map((l) => [l, +mrr(ranks.filter((r) => r.lang === l)).toFixed(3)])),
    ranks: Object.fromEntries(ranks.map((r) => [r.id, r.rank])),
  }
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(res, null, 2))
  console.log(`${name}: MRR ${res.mrr}  hits@1 ${res.hits1}/${res.n}  hits@5 ${res.hits5}/${res.n}  ${LANGS.map((l) => `${l} ${res.byLang[l]}`).join('  ')}  ${extra.loadS}s load, ${extra.msPerSentence} ms/sent`)
  console.log('  ranks:', Object.entries(res.ranks).map(([k, v]) => `${k}=${v}`).join(' '))
}

async function probeEmbedder(name) {
  const cfg = MODELS[name]
  if (!cfg) throw new Error(`unknown model ${name}; known: ${Object.keys(MODELS).join(', ')}`)
  const t = await import('@huggingface/transformers')
  if (cfg.local) { t.env.localModelPath = cfg.local; t.env.allowRemoteModels = false } else { t.env.allowRemoteModels = true }
  let t0 = performance.now()
  const pipe = await t.pipeline('feature-extraction', cfg.id, { dtype: cfg.dtype, local_files_only: !!cfg.local })
  const loadS = +((performance.now() - t0) / 1000).toFixed(1)
  const padSide = pipe.tokenizer.padding_side
  const batch = cfg.pooling === 'last_token' && padSide !== 'left' ? 1 : (cfg.batch && padSide !== 'left' ? cfg.batch : 16)
  const embed = async (texts, prefix = '') => {
    const out = []
    for (let i = 0; i < texts.length; i += batch) {
      const r = await pipe(texts.slice(i, i + batch).map((x) => prefix + x), { pooling: cfg.pooling, normalize: true })
      out.push(...r.tolist())
    }
    return out
  }
  t0 = performance.now()
  const D = await embed(docs.map((d) => d.text), cfg.doc)
  const Q = await embed(PAIRS.map((p) => p.en), cfg.query)
  const msPerSentence = +((performance.now() - t0) / (D.length + Q.length)).toFixed(1)
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)
  const ranks = PAIRS.map((p, qi) => {
    const scores = D.map((d) => dot(Q[qi], d))
    const g = scores[docs.findIndex((d) => d.gold === p.id)]
    return { id: p.id, lang: p.lang, rank: 1 + scores.filter((s) => s > g).length }
  })
  summarize(name, ranks, { id: cfg.id, dtype: cfg.dtype, pooling: cfg.pooling, padSide, batch, loadS, msPerSentence, docs: docs.length })
}

// Same prompt as src/rerank.ts.
const QWEN_PREFIX = '<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be "yes" or "no".<|im_end|>\n<|im_start|>user\n'
const QWEN_SUFFIX = '<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n'
const RERANK_TASK = 'Given a passage from one text, decide whether it quotes, paraphrases or alludes to this passage from another text'

async function probeReranker(dtype) {
  const id = 'onnx-community/Qwen3-Reranker-0.6B-ONNX'
  const t = await import('@huggingface/transformers')
  let t0 = performance.now()
  const tok = await t.AutoTokenizer.from_pretrained(id)
  const model = await t.AutoModelForCausalLM.from_pretrained(id, { dtype })
  const loadS = +((performance.now() - t0) / 1000).toFixed(1)
  const [yes] = tok.encode('yes', { add_special_tokens: false })
  const [no] = tok.encode('no', { add_special_tokens: false })
  let pairs = 0
  t0 = performance.now()
  const ranks = []
  for (const p of PAIRS) {
    const cands = [p.orig, ...DISTRACTORS[p.lang]]
    const scores = []
    for (let i = 0; i < cands.length; i += 4) {
      const texts = cands.slice(i, i + 4).map((c) => `${QWEN_PREFIX}<Instruct>: ${RERANK_TASK}\n<Query>: ${p.en}\n<Document>: ${c}${QWEN_SUFFIX}`)
      const enc = tok(texts, { padding: true })
      const { logits } = await model(enc)
      const [rows, len, vocab] = logits.dims
      for (let r = 0; r < rows; r++) {
        let last = len - 1
        while (last > 0 && Number(enc.attention_mask.data[r * len + last]) === 0) last--
        const base = (r * len + last) * vocab
        scores.push(1 / (1 + Math.exp(logits.data[base + no] - logits.data[base + yes])))
      }
    }
    pairs += cands.length
    ranks.push({ id: p.id, lang: p.lang, rank: 1 + scores.filter((s) => s > scores[0]).length, gold: +scores[0].toFixed(3), top: +Math.max(...scores).toFixed(3) })
  }
  const msPerSentence = +((performance.now() - t0) / pairs).toFixed(1)
  summarize(`qwen3-reranker-0.6b-${dtype}`, ranks, { id, dtype, loadS, msPerSentence, pool: 'gold + same-language distractors', goldScores: Object.fromEntries(ranks.map((r) => [r.id, r.gold])) })
}

const args = process.argv.slice(2)
if (args[0] === '--rerank') for (const d of args.slice(1).length ? args.slice(1) : ['q8']) await probeReranker(d)
else for (const m of args.length ? args : Object.keys(MODELS)) {
  try { await probeEmbedder(m) } catch (e) { console.log(`${m}: FAILED ${e.message}`) }
}
