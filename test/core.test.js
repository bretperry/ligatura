// Pure-function tests: no model downloads.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitText, lexicalScorer, sharedWords } from '../dist/index.js'
import { fuse, ranks } from '../dist/util.js'

test('splitText splits sentences and drops fragments', () => {
  assert.deepEqual(splitText('He that followeth me shall not walk in darkness. Vanity of vanities, all is vanity!\n\nOk.'), [
    'He that followeth me shall not walk in darkness.',
    'Vanity of vanities, all is vanity!',
  ])
})

test('splitText paragraph and line modes', () => {
  assert.deepEqual(splitText('a b\nc\n\nd', 'paragraph'), ['a b c', 'd'])
  assert.deepEqual(splitText('a b\nc\n\nd', 'line'), ['a b', 'c', 'd'])
})

test('lexical overlap ranks the quoted verse first and folds archaic endings', () => {
  const lex = lexicalScorer([
    'Go ye into the whole world, and preach the gospel.',
    'I am the light of the world: he that followeth me, walketh not in darkness.',
  ])
  const s = lex.scores('He that follows me shall not walk in darkness')
  assert.ok(s[1] > s[0])
  assert.deepEqual(sharedWords('walk in darkness', 'walketh not in darkness'), ['darkness'])
})

test('ranks and reciprocal rank fusion', () => {
  assert.deepEqual([...ranks(Float32Array.from([0.1, 0.9, 0.5]))], [3, 1, 2])
  // Item 2 is 2nd and 1st; item 0 is 1st and 3rd; item 1 is 3rd and 2nd.
  const f = fuse(Float32Array.from([0.9, 0.1, 0.5]), Float32Array.from([0.1, 0.2, 0.9]))
  assert.deepEqual([...ranks(f)], [2, 3, 1])
})
