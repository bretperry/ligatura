import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLang, foldClassicalChinese, splitText, lexicalScorer, charScorer, resolve } from '../dist/index.js'

const lzh = getLang('lzh')

test('Classical Chinese folds traditional, simplified and variant forms together', () => {
  assert.equal(foldClassicalChinese('學而時習之'), '学而时习之')
  assert.equal(foldClassicalChinese('學而時習之'), foldClassicalChinese('学而时习之'))
  assert.equal(foldClassicalChinese('說'), foldClassicalChinese('説'))
  assert.equal(foldClassicalChinese('為'), foldClassicalChinese('爲'))
  assert.equal(foldClassicalChinese('於'), foldClassicalChinese('于'))
  assert.equal(foldClassicalChinese('羣'), foldClassicalChinese('群'))
  assert.equal(foldClassicalChinese('後'), foldClassicalChinese('后'))
})

test('Classical Chinese drops punctuation, spaces, Latin and digits; keeps Han order', () => {
  assert.equal(foldClassicalChinese('子曰：「學而時習之，不亦說乎？」 Analects 1.1'), '子曰学而时习之不亦说乎')
  assert.equal(foldClassicalChinese('⾔'), '言', 'Kangxi radicals normalize')
  assert.equal(foldClassicalChinese('𠮷'), '𠮷', 'extension B passes through')
})

test('Classical Chinese words are characters, without particles', () => {
  assert.deepEqual(lzh.words('學而時習之，不亦說乎？'), ['学', '时', '习', '不', '亦', '说'])
  assert.deepEqual(lzh.words('道可道，非常道'), ['道', '可', '道', '非', '常', '道'])
  assert.deepEqual(lzh.words('Hello 123'), [])
})

test('Classical Chinese sentences end at 。！？ and ；, with closing quotes', () => {
  const t = '子曰：「學而時習之，不亦說乎？」有朋自遠方來，不亦樂乎！人不知而不慍；不亦君子乎。'
  assert.deepEqual(splitText(t, 'sentence', 1, lzh), ['子曰：「學而時習之，不亦說乎？」', '有朋自遠方來，不亦樂乎！', '人不知而不慍；', '不亦君子乎。'])
})

test('Classical Chinese overlap finds a quotation across traditional and simplified', () => {
  const docs = ['道可道，非常道。名可名，非常名。', '學而時習之，不亦說乎。', '天下皆知美之為美，斯惡已。']
  const s = lexicalScorer(docs, lzh).scores('学而时习之，不亦说乎')
  assert.equal(s.indexOf(Math.max(...s)), 1)
  const c = charScorer(docs, lzh, 2).scores('不亦説乎')
  assert.equal(c.indexOf(Math.max(...c)), 1)
  assert.equal(c[0], 0)
})

test('Classical Chinese uses bge-m3 and bigrams', () => {
  assert.equal(lzh.charGrams, 2)
  assert.equal(resolve({ lang: 'lzh' }).embed, 'bge-m3')
  assert.equal(resolve({ sourceLang: 'lzh', targetLang: 'en' }).lexical, false)
})
