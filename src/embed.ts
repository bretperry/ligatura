// Embedding backends. Local models run in process (transformers.js, ONNX); `openai:` calls any
// OpenAI-compatible /v1/embeddings server (Ollama, LM Studio, llama.cpp, vLLM).
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { availableParallelism } from 'node:os'
import { cacheDir, log } from './util.js'

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
}
export const DEFAULT_EMBEDDER = 'nomic-embed-text-v1.5'
const LOCAL_DTYPE = 'q8'

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
  const file = join(dir, `${key}.json`)
  if (existsSync(file)) {
    try {
      return checked((JSON.parse(readFileSync(file, 'utf8')) as number[][]).map((v) => Float32Array.from(v)), texts.length, e.name)
    } catch {
      log(`cache: ${file} is unreadable; embedding again`)
    }
  }
  const out = checked(await e.embed(texts, role), texts.length, e.name)
  // Private directory and file; write to a temporary name, then rename, so a crash or a parallel
  // run never leaves half a file under the real name.
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  try { chmodSync(dir, 0o700) } catch {}
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  try {
    writeFileSync(tmp, JSON.stringify(out.map((v) => Array.from(v))), { mode: 0o600 })
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
  let pipe: ((t: string[], o: object) => Promise<{ tolist(): number[][] }>) | undefined
  return {
    name,
    fingerprint: JSON.stringify({ kind: 'local', ...cfg, dtype: LOCAL_DTYPE }),
    cacheable: true,
    async embed(texts, role) {
      if (!pipe) {
        const { pipeline } = await import('@huggingface/transformers')
        // ONNX Runtime's default left most cores idle (about one in use on an M3).
        const session_options = { intraOpNumThreads: Math.max(1, availableParallelism() - 1) }
        pipe = (await pipeline('feature-extraction', cfg.id, { dtype: LOCAL_DTYPE, revision: cfg.revision, session_options })) as unknown as typeof pipe
      }
      const prefix = cfg[role] ?? ''
      // Batches stay in input order: q8 quantizes each batch as a whole, so regrouping texts
      // (say, by length) changes their vectors.
      const out: Float32Array[] = []
      const started = Date.now()
      for (let i = 0; i < texts.length; i += 32) {
        const t = await pipe!(texts.slice(i, i + 32).map((x) => prefix + x), { pooling: cfg.pooling, normalize: true })
        out.push(...t.tolist().map((v) => Float32Array.from(v)))
        const done = Math.min(i + 32, texts.length)
        const msg = `embed ${name} ${role}: ${done}/${texts.length}`
        if (process.stderr.isTTY) log(msg, true)
        else if (done % 2048 < 32 || done === texts.length) log(`${msg} (${Math.round((Date.now() - started) / 1000)} s)`)
      }
      return out
    },
  }
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
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...auth('embed', url) },
          body: JSON.stringify({ model, input: batch }),
        })
        if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
        const body = (await res.json()) as { data?: { index?: unknown; embedding?: unknown }[] }
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
