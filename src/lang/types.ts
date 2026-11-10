// A language profile: everything in ligatura that depends on the language of a text.
export interface Lang {
  code: string
  name: string
  // Splits one paragraph (whitespace already collapsed) into sentences.
  sentences(paragraph: string): string[]
  // Content words, normalized (case, diacritics, spelling variants) and without stop words.
  words(text: string): string[]
  // Folds inflected forms of a normalized word to a shared key.
  stem(word: string): string
  // Shortest stem kept for overlap scoring; shorter ones are dropped as noise.
  minKey: number
  // n for a third ranking by shared character n-grams inside words, which matches inflected and
  // respelled forms the stems miss. Off when absent (English).
  charGrams?: number
  // Optional: the one string to take character n-grams from, instead of each word. Sanskrit
  // returns its folded text with spaces removed, since sandhi joins words and editions space
  // the same verse differently.
  charText?(text: string): string
  // Optional: each list's vote in reciprocal rank fusion when both texts are in this language;
  // 0 leaves a list out. Unset lists vote 1, so a profile without it fuses with equal votes.
  fusion?: { dense?: number; words?: number; chars?: number }
  // The built-in embedder used when this language is on both sides.
  embedder: string
}

// Strips the longest ending in the list, keeping at least minStem letters.
export function stripEnding(word: string, endings: readonly string[], minStem: number): string {
  for (const e of endings) if (word.length - e.length >= minStem && word.endsWith(e)) return word.slice(0, -e.length)
  return word
}

export const byLength = (xs: string[]) => [...new Set(xs)].sort((a, b) => b.length - a.length)
