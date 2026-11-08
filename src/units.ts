// Units are the pieces a text is linked by: a verse, a sentence, a paragraph. Each has a stable ref.
import { readFileSync } from 'node:fs'

export interface Unit {
  ref: string
  text: string
}

export type Split = 'auto' | 'sentence' | 'paragraph' | 'line'

// JSONL ({"ref", "text"} per line) loads as is. Plain text splits into units numbered from 1:
// "auto" means sentences.
export function loadUnits(path: string, split: Split = 'auto'): Unit[] {
  const raw = readFileSync(path, 'utf8')
  if (path.endsWith('.jsonl')) {
    return raw.split('\n').filter((l) => l.trim()).map((l, i) => {
      const o = JSON.parse(l) as { ref?: unknown; id?: unknown; text?: unknown }
      const ref = o.ref ?? o.id
      if (ref === undefined || typeof o.text !== 'string') throw new Error(`${path}:${i + 1}: each line needs "ref" and "text"`)
      return { ref: String(ref), text: o.text }
    })
  }
  return splitText(raw, split).map((text, i) => ({ ref: String(i + 1), text }))
}

export function splitText(raw: string, split: Split = 'auto'): string[] {
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  if (split === 'line') return raw.split('\n').map(flat).filter(Boolean)
  const paras = raw.split(/\n\s*\n/).map(flat).filter(Boolean)
  if (split === 'paragraph') return paras
  // A sentence ends at . ; : ? or ! followed by a space and a capital or an opening quote.
  return paras.flatMap((p) => p.split(/(?<=[.;:?!])\s+(?=[A-Z“"'‘])/)).map(flat).filter((s) => s.split(' ').length >= 3)
}
