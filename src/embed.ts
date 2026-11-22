// Embedding backends. Local models run in process (transformers.js, ONNX); `openai:` calls any
// OpenAI-compatible /v1/embeddings server (Ollama, LM Studio, llama.cpp, vLLM).
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { availableParallelism } from 'node:os'
import { createRequire } from 'node:module'
import { cacheDir, log, postJson } from './util.js'

// The runtime decides q8 vectors as much as the model file does: transformers.js 4 (newer
// onnxruntime) moved them about 0.02 in cosine. Keying the cache on it keeps old vectors out.
const RUNTIME = (() => {
  try {
    // The package's exports hide package.json, so walk up from its entry point.
    let dir = dirname(createRequire(import.meta.url).resolve('@huggingface/transformers'))
    for (let i = 0; i < 5; i++, dir = dirname(dir)) {
      const p = join(dir, 'package.json')
      if (existsSync(p)) { const j = JSON.parse(readFileSync(p, 'utf8')); if (j.name === '@huggingface/transformers') return j.version as string }
    }
  } catch {}
  return 'unknown'
})()

export interface Embedder {
  name: string
  // Everything that changes the vectors: model, revision, prefixes, pooling, precision, server.
  fingerprint: string
  // false for a server whose model can change under the same name; its vectors aren't cached.
  cacheable: boolean
  embed(texts: string[], role: 'query' | 'doc'): Promise<Float32Array[]>
}

interface LocalModel {
  id: string
  revision: string
  pooling: 'cls' | 'mean' | 'last_token'
  query?: string
  doc?: string
  dtype?: 'q8' | 'q4' | 'fp32' // default q8
  // A model built locally, read from <cache>/onnx/<id> and never downloaded.
  local?: boolean
}

// Query and document prefixes follow each model card. The revision is part of the cache key;
// a commit hash there pins the model, 'main' follows the Hugging Face repo.
export const LOCAL_EMBEDDERS: Record<string, LocalModel> = {
  'nomic-embed-text-v1.5': { id: 'nomic-ai/nomic-embed-text-v1.5', revision: 'main', pooling: 'mean', query: 'search_query: ', doc: 'search_document: ' },
  'bge-small-en-v1.5': { id: 'Xenova/bge-small-en-v1.5', revision: 'main', pooling: 'cls' },
  'bge-large-en-v1.5': { id: 'Xenova/bge-large-en-v1.5', revision: 'main', pooling: 'cls', query: 'Represent this sentence for searching relevant passages: ' },
  // Multilingual (MIT): the default for Latin and Greek, and for any run across two languages.
  // ONNX export of BAAI/bge-m3, pinned to the commit measured in the README.
  'bge-m3': { id: 'Xenova/bge-m3', revision: '4de13258303883538bd53b696b452bf8099f0858', pooling: 'cls' },
  // Others measured against English in lab/multilingual-probe.mjs and lab/yardstick.mjs, pinned to
  // the commits current on 2026-11-15.
  'snowflake-arctic-embed-l-v2.0': { id: 'Snowflake/snowflake-arctic-embed-l-v2.0', revision: 'ac6544c8a46e00af67e330e85a9028c66b8cfd9a', pooling: 'cls', query: 'query: ' },
  'multilingual-e5-large': { id: 'Xenova/multilingual-e5-large', revision: '00fc3aeb3dbb95842de2ac1961d33c6319acf57b', pooling: 'mean', query: 'query: ', doc: 'passage: ' },
  'multilingual-e5-small': { id: 'Xenova/multilingual-e5-small', revision: '761b726dd34fb83930e26aab4e9ac3899aa1fa78', pooling: 'mean', query: 'query: ', doc: 'passage: ' },
  // q8 hurts this one badly; fp32 is slow (hours for a book).
  'qwen3-embedding-0.6b': {
    id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX', revision: 'c25a394dd583836952667c12f008335071b3f43d', pooling: 'last_token', dtype: 'fp32',
    query: 'Instruct: Given a passage, retrieve the passage in another text, in any language, that it quotes, translates or alludes to\nQuery: ',
  },
  // bge-m3 tuned on English against Latin, Greek and Sanskrit (lab/finetune.py); built locally, not published.
  'bge-m3-classics': { id: 'bge-m3-classics', revision: 'local', pooling: 'cls', local: true },
}
// English against English: two embedders fused (see "a+b" in link.ts and the README results).
export const DEFAULT_EMBEDDER = 'nomic-embed-text-v1.5+bge-m3'
const LOCAL_DTYPE = 'q8'

// "a+b" names several embedders to fuse. A "+" inside an openai: spec (a URL or a model name)
// stays part of it: a new part starts only at "openai:" or at a local model's name.
export function splitEmbedSpec(spec: string): string[] {
  const parts: string[] = []
  for (const p of spec.split('+')) {
    if (parts.length && !p.startsWith('openai:') && !(p in LOCAL_EMBEDDERS) && parts[parts.length - 1].startsWith('openai:')) parts[parts.length - 1] += `+${p}`
    else parts.push(p)
  }
  if (parts.some((p) => !p)) throw new Error(`--embed "${spec}" has an empty name; join embedders as a+b`)
  const dup = parts.find((p, i) => parts.indexOf(p) !== i)
  if (dup) throw new Error(`--embed "${spec}" names ${dup} twice; fusing an embedder with itself only doubles its weight`)
  return parts
}

export function makeEmbedder(spec: string): Embedder {
  const inner = spec.startsWith('openai:') ? openaiEmbedder(spec) : localEmbedder(spec)
  return { ...inner, embed: (texts, role) => cached(inner, texts, role) }
}

const CACHE_VERSION = 2

// Vectors are cached by everything that shapes them, so a rerun embeds nothing and a changed
// model or prefix never reuses old vectors. LIGATURA_NO_CACHE=1 turns the cache off.
async function cached(e: Embedder, texts: string[], role: 'query' | 'doc'): Promise<Float32Array[]> {
  if (!e.cacheable || process.env.LIGATURA_NO_CACHE) return checked(await e.embed(texts, role), texts.length, e.name)
  const key = createHash('sha256').update(JSON.stringify({ v: CACHE_VERSION, fp: e.fingerprint, role, texts })).digest('hex')
  const dir = join(cacheDir(), 'vectors')
  // Binary: two uint32 (count, dimension), then the floats. JSON from older versions is still read;
  // it can't hold a large text (36k vectors of 1024 overflow a string), so new files are binary.
  const file = join(dir, `${key}.bin`)
  const legacy = join(dir, `${key}.json`)
  if (existsSync(file)) {
    try {
      const buf = readFileSync(file)
      const n = buf.readUInt32LE(0), dim = buf.readUInt32LE(4)
      if (buf.length !== 8 + 4 * n * dim) throw new Error('size')
      const all = new Float32Array(buf.buffer.slice(buf.byteOffset + 8, buf.byteOffset + buf.length))
      return checked(Array.from({ length: n }, (_, i) => all.slice(i * dim, (i + 1) * dim)), texts.length, e.name)
    } catch {
      log(`cache: ${file} is unreadable; embedding again`)
    }
  } else if (existsSync(legacy)) {
    try {
      return checked((JSON.parse(readFileSync(legacy, 'utf8')) as number[][]).map((v) => Float32Array.from(v)), texts.length, e.name)
    } catch {
      log(`cache: ${legacy} is unreadable; embedding again`)
    }
  }
  const out = checked(await e.embed(texts, role), texts.length, e.name)
  // Private directory and file; write to a temporary name, then rename, so a crash or a parallel
  // run never leaves half a file under the real name.
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  try { chmodSync(dir, 0o700) } catch {}
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  try {
    const dim = out[0]?.length ?? 0
    const buf = Buffer.alloc(8 + 4 * out.length * dim)
    buf.writeUInt32LE(out.length, 0)
    buf.writeUInt32LE(dim, 4)
    out.forEach((v, i) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).copy(buf, 8 + 4 * i * dim))
    writeFileSync(tmp, buf, { mode: 0o600 })
    renameSync(tmp, file)
  } catch (err) {
    try { unlinkSync(tmp) } catch {}
    log(`cache: could not write ${file}: ${(err as Error).message}`)
  }
  return out
}

// One finite vector per text, all the same length.
function checked(vs: Float32Array[], n: number, name: string): Float32Array[] {
  if (!Array.isArray(vs) || vs.length !== n) throw new Error(`${name}: expected ${n} vectors, got ${vs?.length}`)
  const dim = vs[0]?.length
  for (const v of vs) {
    if (!dim || v.length !== dim) throw new Error(`${name}: vectors differ in length (${dim} and ${v.length})`)
    for (const x of v) if (!Number.isFinite(x)) throw new Error(`${name}: a vector holds a non-finite value`)
  }
  return vs
}

function localEmbedder(name: string): Embedder {
  const cfg = LOCAL_EMBEDDERS[name]
  if (!cfg) throw new Error(`unknown embedder "${name}"; local models: ${Object.keys(LOCAL_EMBEDDERS).join(', ')}; or openai:<base-url>#<model>`)
  let pipe: (((t: string[], o: object) => Promise<{ tolist(): number[][] }>) & { tokenizer?: { padding_side?: string } }) | undefined
  return {
    name,
    // A locally built model has no revision to pin, so its files' sizes and times stand in for one:
    // rebuilding it never reuses the old model's vectors.
    fingerprint: JSON.stringify({ kind: 'local', ...cfg, dtype: cfg.dtype ?? LOCAL_DTYPE, runtime: RUNTIME, ...(cfg.local ? { files: filesStamp(join(cacheDir(), 'onnx', cfg.id)) } : {}) }),
    cacheable: true,
    async embed(texts, role) {
      if (!pipe) {
        const { pipeline, env } = await import('@huggingface/transformers')
        const localDir = join(cacheDir(), 'onnx')
        if (cfg.local && !existsSync(join(localDir, cfg.id))) throw new Error(`embedder "${name}" is built locally; expected it at ${join(localDir, cfg.id)}`)
        // ONNX Runtime's default left most cores idle (about one in use on an M3).
        const session_options = { intraOpNumThreads: Math.max(1, availableParallelism() - 1) }
        // localModelPath is global to transformers.js: set it only for this load, so a later
        // download of another model never picks up a local build of the same id.
        const prev = env.localModelPath
        if (cfg.local) env.localModelPath = `${localDir}/`
        try {
          pipe = (await pipeline('feature-extraction', cfg.id, { dtype: cfg.dtype ?? LOCAL_DTYPE, session_options, ...(cfg.local ? { local_files_only: true } : { revision: cfg.revision }) })) as unknown as typeof pipe
        } finally {
          env.localModelPath = prev
        }
      }
      const prefix = cfg[role] ?? ''
      // Batches stay in input order: q8 quantizes each batch as a whole, so regrouping texts
      // (say, by length) changes their vectors.
      // Last-token pooling reads the last position, padding or not: a batch is safe only when the
      // tokenizer pads on the left. Otherwise every text but the longest would pool a pad token.
      const batch = cfg.pooling === 'last_token' && pipe!.tokenizer?.padding_side !== 'left' ? 1 : 32
      const out: Float32Array[] = []
      const started = Date.now()
      for (let i = 0; i < texts.length; i += batch) {
        const t = await pipe!(texts.slice(i, i + batch).map((x) => prefix + x), { pooling: cfg.pooling, normalize: true })
        out.push(...t.tolist().map((v) => Float32Array.from(v)))
        const done = Math.min(i + batch, texts.length)
        const msg = `embed ${name} ${role}: ${done}/${texts.length}`
        if (process.stderr.isTTY) log(msg, true)
        else if (done % 2048 < batch || done === texts.length) log(`${msg} (${Math.round((Date.now() - started) / 1000)} s)`)
      }
      return out
    },
  }
}

// Every file under dir with its size and modification time, hashed; '' when dir is missing.
function filesStamp(dir: string): string {
  if (!existsSync(dir)) return ''
  const h = createHash('sha256')
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else { const st = statSync(p); h.update(`${p.slice(dir.length)}\0${st.size}\0${st.mtimeMs}\n`) }
    }
  }
  walk(dir)
  return h.digest('hex').slice(0, 16)
}

// openai:http://localhost:11434/v1#nomic-embed-text sends {model, input} to <base>/embeddings.
// A server can swap the model behind a name, so these vectors aren't cached.
function openaiEmbedder(spec: string): Embedder {
  const [base, model] = spec.slice('openai:'.length).split('#')
  if (!base || !model) throw new Error('openai embedder needs openai:<base-url>#<model>')
  const url = `${base.replace(/\/$/, '')}/embeddings`
  return {
    name: spec,
    fingerprint: JSON.stringify({ kind: 'openai', url, model }),
    cacheable: false,
    async embed(texts) {
      const out: Float32Array[] = []
      for (let i = 0; i < texts.length; i += 64) {
        const batch = texts.slice(i, i + 64)
        const body = (await postJson(url, auth('embed', url), { model, input: batch })) as { data?: { index?: unknown; embedding?: unknown }[] }
        const got = new Array<Float32Array | undefined>(batch.length)
        for (const d of Array.isArray(body.data) ? body.data : []) {
          const k = d.index
          if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= batch.length || got[k] || !Array.isArray(d.embedding)) {
            throw new Error(`${url}: malformed or duplicate embedding at index ${String(k)}`)
          }
          got[k] = normalize(Float32Array.from(d.embedding as number[]))
        }
        const lost = got.findIndex((v) => !v)
        if (lost >= 0 || got.length !== batch.length) throw new Error(`${url}: no embedding for input ${i + Math.max(lost, 0)}`)
        out.push(...(got as Float32Array[]))
        log(`embed ${model}: ${Math.min(i + 64, texts.length)}/${texts.length}`, true)
      }
      return out
    },
  }
}

// Keys. LIGATURA_EMBED_API_KEY and LIGATURA_RERANK_API_KEY go only to their own backend.
// LIGATURA_API_KEY is a shared fallback, sent to one server only: if the embedder and the
// reranker are different servers, each needs its own key. A key never goes over plain http
// except to this machine.
const sharedKeyOrigin: { origin?: string } = {}
export function auth(kind: 'embed' | 'rerank', url: string): Record<string, string> {
  const own = process.env[kind === 'embed' ? 'LIGATURA_EMBED_API_KEY' : 'LIGATURA_RERANK_API_KEY']
  const key = own || process.env.LIGATURA_API_KEY
  if (!key) return {}
  const u = new URL(url)
  const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname)
  if (u.protocol !== 'https:' && !local) throw new Error(`refusing to send an API key over ${u.protocol} to ${u.host}; use https`)
  if (!own) {
    if (sharedKeyOrigin.origin && sharedKeyOrigin.origin !== u.origin) {
      throw new Error(`LIGATURA_API_KEY would go to both ${sharedKeyOrigin.origin} and ${u.origin}; set LIGATURA_EMBED_API_KEY and LIGATURA_RERANK_API_KEY instead`)
    }
    sharedKeyOrigin.origin = u.origin
  }
  return { authorization: `Bearer ${key}` }
}

function normalize(v: Float32Array): Float32Array {
  let s = 0
  for (const x of v) s += x * x
  const n = Math.sqrt(s) || 1
  return v.map((x) => x / n)
}
