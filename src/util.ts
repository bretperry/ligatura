import { homedir } from 'node:os'
import { join } from 'node:path'

export const cacheDir = () => process.env.LIGATURA_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'ligatura')

let quiet = false
export const setQuiet = (q: boolean) => { quiet = q }

// Progress goes to stderr so stdout stays clean JSONL. Progress lines overwrite each other on a TTY.
export function log(msg: string, progress = false) {
  if (quiet) return
  if (progress && process.stderr.isTTY) process.stderr.write(`\r\x1b[K${msg}`)
  else if (!progress) process.stderr.write(`${process.stderr.isTTY ? '\r\x1b[K' : ''}${msg}\n`)
}

export const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

// Ranks from scores: 1 is best. Tied scores share the best rank they cover ("1, 2, 2, 4"), so
// file order never breaks a tie: thousands of zero-overlap targets all rank equal, not 1..n.
export function ranks(scores: Float32Array): Int32Array {
  const order = [...scores.keys()].sort((a, b) => scores[b] - scores[a])
  const r = new Int32Array(scores.length)
  order.forEach((j, i) => { r[j] = i > 0 && scores[j] === scores[order[i - 1]] ? r[order[i - 1]] : i + 1 })
  return r
}

// A whole number at least min, or an error naming the option.
export function checkInt(name: string, v: number | undefined, min: number): number | undefined {
  if (v === undefined) return undefined
  if (!Number.isInteger(v) || v < min) throw new Error(`${name} must be a whole number of at least ${min}, got ${v}`)
  return v
}

// Refs must be unique: a link names its passages by ref.
export function checkUnique(what: string, refs: string[]) {
  const seen = new Set<string>()
  for (const r of refs) {
    if (seen.has(r)) throw new Error(`${what}: ref "${r}" appears more than once; refs must be unique`)
    seen.add(r)
  }
}

export const RRF_K = 60

// Reciprocal rank fusion: each list adds weight / (60 + rank), weight 1 unless given. A list where
// every score is equal says nothing, so it is left out; so is a list with weight 0.
export function fuse(...lists: Float32Array[]): Float32Array {
  return fuseWeighted(lists.map((l) => [l, 1]))
}

export function fuseWeighted(lists: [Float32Array, number][]): Float32Array {
  const informative = lists.filter(([l, w]) => w > 0 && l.some((x) => x !== l[0]))
  if (!informative.length) return new Float32Array(lists[0]?.[0].length ?? 0)
  const rs = informative.map(([l, w]) => [ranks(l), w] as const)
  return Float32Array.from(rs[0][0], (_, j) => rs.reduce((s, [r, w]) => s + w / (RRF_K + r[j]), 0))
}

export const topK = (scores: Float32Array, k: number) => [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, k)
