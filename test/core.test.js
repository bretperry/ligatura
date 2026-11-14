// Pure-function tests: no model downloads.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitText, lexicalScorer, sharedWords } from '../dist/index.js'
import { fuse, fuseWeighted, ranks, checkInt, checkUnique } from '../dist/util.js'
import { judgeRefs } from '../dist/rerank.js'
import { loadUnits } from '../dist/units.js'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('splitText keeps short sentences; minWords drops fragments on request', () => {
  const raw = 'He that followeth me shall not walk in darkness. Jesus wept.\n\nOk.'
  assert.deepEqual(splitText(raw), ['He that followeth me shall not walk in darkness.', 'Jesus wept.', 'Ok.'])
  assert.deepEqual(splitText(raw, 'auto', 3), ['He that followeth me shall not walk in darkness.'])
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

test('tied scores share a rank, and an all-equal list adds nothing to fusion', () => {
  assert.deepEqual([...ranks(Float32Array.from([0, 0.5, 0, 0.5, 0.9]))], [4, 2, 4, 2, 1])
  // Dense picks item 3; lexical is all zero. File order must not demote item 3.
  const f = fuse(Float32Array.from([0, 0, 0, 1]), Float32Array.from([0, 0, 0, 0]))
  assert.equal([...ranks(f)][3], 1)
  // Zero-overlap items tie with each other instead of ranking by position.
  const g = fuse(Float32Array.from([0.4, 0.3, 0.2, 0.1]), Float32Array.from([0, 0, 0, 0.5]))
  assert.ok(g[0] > g[1] && g[1] > g[2])
})

test('weighted fusion: weight 1 matches fuse, weight 0 leaves a list out', () => {
  const a = Float32Array.from([0.9, 0.1, 0.5]), b = Float32Array.from([0.1, 0.2, 0.9])
  assert.deepEqual([...fuseWeighted([[a, 1], [b, 1]])], [...fuse(a, b)])
  assert.deepEqual([...ranks(fuseWeighted([[a, 0], [b, 1]]))], [...ranks(b)])
  // A heavier vote wins a disagreement: item 0 is first in a, last in b.
  assert.equal([...ranks(fuseWeighted([[a, 3], [b, 1]]))][0], 1)
  // If the only weighted list is all equal, the zero-weight lists break the tie.
  const flat = Float32Array.from([0, 0, 0])
  assert.deepEqual([...ranks(fuseWeighted([[a, 0], [flat, 1]]))], [...ranks(a)])
})

test('judgeRefs keeps only candidate refs, once each, and survives bad replies', () => {
  const c = ['MAT.1.1', 'JHN.3.16']
  assert.deepEqual(judgeRefs('{"refs": ["JHN.3.16", "X", "JHN.3.16", "MAT.1.1"]}', c), ['JHN.3.16', 'MAT.1.1'])
  assert.equal(judgeRefs('{"refs": {}}', c), undefined)
  assert.equal(judgeRefs('{"refs": "MAT.1.1"}', c), undefined)
  assert.deepEqual(judgeRefs('<think>{"refs":["MAT.1.1"]}</think> note {"a": "}"} then {"refs": ["JHN.3.16"], "why": "quote"}', c), ['JHN.3.16'])
  assert.equal(judgeRefs('no json here', c), undefined)
})

test('numbers and refs are checked', () => {
  assert.throws(() => checkInt('pool', 0, 1), /pool/)
  assert.throws(() => checkInt('top', -1, 0), /top/)
  assert.throws(() => checkInt('neighbours', 1.5, 0), /neighbours/)
  assert.equal(checkInt('pool', undefined, 1), undefined)
  assert.throws(() => checkUnique('target', ['a', 'b', 'a']), /"a"/)
  const dir = mkdtempSync(join(tmpdir(), 'ligatura-'))
  const f = join(dir, 'u.jsonl')
  writeFileSync(f, '{"ref":"a","text":"x"}\n\n{"ref":"a","text":"y"}\n')
  assert.throws(() => loadUnits(f), /:3: ref "a" already used on line 1/)
  writeFileSync(f, '{"ref":"a","text":"x"}\nnot json\n')
  assert.throws(() => loadUnits(f), /:2: not valid JSON/)
})
