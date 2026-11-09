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
