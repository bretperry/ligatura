// Spanish. Folds case and accents but keeps ñ, which is a letter of its own ("año" is not
// "ano"). A light suffix stripper stands in for a lemmatizer: it joins plurals, gender and most
// regular verb forms, not stem changes (puedo, podemos) or irregular verbs (fue, iba).
import { sentenceSplitter } from './fold.js'
import { byLength, stripEnding, type Lang } from './types.js'

// NFD splits ñ into n + tilde; put it back together before the other marks are dropped.
export const foldSpanish = (s: string) => s.normalize('NFD').toLowerCase().replace(/ñ/g, 'ñ').replace(/\p{M}/gu, '')

// Articles, pronouns, prepositions, conjunctions, and the commonest forms of ser, estar, haber and decir.
const STOP = new Set(
  `el la los las un una unos unas de del al y e o u que en a se no por con para su sus lo le les me te nos os
  mi mis tu tus yo él ella ellos ellas nosotros vosotros usted ustedes nuestro nuestra nuestros nuestras
  vuestro vuestra vuestros vuestras este esta esto estos estas ese esa eso esos esas aquel aquella aquello
  aquellos aquellas como mas más pero ni ya sobre entre sin hasta desde porque cuando donde pues muy
  tambien también todo toda todos todas cual cuales quien quienes cuyo sino aun aunque asi así he aqui aquí
  es son era eran fue fueron ser sea sean sera será seran serán soy eres somos sois siendo sido
  estar esta está estan están estaba estaban estuvo
  ha han he has hemos habeis había habia habían habian hubo haber habra habrá
  dijo dice dijeron dicen diciendo respondió respondio`.split(/\s+/).map(foldSpanish),
)

// Noun and adjective suffixes, then verb endings. Longest first.
const ENDINGS = byLength([
  'amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'acion', 'adoras', 'adores', 'adora', 'ador', 'ancias', 'ancia', 'encias', 'encia',
  'mente', 'idades', 'idad', 'osos', 'osas', 'oso', 'osa', 'ables', 'able', 'ibles', 'ible', 'ivas', 'ivos', 'iva', 'ivo',
  'aremos', 'eremos', 'iremos', 'aran', 'eran', 'iran', 'ara', 'era', 'ira', 'are', 'ere', 'ire', 'aras', 'eras', 'iras',
  'abamos', 'aban', 'abas', 'aba', 'iamos', 'ian', 'ias', 'ia', 'aron', 'ieron', 'asteis', 'isteis', 'aste', 'iste', 'amos', 'emos', 'imos', 'ais', 'eis',
  'ando', 'iendo', 'ados', 'adas', 'ado', 'ada', 'idos', 'idas', 'ido', 'ida', 'ar', 'er', 'ir', 'an', 'en', 'as', 'es', 'os', 'a', 'e', 'o', 'io', 's',
])

export const es: Lang = {
  code: 'es',
  name: 'Spanish',
  // As English; a sentence may also open with ¿ or ¡.
  sentences: sentenceSplitter('¿¡«"“—'),
  words: (s) => (foldSpanish(s).match(/[a-zñ]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)),
  // Stems keep at least five letters: cutting shorter joined unrelated words (vida, vid) and
  // lost links on the nt-ot-es fixture (see its README).
  stem: (w) => stripEnding(w, ENDINGS, 5),
  minKey: 3,
  embedder: 'bge-m3',
}
