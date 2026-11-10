// French. Folds case, accents and the ligatures œ and æ, so "Évangile" and "evangile" match.
// Elided articles and pronouns (l', d', qu', j', n', s') split at the apostrophe and drop as
// short or stop words, so "l'homme" gives "homme". A light suffix stripper stands in for a
// lemmatizer: it joins plurals and most regular verb forms, not stem changes (vais, allons).
import { stripAccents, sentenceSplitter } from './fold.js'
import { byLength, stripEnding, type Lang } from './types.js'

export const foldFrench = (s: string) => stripAccents(s).replace(/œ/g, 'oe').replace(/æ/g, 'ae')

// Articles, pronouns, prepositions, conjunctions, and the commonest forms of être, avoir and dire.
const STOP = new Set(
  `les des une aux du un le la de et en est que qui quoi ne pas il elle ils elles on nous vous je tu
  me te se moi toi soi lui leur leurs son sa ses mon ma mes ton ta tes notre nos votre vos ce cet cette ces
  ceci cela ca celui celle ceux celles dans par pour sur avec sans sous vers chez entre mais ou donc or ni car
  au aux y si comme quand ainsi aussi plus tout tous toute toutes meme dont lorsque puisque quoique jusque
  lorsqu puisqu quoiqu jusqu aujourd hui point voici voila
  etre suis es sommes etes sont etait etaient fut furent sera seront soit soient ete
  avoir ai as avons avez ont avait avaient eut eurent aura auront ait aient eu
  dit dire disait dis disant dirent repondit`.split(/\s+/).map(foldFrench),
)

// Noun and adjective suffixes, then verb endings. Longest first.
const ENDINGS = byLength([
  'issements', 'issement', 'ements', 'ement', 'ations', 'ation', 'ateurs', 'ateur', 'atrices', 'atrice', 'ances', 'ance', 'ences', 'ence',
  'ites', 'ite', 'euses', 'euse', 'eux', 'ives', 'ive', 'ifs', 'if', 'ables', 'able', 'iques', 'ique', 'istes', 'iste', 'ismes', 'isme',
  'erions', 'eriez', 'eraient', 'erait', 'erais', 'erent', 'erez', 'erons', 'eront', 'era', 'eras', 'erai',
  'issaient', 'issait', 'issant', 'issons', 'issez', 'issent', 'isse', 'irent', 'iront', 'ira',
  'aient', 'ait', 'ais', 'ions', 'iez', 'ant', 'ants', 'antes', 'ante', 'ames', 'ates', 'at', 'a',
  'ees', 'ee', 'es', 'er', 'ez', 'ir', 'is', 'it', 'ons', 'ent', 'e', 's', 'x',
])

export const fr: Lang = {
  code: 'fr',
  name: 'French',
  // As English, with French spacing ("Qui es-tu ? Je…") and guillemets.
  sentences: sentenceSplitter('«"“—'),
  words: (s) => (foldFrench(s).match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)),
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  embedder: 'bge-m3',
}
