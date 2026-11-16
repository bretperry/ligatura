// link() end to end against a fake OpenAI-compatible /embeddings server: no model downloads.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { link, loadGloss, makeEmbedder, splitEmbedSpec } from '../dist/index.js'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setQuiet } from '../dist/util.js'

// Each model maps a text to a fixed vector; any other text gets the "nothing" axis.
const V = {
  a: {
    'Tityrus, you lie under the beech': [1, 0, 0, 0],
    'Tityre, tu patulae recubans sub tegmine fagi': [0, 1, 0, 0],
    'Tityrus, you who lie under the spreading beech': [0.95, 0.31, 0, 0],
    'Arma virumque cano': [0.6, 0.8, 0, 0],
    'Quo me, Bacche, rapis': [0.3, 0.95, 0, 0],
  },
  // b orders the targets differently from a: carm, ecl, aen.
  b: {
    'Tityrus, you lie under the beech': [1, 0, 0, 0],
    'Tityre, tu patulae recubans sub tegmine fagi': [0.5, 0.866, 0, 0],
    'Arma virumque cano': [0.2, 0.98, 0, 0],
    'Quo me, Bacche, rapis': [0.9, 0.436, 0, 0],
  },
}
const NONE = [0, 0, 0, 1]

let server, base
const prevNoCache = process.env.LIGATURA_NO_CACHE
before(async () => {
  setQuiet(true)
  process.env.LIGATURA_NO_CACHE = '1'
  server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const { model, input } = JSON.parse(body)
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ data: input.map((t, index) => ({ index, embedding: V[model]?.[t] ?? NONE })) }))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `openai:http://127.0.0.1:${server.address().port}/v1`
})
after(() => {
  server.close()
  setQuiet(false)
  if (prevNoCache === undefined) delete process.env.LIGATURA_NO_CACHE
  else process.env.LIGATURA_NO_CACHE = prevNoCache
})

const source = [{ ref: 's1', text: 'Tityrus, you lie under the beech' }]
const target = [
  { ref: 'ecl.1.1', text: 'Tityre, tu patulae recubans sub tegmine fagi' },
  { ref: 'aen.1.1', text: 'Arma virumque cano' },
  { ref: 'carm.3.25', text: 'Quo me, Bacche, rapis' },
]
// English against Latin: overlap is off, so the order is the embedding order alone.
const langs = { sourceLang: 'en', targetLang: 'la' }

async function first(opts) {
  for await (const r of link(source, target, { rerank: 'none', ...langs, ...opts })) return r
}
const refs = (r) => r.ranked.map((c) => target[c.index].ref)

test('without a gloss, the Latin line the source translates is not first', async () => {
  const r = await first({ embed: `${base}#a` })
  assert.equal(refs(r)[0], 'aen.1.1')
})

test('a gloss lets a target unit score by its translation', async () => {
  const gloss = [{ ref: 'ecl.1.1', text: 'Tityrus, you who lie under the spreading beech' }]
  const r = await first({ embed: `${base}#a`, gloss })
  assert.equal(refs(r)[0], 'ecl.1.1')
  assert.ok(Math.abs(r.ranked[0].dense - 0.95) < 1e-3, `dense ${r.ranked[0].dense} is the gloss cosine`)
  // A unit with no translation keeps its own score.
  const aen = r.ranked.find((c) => target[c.index].ref === 'aen.1.1')
  assert.ok(Math.abs(aen.dense - 0.6) < 1e-3)
})

test('a gloss never lowers a unit below its own text', async () => {
  const gloss = [{ ref: 'aen.1.1', text: 'unrelated words' }]
  const r = await first({ embed: `${base}#a`, gloss })
  const aen = r.ranked.find((c) => target[c.index].ref === 'aen.1.1')
  assert.ok(Math.abs(aen.dense - 0.6) < 1e-3)
})

test('a+b fuses two embedders by rank and reports their mean cosine', async () => {
  const a = await first({ embed: `${base}#a` })
  const b = await first({ embed: `${base}#b` })
  assert.deepEqual(refs(a), ['aen.1.1', 'carm.3.25', 'ecl.1.1'])
  assert.deepEqual(refs(b), ['carm.3.25', 'ecl.1.1', 'aen.1.1'])
  // carm ranks 2nd and 1st, aen 1st and 3rd, ecl 3rd and 2nd.
  const ab = await first({ embed: `${base}#a+${base}#b` })
  assert.equal(refs(ab)[0], 'carm.3.25')
  assert.ok(Math.abs(ab.ranked[0].dense - (0.3 + 0.9) / 2) < 1e-2, `dense ${ab.ranked[0].dense} is the mean`)
})

test('a gloss applies in every fused embedder', async () => {
  // Under b alone the gloss text is unknown, so only a can lift ecl; with a+b it ranks 1st in a.
  const gloss = [{ ref: 'ecl.1.1', text: 'Tityrus, you who lie under the spreading beech' }]
  const ab = await first({ embed: `${base}#a+${base}#b`, gloss })
  assert.equal(refs(ab)[0], 'ecl.1.1')
})

test('a gloss keyed to refs the target lacks fails instead of doing nothing', async () => {
  await assert.rejects(first({ embed: `${base}#a`, gloss: [{ ref: 'ECL.1.1', text: 'x' }] }), /1 of 1 gloss refs are not target refs \(first: "ECL.1.1"\)/)
  await assert.rejects(first({ embed: `${base}#a`, gloss: [] }), /no units/)
  await assert.rejects(first({ embed: `${base}#a`, gloss: [{ ref: 'ecl.1.1', text: 'x' }, { ref: 'ecl.1.1', text: 'y' }] }), /gloss/)
})

test('a gloss must be JSONL, since plain text would number its own sentences', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ligatura-gloss-'))
  writeFileSync(join(dir, 'g.txt'), 'The king spoke. The queen wept.')
  assert.throws(() => loadGloss(join(dir, 'g.txt')), /a gloss is JSONL/)
  writeFileSync(join(dir, 'g.jsonl'), '{"ref":"1","text":"The king spoke."}\n')
  assert.deepEqual(loadGloss(join(dir, 'g.jsonl')), [{ ref: '1', text: 'The king spoke.' }])
})

test('embed specs split on + between embedders, not inside an openai: spec', () => {
  assert.deepEqual(splitEmbedSpec('nomic-embed-text-v1.5+bge-m3'), ['nomic-embed-text-v1.5', 'bge-m3'])
  assert.deepEqual(splitEmbedSpec('openai:http://h/v1#d16+q8'), ['openai:http://h/v1#d16+q8'])
  assert.deepEqual(splitEmbedSpec('openai:http://h/v1#d16+q8+bge-m3'), ['openai:http://h/v1#d16+q8', 'bge-m3'])
  assert.deepEqual(splitEmbedSpec('openai:http://h/v1#a+openai:http://h/v1#b'), ['openai:http://h/v1#a', 'openai:http://h/v1#b'])
  assert.throws(() => splitEmbedSpec('bge-m3+'), /empty name/)
  assert.throws(() => splitEmbedSpec('+bge-m3'), /empty name/)
  assert.throws(() => splitEmbedSpec('bge-m3+bge-m3'), /names bge-m3 twice/)
})

test('a locally built embedder fingerprints its files, so a rebuild never reuses old vectors', () => {
  const home = mkdtempSync(join(tmpdir(), 'ligatura-cache-'))
  const prev = process.env.LIGATURA_CACHE
  process.env.LIGATURA_CACHE = home
  try {
    const dir = join(home, 'onnx', 'bge-m3-classics', 'onnx')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'model_quantized.onnx'), 'one')
    const before = makeEmbedder('bge-m3-classics').fingerprint
    assert.equal(makeEmbedder('bge-m3-classics').fingerprint, before)
    writeFileSync(join(dir, 'model_quantized.onnx'), 'rebuilt')
    assert.notEqual(makeEmbedder('bge-m3-classics').fingerprint, before)
  } finally {
    if (prev === undefined) delete process.env.LIGATURA_CACHE
    else process.env.LIGATURA_CACHE = prev
  }
})
