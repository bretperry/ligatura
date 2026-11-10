// Sanskrit, in Devanagari or IAST (ISO 15919 spellings such as ṁ and r̥ also fold).
//
// Folding: Devanagari is transliterated to IAST, then IAST is folded to plain a-z by dropping
// diacritics and case. Transliteration has to come first: Devanagari is an abugida (the vowel a
// is implicit, other vowels are signs on the consonant), so no diacritic folding can line it up
// with IAST, while Devanagari to IAST is a lossless table lookup (the reverse is not: IAST "kh"
// may be k + h). Dropping the diacritics then loses ā/a, ś/ṣ/s and the nasals, which costs little
// for matching and merges the nasal and visarga variants that sandhi produces (ṃ/m, ḥ/h).
//
// Sandhi joins and alters words at their edges ("tapaḥ svādhyāya" is often "tapaḥsvādhyāya"),
// and editions space the same verse differently. There is no sandhi splitter here. Instead, the
// character n-gram ranking takes its grams from the whole text with spaces removed (`charText`),
// which match the unchanged middles of words however they are joined. On
// fixtures/shankara-upanisads, ranking by n-grams alone gave R@1 / R@10 of 1,217 links: word
// stems 630 / 882; de-spaced 3-grams 829 / 1,067, 4: 933 / 1,127, 5: 982 / 1,149, 6: 1,004 /
// 1,153, 7: 1,013 / 1,148; per-word 5-grams 833 / 1,077.
import { byLength, stripEnding, type Lang } from './types.js'

const VOWELS: Record<string, string> = { अ: 'a', आ: 'ā', इ: 'i', ई: 'ī', उ: 'u', ऊ: 'ū', ऋ: 'ṛ', ॠ: 'ṝ', ऌ: 'ḷ', ॡ: 'ḹ', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऎ: 'e', ऒ: 'o' }
const SIGNS: Record<string, string> = { 'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'ॣ': 'ḹ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॆ': 'e', 'ॊ': 'o' }
const CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ṅ', च: 'c', छ: 'ch', ज: 'j', झ: 'jh', ञ: 'ñ',
  ट: 'ṭ', ठ: 'ṭh', ड: 'ḍ', ढ: 'ḍh', ण: 'ṇ', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', ळ: 'ḷ', व: 'v',
  श: 'ś', ष: 'ṣ', स: 's', ह: 'h',
}
// Anusvāra, visarga, candrabindu, avagraha (an elided a, dropped), om, daṇḍas.
const OTHER: Record<string, string> = { 'ं': 'ṃ', 'ः': 'ḥ', 'ँ': 'ṃ', 'ऽ': '', ॐ: 'oṃ', '।': '|', '॥': '||', 'ॱ': '' }
const VIRAMA = '्'
const NUKTA = '़'

// Devanagari to IAST. Characters outside Devanagari pass through, so mixed text is fine.
export function devanagariToIast(text: string): string {
  // Composed nukta letters (क़ U+0958 ...) decompose to letter + nukta under NFD.
  const s = text.normalize('NFD').replace(/[॑-॔᳐-᳿]/g, '') // Vedic accents
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const c = CONSONANTS[ch]
    if (c) {
      out += c
      if (s[i + 1] === NUKTA) i++
      const next = s[i + 1]
      if (next === VIRAMA) i++
      else if (SIGNS[next]) { out += SIGNS[next]; i++ }
      else out += 'a'
    } else if (VOWELS[ch]) out += VOWELS[ch]
    else if (SIGNS[ch]) out += SIGNS[ch] // a stray sign
    else if (ch in OTHER) out += OTHER[ch]
    else if (ch >= '०' && ch <= '९') out += String(ch.charCodeAt(0) - 0x966)
    else if (ch === NUKTA || ch === VIRAMA) continue
    else out += ch
  }
  return out.normalize('NFC')
}

// Devanagari or IAST to lower-case a-z (plus anything that isn't Sanskrit, untouched).
export function foldSanskrit(s: string): string {
  return devanagariToIast(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// Daṇḍas in either script: । ॥ in Devanagari, | || or / // in IAST (GRETIL uses the slashes).
const VERSE_NUMBER = /(॥|।|\|\||\/\/)\s*[\p{L}_]*[0-9०-९][0-9०-९.,:;_\-\p{L}]*\s*(?:॥|।|\|\||\/\/)/gu

// Removes verse numbers between daṇḍas ("॥ १.२ ॥", "|| 2 ||", "// BhG_2.19 //"), keeping one daṇḍa.
export const stripVerseNumbers = (s: string) => s.replace(VERSE_NUMBER, '$1').replace(/\s+/g, ' ').trim()

// Particles, pronouns and the commonest forms of "be" and "say", folded, with their common sandhi forms.
const STOP = new Set(
  `ca va eva api hi tu iti ity na ced cet nu khalu kila vai sma ha iva yatha tatha tada yada atha
  athava tatra yatra tatah yatah iha punah punar caiva capi naiva napi tathaiva yathaiva
  sah sa so tat tad tam tena tasya tasmai tasmat tasmin te tau tan taih tesam tesu ta tam tah tabhih tasam
  esah esa eso etat etad etam etena etasya ete etan ayam iyam idam asya asmin imam imau ime anena
  yah ya yo yat yad yam yena yasya yasmin ye yan yaih yesam yasmat
  kah ka ko kim kena kasya ke kecit kascit kincit kimcit kim
  aham mam ma maya mama me mayi vayam asman asmakam nah tvam tvam tvaya tava tvayi yuyam yusmakam vah
  asti santi asi asmi asit abhavat bhavati bhavanti syat syuh
  uvaca abravit aha ahuh ucuh vacah vadati`.split(/\s+/),
)

// Nominal endings (vowel stems, then -an and -in stems), then verbal ones, folded and longest first.
const ENDINGS = byLength([
  'ah', 'am', 'ena', 'aya', 'at', 'asya', 'e', 'au', 'ani', 'aih', 'ebhyah', 'anam', 'esu', 'ah', 'a', 'aya', 'ayah', 'ayam', 'asu', 'abhih', 'abhyah', 'ayai', 'ayah',
  'ih', 'im', 'ina', 'aye', 'eh', 'inam', 'isu', 'ibhih', 'ibhyah', 'i', 'iya', 'iyah', 'ini', 'inah', 'inam',
  'uh', 'um', 'una', 've', 'oh', 'unam', 'usu', 'ubhih', 'u',
  'o', 'h', 'm', 'ad', 'an', 'na', 'nah', 'ne', 'nam', 'nau',
  'ati', 'anti', 'asi', 'ami', 'amah', 'ate', 'ante', 'ase', 'ita', 'tum', 'tva', 'tvam', 'ya', 'itva', 'itum', 'tah', 'tam', 'tani', 'ta',
])

export const sa: Lang = {
  code: 'sa',
  name: 'Sanskrit',
  // A sentence (in verse, a half-verse) ends at a daṇḍa in either script. Verse numbers go first.
  sentences: (p) => stripVerseNumbers(p).split(/(?<=[।॥|]|\/\/?)\s+/),
  words: (s) => (foldSanskrit(stripVerseNumbers(s)).match(/[a-z]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)),
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  charGrams: 6,
  charText: (s) => foldSanskrit(stripVerseNumbers(s)).replace(/[^a-z]/g, ''),
  // Only character overlap votes in Sanskrit-to-Sanskrit fusion. On shankara-upanisads any vote
  // for bge-m3 or the stems lowered R@1, on the half the weights were chosen on (adhyāyas 1-2)
  // and on the other; equal votes lost 122 links at R@10 to character overlap alone.
  fusion: { dense: 0, words: 0 },
  embedder: 'bge-m3',
}
