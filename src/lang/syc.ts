// Classical Syriac (Estrangela, Serto and Madnhaya share one Unicode block, U+0710–072F).
// Folding drops every combining mark: the East and West vowel points (U+0730–073F), the
// diacritics (feminine dot, qushshaya, rukkaya, seyame U+0308, linea occultans, U+0740–074A)
// and the superscript alef (U+0711), plus the abbreviation mark SAM (U+070F), tatweel and the
// joiners, so a pointed Serto text and an unpointed Estrangela text give the same words.
// Text direction plays no part: matching reads the string in logical order.
// Syriac proclitics (ܘ and, ܕ of/that, ܒ in, ܠ to) are split off; stems drop the emphatic
// ending ܐ, plurals and pronoun suffixes. Roots are not found.
// Biblical and Imperial Aramaic are written in Hebrew script and are not read by this profile.
import { byLength, stripEnding, type Lang } from './types.js'

export function foldSyriac(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\p{M}܏ـ‌‍]/gu, '')
    .normalize('NFC')
}

// Pronouns, particles, prepositions and the commonest forms of "to be", folded.
const STOP = new Set(
  `ܘ ܕ ܐܢ ܠܐ ܗܘ ܗܝ ܗܘܘ ܗܘܐ ܗܘܬ ܗܢܘܢ ܗܢܝܢ ܗܠܝܢ ܗܢܐ ܗܕܐ ܗܠܝܢ ܗܠܘ ܡܢ ܥܠ ܥܡ ܐܠܐ ܟܠ ܐܝܬ ܝܬ ܐܦ ܐܘ ܗܟܝܠ ܗܐ
  ܐܝܟ ܥܕ ܠܘܬ ܐܢܐ ܐܢܬ ܐܢܬܝ ܐܢܬܘܢ ܐܢܚܢ ܐܢܬܝܢ ܕܝܢ ܓܝܪ ܗܟܢܐ ܗܟܢܝܢ ܠܗ ܠܗܘܢ ܠܗܝܢ ܒܗ ܒܗܘܢ ܡܢܗ ܡܢܗܘܢ ܥܠܘܗܝ ܥܠܝܗܘܢ ܥܡܗ
  ܐܝܬܘܗܝ ܗܘܝ ܒܗܘܢ ܠܗܘܢ ܕܗܘ ܕܗܝ ܕܗܢܐ ܕܗܠܝܢ ܕܠܐ ܕܟܠ ܕܐܢ ܘܠܐ ܘܐܢ ܗܘܘ ܗܘܝܢ ܡܛܠ ܥܠܝܗ ܠܘܬܗ ܠܘܬܗܘܢ ܬܡܢ ܗܪܟܐ`.split(/\s+/),
)

// ܘ (and) and ܕ (of, that, who) come off if three letters remain, singly or as ܘܕ. ܒ and ܠ
// come off only from words of five letters or more: ܒܝܬ (house), ܠܒܐ (heart), ܟܬܒܐ (book)
// stay whole. ܟ and ܡ are not split, since ܡܢ (from) is a stop word and both begin too many roots.
// A stop word left after a step stays as it is, to be dropped.
export function splitProclitics(w: string): string {
  if (w.length > 3 && /^[ܘܕ]/.test(w)) w = w.slice(1)
  if (STOP.has(w)) return w
  if (w.length > 4 && /^[ܘܕ]/.test(w)) w = w.slice(1)
  if (STOP.has(w)) return w
  if (w.length > 4 && /^[ܒܠ]/.test(w)) w = w.slice(1)
  return w
}

// Pronoun suffixes (-eh, -ay, -kon, -hon), plural -in and -un, feminine -ath, emphatic -a.
const ENDINGS = byLength(['ܝܗܘܢ', 'ܝܗܝܢ', 'ܗܘܢ', 'ܗܝܢ', 'ܟܘܢ', 'ܘܗܝ', 'ܬܐ', 'ܝܢ', 'ܘܢ', 'ܝܗ', 'ܗܝ', 'ܐ', 'ܗ'])

export const syc: Lang = {
  code: 'syc',
  name: 'Syriac',
  // A sentence ends at a Syriac stop (܀ ܁ ܂ ܃ ܄), . ! ? ؟ ; or :, then a space. Syriac has no
  // capitals, so none is required. The Syriac colons used inside verses (܅–܇) don't end one.
  sentences: (p) => p.split(/(?<=[܀-܄.!?؟;:])\s+/),
  words: (s) =>
    (foldSyriac(s).match(/[ܐ-ܯ]+/g) ?? [])
      .filter((w) => !STOP.has(w))
      .map(splitProclitics)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  // Three-letter stems are the floor: roots are mostly triliteral, and ܐܒ (father) is the rare short one.
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  embedder: 'bge-m3',
}
