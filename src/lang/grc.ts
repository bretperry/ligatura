// Ancient Greek (polytonic or monotonic). Decomposes to NFD and drops every combining mark
// (accents, breathings, diaeresis, iota subscript), folds case, and writes final ς as σ, so
// "Ἐν ἀρχῇ" and "εν αρχη" match. A light suffix stripper stands in for a lemmatizer: it joins
// most forms of a noun, fewer of a verb (augments, reduplication and stem changes defeat it).
import { byLength, stripEnding, type Lang } from './types.js'

export function foldGreek(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    // Lunate and symbol forms of letters.
    .replace(/ϲ/g, 'σ')
    .replace(/ϐ/g, 'β')
    .replace(/ϑ/g, 'θ')
    .replace(/ϕ/g, 'φ')
}

// Articles, particles, prepositions, pronouns and the commonest forms of "be" and "say", folded.
const STOP = new Set(
  `ο η το του τησ τω τη τον την οι αι τα των τοισ ταισ τουσ τασ
  και δε γαρ μεν ουν τε αλλα αλλ ου ουκ ουχ μη μηδε ουδε ουτε μητε η ει εαν αν γε δη αρα ινα οτι
  ωσ ωσπερ καθωσ οπωσ οταν οτε τοτε νυν ετι ιδου
  εν εισ εκ εξ επι προσ απο απ αφ δια δι κατα κατ καθ μετα μετ μεθ περι υπο υπ υφ υπερ παρα παρ συν αντι προ
  αυτοσ αυτου αυτω αυτον αυτη αυτησ αυτην αυτοι αυτων αυτοισ αυτουσ αυται αυτα αυταισ αυτασ
  ουτοσ αυτη τουτο τουτου τουτω τουτον ταυτα τουτων τουτοισ τουτουσ ταυτην ταυτησ εκεινοσ εκεινου εκεινη εκεινο
  εγω μου εμου μοι εμοι με εμε ημεισ ημων ημιν ημασ συ σου σοι σε υμεισ υμων υμιν υμασ
  οσ ησ ω ον ην ων οισ ουσ αισ ασ τισ τι τινα τινοσ τινι πασ παντα παντεσ παντων πασι
  εστιν εστι ειμι εσμεν εστε εισιν ειναι ην ησαν εσται εσονται εστω ων ουσα ον
  λεγει λεγων λεγοντεσ λεγουσιν ειπεν ειπον ειπαν ειπων ελεγεν φησιν`.split(/\s+/).map(foldGreek),
)

// Noun, adjective and participle endings, then verb endings. Longest first.
const ENDINGS = byLength([
  'οισ', 'αισ', 'ουσ', 'ων', 'ου', 'ον', 'οσ', 'ησ', 'ην', 'ασ', 'αν', 'εσ', 'ει', 'αι', 'οι', 'ω', 'η', 'α', 'ε', 'ο', 'ι', 'υσ', 'εωσ', 'εων', 'ευσ', 'εια', 'ματοσ', 'ματα', 'ματι', 'μα',
  'ομενοσ', 'ομενον', 'ομενοι', 'ομενων', 'ομενη', 'μενοσ', 'μενον', 'μενοι', 'μενων', 'μενη', 'οντοσ', 'οντεσ', 'οντων', 'οντα', 'ουσα', 'ουσι', 'ουσιν', 'ασιν', 'εσιν',
  'σθαι', 'ειν', 'σεισ', 'σει', 'σω', 'σομεν', 'σετε', 'σουσιν', 'σουσι', 'εισ', 'ουμεν', 'ειτε', 'ουσιν', 'ομεν', 'ετε', 'ουσι', 'εται', 'ονται', 'ηται', 'ωνται', 'σαι', 'σασ', 'σαντεσ', 'σεν', 'σε', 'σα', 'σαν', 'θη', 'θησ', 'θησαν', 'θεισ', 'ντεσ', 'νται', 'ται', 'το', 'ντο',
])

export const grc: Lang = {
  code: 'grc',
  name: 'Ancient Greek',
  // A sentence ends at a full stop, a Greek question mark (;), an ano teleia (· U+0387 or the
  // middle dot U+00B7 most editions type for it) or !, followed by a space. Editions often begin
  // sentences in lower case, so no capital is required.
  sentences: (p) => p.split(/(?<=[.;;··!])\s+/),
  words: (s) => (foldGreek(s).match(/[α-ω]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)),
  // Greek keeps two-letter stems: θεός, θεοῦ, θεῷ all fold to θε.
  stem: (w) => stripEnding(w, ENDINGS, 2),
  minKey: 2,
  charGrams: 4,
  embedder: 'bge-m3',
}
