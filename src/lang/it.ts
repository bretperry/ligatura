// Italian. Folds case and accents, so "città" and "citta" match. Elided articles and
// prepositions (l', d', un', dell', all', nell', quest') split at the apostrophe and drop as short
// or stop words, so "l'uomo" gives "uomo". A light suffix stripper stands in for a lemmatizer: it
// joins plurals, gender and most regular verb forms, not stem changes (vado, andiamo).
import { stripAccents, sentenceSplitter } from './fold.js'
import { byLength, stripEnding, type Lang } from './types.js'

export const foldItalian = stripAccents

// Articles, articulated prepositions, pronouns, conjunctions, and the commonest forms of essere,
// avere and dire. Older spellings common in Bible translations (egli, eziandio, imperocchè) too.
const STOP = new Set(
  `il lo la i gli le un uno una di a da in con su per tra fra e ed o od che chi cui non si mi ti ci vi ne
  del dello della dei degli delle dell al allo alla ai agli alle all dal dallo dalla dai dagli dalle dall
  nel nello nella nei negli nelle nell sul sullo sulla sui sugli sulle sull col coi
  io tu egli ella lui lei noi voi essi esse esso essa loro me te se sé lo
  suo sua suoi sue mio mia miei mie tuo tua tuoi tue nostro nostra nostri nostre vostro vostra vostri vostre
  questo questa questi queste quest quello quella quelli quelle quell quel quei ciò cio
  come ma se più piu anche ancora pure però pero perché perche poiché poiche quando dove così cosi dunque
  ogni tutto tutta tutti tutte ecco ora allora eziandio imperocché imperocche conciossiachè
  è sono era erano fu furono sarà sara saranno sia siano essere stato stata sei siamo siete
  ha hanno ho hai abbiamo avete aveva avevano ebbe ebbero avere avrà avra abbia
  disse dice dissero dicendo rispose`.split(/\s+/).map(foldItalian),
)

// Noun and adjective suffixes, then verb endings. Longest first.
const ENDINGS = byLength([
  'amente', 'azioni', 'azione', 'atori', 'atore', 'atrici', 'atrice', 'anze', 'anza', 'enze', 'enza', 'ezze', 'ezza', 'mente', 'ita',
  'ismi', 'ismo', 'iste', 'ista', 'isti', 'abili', 'abile', 'ibili', 'ibile', 'osi', 'ose', 'oso', 'osa', 'ivi', 'ive', 'ivo', 'iva',
  'eranno', 'iranno', 'eremo', 'iremo', 'erete', 'irete', 'era', 'ira', 'ero', 'iro', 'erai', 'irai',
  'avano', 'evano', 'ivano', 'avamo', 'evamo', 'ava', 'eva', 'iva', 'arono', 'erono', 'irono', 'ando', 'endo',
  'iamo', 'ate', 'ete', 'ite', 'ato', 'ata', 'ati', 'uto', 'uta', 'uti', 'ute', 'ito', 'iti',
  'are', 'ere', 'ire', 'ano', 'ono', 'i', 'e', 'o', 'a',
])

export const it: Lang = {
  code: 'it',
  name: 'Italian',
  sentences: sentenceSplitter('«"“—'),
  words: (s) => (foldItalian(s).match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)),
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  embedder: 'bge-m3',
}
