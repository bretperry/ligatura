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

// Ranks from scores: 1 is best. Ties keep input order.
export function ranks(scores: Float32Array): Int32Array {
  const order = [...scores.keys()].sort((a, b) => scores[b] - scores[a])
  const r = new Int32Array(scores.length)
  order.forEach((j, i) => { r[j] = i + 1 })
  return r
}

export const RRF_K = 60

// Reciprocal rank fusion: each list adds 1 / (60 + rank).
export function fuse(...lists: Float32Array[]): Float32Array {
  const rs = lists.map(ranks)
  return Float32Array.from(rs[0], (_, j) => rs.reduce((s, r) => s + 1 / (RRF_K + r[j]), 0))
}

export const topK = (scores: Float32Array, k: number) => [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, k)
