// Coptic, Sahidic first. Sahidic is the literary standard and has the most open text (the
// Sahidic New Testament, the Coptic Scriptorium corpora); Bohairic, the liturgical dialect, is
// read with the same profile but shares fewer words with Sahidic (ⲡⲓ- for ⲡⲉ-, ⲫ ⲑ ⲭ for ⲡ ⲧ ⲕ
// in native words), so overlap is weaker across dialects. Only ϧ is folded into ϩ.
//
// Unicode: the Coptic block (U+2C80–U+2CFF) holds most letters, but Unicode left seven letters
// in the Greek block (ϣ ϥ ϧ ϩ ϫ ϭ ϯ, U+03E2–U+03EF), and many editions and OCR type the rest
// with plain Greek letters (α for ⲁ, ϲ or σ for ⲥ). Folding lower-cases, then writes every
// Greek-block lookalike as its Coptic-block letter, so all spellings of a word match.
// Combining marks (supralinear strokes U+0305/U+0304, U+FE24–FE26, dots, diaeresis, acute,
// the Coptic combining marks U+2CEF–2CF1) are dropped.
//
// Coptic writes "bound groups": article, conjugation base, verb and pronoun suffix run together
// (ⲁϥⲧⲁⲁϥ "he gave it"). Editions space the groups, not the morphemes, and there is no
// segmenter here. A light prefix and suffix stripper stands in for one.
import { byLength, type Lang } from './types.js'

// Greek-block letters to the Coptic block. The lowercase of the seven Coptic-only letters has
// no Coptic-block form and stays where it is.
const GREEK_TO_COPTIC: Record<string, string> = {
  α: 'ⲁ', β: 'ⲃ', γ: 'ⲅ', δ: 'ⲇ', ε: 'ⲉ', ϛ: 'ⲋ', ζ: 'ⲍ', η: 'ⲏ', θ: 'ⲑ', ι: 'ⲓ', ϊ: 'ⲓ', κ: 'ⲕ',
  λ: 'ⲗ', μ: 'ⲙ', ν: 'ⲛ', ξ: 'ⲝ', ο: 'ⲟ', π: 'ⲡ', ρ: 'ⲣ', σ: 'ⲥ', ς: 'ⲥ', ϲ: 'ⲥ', τ: 'ⲧ', υ: 'ⲩ',
  φ: 'ⲫ', χ: 'ⲭ', ψ: 'ⲯ', ω: 'ⲱ', ϧ: 'ϩ',
}

export function foldCoptic(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/‾/g, '')
    .toLowerCase()
    .replace(/[α-ωϛϲϧ]/g, (c) => GREEK_TO_COPTIC[c] ?? c)
    .normalize('NFC')
}

// Coptic block letters (lowercase ⲁ–ⳣ) plus ϣ ϥ ϩ ϫ ϭ ϯ (ϧ is folded to ϩ).
const WORD = /[ⲁ-ⳣϣϥϩϫϭϯ]+/g

// Particles, copula, pronouns, prepositions, negation and conjunctions, folded. Bound groups
// that are only function words ("ⲁⲩⲱ", "ⲇⲉ", "ⲛⲧⲟϥ") drop out before stemming.
const STOP = new Set(
  `ⲁⲩⲱ ⲇⲉ ⲅⲁⲣ ⲙⲉⲛ ⲟⲩⲇⲉ ⲟⲩⲧⲉ ⲁⲗⲗⲁ ⲁϩⲗⲗⲁ ϫⲉ ⲉϣϫⲉ ⲉⲓⲉ ⲉⲓⲧⲉ ϫⲉⲕⲁⲥ ϫⲉⲕⲁⲁⲥ ⲉⲃⲟⲗ ⲉϩⲟⲩⲛ ⲉϩⲣⲁⲓ ⲉⲡⲉⲥⲏⲧ ⲁⲛ ⲙⲛ ⲛⲙⲙⲁ ⲛⲉⲙ ⲛⲧⲉ ⲛⲥⲁ ⲛϩⲏⲧ ϩⲛ ϩⲙ ϩⲓ ϩⲁ ϩⲓϫⲛ ϩⲁⲧⲛ ϩⲁⲧⲉ ϩⲓⲧⲛ ⲉϫⲛ ⲉⲣⲟ ⲉⲧⲃⲉ ϣⲁ ⲛⲥⲱ ⲙⲛⲛⲥⲁ ⲁⲧⲉ ⲕⲁⲓ
  ⲡⲉ ⲧⲉ ⲛⲉ ⲡⲉⲓ ⲧⲉⲓ ⲛⲉⲓ ⲡⲁⲓ ⲧⲁⲓ ⲛⲁⲓ ⲡⲉⲧⲉ ⲧⲉⲧⲉ ⲉⲧⲉ ⲉⲧⲁⲓ ⲡⲁ ⲧⲁ ⲛⲁ ⲟⲩ ϩⲉⲛ ⲛⲉⲛ ⲛⲉⲧ ⲡⲉⲧ
  ⲁⲛⲟⲕ ⲛⲧⲟⲕ ⲛⲧⲟ ⲛⲧⲟϥ ⲛⲧⲟⲥ ⲁⲛⲟⲛ ⲛⲧⲱⲧⲛ ⲛⲧⲟⲟⲩ ⲁⲛⲅ ⲛⲧⲕ ⲛⲧⲉⲧⲛ ⲛⲧⲟⲟⲧ
  ⲙⲙⲟⲓ ⲙⲙⲟⲕ ⲙⲙⲟϥ ⲙⲙⲟⲥ ⲙⲙⲟⲛ ⲙⲙⲱⲧⲛ ⲙⲙⲟⲟⲩ ⲉⲣⲟⲓ ⲉⲣⲟⲕ ⲉⲣⲟϥ ⲉⲣⲟⲥ ⲉⲣⲟⲛ ⲉⲣⲱⲧⲛ ⲉⲣⲟⲟⲩ
  ⲛⲁⲓ ⲛⲁⲕ ⲛⲁϥ ⲛⲁⲥ ⲛⲁⲛ ⲛⲏⲧⲛ ⲛⲁⲩ ⲛⲏⲓ ⲛⲁⲣ
  ⲙⲡⲉ ⲙⲡⲉⲧⲛ ⲙⲡⲉⲩ ⲙⲡⲉϥ ⲙⲡⲉⲥ ⲙⲡⲁⲧⲉ ⲙⲡⲣ ⲙⲡⲣⲧ ⲛⲛⲉ ⲙⲁⲣⲉ ⲙⲁⲣⲓ ⲙⲁ ⲁⲩ ⲁϥ ⲁⲥ ⲁⲓ ⲉⲓ ⲉϥ ⲉⲩ ⲉⲥ
  ⲙⲟⲛ ⲟⲩⲛ ⲙⲛⲧ ⲛⲧⲁⲓ`.split(/\s+/).map(foldCoptic),
)

// Conjugation bases, relative markers and the negative: perfect ⲁϥ-, imperfect ⲛⲉϥ-, relative
// ⲉⲧ- / ⲉⲛⲧⲁϥ-, circumstantial ⲉϥ-, "when" ⲛⲧⲉⲣⲉ-, negative perfect ⲙⲡⲉϥ-. First pass.
const CONJUGATION = byLength(
  `ⲉⲛⲧⲁⲧⲉⲧⲛ ⲉⲛⲧⲁⲩ ⲉⲛⲧⲁϥ ⲉⲛⲧⲁⲥ ⲉⲛⲧⲁⲓ ⲉⲛⲧⲁⲛ ⲉⲛⲧⲁ ⲛⲧⲁⲧⲉⲧⲛ ⲛⲧⲉⲣⲉ ⲛⲧⲉⲣ ⲛⲉⲣⲉ ⲉⲧⲉⲣⲉ ⲉⲧⲉⲧⲛ ⲉⲣⲉ ⲉⲣϣⲁⲛ ⲉϥϣⲁⲛ ⲉⲩϣⲁⲛ
  ⲛⲉⲩ ⲛⲉϥ ⲛⲉⲥ ⲛⲉⲓ ⲛⲉⲧⲉⲧⲛ ⲙⲡⲉⲧⲛ ⲙⲡⲉⲩ ⲙⲡⲉϥ ⲙⲡⲉⲥ ⲙⲡⲉⲓ ⲙⲡⲉ ⲙⲛⲧⲉ ⲙⲉⲣⲉ ⲛⲛⲉⲧⲛ ⲛⲛⲉⲩ ⲛⲛⲉϥ ⲛⲛⲉⲥ ⲛⲛⲉ
  ⲁⲧⲉⲧⲛ ⲁⲩ ⲁϥ ⲁⲥ ⲁⲓ ⲉⲧ ⲉϥ ⲉⲩ ⲉⲥ ⲉⲓ ⲧⲉⲧⲛ ⲧⲛ ⲧⲉ ⲥⲉ ⲛⲧⲉⲧⲛ ⲛⲧⲉ ⲛⲧⲕ ⲛⲧⲟ`.split(/\s+/).map(foldCoptic),
)
// Articles, prepositions and the nominalizing ⲡⲉⲧ- "the one who". Second pass.
const ARTICLES = byLength(`ⲡⲉⲧ ⲛⲉⲧ ⲧⲉⲧ ϩⲉⲛ ⲛⲉⲛ ⲡⲉ ⲧⲉ ⲛⲉ ⲟⲩ ϩⲛ ϩⲙ ⲙⲛ ⲙⲙ ⲛⲛ ⲙ ⲛ ⲡ ⲧ ϩ ⲉ ⲉⲧ`.split(/\s+/).map(foldCoptic))
// Pronoun suffixes on verbs, nouns and prepositions (ⲧⲁⲁϥ, ⲣⲁⲧⲟⲩ, ⲛⲁϥ).
const SUFFIXES = byLength(['ⲧⲏⲩⲧⲛ', 'ⲧⲉⲧⲛ', 'ⲧⲛ', 'ϥ', 'ⲥ', 'ⲕ', 'ⲟⲩ', 'ⲛ'].map(foldCoptic))

// Shortest word kept, and shortest stem left. Coptic roots are short (ⲣⲱⲙⲉ, ⲛⲟⲩⲧⲉ, ϣⲁϫⲉ).
const MIN_STEM = 3

function strip(word: string, affixes: readonly string[], atStart: boolean): string {
  for (const a of affixes) {
    if (word.length - a.length < MIN_STEM) continue
    if (atStart ? word.startsWith(a) : word.endsWith(a)) return atStart ? word.slice(a.length) : word.slice(0, -a.length)
  }
  return word
}

export const cop: Lang = {
  code: 'cop',
  name: 'Coptic (Sahidic)',
  // A sentence ends at a full stop, an ano teleia (· U+0387 or U+00B7, which Sahidic editions
  // type for a stop), a Greek question mark (;), !, ?, or a Coptic or Old Nubian full stop
  // (⳹ U+2CF9, ⳾ U+2CFE), followed by a space. No capital is required.
  sentences: (p) => p.split(/(?<=[.;;··!?⳹⳾])\s+/),
  words: (s) => (foldCoptic(s).match(WORD) ?? []).filter((w) => w.length > 1 && !STOP.has(w)),
  // Conjugation base, then article or preposition (twice: ⲛ+ⲟⲩ in ⲛⲟⲩⲣⲱⲙⲉ), then pronoun suffix. A bound group that is all function
  // words has already gone.
  stem: (w) => strip(strip(strip(strip(w, CONJUGATION, true), ARTICLES, true), ARTICLES, true), SUFFIXES, false),
  minKey: MIN_STEM,
  // 3-grams, since a bound group is short and rich in clitics.
  charGrams: 3,
  // bge-m3 scores 0 of 251 links on the Sahidic fixture: it does not read Coptic. With equal votes
  // fused R@1 was 102 against 141 for character overlap alone; leaving out only the embedder gave
  // 125. Word overlap also loses to character 3-grams, since editions cut bound groups differently.
  // So character overlap fuses alone, as in Sanskrit. Chosen on the whole fixture, not a held-out half.
  fusion: { dense: 0, words: 0 },
  embedder: 'bge-m3',
}
