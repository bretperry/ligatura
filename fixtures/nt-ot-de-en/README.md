# The New Testament quoting the Old, German against English

The Luther 1912 New Testament against the King James Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,957 New Testament verses, ref `BOOK.chapter.verse`. Luther 1912 (`../nt-ot-de/source.jsonl`, linked).
- `target.jsonl`: 23,145 Old Testament verses: KJV (`../nt-ot-fr-en/target.jsonl`, linked).
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `de` and `en`.

```
ligatura eval fixtures/nt-ot-de-en --neighbours 1
```

## Results

Of 269 links (de → en), `ligatura eval fixtures/nt-ot-de-en --neighbours 1`, run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 16 s; both texts were cached from `nt-ot-de` and `nt-ot-fr-en`.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 104 | 138 | 153 | 175 |
| Retrieval (embedding; no overlap across languages) | 104 | 138 | 153 | 175 |

bge-m3 alone finds 175 of 269 (65%) across the language line, the lowest of the three pairs, against 200 within German.
