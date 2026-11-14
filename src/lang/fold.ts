// Shared pieces of the French, Spanish, Italian and German profiles.

// Lower case without accents: NFD, then every combining mark dropped, so "Été" is "ete".
export const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// A sentence ends at . ; : ? ! or …, perhaps followed by `closers` (closing quotes or brackets,
// which French sets off with a space: "Viens ! »"), then a space and a capital or one of
// `openers`. A mark can't be both: German closes with “ and «, which open in other languages.
export function sentenceSplitter(openers: string, closers = '»”’"\')'): (p: string) => string[] {
  const re = new RegExp(`(?<=[.;:?!…](?:\\s*[${closers}\\]])*)\\s+(?=[\\p{Lu}${openers}])`, 'u')
  return (p) => p.split(re)
}
