// Word overlap weighted by rarity (tf-idf cosine). Catches quotation, which embeddings blur.
// The stop list and stem fold archaic English (thou, hath, followeth), common in older texts.

const STOP = new Set(
  'the and of to that in a is he for it not be his they all which with as but i you thou thee thy shall unto this them me my him are have will by from or so what was on no who when if there their we then do hath doth'.split(' '),
)

export function words(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [])
}

const stem = (w: string) => w.replace(/(eth|est|ed|ing|s)$/, '')
const stems = (s: string) => [...words(s)].map(stem).filter((w) => w.length > 2)

export function sharedWords(a: string, b: string): string[] {
  const wb = words(b)
  return [...words(a)].filter((w) => wb.has(w))
}

interface Vec {
  v: Map<string, number>
  norm: number
}

// Document frequencies come from the target texts; scores are cosines in [0, 1].
export function lexicalScorer(docs: string[]) {
  const df = new Map<string, number>()
  for (const d of docs) for (const w of new Set(stems(d))) df.set(w, (df.get(w) ?? 0) + 1)
  const idf = (w: string) => Math.log((docs.length + 1) / ((df.get(w) ?? 0) + 1))
  const vec = (s: string): Vec => {
    const v = new Map<string, number>()
    for (const w of stems(s)) v.set(w, (v.get(w) ?? 0) + idf(w))
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
