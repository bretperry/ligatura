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
