// Cheap, rule-based normalizers for the yardstick (lab/yardstick.mjs).
//   devanagariToIast('रामः')  -> 'rāmaḥ'
//   foldLatin('Cælum vivus')  -> 'caelum uiuus'

const VOWELS = { अ: 'a', आ: 'ā', इ: 'i', ई: 'ī', उ: 'u', ऊ: 'ū', ऋ: 'ṛ', ॠ: 'ṝ', ऌ: 'ḷ', ॡ: 'ḹ', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au' }
const MATRAS = { 'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'ॣ': 'ḹ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au' }
const CONSONANTS = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ṅ', च: 'c', छ: 'ch', ज: 'j', झ: 'jh', ञ: 'ñ',
  ट: 'ṭ', ठ: 'ṭh', ड: 'ḍ', ढ: 'ḍh', ण: 'ṇ', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', ळ: 'ḷ', व: 'v',
  श: 'ś', ष: 'ṣ', स: 's', ह: 'h',
}
const OTHER = { 'ं': 'ṃ', 'ः': 'ḥ', 'ँ': 'm̐', 'ऽ': "'", '।': '|', '॥': '||', ॐ: 'oṃ', '़': '' }
const VIRAMA = '्'

export function devanagariToIast(text) {
  const s = text.normalize('NFC')
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch]
      let next = s[i + 1]
      if (next === '़') next = s[++i + 1] // nukta: ignore
      if (next === VIRAMA) i++
      else if (MATRAS[next]) { out += MATRAS[next]; i++ }
      else out += 'a'
    } else if (VOWELS[ch]) out += VOWELS[ch]
    else if (ch in OTHER) out += OTHER[ch]
    else if (ch >= '०' && ch <= '९') out += String(ch.charCodeAt(0) - 0x966)
    else out += ch
  }
  return out
}

// u/v -> u, j -> i, æ -> ae, œ -> oe, strip macrons/breves, lower case.
export function foldLatin(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
    .replace(/Æ/g, 'Ae').replace(/æ/g, 'ae').replace(/Œ/g, 'Oe').replace(/œ/g, 'oe')
    .toLowerCase().replace(/v/g, 'u').replace(/j/g, 'i')
}
