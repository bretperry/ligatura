import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLang, foldLatin, foldGreek, splitText, lexicalScorer, sharedWords, resolve } from '../dist/index.js'

const la = getLang('la')
const grc = getLang('grc')

test('Latin folds case, macrons, ligatures, u/v and i/j', () => {
  assert.equal(foldLatin('Vīvit JESUS'), 'uiuit iesus')
  assert.equal(foldLatin('cælum'), 'caelum')
  assert.deepEqual(la.words('Servus vivit'), la.words('seruus uiuit'))
  assert.deepEqual(la.words('Jerusalem'), la.words('Ierusalem'))
})

test('Latin drops stop words, splits off -que, and stems endings', () => {
  assert.deepEqual(la.words('et in principio erat Verbum'), ['principio', 'uerbum'])
  assert.deepEqual(la.words('populusque'), ['populus'])
  assert.deepEqual(la.words('itaque'), [], 'itaque is a stop word, not ita + que')
  const stems = (s) => la.words(s).map(la.stem)
  assert.deepEqual(stems('dominus domini dominum'), ['domin', 'domin', 'domin'])
  assert.deepEqual(stems('diligis diliges'), ['dilig', 'dilig'])
})

test('Latin overlap matches a quotation across spelling variants', () => {
  const docs = ['In principio creavit Deus cælum, et terram.', 'Magnus Dominus et laudabilis nimis', 'Et vidit Deus lucem quod esset bona']
  const s = lexicalScorer(docs, la).scores('in principio fecit Deus coelum et terram')
  assert.equal(s.indexOf(Math.max(...s)), 0)
  assert.deepEqual(sharedWords('Magnus es, Domine, et laudabilis valde', docs[1], la), ['magnus', 'laudabilis'])
})

test('Greek strips accents, breathings and iota subscript, and folds final sigma', () => {
  assert.equal(foldGreek('Ἐν ἀρχῇ ἦν ὁ λόγος'), 'εν αρχη ην ο λογοσ')
  assert.equal(foldGreek('ΛΟΓΟΣ'), 'λογοσ')
  assert.equal(foldGreek('ϊ'), 'ι')
  assert.deepEqual(grc.words('λόγος'), grc.words('ΛΟΓΟΣ'))
  assert.deepEqual(grc.words('λόγος'), ['λογοσ'])
})

test('Greek drops stop words and stems endings', () => {
  assert.deepEqual(grc.words('καὶ ὁ λόγος ἦν πρὸς τὸν θεόν'), ['λογοσ', 'θεον'])
  const stems = (s) => grc.words(s).map(grc.stem)
  assert.deepEqual(stems('θεός θεοῦ θεῷ'), ['θε', 'θε', 'θε'])
  assert.deepEqual(stems('λόγος λόγῳ λόγοις'), ['λογ', 'λογ', 'λογ'])
})

test('Greek sentences end at . ; and the ano teleia, with no capital needed', () => {
  const text = 'ἐν ἀρχῇ ἦν ὁ λόγος· καὶ ὁ λόγος ἦν πρὸς τὸν θεόν. τίς ἐστιν; οὗτος ἦν· οὐδὲ ἕν; ναί.'
  assert.deepEqual(splitText(text, 'sentence', 1, grc), [
    'ἐν ἀρχῇ ἦν ὁ λόγος·',
    'καὶ ὁ λόγος ἦν πρὸς τὸν θεόν.',
    'τίς ἐστιν;',
    'οὗτος ἦν·',
    'οὐδὲ ἕν;',
    'ναί.',
  ])
})

test('Latin sentences need a capital after the stop, as English', () => {
  assert.deepEqual(splitText('Magnus es, Domine. et laudabilis valde: Ἀ. Magna virtus tua.', 'sentence', 1, la), ['Magnus es, Domine. et laudabilis valde:', 'Ἀ.', 'Magna virtus tua.'])
})

test('English is unchanged and the default', () => {
  const en = getLang(undefined)
  assert.equal(en.code, 'en')
  assert.deepEqual(en.words('He walketh in the way'), ['walketh', 'way'])
  assert.deepEqual(splitText('He came. it was. And then.'), ['He came. it was.', 'And then.'])
})

test('languages resolve the embedder and turn overlap off across languages', () => {
  assert.deepEqual(resolve({}).embed, 'nomic-embed-text-v1.5')
  assert.equal(resolve({}).lexical, true)
  assert.equal(resolve({ lang: 'grc' }).embed, 'bge-m3')
  assert.equal(resolve({ lang: 'la' }).lexical, true)
  const cross = resolve({ sourceLang: 'la', targetLang: 'en' })
  assert.equal(cross.embed, 'bge-m3')
  assert.equal(cross.lexical, false)
  assert.equal(resolve({ lang: 'la', targetLang: 'en', embed: 'bge-small-en-v1.5' }).embed, 'bge-small-en-v1.5')
  assert.throws(() => resolve({ lang: 'xx' }), /unknown language "xx"/)
})
