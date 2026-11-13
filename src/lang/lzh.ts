// Classical (Literary) Chinese, in traditional or simplified characters.
//
// There are no spaces between words, and a classical "word" is mostly one or two characters, so
// there is no word list to segment with. The profile treats each Han character as a word (so
// word overlap is character-unigram tf-idf) and scores character bigrams of the whole text as the
// third ranking (`charText`, `charGrams: 2`), which is what carries quotation of phrases.
//
// Folding: traditional and variant characters fold to one simplified form (lzh-chars.ts), so
// 說/説/说 and 為/爲/为 match. Punctuation, Latin text, digits and whitespace are dropped, which
// also lets a text with 。，、 and one without line up. Grammatical particles (之乎者也矣焉哉兮
// 而于其以 and the like) are dropped from word overlap; the bigrams keep them, since in a
// quotation they are part of the phrase. Kangxi radicals and compatibility ideographs go through
// NFKC first (⾔ becomes 言).
//
// The sentence rule splits at 。！？ and ；, plus the closing quote or bracket that follows.
import type { Lang } from './types.js'
import { foldChar } from './lzh-chars.js'

// A Han character: unified ideographs, extension A, and extensions B-F by surrogate pair.
const HAN = /[㐀-䶿一-鿿豈-﫿]|[\u{20000}-\u{2FA1F}]/gu

// Folds to simplified characters; keeps only Han characters, in order, as one string.
export function foldClassicalChinese(s: string): string {
  return (s.normalize('NFKC').match(HAN) ?? []).map(foldChar).join('')
}

// Particles, pronouns and the commonest function words, in folded form.
const STOP = new Set([...'之乎者也矣焉哉兮耳而于其以与则曰云乃若夫且亦所为是此彼我吾予余汝尔女'])

export const lzh: Lang = {
  code: 'lzh',
  name: 'Classical Chinese',
  // 。！？ and ； end a sentence, with any closers (」』”’）) after; 、，：are inside sentences.
  sentences: (p) => p.split(/(?<=[。！？；!?;][」』”’）)"']*)(?![」』”’）)"'])\s*/u).filter((x) => x.trim()),
  words: (s) => [...foldClassicalChinese(s)].filter((c) => !STOP.has(c)),
  // A character is its own stem.
  stem: (w) => w,
  minKey: 1,
  charGrams: 2,
  charText: foldClassicalChinese,
  embedder: 'bge-m3',
}
