// German. Folds case, umlauts (ä ö ü to a o u) and ß to ss, so "Füße" and "Füsse" match.
// The 19th-century th of Bible German (thun, Thür, Rath) folds to t.
// A light suffix stripper stands in for a lemmatizer: it joins case and plural endings and
// regular verb forms, not ablaut (sprach, gesprochen) or compounds (Himmelreich).
import { stripAccents, sentenceSplitter } from './fold.js'
import { byLength, stripEnding, type Lang } from './types.js'

export const foldGerman = (s: string) =>
  stripAccents(s.replace(/ß/g, 'ss').replace(/ẞ/g, 'SS'))
    // 19th-century "th" in native words: Thür, thun, Rath, Muth.
    .replace(/\bth(?=[aeiouy])/g, 't')
    .replace(/([aeiou])th\b/g, '$1t')

// Articles, pronouns, prepositions, conjunctions, and the commonest forms of sein, haben, werden and sagen.
const STOP = new Set(
  `der die das den dem des ein eine einen einem einer eines und oder aber denn doch sondern zu zum zur
  in im an am auf aus bei beim mit nach von vom vor über unter durch für gegen ohne um bis als wie wenn
  daß dass ob so da nicht kein keine keinen keinem keiner ich du er sie es wir ihr mich dich sich uns euch
  mir dir ihm ihn ihnen mein meine meinen meinem meiner dein deine deinen deinem deiner sein seine seinen
  seinem seiner seines ihre ihren ihrem ihrer unser unsere unserm unsern euer eure euren eurem
  dieser diese dieses diesen diesem jener jene welcher welche welches welchen was wer wo auch noch nur
  schon nun dann denn alle allen aller alles also siehe
  ist sind war waren bin bist seid sein wäre wären gewesen wird werden wurde wurden ward werdet
  hat haben hatte hatten hast habt habe gehabt sprach spricht sagte sagt sprachen antwortete`.split(/\s+/).map(foldGerman),
)

// Derivational suffixes, then case, plural and verb endings. Longest first.
const ENDINGS = byLength([
  'ungen', 'ung', 'heiten', 'heit', 'keiten', 'keit', 'lichen', 'licher', 'liches', 'lichem', 'liche', 'lich', 'ischen', 'ische', 'isch',
  'igen', 'iger', 'iges', 'igem', 'ige', 'ig', 'nisse', 'nis', 'eten', 'etet', 'est', 'end', 'ern', 'em', 'en', 'er', 'es', 'et', 'te', 'ten', 'st', 'e', 's', 't', 'n',
])

export const de: Lang = {
  code: 'de',
  name: 'German',
  // As English, with German quotation marks („…“ and »…«).
  sentences: sentenceSplitter('„‚»"—', '“‘«"\')'),
  words: (s) => (foldGerman(s).match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)),
  stem: (w) => stripEnding(w, ENDINGS, 3),
  minKey: 3,
  embedder: 'bge-m3',
}
