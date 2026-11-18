// The pipeline: embed both texts, score every target unit two ways (embedding similarity and word
// overlap), fuse the two rankings, then let a reranker read the top of the fused list.
import { makeEmbedder, splitEmbedSpec, DEFAULT_EMBEDDER } from './embed.js'
import { defaultEmbedder, getLang, type Lang } from './lang/index.js'
import { charScorer, lexicalScorer, pairScorer, sharedWords } from './lexical.js'
import { makeReranker, DEFAULT_RERANKER } from './rerank.js'
import type { Unit } from './units.js'
import { checkInt, checkUnique, dot, fuseWeighted, log, ranks, RRF_K, topK } from './util.js'

export interface LinkOptions {
  embed?: string
  rerank?: string
  task?: string
  pool?: number // candidates the reranker reads per source unit
  lang?: string // language of both texts: en (default), la, grc or sa
  sourceLang?: string // overrides lang for the source
  targetLang?: string // overrides lang for the target
  // Translations of target units, matched by ref. A target unit then scores the better of its
  // own text and its translation, and word overlap reads both.
  gloss?: Unit[]
  // Experimental, off by default until measured:
  // rerankFuse: the reranker's vote when its order is fused with the retrieval order inside the
  // pool (reciprocal rank fusion) instead of replacing it.
  rerankFuse?: number
  // pairs: a further ranking by shared rare word pairs (Tesserae's rule); same language only.
  pairs?: boolean
  // runs: a further ranking that adds, to each target's own fused score, the best fused score of
  // the neighbouring source units at the neighbouring targets, so a run of links lifts its members.
  runs?: boolean
  runsWeight?: number // the runs list's vote (default 1)
  runsGate?: number // lift only targets in the unit's own top n (default: all)
  // Yield results only for these source refs; the rest are still read as neighbours for runs.
  only?: Set<string>
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
  pairs?: Float32Array
}

export const DEFAULTS = { embed: DEFAULT_EMBEDDER, rerank: DEFAULT_RERANKER, pool: 30 }

export async function* link(source: Unit[], target: Unit[], opts: LinkOptions = {}): AsyncGenerator<UnitResult> {
  const run = resolve(opts)
  // "a+b" runs several embedders; each ranks the targets and the rankings are fused.
  const embedders = splitEmbedSpec(run.embed).map(makeEmbedder)
  const reranker = makeReranker(opts.rerank ?? DEFAULTS.rerank, opts.task)
  const pool = checkInt('pool', opts.pool, 1) ?? DEFAULTS.pool
  checkUnique('source', source.map((u) => u.ref))
  checkUnique('target', target.map((u) => u.ref))
  const glossByRef = new Map((opts.gloss ?? []).map((u) => [u.ref, u.text]))
  if (opts.gloss) {
    checkUnique('gloss', opts.gloss.map((u) => u.ref))
    // A gloss keyed to another ref scheme would otherwise be ignored without a word.
    const tRefs = new Set(target.map((u) => u.ref))
    const stray = opts.gloss.filter((u) => !tRefs.has(u.ref))
    if (!opts.gloss.length) throw new Error('the gloss has no units')
    if (stray.length) throw new Error(`${stray.length} of ${opts.gloss.length} gloss refs are not target refs (first: "${stray[0].ref}"); a gloss is keyed by the target's refs`)
  }
  const glossed = target.flatMap((u, j) => (glossByRef.has(u.ref) ? [j] : []))
  if (opts.gloss) log(`gloss: ${glossed.length} of ${target.length} target units have a translation`)
  const forEmbed = (lang: Lang, units: Unit[]) => units.map((u) => (lang.embedText ? lang.embedText(u.text) : u.text))
  // Source units to score: those yielded, and with runs their neighbours too.
  const yields = source.flatMap((u, i) => (!opts.only || opts.only.has(u.ref) ? [i] : []))
  const needed = [...new Set(yields.flatMap((i) => (opts.runs ? [i - 1, i, i + 1] : [i])).filter((i) => i >= 0 && i < source.length))].sort((a, b) => a - b)
  const slot = new Map(needed.map((i, k) => [i, k]))
  const spaces: { t: Float32Array[]; s: Float32Array[]; g: Float32Array[] }[] = []
  for (const embedder of embedders) {
    log(`embedding ${target.length} target (${run.target.code}) and ${needed.length} source (${run.source.code}) units with ${embedder.name}${run.lexical ? '' : '; no word overlap across languages'}`)
    const t = await embedder.embed(forEmbed(run.target, target), 'doc')
    const s = await embedder.embed(forEmbed(run.source, needed.map((i) => source[i])), 'query')
    if (s[0] && t[0] && s[0].length !== t[0].length) throw new Error(`source and target vectors differ in length (${s[0].length}, ${t[0].length})`)
    const g = glossed.length ? await embedder.embed(glossed.map((j) => glossByRef.get(target[j].ref)!), 'doc') : []
    spaces.push({ t, s, g })
  }
  // Overlap scores the translations as documents of their own, after the target's units, so both
  // share one idf; a glossed unit then keeps the better of the two, as the embeddings do.
  const docs = [...target.map((u) => u.text), ...glossed.map((j) => glossByRef.get(target[j].ref)!)]
  const better = (all: Float32Array): Float32Array => {
    const out = all.slice(0, target.length)
    glossed.forEach((j, k) => { out[j] = Math.max(out[j], all[target.length + k]) })
    return out
  }
  const lex = run.lexical ? lexicalScorer(docs, run.target) : undefined
  // The profile's fusion weights apply only when both texts are in its language.
  // With a+b, each embedder's list votes w.dense: a fused pair outvotes overlap, as measured.
  const w = run.lexical ? run.target.fusion ?? {} : {}
  const chr = run.lexical && run.target.charGrams ? charScorer(docs, run.target, run.target.charGrams) : undefined
  const prs = run.lexical && opts.pairs ? pairScorer(docs, source.map((u) => u.text), run.target) : undefined
  // Every signal for one source unit, fused; kept for neighbours when runs is on.
  const memo = new Map<number, ReturnType<typeof signals>>()
  function signals(i: number) {
    const k = slot.get(i)!
    const denses = spaces.map((sp) => {
      const d = Float32Array.from(sp.t, (t) => dot(sp.s[k], t))
      glossed.forEach((j, x) => { d[j] = Math.max(d[j], dot(sp.s[k], sp.g[x])) })
      return d
    })
    // The reported cosine is the mean across embedders.
    const dense = denses.length === 1 ? denses[0] : Float32Array.from(denses[0], (_, j) => denses.reduce((a, d) => a + d[j], 0) / denses.length)
    const text = source[i].text
    const lexical = lex && better(lex.scores(text))
    const chars = chr && better(chr.scores(text))
    const pairs = prs && better(prs.scores(text))
    // Across languages, overlap is left out and the fused order is the embedding order.
    const fused = fuseWeighted([...denses.map((d) => [d, w.dense ?? 1]), [lexical, w.words ?? 1], [chars, w.chars ?? 1], [pairs, w.words ?? 1]].filter((x): x is [Float32Array, number] => x[0] !== undefined))
    return { dense, lexical, chars, pairs, fused }
  }
  const get = (i: number) => {
    let r = memo.get(i)
    if (!r) memo.set(i, (r = signals(i)))
    return r
  }
  const started = Date.now()
  for (const [n, i] of yields.entries()) {
    const s = source[i]
    const { dense, lexical, chars, pairs, fused: own } = get(i)
    let fused = own
    if (opts.runs) {
      // Support from the run: the best fused score of source i-1 or i+1 at target j-1, j or j+1.
      const near = [i - 1, i + 1].filter((x) => slot.has(x)).map((x) => get(x).fused)
      const ownRank = opts.runsGate ? ranks(own) : undefined
      const support = Float32Array.from(own, (f, j) => {
        let best = 0
        if (ownRank && ownRank[j] > opts.runsGate!) return f
        for (const nf of near) for (const o of [-1, 0, 1]) { const v = nf[j + o]; if (v !== undefined && v > best) best = v }
        return f + best
      })
      fused = fuseWeighted([[own, 1], [support, opts.runsWeight ?? 1]])
    }
    // Units behind the previous one are no longer needed.
    for (const x of memo.keys()) if (x < i - 1) memo.delete(x)
    const fusedRank = ranks(fused)
    const top = topK(fused, pool)
    const ranked: Scored[] = top.map((j) => ({ index: j, dense: dense[j], lex: lexical?.[j] ?? 0, fusedRank: fusedRank[j] }))
    if (reranker) {
      // Candidates go to the reranker in target order, so the fused rank can't lead it.
      const ordered = [...ranked].sort((a, b) => a.index - b.index)
      const scores = await reranker.score(s, ordered.map((c) => target[c.index]))
      ordered.forEach((c, k) => { c.rerank = scores[k] })
      const fuseW = opts.rerankFuse
      if (fuseW !== undefined) {
        // Fuse inside the pool: the retrieval order votes 1, the reranker's order fuseW.
        const rr = ranks(Float32Array.from(ranked, (c) => c.rerank!))
        const vote = new Map(ranked.map((c, k) => [c.index, 1 / (RRF_K + c.fusedRank) + fuseW / (RRF_K + rr[k])]))
        ranked.sort((a, b) => vote.get(b.index)! - vote.get(a.index)! || a.fusedRank - b.fusedRank)
      } else ranked.sort((a, b) => b.rerank! - a.rerank! || a.fusedRank - b.fusedRank)
      const each = (Date.now() - started) / (n + 1)
      log(`rerank ${reranker.name}: ${n + 1}/${yields.length}, about ${Math.round((each * (yields.length - n - 1)) / 60000)} min left`, true)
    }
    yield { source: s, ranked, fusedRank, dense, lexical, chars, pairs }
  }
  if (reranker) log(`reranked ${yields.length} units in ${Math.round((Date.now() - started) / 1000)} s`)
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
  method: { embed: string; rerank: string; lang?: string; gloss?: true }
  date: string
}

// The links a person reviews: the top n of each pool, at or above a score if one is set.
export function toLinks(r: UnitResult, target: Unit[], opts: LinkOptions & { top: number; minScore?: number }): Link[] {
  checkInt('top', opts.top, 0)
  if (opts.minScore !== undefined && !Number.isFinite(opts.minScore)) throw new Error(`min-score must be a number, got ${opts.minScore}`)
  const run = resolve(opts)
  const date = new Date().toISOString().slice(0, 10)
  const round = (x: number) => Math.round(x * 1000) / 1000
  // Overlap read each target unit with its translation, so shared words do too.
  const glossByRef = new Map((opts.gloss ?? []).map((u) => [u.ref, u.text]))
  const withGloss = (u: Unit) => (glossByRef.has(u.ref) ? `${u.text} ${glossByRef.get(u.ref)}` : u.text)
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
      shared: run.lexical ? sharedWords(r.source.text, withGloss(target[c.index]), run.target) : [],
      status: 'suggested' as const,
      method: { embed: run.embed, rerank: opts.rerank ?? DEFAULTS.rerank, ...(run.source.code === 'en' && run.target.code === 'en' ? {} : { lang: `${run.source.code}>${run.target.code}` }), ...(opts.gloss ? { gloss: true as const } : {}) },
      date,
    }))
}
