# The New Testament quoting the Old, Italian against English

The Riveduta 1927 New Testament against the King James Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,957 New Testament verses, ref `BOOK.chapter.verse`. Riveduta 1927 (`../nt-ot-it/source.jsonl`, linked).
- `target.jsonl`: 23,145 Old Testament verses: KJV (`../nt-ot-fr-en/target.jsonl`, linked).
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `it` and `en`.

```
ligatura eval fixtures/nt-ot-it-en --neighbours 1
```

## Results

Of 269 links (it → en), `ligatura eval fixtures/nt-ot-it-en --neighbours 1`, run 2026-11-13 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: under a minute; both texts were cached from `nt-ot-it` and `nt-ot-fr-en`.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 104 | 144 | 158 | 175 |
| Retrieval (embedding; no overlap across languages) | 104 | 144 | 158 | 175 |

bge-m3 alone finds 175 of 269 (65%) across the language line, against 192 within Italian.
