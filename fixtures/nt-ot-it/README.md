# The New Testament quoting the Old, in Italian

The Riveduta 1927 New Testament against its Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,957 New Testament verses, ref `BOOK.chapter.verse`. *La Sacra Bibbia*, Riveduta 1927 (Giovanni Luzzi), public domain, from [eBible.org](https://ebible.org/ita1927/) (`ita1927_usfx.zip`; its notes of the Hebrew verse number, such as "(H8-23)", are dropped).
- `target.jsonl`: 23,145 Old Testament verses: the same Bible, numbered as the KJV, chapter for chapter. Psalm titles open verse 1 ("Salmo di Davide. L'Eterno ha detto al mio Signore…").
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `it` and `it`.

```
ligatura eval fixtures/nt-ot-it --neighbours 1
```

## Results

Of 269 links (it → it), `ligatura eval fixtures/nt-ot-it --neighbours 1`, run 2026-11-13 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 41 min, embedding both Testaments.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 114 | 150 | 171 | 192 |
| Overlap only | 108 | 140 | 159 | 174 |
| Retrieval (embedding + overlap) | 122 | 187 | 210 | 232 |

Fused finds 232 of 269 (86%) in the top 10, ahead of either signal alone. Overlap alone is the
weakest of the five languages here (fr 186, es 183, de 198, ar 206). Ranking the whole target by
`lexicalScorer`, stems of at least 3, 4, 5 (the profile) and 6 letters and no stemming all
gave R@10 between 171 and 175 of 269, so the stem length is kept.
