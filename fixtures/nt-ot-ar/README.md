# The New Testament quoting the Old, in Arabic

The Van Dyck New Testament against its Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,959 New Testament verses, ref `BOOK.chapter.verse`. The Smith–Van Dyck Arabic Bible (Syrian Mission, 1865), public domain, from [eBible.org](https://ebible.org/arb-vd/) (`arb-vd_usfx.zip`; its section headings are dropped). The text has full vowel marks.
- `target.jsonl`: 23,145 Old Testament verses: the same Bible, numbered as the KJV, chapter for chapter. Psalm titles are dropped, as in the KJV file.
- `gold.jsonl`: 269 links from 241 NT verses, target refs in KJV numbering.
- `fixture.json` sets the languages to `ar` and `ar`.

```
ligatura eval fixtures/nt-ot-ar --neighbours 1
```

## Results

Of 269 links (ar → ar), `ligatura eval fixtures/nt-ot-ar --neighbours 1`, run 2026-11-13 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 8 min, embedding both Testaments.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 124 | 155 | 170 | 186 |
| Overlap only | 141 | 184 | 194 | 206 |
| Retrieval (embedding + overlap) | 165 | 196 | 209 | 225 |

Fused finds 225 of 269 (84%) in the top 10. Overlap beats the embedder here, the only language of
the five where it does.

### Vowel marks

The first run gave bge-m3 the vowelled text as printed. It found 124 links in the top 10
(fused 211) and took 79 minutes: the marks roughly double the tokens. The profile now hands the
embedder the text without vowel marks (`embedText` in `src/lang/ar.ts`):

| Embedder reads | Embedding R@1 / R@10 | Fused R@1 / R@10 |
|---|---|---|
| vowelled text | 71 / 124 | 128 / 211 |
| marks removed (profile) | 124 / 186 | 165 / 225 |

Stems were left as they are. Ranking the whole target by `lexicalScorer`, the profile gave R@10
206 of 269; no stemming 204, pronoun suffixes only 205, stems of 3+ letters 208, `minKey` 3 202,
and splitting a lone ب, ل or ك 199.
