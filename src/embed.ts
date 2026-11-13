// Embedding backends. Local models run in process (transformers.js, ONNX); `openai:` calls any
// OpenAI-compatible /v1/embeddings server (Ollama, LM Studio, llama.cpp, vLLM).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cacheDir, log } from './util.js'

export interface Embedder {
  name: string
  embed(texts: string[], role: 'query' | 'doc'): Promise<Float32Array[]>
}

interface LocalModel {
  id: string
  pooling: 'cls' | 'mean' | 'last_token'
  query?: string
  doc?: string
  dtype?: 'q8' | 'q4' | 'fp32'
  // A model built locally, read from <cache>/onnx/<id> and never downloaded.
  local?: boolean
}

// Query and document prefixes follow each model card.
export const LOCAL_EMBEDDERS: Record<string, LocalModel> = {
  'nomic-embed-text-v1.5': { id: 'nomic-ai/nomic-embed-text-v1.5', pooling: 'mean', query: 'search_query: ', doc: 'search_document: ' },
  'bge-small-en-v1.5': { id: 'Xenova/bge-small-en-v1.5', pooling: 'cls' },
  'bge-large-en-v1.5': { id: 'Xenova/bge-large-en-v1.5', pooling: 'cls', query: 'Represent this sentence for searching relevant passages: ' },
  // Multilingual: English against Italian, Latin, Greek, French, German, Sanskrit (lab/multilingual-probe.mjs).
  'bge-m3': { id: 'Xenova/bge-m3', pooling: 'cls' },
  // bge-m3 tuned on English against Latin, Greek and Sanskrit (lab/finetune.py); built locally, not published.
  'bge-m3-classics': { id: 'bge-m3-classics', pooling: 'cls', local: true },
  'snowflake-arctic-embed-l-v2.0': { id: 'Snowflake/snowflake-arctic-embed-l-v2.0', pooling: 'cls', query: 'query: ' },
  'multilingual-e5-large': { id: 'Xenova/multilingual-e5-large', pooling: 'mean', query: 'query: ', doc: 'passage: ' },
  'multilingual-e5-small': { id: 'Xenova/multilingual-e5-small', pooling: 'mean', query: 'query: ', doc: 'passage: ' },
  'qwen3-embedding-0.6b': {
    id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX', pooling: 'last_token', dtype: 'fp32',
    query: 'Instruct: Given a passage, retrieve the passage in another text, in any language, that it quotes, translates or alludes to\nQuery: ',
  },
}
export const DEFAULT_EMBEDDER = 'nomic-embed-text-v1.5+bge-m3'

export function makeEmbedder(spec: string): Embedder {
  const inner = spec.startsWith('openai:') ? openaiEmbedder(spec) : localEmbedder(spec)
  return { name: inner.name, embed: (texts, role) => cached(inner, texts, role) }
}

// Vectors are cached per model, role and exact input, so a rerun embeds nothing.
async function cached(e: Embedder, texts: string[], role: 'query' | 'doc'): Promise<Float32Array[]> {
  const key = createHash('sha1').update(`${e.name}\0${role}\0${texts.join('\0')}`).digest('hex')
  const dir = join(cacheDir(), 'vectors')
  // Raw float32, row after row: JSON can't hold large texts (46k x 1024 floats overflows V8 strings).
  const file = join(dir, `${key}.f32`)
  if (existsSync(file)) {
    const buf = readFileSync(file)
    const all = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
    const dim = all.length / texts.length
    return texts.map((_, i) => all.slice(i * dim, (i + 1) * dim))
  }
  const out = await e.embed(texts, role)
  mkdirSync(dir, { recursive: true })
  const flat = new Float32Array(out.length * (out[0]?.length ?? 0))
  out.forEach((v, i) => flat.set(v, i * v.length))
  writeFileSync(file, Buffer.from(flat.buffer))
  return out
}

function localEmbedder(name: string): Embedder {
  const cfg = LOCAL_EMBEDDERS[name]
  if (!cfg) throw new Error(`unknown embedder "${name}"; local models: ${Object.keys(LOCAL_EMBEDDERS).join(', ')}; or openai:<base-url>#<model>`)
  let pipe: ((t: string[], o: object) => Promise<{ tolist(): number[][] }>) | undefined
  return {
    name,
    async embed(texts, role) {
      if (!pipe) {
        const { pipeline, env } = await import('@huggingface/transformers')
        if (cfg.local) {
          env.localModelPath = join(cacheDir(), 'onnx') + '/'
          if (!existsSync(join(env.localModelPath, cfg.id))) throw new Error(`embedder "${name}" is built locally; expected it at ${join(env.localModelPath, cfg.id)}`)
        }
        pipe = (await pipeline('feature-extraction', cfg.id, { dtype: cfg.dtype ?? 'q8', ...(cfg.local ? { local_files_only: true } : {}) })) as unknown as typeof pipe
      }
      const prefix = cfg[role] ?? ''
      const out: Float32Array[] = []
      for (let i = 0; i < texts.length; i += 32) {
        const t = await pipe!(texts.slice(i, i + 32).map((x) => prefix + x), { pooling: cfg.pooling, normalize: true })
        out.push(...t.tolist().map((v) => Float32Array.from(v)))
        log(`embed ${name} ${role}: ${Math.min(i + 32, texts.length)}/${texts.length}`, true)
      }
      return out
    },
  }
}

// openai:http://localhost:11434/v1#nomic-embed-text sends {model, input} to <base>/embeddings.
// A key, if the server needs one, comes from LIGATURA_API_KEY.
function openaiEmbedder(spec: string): Embedder {
  const [base, model] = spec.slice('openai:'.length).split('#')
  if (!base || !model) throw new Error('openai embedder needs openai:<base-url>#<model>')
  return {
    name: spec,
    async embed(texts) {
      const out: Float32Array[] = []
      for (let i = 0; i < texts.length; i += 64) {
        const res = await fetch(`${base.replace(/\/$/, '')}/embeddings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...auth() },
          body: JSON.stringify({ model, input: texts.slice(i, i + 64) }),
        })
        if (!res.ok) throw new Error(`${base}/embeddings: ${res.status} ${await res.text()}`)
        const body = (await res.json()) as { data: { index: number; embedding: number[] }[] }
        for (const d of body.data.sort((a, b) => a.index - b.index)) out.push(normalize(Float32Array.from(d.embedding)))
        log(`embed ${model}: ${Math.min(i + 64, texts.length)}/${texts.length}`, true)
      }
      return out
    },
  }
}

export const auth = (): Record<string, string> => (process.env.LIGATURA_API_KEY ? { authorization: `Bearer ${process.env.LIGATURA_API_KEY}` } : {})

function normalize(v: Float32Array): Float32Array {
  const n = Math.hypot(...v) || 1
  return v.map((x) => x / n)
}
