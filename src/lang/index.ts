import { en } from './en.js'
import { grc } from './grc.js'
import { la } from './la.js'
import type { Lang } from './types.js'

export type { Lang } from './types.js'
export { en, la, grc }
export { foldLatin } from './la.js'
export { foldGreek } from './grc.js'

export const LANGS: Record<string, Lang> = { en, la, grc }
export const DEFAULT_LANG = 'en'

// The built-in embedder for cross-lingual runs (English with Latin or Greek, Latin with Greek).
export const MULTILINGUAL_EMBEDDER = 'bge-m3'

export function getLang(code: string | undefined): Lang {
  const l = LANGS[code ?? DEFAULT_LANG]
  if (!l) throw new Error(`unknown language "${code}"; known: ${Object.keys(LANGS).join(', ')}`)
  return l
}

// The default embedder: the language's own when both sides share it, else the multilingual one.
export const defaultEmbedder = (source: Lang, target: Lang) => (source === target ? source.embedder : MULTILINGUAL_EMBEDDER)
