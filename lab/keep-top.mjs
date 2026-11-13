// Fusion buried it: a gold link one list ranks in its top 10 that fusion pushes out. Tries ways to
// keep each list's own top hits, on the real pipeline's signals. Reads cached vectors.
//   node lab/keep-top.mjs fixtures/augustine-vulgate [--json out.json] [--grid]
// Gold sources split by the same stable hash as lab/variants.mjs: pick on dev, report test.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { link, resolve } from '../dist/link.js'
import { loadUnits } from '../dist/units.js'
import { ranks, RRF_K } from '../dist/util.js'

const dir = process.argv[2]
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const fxFile = join(dir, 'fixture.json')
const fx = existsSync(fxFile) ? JSON.parse(readFileSync(fxFile, 'utf8')) : {}
const opts = { sourceLang: fx.sourceLang, targetLang: fx.targetLang, rerank: 'none' }
const run = resolve(opts)
const source = loadUnits(join(dir, 'source.jsonl')), target = loadUnits(join(dir, 'target.jsonl'))
const tIndex = new Map(target.map((u, i) => [u.ref, i])), sRefs = new Set(source.map((u) => u.ref))
const gold = readFileSync(join(dir, 'gold.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((g) => tIndex.has(g.target) && sRefs.has(g.source))
const half = (ref) => (createHash('sha1').update(ref).digest()[0] & 1 ? 'test' : 'dev')
const wanted = new Set(gold.map((g) => g.source))
const units = source.filter((u) => wanted.has(u.ref))
const near = 1
const N = 10
const w = run.lexical ? run.target.fusion ?? {} : {}

// Each variant maps a source's signals to its output order (at least the top N), best first.
const variants = {}
const out = {} // name -> rows {half, pos, extra}

// The n best of a list (ties broken by fused order); overlap lists only offer targets they score.
function topBy(scores, n, fusedRank, positive) {
  const best = []
  for (let j = 0; j < scores.length; j++) {
    if (positive && !(scores[j] > 0)) continue
    if (best.length === n && !(scores[j] > scores[best[n - 1]] || (scores[j] === scores[best[n - 1]] && fusedRank[j] < fusedRank[best[n - 1]]))) continue
    best.push(j)
    best.sort((a, b) => scores[b] - scores[a] || fusedRank[a] - fusedRank[b])
    if (best.length > n) best.pop()
  }
  return best
}

// Fused order: by fused rank, then target order (as topK in the pipeline).
const order = (fusedRank, k) => {
  const idx = []
  for (let j = 0; j < fusedRank.length; j++) if (fusedRank[j] <= k + 50) idx.push(j)
  return idx.sort((a, b) => fusedRank[a] - fusedRank[b] || a - b)
}

const rrfRanks = (lists) => {
  const s = Float32Array.from(lists[0][0], (_, j) => lists.reduce((a, [r, wt]) => a + wt / (RRF_K + r[j]), 0))
  return ranks(s)
}

for await (const r of link(units, target, opts)) {
  const lists = [['dense', r.dense, w.dense ?? 1, false], ['words', r.lexical, w.words ?? 1, true], ['chars', r.chars, w.chars ?? 1, true]]
    .filter((l) => l[1] !== undefined && l[1].some((x) => x !== l[1][0]))
  const fr = r.fusedRank
  const base = order(fr, N)
  const results = {}
  results.base = { top: base.slice(0, N), extra: 0 }
  // Reserve: each list's top n in the output's top N. They replace the lowest fused rows that no
  // list reserved; the top N stays in fused order, so rows above the newcomers don't move.
  for (const who of ['voting', 'all']) for (const n of [1, 2, 3]) {
    const from = lists.filter((l) => who === 'all' || l[2] > 0)
    const U = new Set(from.flatMap(([, s, , pos]) => topBy(s, n, fr, pos)))
    const top10 = base.slice(0, N)
    const extras = [...U].filter((j) => !top10.includes(j)).sort((a, b) => fr[a] - fr[b] || a - b)
    let kept = [...top10]
    for (let i = kept.length - 1; i >= 0 && kept.length + extras.length > N; i--) if (!U.has(kept[i])) kept.splice(i, 1)
    const merged = [...kept, ...extras].sort((a, b) => fr[a] - fr[b] || a - b).slice(0, N)
    results[`reserve ${who} n${n}`] = { top: merged, extra: 0 }
    // Append: the fused top N, plus each list's top n outside it (more rows to review).
    results[`append ${who} n${n}`] = { top: [...top10, ...extras], extra: extras.length }
  }
  // Rank-based alternatives need each list's full ranks.
  const lr = lists.map(([name, s, wt]) => [name, ranks(s), wt])
  if (lists.length > 1) {
    // Max-of-ranks blended with RRF: a list's own top hit gets a bonus that fusion can't average away.
    if (!process.argv.includes('--grid')) for (const beta of [0.5, 1, 2]) for (const k of [1, 5]) {
      const voting = lr.filter(([, , wt]) => wt > 0)
      const s = Float32Array.from(r.dense, (_, j) => {
        let rrf = 0, mx = 0
        for (const [, rk, wt] of voting) { rrf += wt / (RRF_K + rk[j]); mx = Math.max(mx, wt / (k + rk[j])) }
        // Scaled so a list's first place earns beta times one RRF vote at rank 1.
        return rrf + beta * mx * (k + 1) / (RRF_K + 1)
      })
      const rk = ranks(s)
      results[`maxblend b${beta} k${k}`] = { top: order(rk, N).slice(0, N), extra: 0 }
    }
    // --grid: list weights (votes are ratios, so dense 1 or 0 covers the space).
    if (process.argv.includes('--grid')) for (const wd of [0, 1]) for (const ww of [0, 0.25, 0.5, 1]) for (const wc of [1, 2, 3, 4, 6]) {
      const m = { dense: wd, words: ww, chars: wc }
      const rk = rrfRanks(lr.map(([name, rks]) => [rks, m[name]]))
      results[`weights d${wd} w${ww} c${wc}`] = { top: order(rk, N).slice(0, N), extra: 0 }
    }
  } else for (const name of Object.keys(out)) if (!(name in results)) results[name] = results.base
  if (process.argv.includes('--grid')) for (const name of Object.keys(results)) if (!name.startsWith('weights') && name !== 'base') delete results[name]
  for (const g of gold.filter((x) => x.source === r.source.ref)) {
    const t = tIndex.get(g.target)
    const hits = new Set([t - 1, t, t + 1].filter((j) => j >= 0 && j < target.length))
    // Buried: some list has it in its top N, fusion doesn't.
    const listBest = Math.min(...lists.map(([, s, , pos], i) => Math.min(...[...hits].map((j) => (pos && !(s[j] > 0) ? Infinity : lr[i][1][j])))))
    for (const [name, v] of Object.entries(results)) {
      const p = v.top.findIndex((j) => hits.has(j))
      ;(out[name] ??= []).push({ half: half(g.source), pos: p < 0 ? Infinity : p + 1, listBest, extra: v.extra, src: g.source })
    }
  }
}

// R@k counts positions in the output; append rows past N count toward R@N (they are output too).
const summary = {}
for (const [name, rows] of Object.entries(out)) {
  summary[name] = {}
  for (const h of ['dev', 'test', 'all']) {
    const rs = rows.filter((x) => h === 'all' || x.half === h)
    const srcs = new Map(rs.map((x) => [x.src, x.extra]))
    const R = (k) => rs.filter((x) => x.pos <= k || (k === N && x.pos < Infinity)).length
    summary[name][h] = { links: rs.length, r1: R(1), r3: R(3), r10: R(N), buried: rs.filter((x) => x.listBest <= N && x.pos === Infinity).length, extraPerSource: [...srcs.values()].reduce((a, b) => a + b, 0) / (srcs.size || 1) }
  }
}
const fixture = dir.replace(/\/$/, '').split('/').pop()
console.log(`${fixture} ${run.source.code}>${run.target.code} ${run.embed} links ${gold.length}`)
for (const [name, s] of Object.entries(summary)) console.log(name.padEnd(26), ['dev', 'test'].map((h) => `${h} ${s[h].r1}/${s[h].r3}/${s[h].r10} of ${s[h].links} bur ${s[h].buried} +${s[h].extraPerSource.toFixed(2)}`).join('   '))
if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify({ fixture, lang: `${run.source.code}>${run.target.code}`, summary }, null, 1))
