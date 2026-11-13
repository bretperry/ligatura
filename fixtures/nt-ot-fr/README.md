# The New Testament quoting the Old, in French

The French New Testament against the French Old Testament, both from the Ostervald Bible. The
gold set is H. B. Swete's tables of the passages the New Testament formally quotes, the same
links as `../lxx-nt`, renumbered for a Bible translated from the Hebrew.

This folder's `scripts/` builds ten fixtures, one pair per language:

| Fixture | Source (NT) | Target (OT) | Languages |
|---|---|---|---|
| `nt-ot-fr` | Ostervald | Ostervald | fr → fr |
| `nt-ot-fr-en` | Ostervald | KJV | fr → en |
| `nt-ot-es` | Reina-Valera 1909 | Reina-Valera 1909 | es → es |
| `nt-ot-es-en` | Reina-Valera 1909 | KJV | es → en |
| `nt-ot-de` | Luther 1912 | Luther 1912 | de → de |
| `nt-ot-de-en` | Luther 1912 | KJV | de → en |
| `nt-ot-it` | Riveduta 1927 | Riveduta 1927 | it → it |
| `nt-ot-it-en` | Riveduta 1927 | KJV | it → en |
| `nt-ot-ar` | Van Dyck | Van Dyck | ar → ar |
| `nt-ot-ar-en` | Van Dyck | KJV | ar → en |

- `source.jsonl`: 7,958 verses of the New Testament, ref `BOOK.chapter.verse` (USFM codes).
  *La Bible J. F. Ostervald*, the 1996 revision of the 1744 text, public domain as distributed
  by the Unbound Bible (Biola University) and [seven1m/open-bibles](https://github.com/seven1m/open-bibles).
- `target.jsonl`: 23,214 verses of the Old Testament, same Bible, its own numbering: psalm titles
  are verses, as in the Hebrew (Ps. 22:1 is the title, "Mon Dieu, mon Dieu" is 22:2).
- `gold.jsonl`: 269 links from 241 NT verses, `{"source", "target", "note"}`; `note` gives
  Swete's table and reference and the LXX ref it came from.
- `fixture.json` sets both languages to `fr`.

The `-en` fixtures link their `source.jsonl` to the same-language fixture's, and their
`target.jsonl` to `nt-ot-fr-en`'s (the KJV Old Testament, 23,145 verses, public domain), so
each text is stored once.

```
ligatura eval fixtures/nt-ot-fr --neighbours 1
```

## Results

Of 269 links (fr → fr), `ligatura eval fixtures/nt-ot-fr --neighbours 1`, run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 27 min, embedding both Testaments.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 137 | 171 | 186 | 201 |
| Overlap only | 116 | 152 | 166 | 186 |
| Retrieval (embedding + overlap) | 150 | 195 | 209 | 225 |

Fused finds 225 of 269 (84%) in the top 10, ahead of either signal alone. Of the 44 it misses, 32 fall outside the top 30: loose quotations (Rom. 3:10 / Ps. 14:1), quotations where the LXX and the Hebrew differ (Heb. 11:21 / Gen. 47:31), and ranges whose words sit in a later verse.

### Stem length

The French, Spanish and German stemmers were tuned on these fixtures. Overlap only, R@10 of 269,
measured with a script that ranks the whole target by `lexicalScorer` (2026-11-10):

| Stems | fr | es | de |
|---|---|---|---|
| at least 3 letters | 180 | 165 | 191 |
| no stemming | 188 | 179 | 197 |
| at least 5 letters | 186 | 183 | – |
| at least 6 letters | – | – | 198 |

Short stems joined unrelated words (Spanish *vida* and *vid*), so the profiles keep five letters,
six in German. The eval's overlap-only row differs slightly: it ranks only the top 30.

## Where the gold links come from

`../lxx-nt/scripts/gold.tsv`: Swete, *An Introduction to the Old Testament in Greek*
(Cambridge, 1900), pp. 381–391, transcribed by hand (see `../lxx-nt/README.md`). Its 270 rows
give the LXX verse in First1KGreek's numbering. `scripts/build.py` renumbers them:

1. **LXX to Hebrew chapters.** Psalms (LXX 9 is Hebrew 9–10, LXX 113 is 114–115, and so on) and
   Jeremiah 38 → 31.
2. **Hebrew verses to the KJV's.** Psalm titles counted as verses come off. How many each psalm
   has is read from the data: the Ostervald psalm's verse count minus the KJV's.
3. **Five LXX verse orders, fixed by hand** after reading both verses: the LXX gives the
   commandments as adultery, theft, murder (Exod. 20:13–15), puts cursing parents before
   stealing a man (21:16–17), and numbers Num. 30 as the Hebrew does.
4. **KJV to each Bible.** Ostervald and Luther number psalms as the Hebrew does (titles back
   on). Luther also splits chapters where the Hebrew does (Joel 2:28 is Luther's 3:1; Mal.,
   Hos., Mic., Nah., Deut. 29, Isa. 9 and 64, Jer. 9 move too), and Ostervald does for
   Isa. 9:1 and Num. 30. The 13 moves are listed in `build.py`, each checked by
   reading the verse. The Riveduta and the Van Dyck number every chapter as the KJV does
   (each has the KJV's 23,145 Old Testament verses, chapter for chapter), so nothing moves.

One row is left out: Heb. 1:6 quotes "let all the angels of God worship him", which the LXX has
at Deut. 32:43 and the Hebrew doesn't. Four rows `../lxx-nt` couldn't score (First1KGreek lacks
Dan. 12:11, Deut. 21:23 and Exod. 25:40) are scored here.

`python3 -I scripts/build.py --show` prints every gold link in the KJV with the words the two
verses share. 24 share fewer than two content words: loose quotations (Rom. 3:10 / Ps. 14:1,
Heb. 1:6 / Ps. 97:7), or quotations where Greek and Hebrew differ (Matt. 8:17 / Isa. 53:4).

## Rebuild

```
scripts/fetch.sh                 # clones open-bibles, downloads two eBible.org zips into raw/ (git-ignored)
python3 -I scripts/build.py      # writes all ten fixtures
```

## Known problems

- **One translator on both sides.** The same team translated both Testaments, and often made a
  New Testament quotation match its Old Testament wording. Overlap is easier here than for a
  later author quoting from memory (compare `../augustine-vulgate`).
- **The quoted text is the LXX's, the target the Hebrew's.** Where they differ (Heb. 10:5 / Ps.
  40:6, "a body hast thou prepared me"), the Old Testament verse here doesn't say what the New
  Testament quotes.
- **A range keeps its first verse.** "Isa. xl. 3–5" is one link to ISA.40.3. Use `--neighbours 1`.
- **Formal quotations only.** Swete leaves out allusions, so a suggestion outside the gold set may
  still be right.
- **Ostervald 1996.** The text is the 1996 revision as the Unbound Bible distributes it, not the
  Louis Segond 1910 this fixture first meant to use; Segond wasn't available offline.
- **Italian and Arabic come from eBible.org, not open-bibles.** open-bibles has no Arabic, and
  its `ita-riveduta.osis.xml` is listed as the Riveduta 1927 but its header names the copyrighted
  Riveduta 1990. eBible.org's zips are regenerated from time to time; `fetch.sh` checks the
  SHA-256 of the copies used on 2026-11-13 and warns if a new download differs.
