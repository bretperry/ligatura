// English. The stop list and stem fold archaic forms (thou, hath, followeth), common in older texts.
import type { Lang } from './types.js'

const STOP = new Set(
  'the and of to that in a is he for it not be his they all which with as but i you thou thee thy shall unto this them me my him are have will by from or so what was on no who when if there their we then do hath doth'.split(' '),
)

export const en: Lang = {
  code: 'en',
  name: 'English',
  // A sentence ends at . ; : ? or ! followed by a space and a capital or an opening quote.
  sentences: (p) => p.split(/(?<=[.;:?!])\s+(?=[A-Z“"'‘])/),
  words: (s) => s.toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [],
  stem: (w) => w.replace(/(eth|est|ed|ing|s)$/, ''),
  minKey: 3,
  embedder: 'nomic-embed-text-v1.5',
}
