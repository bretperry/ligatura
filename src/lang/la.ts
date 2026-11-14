// Latin, classical and ecclesiastical. Folds case, macrons and other accents, u/v and i/j,
// and the ligatures æ and œ, so "Vīvit", "uiuit" and "vivit" are one word. A light suffix
// stripper stands in for a lemmatizer: it joins most forms of a noun or a verb, not all
// (it can't join "fero" and "tuli", or "rex" and "regis").
import { byLength, stripEnding, type Lang } from './types.js'

export function foldLatin(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/v/g, 'u')
    .replace(/j/g, 'i')
}

// Function words, pronouns and the commonest verbs of saying and being, in folded spelling.
const STOP = new Set(
  `a ab abs ac ad adhuc an ante apud at atque aut autem cum de dum e ea eam eas ei eis eius
  enim eo eorum eos erat erant ergo es esse est et etiam eum ex hac haec hic hinc his hoc huc
  huius iam ibi id idem igitur ille illa illud illi illis illo illum in inter ipse ipsa ipsum
  ipsi ipsis ipsius ipso is ita item mea meam mei meis meo meum meus mihi me nam ne nec
  neque nisi nobis non nos nostra noster nostri nostrum nunc o ob per post pro propter qua quae
  quam quare quasi qui quia quibus quid quidem quis quo quod quomodo quoniam quoque se sed seu
  si sibi sic sicut sine sit sint sub sum sumus sunt super sua suam sui suis suo suum suus tam
  tamen te tibi tu tua tuae tuam tuas tui tuis tuo tuum tuus tuorum suae suas suorum meae meas meorum nostrae uestrae nostris uestris tunc ubi uel uero uester uestra uestri uos
  uobis ut uti itaque namque usque denique utique dixit dicit ait inquit dicens dicentes`.split(/\s+/).map(foldLatin),
)

// -que is "and", written onto the next word; these words end in -que but aren't word + que.
const QUE = new Set(
  'atque quoque neque itaque absque usque utique undique ubique plerumque quisque quaeque quodque quidque quicumque quaecumque quodcumque uterque utraque utrumque denique namque'.split(' '),
)

// Noun and adjective endings, then verb endings. Longest first.
const ENDINGS = byLength([
  'ibus', 'orum', 'arum', 'ebus', 'ium', 'ius', 'ae', 'am', 'as', 'ei', 'em', 'es', 'is', 'os', 'ui', 'um', 'us', 'a', 'e', 'i', 'o', 'u',
  'erunt', 'issent', 'isset', 'isse', 'ntur', 'mini', 'bant', 'bunt', 'bimus', 'bitis', 'bamus', 'batis', 'eris', 'erit', 'ere', 'are', 'ire',
  'abam', 'ebam', 'iunt', 'unt', 'ant', 'ent', 'int', 'mus', 'tis', 'tur', 'bam', 'bat', 'bit', 'bis', 'bo', 'nt', 'ns', 'nte', 'ntis', 'ndo', 'ndum', 'ndi', 'ri', 'it', 'at', 'et',
])

export const la: Lang = {
  code: 'la',
  name: 'Latin',
  // As English: . ; : ? or ! then a space and a capital or an opening quote.
  sentences: (p) => p.split(/(?<=[.;:?!])\s+(?=[\p{Lu}“"'‘«])/u),
  words: (s) =>
    (foldLatin(s).match(/[a-z]+/g) ?? [])
      .map((w) => (w.length > 5 && w.endsWith('que') && !QUE.has(w) ? w.slice(0, -3) : w))
      .filter((w) => w.length > 2 && !STOP.has(w)),
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  charGrams: 4,
  embedder: 'bge-m3',
}
