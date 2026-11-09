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
  // The built-in embedder used when this language is on both sides.
  embedder: string
}

// Strips the longest ending in the list, keeping at least minStem letters.
export function stripEnding(word: string, endings: readonly string[], minStem: number): string {
  for (const e of endings) if (word.length - e.length >= minStem && word.endsWith(e)) return word.slice(0, -e.length)
  return word
}

export const byLength = (xs: string[]) => [...new Set(xs)].sort((a, b) => b.length - a.length)
