# The Waste Land to its sources

T. S. Eliot, *The Waste Land* (1922), against the works his own Notes cite, mostly in their
original languages. The gold set is the Notes: 39 notes that point at a passage that can be
found, giving 64 links.

- `source.jsonl`: 433 lines of the poem, ref `WL.<line>`, numbered as the 1922 edition and its
  Notes number them.
- `target.jsonl`: 46,724 units from 29 works in 7 languages (`{"ref","text","lang"}`).
- `target-en.jsonl`: 9,884 English translations aligned to the same refs as non-English units,
  for matching through the translation.
- `gold.jsonl`: `{"source","target","note","kind"}`. 64 links: 33 `quote`, 22 `allusion`,
  9 `reference`.

```
ligatura eval fixtures/waste-land --neighbours 1 --gloss target-en.jsonl
```

`--neighbours 1` helps because several notes cite a range, and verse units are single lines.
`--gloss` lets each target unit match through its English translation as well.

## Results

Retrieval only (no reranker), recall of 64 links at 1 / 3 / 5 / 10. Apple M3, 2026-11-09 and
2026-11-10.

| Embed | plain | `--gloss` | `--gloss --neighbours 1` |
|---|---|---|---|
| nomic + bge-m3 (default) | – | 14 / 19 / 19 / 23 | 22 / 30 / 30 / 35 |
| nomic + bge-m3-classics | – | 12 / 18 / 21 / 24 | 17 / 27 / 32 / 38 |
| nomic-embed-text-v1.5 | 13 / 17 / 17 / 18 | 14 / 19 / 21 / 22 | 21 / 28 / 31 / 31 |
| bge-m3 | 11 / 16 / 16 / 19 | 12 / 17 / 17 / 20 | 19 / 26 / 26 / 32 |
| bge-m3-classics | 12 / 15 / 16 / 16 | 12 / 16 / 18 / 18 | 17 / 22 / 28 / 28 |

`bge-m3-classics` is bge-m3 tuned locally on English against Latin, Greek and Sanskrit
(`lab/finetune.py`); it isn't published, so `--embed bge-m3-classics` works only where it was
built. It used no Italian, French or German, which is most of this fixture.

## Rebuild

```
scripts/fetch.sh                 # downloads into raw/ (git-ignored)
python3 -I scripts/build.py      # writes the four .jsonl files; --show prints every gold link
```

`scripts/gold.py` holds the gold set. It finds each target by searching for a phrase, not by
a hard-coded ref, so the build stops if a parser change moves a link.

## Source numbering

Line refs follow the numbers printed in the 1922 text (Project Gutenberg #1321), which are the
numbers Eliot's Notes use. Part V gives 10 numbers to the 11 lines between printed 350 and 360.
The Notes key 357 to the hermit-thrush and 360 to "When I count". So
"Who is the third who walks always beside you?" and "When I count, there are only you and I
together" are one unit, `WL.360`, and every printed number from 360 to 430 matches. Modern
editions that renumber Part V are 1–2 lines off from here (for example, the spider line is
`WL.407` here, as in the Notes). Line 428 keeps the first edition's "ceu" (later "uti").
The epigraph and dedication are not units.

## Targets

Counts are units. "EN" is the size of the aligned English, or a dash when there is none.

| Work | Lang | Units | EN | Ref | Text used |
|---|---|---:|---:|---|---|
| Dante, *Inferno* (all) | it | 4,720 | 4,720 | `Inf.3.55` | PG #1012; Longfellow PG #1001 |
| Dante, *Purgatorio* (all) | it | 4,755 | 4,755 | `Purg.26.148` | PG #1012; Longfellow PG #1002 |
| Ovid, *Metamorphoses* 3, 6 | la | 20 | 20 | `Met.3.314-336` | Perseus (Magnus 1892); Golding 1567 (bk 3), More 1922 (bk 6) |
| Virgil, *Aeneid* 1 | la | 38 | 38 | `Aen.1.723-756` | Perseus (Greenough 1881); Williams 1910 |
| Augustine, *Confessions* 2, 3, 10, 11 | la | 150 | 150 | `Conf.10.53` | PG #33849; Pusey PG #3296 |
| *Pervigilium Veneris* | la | 16 | 16 | `PervVen.22` | Loeb 1912 (Mackail), archive.org OCR |
| Sappho, fragments | grc-Latn | 152 | 121 | `Sappho.W95` | Wharton, PG #57390 |
| *Saṁyutta Nikāya* 35.1–32 | pi | 76 | 64 | `SN35.28.1` | SuttaCentral bilara-data; Sujato English |
| *Bṛhadāraṇyaka Upaniṣad* 5 | en | 31 | – | `BU.5.2.1` | Müller, SBE 15 (1884), archive.org OCR |
| Baudelaire, *Les Fleurs du mal* | fr | 3,207 | – | `Fleurs.83.1` | PG #6099 |
| Verlaine, *Amour* | fr | 1,746 | – | `Amour.31.14` | 1921 Messein ed., archive.org OCR |
| Nerval, *Les Chimères* | fr | 101 | – | `Chimeres.1.2` | PG #55554 |
| Hesse, *Blick ins Chaos* | de | 521 | – | `Hesse.Chaos.211` | Seldwyla 1922, archive.org OCR |
| Wagner, *Tristan und Isolde* | en | 1,857 | – | `Tristan.3.1.24` | Ditson English libretto, PG #16250 |
| Wagner, *Götterdämmerung* | en | 1,772 | – | `Gotterdammerung.3.1` | Armour 1911, PG #49507 |
| KJV: Ecclesiastes, Ezekiel, Luke | en | 2,646 | – | `KJV.Ezek.2.1` | PG #10 |
| Milton, *Paradise Lost* 4 | en | 1,015 | – | `PL.4.140` | PG #26 |
| Shakespeare, *The Tempest* | en | 2,005 | – | `Tempest.1.2.390` | Cambridge ed., PG #23042 |
| Shakespeare, *Antony and Cleopatra* | en | 3,717 | – | `Antony.2.2.239` | PG #1796 |
| Spenser, *Epithalamion*, *Prothalamion* | en | 624 | – | `Proth.18` | Child ed., PG #10602 |
| *Oxford Book of English Verse* 340–380 (Marvell and neighbours) | en | 1,931 | – | `OBEV.357.21` | PG #66619 |
| Webster, *The White Devil* | en | 3,462 | – | `WhiteDevil.5.4.106` | PG #12915 |
| Webster, *The Devil's Law-Case* | en | 3,529 | – | `DevilsLaw.3.2.182` | Dyce 1830 vol. 2, archive.org OCR |
| Middleton, *Women Beware Women* | en | 3,490 | – | `WomenBeware.2.2.233` | Bullen 1885, PG #75606 |
| Kyd, *The Spanish Tragedy* | en | 2,868 | – | `SpanishTragedy.4.1.73` | PG #35330 |
| Day, *The Parliament of Bees* | en | 1,370 | – | `ParliamentBees.383` | 1641 quarto, archive.org OCR |
| Goldsmith, *The Vicar of Wakefield* | en | 403 | – | `Vicar.24.3` | PG #2667 |
| Froude, *Reign of Elizabeth* I, ch. iv | en | 502 | – | `Froude.Eliz1.4.428` | Google scan, archive.org OCR |

By language: en 31,225 · it 9,475 · fr 5,054 · de 521 · la 224 · grc-Latn 152 · pi 76.

### Units and alignment

- **Verse:** one unit per line, numbered within the canto, book, poem or scene.
  - Dante, Paradise Lost, Spenser, the OBEV and the French poems count lines as printed.
  - Plays count printed lines within each scene. Speaker names and stage directions are dropped.
- **Line numbers that are not the editor's:**
  - Antony, the Webster plays, Middleton, Kyd, Tristan and Götterdämmerung use this build's own
    count, so they differ from Globe and Revels numbers. For example, Eliot's "II.ii.190" is
    `Antony.2.2.239`.
  - *The Tempest* uses the Cambridge edition's printed Globe numbers as anchors. Lines between
    anchors are counted, and split half-lines are joined. The anchors at 1.2.390 are exact; the
    end of 5.1 is one line short.
- **Prose:** one unit per paragraph (Vicar, Froude, Confessions sections) or per sentence (Hesse).
- **English alignment:**
  - Dante: Longfellow is line-for-line. All 67 cantos have equal line counts once Longfellow's
    footnote to *Purgatorio* 26 is dropped.
  - Ovid and Virgil: Perseus divides each English translation into "cards" keyed to the Latin
    line where they start. Each card is one passage unit in both files, so units are 5–110
    Latin lines (`Met.3.314-336`).
  - Confessions: Latin sections (Benedictine numbering) and Pusey's paragraphs match one-to-one
    in books 2, 3, 10 and 11. The counts are checked in the build.
  - Pali: SuttaCentral segments grouped by paragraph number. The root and Sujato's
    translation share segment ids.
  - Pervigilium: Mackail's stanzas, Latin and English facing. Where the OCR lost a stanza
    number, neighbouring stanzas are merged (`PervVen.2-3`) so both languages cover the same
    stanzas.
  - Sappho: each Wharton fragment's transliterated Greek, with his literal prose translation.
- **No English alignment:** French, German, the Upanishad (already English) and the Wagner
  libretti (English only).

## Provenance and licence

- **Project Gutenberg:** every text listed above with a PG number. Downloaded on 2026-11-08 from
  `https://www.gutenberg.org/cache/epub/<n>/pg<n>.txt`. Public domain in the US.
  - *The Waste Land* and its Notes (Boni & Liveright, 1922) are public domain in the US.
  - The Hesse (1922), Verlaine edition (1921) and More's Ovid (1922) all predate 1931, so they
    are public domain in the US.
- **Perseus:** `github.com/PerseusDL/canonical-latinLit` (`phi0959.phi006`, `phi0690.phi003`).
  - The underlying editions and translations are 1567–1922 and public domain.
  - The repository's TEI markup is distributed under CC BY-SA. The file headers don't state a
    licence, so this is unverified here.
- **SuttaCentral:** `github.com/suttacentral/bilara-data`, branch `published`, SN 35.1–35.32.
  - Pali root text is the Mahāsaṅgīti edition. The English is Bhikkhu Sujato's.
  - SuttaCentral releases both as CC0. Not re-checked for this build.
- **archive.org OCR** (`https://archive.org/download/<id>/<id>_djvu.txt`):
  - Loeb Pervigilium: `catullustibullus00catu`
  - Webster (Dyce, 1830, vol. 2): `worksofjohnwebst02webs`
  - Verlaine, *Amour*: `amoureditionrevu00verl`
  - Hesse, *Blick ins Chaos*: `bub_gb_vKbrAc4LfyYC`
  - SBE 15: `in.ernet.dli.2015.22552`
  - Day: `bim_early-english-books-1641-1700_the-parliament-of-bees-_day-john_1641`
  - Froude: `bub_gb_JDcNVRMV7xsC`

  All are pre-1931 printings. The OCR is kept as is, apart from long s, which becomes "s",
  and joined hyphens. Expect errors such as "nee" for *nec*, "ilia" for *illa*, "Aeon" for
  "Acteon" and "Eohert" for "Robert".

## Gold: how the notes were mapped

- The source is the line the note is keyed to. For a range note (366–76), it is the first line.
- The targets are every unit holding the words Eliot cites. A three-line citation gives three
  links. A refrain links to its first occurrence only (Prothalamion line 18).
- `note` is Eliot's citation as printed. Long notes are cut with "...".
- Where the note's number and the passage disagree, the target is where the passage actually
  is:
  - Antony "II.ii.190" is `Antony.2.2.239`.
  - The Upanishad "5, 1" is the Datta passage, `BU.5.2.1`–`3`, as Müller numbers it.
- Choices to know about:
  - **31:** The Ditson libretto prints no text for the opening sailor's song ("verses 5-8"). The
    link goes to the same words where the song is reprised in Act I scene ii ("The wind so wild /
    blows homewards now; / my Irish child, / where waitest thou?").
  - **42:** Links to "Blank appears the sea!", the Ditson English for "Öd' und leer das Meer"
    (`Tristan.3.1.24`).
  - **99:** Links to the Met. 6 passages with the rape of Philomela (`vi superat`) and the change
    into birds (`pennis pendere`).
  - **218:** Links to the passage holding the Latin Eliot quotes (`Met.3.314-336`; his quote
    runs to 3.338).
  - **266:** Links to the first lines of the Rhine-daughters' song in Act III. Armour's
    translation omits "Weialala leia".
  - **308:** The Fire Sermon is linked in Pali (SN 35.28). Warren's text, which Eliot cites,
    translates the same sermon from Mahāvagga i.21.
  - **360:** The Part V headnote's "journey to Emmaus" is linked from `WL.360` to Luke
    24:15–16. This is a judgment call; the headnote has no line number.

### Notes not mapped

| Note | Reason |
|---|---|
| Headnote: Weston, *From Ritual to Romance*; Frazer, *Golden Bough* (Adonis, Attis, Osiris) | whole books, no passage |
| 46 Tarot pack, Hanged Man, Fisher King | no text cited |
| 68 "A phenomenon which I have often noticed" | no text cited |
| 100, 115, 126, 428 ("Cf. Philomela in Parts II and III") | cross-references inside the poem |
| 199 ballad "reported to me from Sydney" | source unknown (Eliot says so) |
| 210 currants, "c.i.f. London" | commercial term, no text |
| 264 St Magnus Martyr, *Proposed Demolition of Nineteen City Churches* | pamphlet not obtained |
| 357 Chapman, *Handbook of Birds of Eastern North America* | not on an allowed host |
| 360 Shackleton's Antarctic expedition | no passage named |
| 412 Bradley, *Appearance and Reality*, p. 346 | 1893 text not obtained; page cite |
| 424 Weston, chapter on the Fisher King | whole chapter, no passage |
| 433 "Shantih ... a formal ending to an Upanishad" | generic, no passage |

## Missing or weaker than wanted

Downloads were limited to the hosts in the owner's sandbox allowlist: Gutenberg, archive.org,
GitHub and Perseus. Wikisource, The Latin Library and GRETIL were not reachable.

- **Wagner in German:** the archive.org scans of the *Sämtliche Schriften* are Fraktur, and their
  OCR is unusable. Both libretti are therefore English translations, so notes 31, 42 and 266
  link German or English lines to English targets.
- **Sanskrit Upanishad:** no clean Devanagari text was found. Müller's English (OCR) stands in.
- **Sappho in Greek:** Wharton's Gutenberg text renders the Greek as transliteration
  (`grc-Latn`). The Greek in the Loeb *Lyra Graeca* OCR is lost.
- **Day, Froude, Dyce's Webster, Verlaine, Hesse, Müller, Pervigilium:** OCR noise, as above.
  Page headers and footnotes are filtered out by pattern, so some noise lines remain as units.
- **Webster's *White Devil*** (PG #12915) closes with Webster's note to the reader; it stays as
  units.
- **Not checked by eye:** every unit. Every gold link's target text was checked against the
  note: run `python3 -I scripts/build.py --show` to see all 64.
