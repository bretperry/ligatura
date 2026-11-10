# The New Testament quoting the Old, in Spanish

The Reina-Valera 1909 New Testament against its Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,955 New Testament verses, ref `BOOK.chapter.verse`. Reina-Valera 1909, public domain, from [seven1m/open-bibles](https://github.com/seven1m/open-bibles) (`spa-rv1909.usfx.xml`).
- `target.jsonl`: 23,129 Old Testament verses: the same Bible; numbered as the KJV (psalm titles open verse 1). 16 verses the KJV has are missing from this file.
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `es` and `es`.

```
ligatura eval fixtures/nt-ot-es --neighbours 1
```

## Results

Of 269 links (es → es), `ligatura eval fixtures/nt-ot-es --neighbours 1`, run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 31 min, embedding both Testaments.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 120 | 160 | 169 | 192 |
| Overlap only | 101 | 146 | 158 | 183 |
| Retrieval (embedding + overlap) | 143 | 183 | 198 | 218 |

Fused finds 218 of 269 (81%) in the top 10. Spanish overlap is the weakest of the three: verb inflection is richer and the light stemmer, held to five letters, joins fewer forms.
