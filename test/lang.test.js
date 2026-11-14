import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLang, foldLatin, foldGreek, foldSanskrit, devanagariToIast, splitText, lexicalScorer, charScorer, sharedWords, resolve, foldCoptic } from '../dist/index.js'

const la = getLang('la')
const grc = getLang('grc')
const sa = getLang('sa')

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

test('Sanskrit folds Devanagari and IAST to the same plain letters', () => {
  assert.equal(devanagariToIast('धर्मक्षेत्रे कुरुक्षेत्रे'), 'dharmakṣetre kurukṣetre')
  assert.equal(devanagariToIast('ॐ तपः स्वाध्यायनिरतं'), 'oṃ tapaḥ svādhyāyanirataṃ')
  assert.equal(foldSanskrit('समवेता युयुत्सवः'), 'samaveta yuyutsavah')
  assert.equal(foldSanskrit('samavetā yuyutsavaḥ'), 'samaveta yuyutsavah')
  assert.equal(foldSanskrit('saṁjaya r̥ṣi'), 'samjaya rsi', 'ISO 15919 spellings fold too')
  assert.equal(foldSanskrit('सोऽपि'), 'sopi', 'avagraha is dropped')
  assert.deepEqual(sa.words('मामकाः पाण्डवाश्चैव'), sa.words('māmakāḥ pāṇḍavāścaiva'))
})

test('Sanskrit sentences end at daṇḍas, and verse numbers are stripped', () => {
  const deva = 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः। मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १.१ ॥ धृतराष्ट्र उवाच ॥२॥'
  assert.deepEqual(splitText(deva, 'sentence', 1, sa), ['धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।', 'मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥', 'धृतराष्ट्र उवाच ॥'])
  const iast = 'dharmakṣetre kurukṣetre samavetā yuyutsavaḥ / māmakāḥ pāṇḍavāś caiva kim akurvata saṃjaya // BhG_1.1 // iti || 2 ||'
  assert.deepEqual(splitText(iast, 'sentence', 1, sa), ['dharmakṣetre kurukṣetre samavetā yuyutsavaḥ /', 'māmakāḥ pāṇḍavāś caiva kim akurvata saṃjaya //', 'iti ||'])
  assert.deepEqual(sa.words('॥ १.२ ॥'), [])
})

test('Sanskrit drops particles and stems endings', () => {
  assert.deepEqual(sa.words('स च एव रामः'), ['ramah'])
  const stems = (s) => sa.words(s).map(sa.stem)
  assert.deepEqual(stems('रामः रामो रामेण रामस्य रामम्'), ['ram', 'ram', 'ram', 'ram', 'ram'])
  assert.deepEqual(stems('gacchati gacchanti'), ['gacch', 'gacch'])
  assert.deepEqual(stems('devānām devebhyaḥ deveṣu'), ['dev', 'dev', 'dev'])
})

test('Sanskrit overlap finds a verse however sandhi and spacing join its words', () => {
  const docs = ['tapaḥsvādhyāyanirataṃ tapasvī vāgvidāṃ varam', 'dharmakṣetre kurukṣetre samavetā yuyutsavaḥ', 'nainaṃ chindanti śastrāṇi nainaṃ dahati pāvakaḥ']
  const s = lexicalScorer(docs, sa).scores('नैनं छिन्दन्ति शस्त्राणि')
  assert.equal(s.indexOf(Math.max(...s)), 2)
  const t = lexicalScorer(docs, sa).scores('tapaḥ svādhyāya niratam')
  assert.equal(t.indexOf(Math.max(...t)), 0)
})

test('English is unchanged and the default', () => {
  const en = getLang(undefined)
  assert.equal(en.code, 'en')
  assert.deepEqual(en.words('He walketh in the way'), ['walketh', 'way'])
  assert.deepEqual(splitText('He came. it was. And then.'), ['He came. it was.', 'And then.'])
})

test('only Sanskrit sets fusion weights; the others fuse with equal votes', () => {
  assert.deepEqual(sa.fusion, { dense: 0, words: 0 })
  for (const code of ['en', 'la', 'grc']) assert.equal(getLang(code).fusion, undefined)
})

test('languages resolve the embedder and turn overlap off across languages', () => {
  assert.deepEqual(resolve({}).embed, 'nomic-embed-text-v1.5')
  assert.equal(resolve({}).lexical, true)
  assert.equal(resolve({ lang: 'grc' }).embed, 'bge-m3')
  assert.equal(resolve({ lang: 'la' }).lexical, true)
  assert.equal(resolve({ lang: 'sa' }).embed, 'bge-m3')
  assert.equal(resolve({ sourceLang: 'sa', targetLang: 'en' }).lexical, false)
  const cross = resolve({ sourceLang: 'la', targetLang: 'en' })
  assert.equal(cross.embed, 'bge-m3')
  assert.equal(cross.lexical, false)
  assert.equal(resolve({ lang: 'la', targetLang: 'en', embed: 'bge-small-en-v1.5' }).embed, 'bge-small-en-v1.5')
  assert.throws(() => resolve({ lang: 'xx' }), /unknown language "xx"/)
})

test('character n-grams match forms the stems miss, for Latin and Greek', () => {
  const la = getLang('la')
  assert.equal(la.charGrams, 4)
  assert.equal(getLang('grc').charGrams, 4)
  assert.equal(getLang('en').charGrams, undefined)
  const docs = ['inter mortuos liber', 'in principio erat uerbum', 'liberauit nos a malo']
  const s = charScorer(docs, la, 4).scores('in mortuis liber')
  assert.ok(s[0] > s[1] && s[0] > s[2])
  assert.equal(s[1], 0)
})

// Modern languages: French, Spanish, Italian, German, Arabic.
import { foldFrench, foldSpanish, foldItalian, foldGerman, foldArabic, splitClitics } from '../dist/index.js'

const fr = getLang('fr')
const es = getLang('es')
const it = getLang('it')
const de = getLang('de')
const ar = getLang('ar')
const stemsOf = (l, s) => l.words(s).map(l.stem)

test('French folds case, accents and œ, and drops elided articles', () => {
  assert.equal(foldFrench('Été Cœur À'), 'ete coeur a')
  assert.deepEqual(fr.words("L'homme qu'il aima d’abord"), ['homme', 'aima', 'abord'])
  assert.deepEqual(fr.words('Évangile'), fr.words('evangile'))
  assert.deepEqual(stemsOf(fr, 'pardonner pardonnait pardonnez pardonné pardonnent'), ['pardonn', 'pardonn', 'pardonn', 'pardonn', 'pardonn'])
  assert.deepEqual(stemsOf(fr, 'aimer'), ['aimer'], 'stems keep five letters')
})

test('French sentences allow a space before ? ! ; : and guillemets', () => {
  assert.deepEqual(splitText('Qui es-tu ? Je suis le chemin. « Viens ! » Il part ; et alors : rien.', 'sentence', 1, fr), [
    'Qui es-tu ?',
    'Je suis le chemin.',
    '« Viens ! »',
    'Il part ; et alors : rien.',
  ])
})

test('Spanish folds accents but keeps ñ', () => {
  assert.equal(foldSpanish('Él SEÑOR año corazón'), 'el señor año corazon')
  assert.deepEqual(es.words('el año'), ['año'])
  assert.notDeepEqual(es.words('año'), es.words('ano'))
  assert.deepEqual(stemsOf(es, 'perdonar perdonaron perdonado perdonando'), ['perdon', 'perdon', 'perdon', 'perdon'])
  assert.deepEqual(stemsOf(es, 'vida'), ['vida'], 'stems keep five letters')
})

test('Spanish sentences may open with ¿ or ¡', () => {
  assert.deepEqual(splitText('Dijo: ¿Quién eres? ¡Señor! Yo soy.', 'sentence', 1, es), ['Dijo:', '¿Quién eres?', '¡Señor!', 'Yo soy.'])
})

test('Italian folds accents and drops elided articles', () => {
  assert.equal(foldItalian('Città PERCHÉ'), 'citta perche')
  assert.deepEqual(it.words("L'uomo dell'anima nell'acqua"), ['uomo', 'anima', 'acqua'])
  assert.deepEqual(stemsOf(it, 'perdonare perdonava perdonato perdonando'), ['perdon', 'perdon', 'perdon', 'perdon'])
})

test('German folds umlauts, ß and the old th', () => {
  assert.equal(foldGerman('Füße Straße ÄRGER'), 'fusse strasse arger')
  assert.deepEqual(de.words('Füße'), de.words('Füsse'))
  assert.deepEqual(de.words('daß er es thun wird'), ['tun'])
  assert.deepEqual(stemsOf(de, 'Herrlichkeit herrliche Gebote Geboten'), ['herrlich', 'herrlich', 'gebote', 'gebote'])
})

test('German sentences close with “ and «', () => {
  assert.deepEqual(splitText('Er kam. „Komm!“ Und er kam. »Wer bist du?« Ich bin es.', 'sentence', 1, de), [
    'Er kam.',
    '„Komm!“',
    'Und er kam.',
    '»Wer bist du?«',
    'Ich bin es.',
  ])
})

test('Arabic strips harakat and tatweel, and folds alef, ya and ta marbuta', () => {
  assert.equal(foldArabic('وَقَالَ'), 'وقال')
  assert.equal(foldArabic('اللـــه'), 'الله')
  assert.equal(foldArabic('أإآٱ'), 'اااا')
  assert.equal(foldArabic('إِلَى مَدِينَةٍ'), 'الي مدينه')
})

test('Arabic splits off و ف and ب ل ك with the article, and keeps Allah whole', () => {
  assert.equal(splitClitics('وبالكلمه'), 'كلمه')
  assert.equal(splitClitics('للرب'), 'رب')
  assert.equal(splitClitics('والارض'), 'ارض')
  assert.equal(splitClitics('ولد'), 'ولد', 'three letters stay whole')
  assert.equal(splitClitics('بيت'), 'بيت')
  for (const w of ['الله', 'والله', 'بالله', 'لله']) assert.equal(splitClitics(w), 'الله')
  assert.deepEqual(ar.words('وَقَالَ ٱللَّهُ: لِيَكُنْ نُورٌ'), ['الله', 'ليكن', 'نور'])
  assert.deepEqual(stemsOf(ar, 'كلماتهم الكلمات'), ['كلم', 'كلم'])
})

test('Arabic sentences end at . ؟ and ؛ but not the Arabic comma', () => {
  assert.deepEqual(splitText('في البدء كان الكلمة. من انت؟ انا هو؛ فقال، نعم', 'sentence', 1, ar), [
    'في البدء كان الكلمة.',
    'من انت؟',
    'انا هو؛',
    'فقال، نعم',
  ])
})

test('Modern languages use bge-m3, and overlap finds a quotation', () => {
  for (const l of [fr, es, it, de, ar]) assert.equal(l.embedder, 'bge-m3')
  const docs = ["Au commencement, Dieu créa les cieux et la terre.", "L'Éternel est mon berger: je ne manquerai de rien.", 'Jésus pleura.']
  const s = lexicalScorer(docs, fr).scores("l'Eternel est mon berger")
  assert.equal(s.indexOf(Math.max(...s)), 1)
})

// Coptic.
const cop = getLang('cop')

test('Coptic folds Greek-block lookalikes, case, and supralinear strokes', () => {
  // Coptic-block ⲁⲃⲅ, Greek-block αβγ, capitals, and combining overline/macron/conjoining strokes.
  assert.equal(foldCoptic('ⲀⲂⲄ'), 'ⲁⲃⲅ')
  assert.equal(foldCoptic('αβγ'), 'ⲁⲃⲅ')
  assert.equal(foldCoptic('ⲛ̄ⲧⲟϥ ⲛⲏⲧ︤ⲛ︥ ⲧⲏⲣϥ̄'), 'ⲛⲧⲟϥ ⲛⲏⲧⲛ ⲧⲏⲣϥ')
  assert.equal(foldCoptic('ϲοφια'), foldCoptic('ⲥⲟⲫⲓⲁ'), 'lunate sigma and Greek letters match Coptic ones')
  assert.equal(foldCoptic('Ϣϣ'), 'ϣϣ', 'Coptic-only letters live in the Greek block and keep their place')
  assert.equal(foldCoptic('ϧⲉⲛ'), 'ϩⲉⲛ', 'Bohairic ϧ folds to ϩ')
})

test('Coptic words drop function words; stems peel conjugation bases, articles and suffixes', () => {
  assert.deepEqual(cop.words('ⲁⲩⲱ ⲁϥϫⲟⲟⲥ ⲛⲁϥ ϫⲉ ⲡⲛⲟⲩⲧⲉ'), ['ⲁϥϫⲟⲟⲥ', 'ⲡⲛⲟⲩⲧⲉ'])
  assert.deepEqual(cop.words('ⲛ̄ⲧⲟϥ ⲡⲛⲟⲩⲧⲉ'), cop.words('ⲛⲧⲟϥ ⲡⲛⲟⲩⲧⲉ'))
  assert.equal(cop.stem('ⲁϥϫⲟⲟⲥ'), cop.stem('ⲁⲩϫⲟⲟⲥ'))
  assert.equal(cop.stem('ⲛⲟⲩⲣⲱⲙⲉ'), cop.stem('ⲣⲱⲙⲉ'))
  assert.equal(cop.stem('ⲡⲣⲟ'), 'ⲡⲣⲟ', 'a short word keeps its first letter')
  assert.deepEqual(cop.words('ⲧⲉ'), [], 'copula')
})

test('Coptic sentences end at . · ; ! and the Coptic full stops', () => {
  assert.deepEqual(splitText('ⲁϥⲉⲓ ⲉⲃⲟⲗ. ⲁϥⲛⲁⲩ· ⲁⲩⲱ ⲁϥϫⲟⲟⲥ⳹ ϫⲉ ⲟⲩⲛ ⲟⲩⲛⲟⲩⲧⲉ;', 'sentence', 1, cop), [
    'ⲁϥⲉⲓ ⲉⲃⲟⲗ.',
    'ⲁϥⲛⲁⲩ·',
    'ⲁⲩⲱ ⲁϥϫⲟⲟⲥ⳹',
    'ϫⲉ ⲟⲩⲛ ⲟⲩⲛⲟⲩⲧⲉ;',
  ])
})

test('Coptic uses bge-m3, scores 3-grams, and finds a quotation across spellings', () => {
  assert.equal(cop.embedder, 'bge-m3')
  assert.equal(cop.charGrams, 3)
  assert.deepEqual(cop.fusion, { dense: 0, words: 0 }, 'character 3-grams fuse alone')
  assert.equal(resolve({ lang: 'cop' }).embed, 'bge-m3')
  assert.equal(resolve({ lang: 'cop' }).lexical, true)
  const docs = ['ϩⲛⲧⲁⲣⲭⲏ ⲛⲉⲣⲉⲡϣⲁϫⲉ ϣⲟⲟⲡ', 'ⲡϫⲟⲉⲓⲥ ⲡⲉ ⲡⲁϣⲱⲙⲉ ⲙⲛⲡⲁⲥⲱϯ', 'ⲁⲩⲱ ⲁϥⲉⲓ ⲉⲃⲟⲗ']
  // Quoted with strokes and a Greek-block ϲ.
  const s = lexicalScorer(docs, cop).scores('ⲡϫⲟⲉⲓϲ ⲡⲉ ⲡⲁϣⲱⲙⲉ')
  assert.equal(s.indexOf(Math.max(...s)), 1)
})
