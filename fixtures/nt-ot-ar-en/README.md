# The New Testament quoting the Old, Arabic against English

The Van Dyck New Testament against the King James Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,959 New Testament verses, ref `BOOK.chapter.verse`. Van Dyck (`../nt-ot-ar/source.jsonl`, linked).
- `target.jsonl`: 23,145 Old Testament verses: KJV (`../nt-ot-fr-en/target.jsonl`, linked).
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `ar` and `en`.

```
ligatura eval fixtures/nt-ot-ar-en --neighbours 1
```

## Results

Of 269 links (ar → en), `ligatura eval fixtures/nt-ot-ar-en --neighbours 1`, run 2026-11-13 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: under a minute; both texts were cached from `nt-ot-ar` and `nt-ot-fr-en`.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 88 | 113 | 128 | 149 |
| Retrieval (embedding; no overlap across languages) | 88 | 113 | 128 | 149 |

bge-m3 alone finds 149 of 269 (55%) across the language line, the lowest of the five languages,
against 186 within Arabic. With the vowel marks left in, it found 80 (R@1 36).
