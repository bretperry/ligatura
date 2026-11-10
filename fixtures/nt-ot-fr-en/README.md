# The New Testament quoting the Old, French against English

The Ostervald New Testament (French) against the King James Old Testament (English). The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,958 New Testament verses, ref `BOOK.chapter.verse`. Ostervald (`../nt-ot-fr/source.jsonl`, linked).
- `target.jsonl`: 23,145 Old Testament verses: KJV, public domain, from [seven1m/open-bibles](https://github.com/seven1m/open-bibles).
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `fr` and `en`.

```
ligatura eval fixtures/nt-ot-fr-en --neighbours 1
```

## Results

Of 269 links (fr → en), `ligatura eval fixtures/nt-ot-fr-en --neighbours 1`, run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 21 min, embedding the KJV Old Testament (the French NT was cached).

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 100 | 147 | 161 | 185 |
| Retrieval (embedding; no overlap across languages) | 100 | 147 | 161 | 185 |

bge-m3 alone finds 185 of 269 (69%) across the language line, against 201 within French. Overlap doesn't apply across languages, so fused equals embedding only.
