// Biblical (and Classical) Hebrew. Strips niqqud (vowel points, shin and sin dots, dagesh,
// meteg), cantillation marks and the maqaf, which joins words in print and is read as a space;
// writes final ך ם ן ף ץ as כ מ נ פ צ; and folds presentation forms (שׁ U+FB2A) to the plain
// letter. Pointed and unpointed editions then match. Text direction plays no part: matching
// reads the string in logical order, which is also how Hebrew is stored.
// Scripts without vowel letters write ו and י as consonants and as vowels, so plene and
// defective spellings differ (דוד, דויד); a light prefix and suffix stripper joins the commonest
// forms but finds no roots, and the character n-grams catch more.
import { byLength, stripEnding, type Lang } from './types.js'

export function foldHebrew(s: string): string {
  return s
    // NFKD splits presentation forms (U+FB1D–FB4F) into letter plus point and drops the wide forms.
    .normalize('NFKD')
    // Every Hebrew point and accent is a combining mark (U+0591–U+05C7): drop them with the rest.
    .replace(/\p{M}/gu, '')
    // Maqaf, and bidi controls that editions embed.
    .replace(/[־]/g, ' ')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
}

// The marker of the direct object, relative, conjunction and preposition words, pronouns and the
// commonest forms of "be", with prefixes already off, folded.
const STOP = new Set(
  `את אשר כי על אל לא גם הוא היא הם הן המה הנה אתה את אני אנכי אנחנו אתם אנו זה זאת אלה
  מן עד עם אך אם או פן לכן כן כה אי אין יש כל בין אחר תחת לפני אצל עוד
  היה הית היו תהיה יהיה והיה ויהי`.split(/\s+/).map(foldHebrew),
)

// Proclitic ו (and), then the article ה or one of ב כ ל מ ש (in, like, to, from, that). A letter
// comes off only if three remain, or if what remains is a stop word (ואת, מאת, כאשר): לב (heart),
// בן (son), מה and אב are whole words.
export function splitProclitics(w: string): string {
  if (STOP.has(w)) return w
  const off = (re: RegExp) => { if (re.test(w) && (w.length > 3 || STOP.has(w.slice(1)))) w = w.slice(1) }
  off(/^ו/)
  if (STOP.has(w)) return w
  off(/^[הבכלמש]/)
  return w
}

// Plural, dual and feminine endings, after pronoun suffixes (his, her, their, our, your, my, me).
const PRONOUNS = byLength(['יהמ', 'יהנ', 'יכמ', 'ינו', 'כמ', 'כנ', 'המ', 'הנ', 'נו', 'ני', 'הו', 'ה', 'ו', 'כ', 'י'].map(foldHebrew))
const ENDINGS = byLength(['ים', 'ות', 'ין', 'ית', 'ה', 'ת'].map(foldHebrew))

export const hbo: Lang = {
  code: 'hbo',
  name: 'Biblical Hebrew',
  // A verse ends at the sof pasuq ׃ (U+05C3), a full stop, ! or ?, then a space. The paseq ׀ and
  // the maqaf don't end one, and Hebrew has no capitals, so none is required.
  sentences: (p) => p.split(/(?<=[׃.!?])\s+/),
  words: (s) =>
    (foldHebrew(s).match(/[א-ת]+/g) ?? [])
      .map(splitProclitics)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  // Stems keep two letters: אב (father), אם (mother), יד (hand).
  stem: (w) => stripEnding(stripEnding(w, PRONOUNS, 3), ENDINGS, 2),
  minKey: 2,
  charGrams: 3,
  embedder: 'bge-m3',
}
