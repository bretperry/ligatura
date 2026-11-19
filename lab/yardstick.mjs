// Yardstick: English -> original-language retrieval on held-out parallel text.
//
//   node lab/yardstick.mjs bge-m3 [arctic-l-v2 ...] [--langs la,grc,sa]
//
// For each language: 500 English test sides are the queries; the haystack is their 500
// originals plus 4,500 pool originals (never in train or dev). Reports MRR, R@1, R@10.
// Data and splits come from lab/corpora.py (lab/data/corpora, lab/data/splits).
//
// As a library, swap either side:
//   import { yardstick, loadLang, localEncoder } from './yardstick.mjs'
//   await yardstick({ lang: 'sa',
//     encodeEnglish: (rows) => enc(rows.map((r) => r.en), 'query'),
//     encodeOriginal: [(rows) => enc(rows.map((r) => myTranslation[r.id]), 'doc')] })
// encodeEnglish gets the test rows; encodeOriginal gets the haystack rows ({id, en, orig,
// source}) and may be one function or several "views"; a document scores the max over views.
// Each must return one L2-normalized vector (array or Float32Array) per row, in order.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { devanagariToIast, foldLatin } from './normalize.mjs'

const LAB = new URL('.', import.meta.url).pathname
const DATA = join(LAB, 'data')

// Prefixes and pooling as in src/embed.ts LOCAL_EMBEDDERS.
export const MODELS = {
  'bge-m3': { id: 'Xenova/bge-m3', pooling: 'cls', dtype: 'q8' },
  'arctic-l-v2': { id: 'Snowflake/snowflake-arctic-embed-l-v2.0', pooling: 'cls', query: 'query: ', dtype: 'q8' },
  'e5-large': { id: 'Xenova/multilingual-e5-large', pooling: 'mean', query: 'query: ', doc: 'passage: ', dtype: 'q8' },
  'qwen3-0.6b-fp32': {
    id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX', pooling: 'last_token', dtype: 'fp32', slow: true, // ~10x bge-m3: base variant only unless --all-variants
    query: 'Instruct: Given a passage, retrieve the passage in another text, in any language, that it quotes, translates or alludes to\nQuery: ',
  },
  sphilberta: { id: 'SPhilBerta', local: join(homedir(), '.cache/ligatura/onnx/'), pooling: 'mean', dtype: 'fp32', langs: ['la', 'grc'] },
}

export function loadLang(lang) {
  const byId = new Map(readFileSync(join(DATA, 'corpora', `${lang}.jsonl`), 'utf8').trim().split('\n').map((l) => { const r = JSON.parse(l); return [r.id, r] }))
  const split = JSON.parse(readFileSync(join(DATA, 'splits', `${lang}.json`), 'utf8'))
  const test = split.ids.test.map((id) => byId.get(id))
  const haystack = [...test, ...split.ids.pool.map((id) => byId.get(id))]
  return { test, haystack, split }
}

// One transformers.js pipeline per model; vectors cached on disk per (model, role, texts).
const pipes = {}
export function localEncoder(name) {
  const cfg = MODELS[name]
  if (!cfg) throw new Error(`unknown model ${name}; known: ${Object.keys(MODELS).join(', ')}`)
  return async (texts, role) => {
    const key = createHash('sha1').update(`${name}\0${cfg.dtype}\0${role}\0${texts.join('\0')}`).digest('hex')
    const dir = join(DATA, 'cache', name)
    const file = join(dir, `${key}.f32`)
    if (existsSync(file)) {
      const buf = readFileSync(file)
      const all = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
      const d = all.length / texts.length
      return texts.map((_, i) => all.subarray(i * d, (i + 1) * d))
    }
    if (!pipes[name]) {
      const t = await import('@huggingface/transformers')
      if (cfg.local) { t.env.localModelPath = cfg.local; t.env.allowRemoteModels = false }
      pipes[name] = await t.pipeline('feature-extraction', cfg.id, { dtype: cfg.dtype, local_files_only: !!cfg.local })
    }
    const pipe = pipes[name]
    // last-token pooling needs left padding to batch; fall back to batch 1 otherwise
    const batch = cfg.pooling === 'last_token' && pipe.tokenizer.padding_side !== 'left' ? 1 : 16
    const prefix = cfg[role] ?? ''
    // batch texts of similar length together so padding wastes little compute
    const order = texts.map((_, i) => i).sort((a, b) => texts[a].length - texts[b].length)
    const out = new Array(texts.length)
    for (let i = 0; i < order.length; i += batch) {
      const idx = order.slice(i, i + batch)
      const r = await pipe(idx.map((j) => prefix + texts[j]), { pooling: cfg.pooling, normalize: true })
      r.tolist().forEach((v, k) => { out[idx[k]] = Float32Array.from(v) })
      if ((i / batch) % 50 === 0) process.stderr.write(`${name} ${role} ${Math.min(i + batch, texts.length)}/${texts.length}\n`)
    }
    mkdirSync(dir, { recursive: true })
    const flat = new Float32Array(out.length * out[0].length)
    out.forEach((v, i) => flat.set(v, i * v.length))
    writeFileSync(file, Buffer.from(flat.buffer))
    return out
  }
}

function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export async function yardstick({ lang, encodeEnglish, encodeOriginal }) {
  const { test, haystack } = loadLang(lang)
  const t0 = performance.now()
  const Q = await encodeEnglish(test)
  const views = []
  for (const f of [encodeOriginal].flat()) views.push(await f(haystack))
  const encodeS = (performance.now() - t0) / 1000
  const ranks = test.map((row, qi) => {
    const scores = haystack.map((_, di) => Math.max(...views.map((V) => dot(Q[qi], V[di]))))
    return { id: row.id, source: row.source, rank: 1 + scores.filter((s) => s > scores[qi]).length }
  })
  const stats = (rs) => ({
    n: rs.length,
    mrr: +(rs.reduce((s, r) => s + 1 / r.rank, 0) / rs.length).toFixed(3),
    r1: +(rs.filter((r) => r.rank === 1).length / rs.length).toFixed(3),
    r10: +(rs.filter((r) => r.rank <= 10).length / rs.length).toFixed(3),
  })
  const bySource = Object.fromEntries([...new Set(ranks.map((r) => r.source))].map((s) => [s, stats(ranks.filter((r) => r.source === s))]))
  return { lang, haystack: haystack.length, ...stats(ranks), bySource, encodeS: +encodeS.toFixed(1), ranks: Object.fromEntries(ranks.map((r) => [r.id, r.rank])) }
}

// Variants per language: how the original side is encoded.
export function variants(lang, enc) {
  const orig = (f) => (rows) => enc(rows.map((r) => f(r.orig)), 'doc')
  const id = (x) => x
  if (lang === 'sa') return { devanagari: [orig(id)], iast: [orig(devanagariToIast)], 'max(deva,iast)': [orig(id), orig(devanagariToIast)] }
  if (lang === 'la') return { plain: [orig(id)], 'fold(u/v,i/j,ae)': [orig(foldLatin)] }
  return { plain: [orig(id)] }
}

async function main() {
  const args = process.argv.slice(2)
  const li = args.indexOf('--langs')
  const langs = li >= 0 ? args.splice(li, 2)[1].split(',') : ['la', 'grc', 'sa']
  const ai = args.indexOf('--all-variants')
  const allVariants = ai >= 0 && !!args.splice(ai, 1)
  const outDir = join(LAB, 'yardstick-results')
  mkdirSync(outDir, { recursive: true })
  for (const name of args.length ? args : Object.keys(MODELS)) {
    const enc = localEncoder(name)
    const res = { model: name, ...MODELS[name], results: [] }
    for (const lang of langs) {
      if (MODELS[name].langs && !MODELS[name].langs.includes(lang)) continue
      const vs = Object.entries(variants(lang, enc))
      for (const [variant, encodeOriginal] of MODELS[name].slow && !allVariants ? vs.slice(0, 1) : vs) {
        const encodeEnglish = (rows) => enc(rows.map((r) => r.en), 'query')
        const r = await yardstick({ lang, encodeEnglish, encodeOriginal })
        res.results.push({ variant, ...r })
        console.log(`${name}\t${lang}\t${variant}\tMRR ${r.mrr}\tR@1 ${r.r1}\tR@10 ${r.r10}\t${r.encodeS}s\t${Object.entries(r.bySource).map(([s, x]) => `${s} ${x.mrr}`).join('  ')}`)
        writeFileSync(join(outDir, `${name}.json`), JSON.stringify(res, null, 1))
      }
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
