// The pipeline: embed both texts, score every target unit two ways (embedding similarity and word
// overlap), fuse the two rankings, then let a reranker read the top of the fused list.
import { makeEmbedder, DEFAULT_EMBEDDER } from './embed.js'
import { lexicalScorer, sharedWords } from './lexical.js'
import { makeReranker, DEFAULT_RERANKER } from './rerank.js'
import type { Unit } from './units.js'
import { checkInt, checkUnique, dot, fuse, log, ranks, topK } from './util.js'

export interface LinkOptions {
  embed?: string
  rerank?: string
  task?: string
  pool?: number // candidates the reranker reads per source unit
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
}

export const DEFAULTS = { embed: DEFAULT_EMBEDDER, rerank: DEFAULT_RERANKER, pool: 30 }

export async function* link(source: Unit[], target: Unit[], opts: LinkOptions = {}): AsyncGenerator<UnitResult> {
  const embedder = makeEmbedder(opts.embed ?? DEFAULTS.embed)
  const reranker = makeReranker(opts.rerank ?? DEFAULTS.rerank, opts.task)
  const pool = checkInt('pool', opts.pool, 1) ?? DEFAULTS.pool
  checkUnique('source', source.map((u) => u.ref))
  checkUnique('target', target.map((u) => u.ref))
  log(`embedding ${target.length} target and ${source.length} source units with ${embedder.name}`)
  const tVec = await embedder.embed(target.map((u) => u.text), 'doc')
  const sVec = await embedder.embed(source.map((u) => u.text), 'query')
  if (sVec[0] && tVec[0] && sVec[0].length !== tVec[0].length) throw new Error(`source and target vectors differ in length (${sVec[0].length}, ${tVec[0].length})`)
  const lex = lexicalScorer(target.map((u) => u.text))
  const started = Date.now()
  for (const [i, s] of source.entries()) {
    const dense = Float32Array.from(tVec, (t) => dot(sVec[i], t))
    const lexical = lex.scores(s.text)
    const fused = fuse(dense, lexical)
    const fusedRank = ranks(fused)
    const top = topK(fused, pool)
    const ranked: Scored[] = top.map((j) => ({ index: j, dense: dense[j], lex: lexical[j], fusedRank: fusedRank[j] }))
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
    yield { source: s, ranked, fusedRank }
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
  method: { embed: string; rerank: string }
  date: string
}

// The links a person reviews: the top n of each pool, at or above a score if one is set.
export function toLinks(r: UnitResult, target: Unit[], opts: LinkOptions & { top: number; minScore?: number }): Link[] {
  checkInt('top', opts.top, 0)
  if (opts.minScore !== undefined && !Number.isFinite(opts.minScore)) throw new Error(`min-score must be a number, got ${opts.minScore}`)
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
      shared: sharedWords(r.source.text, target[c.index].text),
      status: 'suggested' as const,
      method: { embed: opts.embed ?? DEFAULTS.embed, rerank: opts.rerank ?? DEFAULTS.rerank },
      date,
    }))
}
