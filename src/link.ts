// The pipeline: embed both texts, score every target unit two ways (embedding similarity and word
// overlap), fuse the two rankings, then let a reranker read the top of the fused list.
import { makeEmbedder, DEFAULT_EMBEDDER } from './embed.js'
import { defaultEmbedder, getLang, type Lang } from './lang/index.js'
import { charScorer, lexicalScorer, sharedWords } from './lexical.js'
import { makeReranker, DEFAULT_RERANKER } from './rerank.js'
import type { Unit } from './units.js'
import { checkInt, checkUnique, dot, fuseWeighted, log, ranks, topK } from './util.js'

export interface LinkOptions {
  embed?: string
  rerank?: string
  task?: string
  pool?: number // candidates the reranker reads per source unit
  lang?: string // language of both texts: en (default), la, grc or sa
  sourceLang?: string // overrides lang for the source
  targetLang?: string // overrides lang for the target
}

export interface Resolved {
  source: Lang
  target: Lang
  embed: string
  // Word overlap only means something when both texts are in the same language.
  lexical: boolean
}

// Languages and embedder for a run: English and nomic-embed-text by default; bge-m3 for Latin,
// Greek, Sanskrit, and any pair of different languages.
export function resolve(opts: LinkOptions = {}): Resolved {
  const source = getLang(opts.sourceLang ?? opts.lang)
  const target = getLang(opts.targetLang ?? opts.lang)
  return { source, target, embed: opts.embed ?? defaultEmbedder(source, target), lexical: source === target }
}

export interface Scored {
  index: number // into the target units
  dense: number
  lex: number
  fusedRank: number
  rerank?: number
}

export interface UnitResult {
  source: Unit
  // The pool, best first: reranker order if one ran, else fused order.
  ranked: Scored[]
  // Fused rank of any target unit, for targets outside the pool.
  fusedRank: Int32Array
  // Each signal's score for every target unit, for eval. lexical is absent across two languages;
  // chars, unless the language profile sets charGrams.
  dense: Float32Array
  lexical?: Float32Array
  chars?: Float32Array
}

export const DEFAULTS = { embed: DEFAULT_EMBEDDER, rerank: DEFAULT_RERANKER, pool: 30 }

export async function* link(source: Unit[], target: Unit[], opts: LinkOptions = {}): AsyncGenerator<UnitResult> {
  const run = resolve(opts)
  const embedder = makeEmbedder(run.embed)
  const reranker = makeReranker(opts.rerank ?? DEFAULTS.rerank, opts.task)
  const pool = checkInt('pool', opts.pool, 1) ?? DEFAULTS.pool
  checkUnique('source', source.map((u) => u.ref))
  checkUnique('target', target.map((u) => u.ref))
  log(`embedding ${target.length} target (${run.target.code}) and ${source.length} source (${run.source.code}) units with ${embedder.name}${run.lexical ? '' : '; no word overlap across languages'}`)
  const tVec = await embedder.embed(target.map((u) => u.text), 'doc')
  const sVec = await embedder.embed(source.map((u) => u.text), 'query')
  if (sVec[0] && tVec[0] && sVec[0].length !== tVec[0].length) throw new Error(`source and target vectors differ in length (${sVec[0].length}, ${tVec[0].length})`)
  const lex = run.lexical ? lexicalScorer(target.map((u) => u.text), run.target) : undefined
  // The profile's fusion weights apply only when both texts are in its language.
  const w = run.lexical ? run.target.fusion ?? {} : {}
  const chr = run.lexical && run.target.charGrams ? charScorer(target.map((u) => u.text), run.target, run.target.charGrams) : undefined
  const started = Date.now()
  for (const [i, s] of source.entries()) {
    const dense = Float32Array.from(tVec, (t) => dot(sVec[i], t))
    const lexical = lex?.scores(s.text)
    const chars = chr?.scores(s.text)
    // Across languages, overlap is left out and the fused order is the embedding order.
    const fused = fuseWeighted([[dense, w.dense ?? 1], [lexical, w.words ?? 1], [chars, w.chars ?? 1]].filter((x): x is [Float32Array, number] => x[0] !== undefined))
    const fusedRank = ranks(fused)
    const top = topK(fused, pool)
    const ranked: Scored[] = top.map((j) => ({ index: j, dense: dense[j], lex: lexical?.[j] ?? 0, fusedRank: fusedRank[j] }))
    if (reranker) {
      // Candidates go to the reranker in target order, so the fused rank can't lead it.
      const ordered = [...ranked].sort((a, b) => a.index - b.index)
      const scores = await reranker.score(s, ordered.map((c) => target[c.index]))
      ordered.forEach((c, k) => { c.rerank = scores[k] })
      ranked.sort((a, b) => b.rerank! - a.rerank! || a.fusedRank - b.fusedRank)
    }
    if (reranker) {
      const each = (Date.now() - started) / (i + 1)
      log(`rerank ${reranker.name}: ${i + 1}/${source.length}, about ${Math.round((each * (source.length - i - 1)) / 60000)} min left`, true)
    }
    yield { source: s, ranked, fusedRank, dense, lexical, chars }
  }
  if (reranker) log(`reranked ${source.length} units in ${Math.round((Date.now() - started) / 1000)} s`)
}

export interface Link {
  source: string
  target: string
  rank: number
  score: number
  dense: number
  lex: number
  rerank?: number
  shared: string[]
  status: 'suggested'
  method: { embed: string; rerank: string; lang?: string }
  date: string
}

// The links a person reviews: the top n of each pool, at or above a score if one is set.
export function toLinks(r: UnitResult, target: Unit[], opts: LinkOptions & { top: number; minScore?: number }): Link[] {
  checkInt('top', opts.top, 0)
  if (opts.minScore !== undefined && !Number.isFinite(opts.minScore)) throw new Error(`min-score must be a number, got ${opts.minScore}`)
  const run = resolve(opts)
  const date = new Date().toISOString().slice(0, 10)
  const round = (x: number) => Math.round(x * 1000) / 1000
  return r.ranked
    .slice(0, opts.top)
    .filter((c) => opts.minScore === undefined || (c.rerank ?? c.dense) >= opts.minScore)
    .map((c, k) => ({
      source: r.source.ref,
      target: target[c.index].ref,
      rank: k + 1,
      score: round(c.rerank ?? c.dense),
      dense: round(c.dense),
      lex: round(c.lex),
      ...(c.rerank === undefined ? {} : { rerank: round(c.rerank) }),
      shared: run.lexical ? sharedWords(r.source.text, target[c.index].text, run.target) : [],
      status: 'suggested' as const,
      method: { embed: run.embed, rerank: opts.rerank ?? DEFAULTS.rerank, ...(run.source.code === 'en' && run.target.code === 'en' ? {} : { lang: `${run.source.code}>${run.target.code}` }) },
      date,
    }))
}
