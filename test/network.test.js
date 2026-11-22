// Hung or garbled servers fail loudly; toLinks reports the run's own settings.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { link, toLinks, makeEmbedder } from '../dist/index.js'
import { makeReranker } from '../dist/rerank.js'
import { setQuiet } from '../dist/util.js'

let server, url, mode
const prev = { t: process.env.LIGATURA_TIMEOUT_MS, c: process.env.LIGATURA_NO_CACHE }
before(async () => {
  setQuiet(true)
  process.env.LIGATURA_NO_CACHE = '1'
  server = createServer((req, res) => {
    req.resume()
    req.on('end', () => {
      if (mode === 'hang') return
      res.setHeader('content-type', 'application/json')
      if (req.url.endsWith('/embeddings')) return res.end(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }))
      res.end(JSON.stringify({ choices: [{ message: { content: 'I cannot decide.' } }] }))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  url = `http://127.0.0.1:${server.address().port}/v1`
})
after(() => {
  server.closeAllConnections()
  server.close()
  setQuiet(false)
  for (const [k, v] of [['LIGATURA_TIMEOUT_MS', prev.t], ['LIGATURA_NO_CACHE', prev.c]]) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

test('a server that never answers is a timeout error naming the knob', async () => {
  mode = 'hang'
  process.env.LIGATURA_TIMEOUT_MS = '200'
  await assert.rejects(makeEmbedder(`openai:${url}#m`).embed(['x'], 'doc'), /no reply within 0\.2 s.*LIGATURA_TIMEOUT_MS/)
  const judge = makeReranker(`chat:${url}#m`)
  await assert.rejects(judge.score({ ref: 'q', text: 'q' }, [{ ref: 'a', text: 'a' }]), /no reply within/)
  delete process.env.LIGATURA_TIMEOUT_MS
})

test('a bad LIGATURA_TIMEOUT_MS is an error, not a silent default', async () => {
  mode = 'ok'
  process.env.LIGATURA_TIMEOUT_MS = 'soon'
  await assert.rejects(makeEmbedder(`openai:${url}#m`).embed(['x'], 'doc'), /LIGATURA_TIMEOUT_MS must be/)
  delete process.env.LIGATURA_TIMEOUT_MS
})

test('a judge reply with no refs throws instead of scoring every candidate 0', async () => {
  mode = 'ok'
  const judge = makeReranker(`chat:${url}#m`)
  await assert.rejects(judge.score({ ref: 'q', text: 'q' }, [{ ref: 'a', text: 'a' }]), /judge's reply for q has no/)
})

test('toLinks reports the settings link() ran with, whatever opts the caller passes', async () => {
  mode = 'ok'
  const src = [{ ref: 's', text: 'x' }]
  const tgt = [{ ref: 't', text: 'x' }]
  const ran = { embed: `openai:${url}#m`, rerank: 'none', sourceLang: 'la', targetLang: 'la' }
  let r
  for await (const x of link(src, tgt, ran)) r = x
  const [l] = toLinks(r, tgt, { top: 1, lang: 'en' })
  assert.equal(l.method.embed, ran.embed)
  assert.equal(l.method.rerank, 'none')
  assert.equal(l.method.lang, 'la>la')
})
