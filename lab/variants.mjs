// Try retrieval variants on a fixture without changing the pipeline. Reads cached vectors.
//   node lab/variants.mjs fixtures/augustine-vulgate [--embed bge-m3]
// Gold sources split by a stable hash into dev and test halves: pick a variant on dev, report both.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { makeEmbedder } from '../dist/embed.js'
import { lexicalScorer } from '../dist/lexical.js'
import { resolve } from '../dist/link.js'
import { ranks } from '../dist/util.js'

const dir = process.argv[2]
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const fx = JSON.parse(readFileSync(join(dir, 'fixture.json'), 'utf8'))
const run = resolve({ sourceLang: fx.sourceLang, targetLang: fx.targetLang, embed: arg('--embed') })
const jl = (f) => readFileSync(join(dir, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const source = jl('source.jsonl'), target = jl('target.jsonl')
const tIndex = new Map(target.map((u, i) => [u.ref, i])), sIndex = new Map(source.map((u, i) => [u.ref, i]))
const gold = jl('gold.jsonl').filter((g) => tIndex.has(g.target) && sIndex.has(g.source))
const half = (ref) => (createHash('sha1').update(ref).digest()[0] & 1 ? 'test' : 'dev')

const emb = makeEmbedder(run.embed)
const tVec = await emb.embed(target.map((u) => u.text), 'doc')
// Every source unit, so a unit's neighbours have vectors too.
const sVec = await emb.embed(source.map((u) => u.text), 'query')
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

// Character n-grams inside folded words: matches inflected and respelled forms that stems miss.
function charScorer(docs, lang, n = 4) {
  const grams = (s) => { const g = new Set(); for (const w of lang.words(s)) { const p = ` ${w} `; for (let i = 0; i + n <= p.length; i++) g.add(p.slice(i, i + n)) } return g }
  const df = new Map(); const tg = docs.map(grams)
  for (const g of tg) for (const x of g) df.set(x, (df.get(x) ?? 0) + 1)
  const idf = (x) => Math.log((docs.length + 1) / ((df.get(x) ?? 0) + 1))
  const vec = (g) => { const v = new Map(); for (const x of g) v.set(x, idf(x)); return { v, norm: Math.hypot(...v.values()) || 1 } }
  const tv = tg.map(vec)
  // Inverted index: score only targets sharing a gram.
  const inv = new Map(); tv.forEach((t, j) => { for (const [x, w] of t.v) { let l = inv.get(x); if (!l) inv.set(x, (l = [])); l.push(j, w) } })
  return { scores(q) { const qv = vec(grams(q)); const out = new Float32Array(docs.length); for (const [x, w] of qv.v) { const l = inv.get(x); if (l) for (let k = 0; k < l.length; k += 2) out[l[k]] += w * l[k + 1] } for (let j = 0; j < out.length; j++) out[j] /= qv.norm * tv[j].norm; return out } }
}

const lex = run.lexical ? lexicalScorer(target.map((u) => u.text), run.target) : undefined
const chr = run.lexical ? charScorer(target.map((u) => u.text), run.target) : undefined

const rrf = (lists, k = 60, w) => {
  const live = lists.map((l, i) => [l, w ? w[i] : 1]).filter(([l]) => l.some((x) => x !== l[0]))
  const rs = live.map(([l, wt]) => [ranks(l), wt])
  return Float32Array.from(lists[0], (_, j) => rs.reduce((s, [r, wt]) => s + wt / (k + r[j]), 0))
}
// Same book: a neighbour unit is context only when its ref shares everything but the last part.
const sameBlock = (a, b) => b >= 0 && b < source.length && source[a].ref.split('.').slice(0, -1).join('.') === source[b].ref.split('.').slice(0, -1).join('.')
const ctxVec = (i, w) => { const v = Float32Array.from(sVec[i]); for (const d of [-1, 1]) if (sameBlock(i, i + d)) for (let k = 0; k < v.length; k++) v[k] += w * sVec[i + d][k]; return v }
const ctxText = (i) => [-1, 0, 1].filter((d) => d === 0 || sameBlock(i, i + d)).map((d) => source[i + d].text).join(' ')

const variants = {
  base: (i) => ({ dense: tVec.map((t) => dot(sVec[i], t)), lex: lex?.scores(source[i].text) }),
}
const cache = new Map()
function signals(i) {
  if (cache.has(i)) return cache.get(i)
  const d = Float32Array.from(tVec, (t) => dot(sVec[i], t))
  const cv = ctxVec(i, 0.5); const dc = Float32Array.from(tVec, (t) => dot(cv, t))
  const s = { d, dc }
  if (lex) { s.l = lex.scores(source[i].text); s.lc = lex.scores(ctxText(i)); s.c = chr.scores(source[i].text); s.cc = chr.scores(ctxText(i)) }
  if (lex) {
    // Best clause: a short quotation inside a long sentence is drowned by the rest of it.
    const cl = clauses(source[i].text)
    const mx = (f) => { const out = new Float32Array(target.length); for (const c of cl) { const sc = f(c); for (let j = 0; j < out.length; j++) if (sc[j] > out[j]) out[j] = sc[j] } return out }
    s.lcl = cl.length > 1 ? mx((c) => lex.scores(c)) : s.l
    s.ccl = cl.length > 1 ? mx((c) => chr.scores(c)) : s.c
  }
  cache.set(i, s); return s
}
// Clauses of at least 4 words, split at , ; : ? ! . and merged forward when short.
function clauses(text) {
  const parts = text.split(/(?<=[,;:?!.])\s+/), out = []
  let cur = ''
  for (const p of parts) { cur = cur ? cur + ' ' + p : p; if (cur.split(/\s+/).length >= 4) { out.push(cur); cur = '' } }
  if (cur) out.length ? (out[out.length - 1] += ' ' + cur) : out.push(cur)
  return out
}
const V = run.lexical ? {
  'base d+l': (s) => rrf([s.d, s.l]),
  'd+l+char': (s) => rrf([s.d, s.l, s.c]),
  'd+char': (s) => rrf([s.d, s.c]),
  'ctx d+l': (s) => rrf([s.dc, s.lc]),
  'ctx d+l+char': (s) => rrf([s.dc, s.lc, s.cc]),
  'own+ctx all': (s) => rrf([s.d, s.l, s.c, s.dc, s.lc, s.cc]),
  'own+ctx d,l,c k20': (s) => rrf([s.d, s.l, s.c, s.dc, s.lc, s.cc], 20),
  'd+l+c+clause': (s) => rrf([s.d, s.l, s.c, s.lcl, s.ccl]),
  'all+clause': (s) => rrf([s.d, s.l, s.c, s.dc, s.lc, s.cc, s.lcl, s.ccl]),
  'd+dc+clause l,c': (s) => rrf([s.d, s.dc, s.lcl, s.ccl]),
} : {
  'base d': (s) => s.d,
  'ctx w0.5': (s) => s.dc,
  'own+ctx rrf': (s) => rrf([s.d, s.dc]),
}
// --only NAME keeps one variant (faster); --dump FILE writes every miss of it as JSONL.
if (arg('--only')) for (const k of Object.keys(V)) if (k !== arg('--only')) delete V[k]
const near = Number(arg('--neighbours', 1))
const res = {}
for (const g of gold) {
  const i = sIndex.get(g.source), t = tIndex.get(g.target), s = signals(i)
  const hits = [...Array(2 * near + 1).keys()].map((d) => t + d - near).filter((j) => j >= 0 && j < target.length)
  for (const [name, f] of Object.entries(V)) {
    const key = `${name}|${g.source}`
    if (!s[name]) s[name] = ranks(f(s))
    const r = Math.min(...hits.map((j) => s[name][j]))
    ;(res[name] ??= []).push({ r, half: half(g.source) })
  }
}
if (arg('--ks')) for (const [name, rows] of Object.entries(res)) console.log(name, arg('--ks').split(',').map((k) => `R@${k} ${rows.filter((x) => x.r <= +k).length}/${rows.length} (${(100 * rows.filter((x) => x.r <= +k).length / rows.length).toFixed(1)}%)`).join('  '))
const pct = (rows, k) => `${rows.filter((x) => x.r <= k).length}/${rows.length}`
console.log(`${dir}  ${run.source.code}>${run.target.code}  ${run.embed}  gold ${gold.length}`)
console.log('variant'.padEnd(22), 'dev R@1  R@10'.padEnd(22), 'test R@1  R@10', '   all R@10')
for (const [name, rows] of Object.entries(res)) {
  const dev = rows.filter((x) => x.half === 'dev'), test = rows.filter((x) => x.half === 'test')
  console.log(name.padEnd(22), `${pct(dev, 1)}  ${pct(dev, 10)}`.padEnd(22), `${pct(test, 1)}  ${pct(test, 10)}`.padEnd(20), (100 * rows.filter((x) => x.r <= 10).length / rows.length).toFixed(1) + '%')
}

// Misses of the best variant, with texts, to judge whether they are findable at all.
if (process.argv.includes('--misses')) {
  const best = arg('--best', 'own+ctx all')
  const goldN = jl('gold.jsonl').filter((g) => tIndex.has(g.target) && sIndex.has(g.source))
  const miss = goldN.filter((g) => { const s = signals(sIndex.get(g.source)); const t = tIndex.get(g.target); return Math.min(...[t - 1, t, t + 1].filter((j) => j >= 0 && j < target.length).map((j) => s[best][j])) > 10 })
  const pick = miss.filter((_, k) => k % Math.max(1, Math.floor(miss.length / 30)) === 0).slice(0, 30)
  for (const g of pick) console.log(`\n${g.source} -> ${g.target}  [${g.note}]${g.kind ? ' ' + g.kind : ''}\n  S: ${source[sIndex.get(g.source)].text}\n  T: ${target[tIndex.get(g.target)].text}`)
}

if (arg('--dump')) {
  const { writeFileSync } = await import('node:fs')
  const name = Object.keys(V)[0], out = []
  for (const g of gold) {
    const s = signals(sIndex.get(g.source)), t = tIndex.get(g.target)
    const r = Math.min(...[t - 1, t, t + 1].filter((j) => j >= 0 && j < target.length).map((j) => s[name][j]))
    if (r > 10) {
      const top = [...s[name].keys()].filter((j) => s[name][j] <= 3).sort((a, b) => s[name][a] - s[name][b])
      out.push({ source: g.source, target: g.target, rank: r, note: g.note, S: source[sIndex.get(g.source)].text, T: target[t].text, top3: top.map((j) => `${target[j].ref}: ${target[j].text}`) })
    }
  }
  writeFileSync(arg('--dump'), out.map((o) => JSON.stringify(o)).join('\n') + '\n')
  console.log(`dumped ${out.length} misses of ${name}`)
}
