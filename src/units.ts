// Units are the pieces a text is linked by: a verse, a sentence, a paragraph. Each has a stable ref.
import { readFileSync } from 'node:fs'
import { getLang, type Lang } from './lang/index.js'

export interface Unit {
  ref: string
  text: string
}

export type Split = 'auto' | 'sentence' | 'paragraph' | 'line'

// JSONL ({"ref", "text"} per line) loads as is. Plain text splits into units numbered from 1:
// "auto" means sentences.
export function loadUnits(path: string, split: Split = 'auto', minWords = 1, lang: Lang = getLang('en')): Unit[] {
  const raw = readFileSync(path, 'utf8')
  if (!path.endsWith('.jsonl')) return splitText(raw, split, minWords, lang).map((text, i) => ({ ref: String(i + 1), text }))
  const units: Unit[] = []
  const lineOf = new Map<string, number>()
  raw.split('\n').forEach((l, i) => {
    if (!l.trim()) return
    let o: { ref?: unknown; id?: unknown; text?: unknown }
    try { o = JSON.parse(l) } catch { throw new Error(`${path}:${i + 1}: not valid JSON`) }
    const ref = o?.ref ?? o?.id
    if ((typeof ref !== 'string' && typeof ref !== 'number') || typeof o.text !== 'string') throw new Error(`${path}:${i + 1}: each line needs "ref" and "text"`)
    const r = String(ref)
    if (lineOf.has(r)) throw new Error(`${path}:${i + 1}: ref "${r}" already used on line ${lineOf.get(r)}; refs must be unique`)
    lineOf.set(r, i + 1)
    units.push({ ref: r, text: o.text })
  })
  return units
}

// minWords drops units shorter than that many words (default 1: keep every nonempty unit).
// Sentences split by the language's rules (lang defaults to English).
export function splitText(raw: string, split: Split = 'auto', minWords = 1, lang: Lang = getLang('en')): string[] {
  const long = (s: string) => s.split(' ').length >= minWords
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  if (split === 'line') return raw.split('\n').map(flat).filter(Boolean).filter(long)
  const paras = raw.split(/\n\s*\n/).map(flat).filter(Boolean)
  if (split === 'paragraph') return paras.filter(long)
  return paras.flatMap((p) => lang.sentences(p)).map(flat).filter(Boolean).filter(long)
}
