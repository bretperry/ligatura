// Word overlap weighted by rarity (tf-idf cosine). Catches quotation, which embeddings blur.
// Words are normalized and stemmed by a language profile (src/lang); English is the default.
import { getLang, type Lang } from './lang/index.js'

export function words(s: string, lang: Lang = getLang('en')): Set<string> {
  return new Set(lang.words(s))
}

// Each distinct word counts once, as before languages: repeats in a unit add nothing.
const stems = (s: string, lang: Lang) => [...words(s, lang)].map(lang.stem).filter((w) => w.length >= lang.minKey)

// Normalized words found in both texts. Both are read as the same language.
export function sharedWords(a: string, b: string, lang: Lang = getLang('en')): string[] {
  const wb = words(b, lang)
  return [...words(a, lang)].filter((w) => wb.has(w))
}

interface Vec {
  v: Map<string, number>
  norm: number
}

// Document frequencies come from the target texts; scores are cosines in [0, 1].
export function lexicalScorer(docs: string[], lang: Lang = getLang('en')) {
  const df = new Map<string, number>()
  for (const d of docs) for (const w of new Set(stems(d, lang))) df.set(w, (df.get(w) ?? 0) + 1)
  const idf = (w: string) => Math.log((docs.length + 1) / ((df.get(w) ?? 0) + 1))
  const vec = (s: string): Vec => {
    const v = new Map<string, number>()
    for (const w of stems(s, lang)) v.set(w, (v.get(w) ?? 0) + idf(w))
    return { v, norm: Math.hypot(...v.values()) || 1 }
  }
  const cos = (a: Vec, b: Vec) => {
    let sum = 0
    for (const [w, x] of a.v) sum += x * (b.v.get(w) ?? 0)
    return sum / (a.norm * b.norm)
  }
  const targets = docs.map(vec)
  return { scores: (query: string) => { const q = vec(query); return Float32Array.from(targets, (t) => cos(q, t)) } }
}

// Character n-grams of each normalized word, padded with spaces so word starts and ends count.
// tf-idf cosine like lexicalScorer, over an inverted index: only targets sharing a gram are touched.
export function charScorer(docs: string[], lang: Lang, n: number) {
  const grams = (s: string) => {
    const g = new Set<string>()
    if (lang.charText) {
      const t = lang.charText(s)
      for (let i = 0; i + n <= t.length; i++) g.add(t.slice(i, i + n))
      return g
    }
    for (const w of lang.words(s)) {
      const p = ` ${w} `
      for (let i = 0; i + n <= p.length; i++) g.add(p.slice(i, i + n))
    }
    return g
  }
  const tg = docs.map(grams)
  const df = new Map<string, number>()
  for (const g of tg) for (const x of g) df.set(x, (df.get(x) ?? 0) + 1)
  const idf = (x: string) => Math.log((docs.length + 1) / ((df.get(x) ?? 0) + 1))
  const norms = new Float32Array(docs.length)
  const index = new Map<string, number[]>()
  tg.forEach((g, j) => {
    let sq = 0
    for (const x of g) {
      const w = idf(x)
      sq += w * w
      let l = index.get(x)
      if (!l) index.set(x, (l = []))
      l.push(j)
    }
    norms[j] = Math.sqrt(sq) || 1
  })
  return {
    scores(query: string): Float32Array {
      const out = new Float32Array(docs.length)
      let sq = 0
      for (const x of grams(query)) {
        const w = idf(x)
        sq += w * w
        for (const j of index.get(x) ?? []) out[j] += w * w
      }
      const qn = Math.sqrt(sq) || 1
      for (let j = 0; j < out.length; j++) out[j] /= qn * norms[j]
      return out
    },
  }
}

// Rare word pairs (Tesserae's rule): a target scores only when it shares at least two stems with
// the query. The score grows with how rare the shared stems are in each text and shrinks with how
// far apart the two rarest sit in each unit: ln(1 + rarity / (distance in query + distance in
// target)). Catches two-word congruencies that single-word tf-idf ranks with ordinary overlap.
export function pairScorer(docs: string[], queries: string[], lang: Lang = getLang('en')) {
  const seq = (s: string) => lang.words(s).map(lang.stem).filter((w) => w.length >= lang.minKey)
  const df = (texts: string[]) => {
    const m = new Map<string, number>()
    for (const t of texts) for (const w of new Set(seq(t))) m.set(w, (m.get(w) ?? 0) + 1)
    return m
  }
  const dfT = df(docs)
  const dfQ = df(queries)
  const positions = (ws: string[]) => {
    const m = new Map<string, number[]>()
    ws.forEach((w, k) => { let l = m.get(w); if (!l) m.set(w, (l = [])); l.push(k) })
    return m
  }
  const tpos = docs.map((d) => positions(seq(d)))
  const index = new Map<string, number[]>()
  tpos.forEach((p, j) => { for (const w of p.keys()) { let l = index.get(w); if (!l) index.set(w, (l = [])); l.push(j) } })
  const gap = (a: number[], b: number[]) => {
    let best = Infinity
    for (const x of a) for (const y of b) best = Math.min(best, Math.abs(x - y))
    return best
  }
  return {
    scores(query: string): Float32Array {
      const out = new Float32Array(docs.length)
      const qpos = positions(seq(query))
      const shared = new Map<number, string[]>()
      for (const w of qpos.keys()) for (const j of index.get(w) ?? []) { let l = shared.get(j); if (!l) shared.set(j, (l = [])); l.push(w) }
      // A stem's rarity counts its frequency in both texts, as Tesserae does.
      const rarity = (w: string) => 1 / (dfT.get(w) ?? 1) + 1 / (dfQ.get(w) ?? 1)
      for (const [j, ws] of shared) {
        if (ws.length < 2) continue
        const [a, b] = [...ws].sort((x, y) => rarity(y) - rarity(x))
        const dist = gap(qpos.get(a)!, qpos.get(b)!) + gap(tpos[j].get(a)!, tpos[j].get(b)!)
        out[j] = Math.log(1 + ws.reduce((s, w) => s + rarity(w), 0) / Math.max(dist, 1))
      }
      return out
    },
  }
}
