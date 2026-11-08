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
}

// Query and document prefixes follow each model card.
export const LOCAL_EMBEDDERS: Record<string, LocalModel> = {
  'nomic-embed-text-v1.5': { id: 'nomic-ai/nomic-embed-text-v1.5', pooling: 'mean', query: 'search_query: ', doc: 'search_document: ' },
  'bge-small-en-v1.5': { id: 'Xenova/bge-small-en-v1.5', pooling: 'cls' },
  'bge-large-en-v1.5': { id: 'Xenova/bge-large-en-v1.5', pooling: 'cls', query: 'Represent this sentence for searching relevant passages: ' },
}
export const DEFAULT_EMBEDDER = 'nomic-embed-text-v1.5'

export function makeEmbedder(spec: string): Embedder {
  const inner = spec.startsWith('openai:') ? openaiEmbedder(spec) : localEmbedder(spec)
  return { name: inner.name, embed: (texts, role) => cached(inner, texts, role) }
}

// Vectors are cached per model, role and exact input, so a rerun embeds nothing.
async function cached(e: Embedder, texts: string[], role: 'query' | 'doc'): Promise<Float32Array[]> {
  const key = createHash('sha1').update(`${e.name}\0${role}\0${texts.join('\0')}`).digest('hex')
  const dir = join(cacheDir(), 'vectors')
  const file = join(dir, `${key}.json`)
  if (existsSync(file)) return (JSON.parse(readFileSync(file, 'utf8')) as number[][]).map((v) => Float32Array.from(v))
  const out = await e.embed(texts, role)
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, JSON.stringify(out.map((v) => Array.from(v))))
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
        const { pipeline } = await import('@huggingface/transformers')
        pipe = (await pipeline('feature-extraction', cfg.id, { dtype: 'q8' })) as unknown as typeof pipe
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
