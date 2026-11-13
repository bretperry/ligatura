// Akkadian (Assyrian and Babylonian, all periods), in transliteration. Cuneiform signs are not read.
//
// Input form: the Latin-letter transliteration that ORACC and CDLI publish, with signs joined by
// hyphens ("a-na be-li-ia"), logograms in capitals with dots ("LUGAL.MEŠ"), determinatives in
// braces or superscript ("{d}UTU", "ᵈUTU"), sign indices as digits or subscripts ("a₂", "šu2",
// "à"), and editorial marks for damage ("[a-na]", "⌈be⌉-li", "x", "...", "#", "!", "?", "<<...>>").
// Normalized transliteration with long vowels (ā â ē ī ū) and ATF line numbers ("1.", "r 3'.")
// are accepted too. Text in cuneiform Unicode folds to nothing: give such text a transliteration.
//
// Folding: determinatives are dropped (classifiers, not words); damaged signs are kept, since a
// broken sign is still evidence, and only the brackets and flags go. Sign indices, aleph and vowel
// length go; š ṣ ṭ ḫ become s s t h. Repeated letters collapse, which merges plene writing
// (ša-a-ti, ša-ti) and gemination (ib-ba-ši, ib-ši). Hyphens join a word's signs, so "be-li-ia" is
// "belia"; the dots of a logogram split it into one word per sign.
import { byLength, stripEnding, type Lang } from './types.js'

// Modifier letters used for superscript determinatives and complements (ᵈ ᵐ ᶠ ᵏⁱ ᵘʳᵘ ...).
const SUPERSCRIPT = /[ᴬ-ᵪᵸᶛ-ᶿʰ-ʸˠ-ˤⁱⁿ]/g

// Transliteration to lower-case a-z words separated by spaces. Anything that isn't a letter
// (digits, brackets, flags, line numbers) separates or vanishes.
export function foldAkkadian(s: string): string {
  return s
    .replace(/\{[^}]*\}/g, ' ') // {d} {ki} {lu₂}
    .replace(SUPERSCRIPT, '')
    .replace(/[⌈⌉⸢⸣⌊⌋\[\]<>()«»!?#*]/g, '') // damage and editorial marks, before hyphens are joined
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // macrons, circumflexes, acute and grave, carons, dots below, breves
    .toLowerCase()
    .replace(/[ʾʼʿ'’`′]/g, '') // aleph, ayin, primes of broken line numbers
    .replace(/(?<=[a-z])[₀-₉0-9]+/g, '') // sign indices: a₂ a2 šu₂
    .replace(/(?<=[a-z])-(?=[a-z])/g, '') // sign hyphens
    .replace(/(?<=[a-z])\.(?=[a-z])/g, ' ') // logogram dots
    .replace(/([a-z])\1+/g, '$1') // plene writing and gemination
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

// Particles, prepositions, conjunctions and pronouns, folded (ša, ina, ana, u, lā, ul, kī, adi,
// eli, itti, ištu, ašar, kīma, ūmma, šumma, anāku, attā, šū, šī, šunu, annû, ...).
const STOP = new Set(
  `sa ina ana la lu ul ula ki kima adi eli ela itti isti istu asar ma summa umma anaku atta atti
  su si sunu sina suati sunuti sinati annu anni annum annutu sati assum aia ayyu mala`.split(/\s+/),
)

// Pronoun suffixes (-šu -ša -ka -ki -ia -ni -šunu -šina -kunu), then case, number and gender
// endings (-um -im -am, -u -i -a, -atu -ati), folded, each list longest first. The stem strips
// one of each, in that order, so "šarrūšu" (his kings) and "šarrum" meet.
const SUFFIXES = byLength(['sunu', 'sina', 'kunu', 'kina', 'su', 'sa', 'ka', 'ki', 'ia', 'ni', 'ku'])
const CASES = byLength(['anu', 'ani', 'ati', 'atu', 'atum', 'etum', 'itum', 'utum', 'um', 'im', 'am', 'ut', 'it', 'at', 'tu', 'ti', 'u', 'i', 'a', 'e'])

export const akk: Lang = {
  code: 'akk',
  name: 'Akkadian',
  // Transliterations are lines with little punctuation, so a sentence ends at . ; : ? ! that
  // follows a letter and precedes a space. A dot after a digit is an ATF line number ("1.",
  // "3'."), and a logogram's dot has no space after it.
  sentences: (p) => p.split(/(?<=[^\s\d′'][.;:?!])\s+/u),
  words: (s) => foldAkkadian(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w)),
  stem: (w) => stripEnding(stripEnding(w, SUFFIXES, 3), CASES, 3),
  minKey: 3,
  charGrams: 4,
  embedder: 'bge-m3',
}
