// Arabic. Strips harakat (short vowels, shadda, sukun, tanwin), the dagger alef, Quranic marks
// and tatweel; writes أ إ آ ٱ as ا, ى as ي and ة as ه; and splits the clitics و ف (and, so),
// ب ل ك (in, to, like) and the article ال off the front of a word, so "وبالكلمة" gives "كلمه".
// Text direction plays no part: matching reads the string in logical order.
// A light suffix stripper (after Larkey's light10) drops pronoun and plural suffixes; it
// doesn't find roots, so broken plurals (كتاب, كتب) stay apart.
import { byLength, stripEnding, type Lang } from './types.js'

export function foldArabic(s: string): string {
  return s
    .normalize('NFC')
    // Harakat U+064B–U+0652, hamza marks U+0653–U+0655, dagger alef U+0670, Quranic marks, tatweel.
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
}

// Prepositions, pronouns, particles, and the commonest forms of kāna and qāla, folded.
const STOP = new Set(
  `في من الي علي عن ان انه انها انهم انك اني لا ما لم لن لما هو هي هم هن هما انت انتم انا نحن
  هذا هذه ذلك تلك هولاء اولئك الذي التي الذين اللذين اللواتي كل قد ثم او ام بل حتي اذا اذ لان لكي كي مع عند
  لكن لكنه ايضا اما الا غير بين بعد قبل منه منها منهم فيه فيها فيهم عليه عليها عليهم له لها لهم لك لكم به بها بهم
  كان كانت كانوا يكون تكون كنت قال قالت قالوا يقول تقول يا ايها ها هوذا`.split(/\s+/).map(foldArabic),
)

// Allah with its clitics (والله، بالله، لله، اللهم) is kept whole: splitting ال would leave له, "to him".
const ALLAH = /^[وف]?(?:ب?ال|ل)لهم?$/

// و or ف, then ب ل or ك, then ال (after ل the article's alif drops: للرب is ل + الرب).
// و and ف come off only if three letters remain (ولد keeps its و); ب ل ك only with the
// article, as in Larkey's light10, since alone they too often begin the word (بيت، لبس، كتب).
// A stop word left after a step stays as it is, to be dropped.
export function splitClitics(w: string): string {
  if (ALLAH.test(w)) return 'الله'
  if (w.length > 3 && /^[وف]/.test(w)) w = w.slice(1)
  if (STOP.has(w)) return w
  if (w.length > 3 && /^لل/.test(w)) return w.slice(2)
  if (w.length > 4 && /^[بك]ال/.test(w)) return w.slice(3)
  if (w.length > 3 && /^ال/.test(w)) return w.slice(2)
  return w
}

// Pronoun suffixes come off first, then plural, dual and feminine endings: كلماتهم, كلمات, كلم.
const PRONOUNS = byLength(['هما', 'كما', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ه', 'ي', 'ك'])
const ENDINGS = byLength(['ات', 'ون', 'ين', 'ان', 'وا', 'يه', 'ه'])

export const ar: Lang = {
  code: 'ar',
  name: 'Arabic',
  // A sentence ends at . ! ؟ (Arabic question mark) or ؛ (Arabic semicolon), then a space.
  // Arabic has no capitals, so none is required. The Arabic comma ، doesn't end one.
  sentences: (p) => p.split(/(?<=[.!?؟؛])\s+/),
  words: (s) =>
    (foldArabic(s).match(/[ء-ي]+/g) ?? [])
      .filter((w) => !STOP.has(w))
      .map(splitClitics)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  // Two-letter stems are real words here: رب (lord), اب (father), ام (mother).
  stem: (w) => stripEnding(stripEnding(w, PRONOUNS, 2), ENDINGS, 2),
  minKey: 2,
  // bge-m3 doesn't vote in Arabic-to-Arabic fusion. On ghazali-quran, equal votes found 399 of 526
  // links in the top 10 against 510 for word overlap alone; a vote of 0.1 gave 509, 0.25 gave 500.
  // The fixture is verbatim quotation, which favours overlap; paraphrase may earn the vote back.
  fusion: { dense: 0 },
  embedder: 'bge-m3',
}
