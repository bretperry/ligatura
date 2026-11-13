import { en } from './en.js'
import { grc } from './grc.js'
import { la } from './la.js'
import { sa } from './sa.js'
import type { Lang } from './types.js'
// Modern languages: French, Spanish, Italian, German, Arabic.
import { fr, foldFrench } from './fr.js'
import { es, foldSpanish } from './es.js'
import { it, foldItalian } from './it.js'
import { de, foldGerman } from './de.js'
import { ar, foldArabic, splitClitics } from './ar.js'
import { lzh, foldClassicalChinese } from './lzh.js'

export type { Lang } from './types.js'
export { en, la, grc, sa }
export { foldLatin } from './la.js'
export { foldGreek } from './grc.js'
export { foldSanskrit, devanagariToIast } from './sa.js'

export const LANGS: Record<string, Lang> = { en, la, grc, sa }
// Modern languages, kept in their own block.
Object.assign(LANGS, { fr, es, it, de, ar })
LANGS.lzh = lzh
export { lzh, foldClassicalChinese }
export { fr, es, it, de, ar, foldFrench, foldSpanish, foldItalian, foldGerman, foldArabic, splitClitics }
export const DEFAULT_LANG = 'en'

// The built-in embedder for cross-lingual runs (any two different languages).
export const MULTILINGUAL_EMBEDDER = 'bge-m3'

export function getLang(code: string | undefined): Lang {
  const l = LANGS[code ?? DEFAULT_LANG]
  if (!l) throw new Error(`unknown language "${code}"; known: ${Object.keys(LANGS).join(', ')}`)
  return l
}

// The default embedder: the language's own when both sides share it, else the multilingual one.
export const defaultEmbedder = (source: Lang, target: Lang) => (source === target ? source.embedder : MULTILINGUAL_EMBEDDER)
