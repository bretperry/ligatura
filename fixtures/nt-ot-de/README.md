# The New Testament quoting the Old, in German

The Luther 1912 New Testament against its Old Testament. The gold set is Swete's tables of New Testament quotations, renumbered for a Bible
translated from the Hebrew. Built by `../nt-ot-fr/scripts/build.py`; its README gives the
sources, how the gold was renumbered, and the known problems.

- `source.jsonl`: 7,957 New Testament verses, ref `BOOK.chapter.verse`. Luther 1912, public domain, from [seven1m/open-bibles](https://github.com/seven1m/open-bibles) (`deu-luther1912.osis.xml`; its 81 marginal notes are dropped).
- `target.jsonl`: 23,214 Old Testament verses: the same Bible, Hebrew numbering: psalm titles are verses, and chapters split where the Hebrew's do (Joel 2:28 is 3:1).
- `gold.jsonl`: 269 links from 241 NT verses, target refs in Luther's numbering.
- `fixture.json` sets the languages to `de` and `de`.

```
ligatura eval fixtures/nt-ot-de --neighbours 1
```

## Results

Of 269 links (de → de), `ligatura eval fixtures/nt-ot-de --neighbours 1`, run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores), bge-m3 q8, no reranker. Time: 31 min, embedding both Testaments.

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only | 123 | 165 | 182 | 200 |
| Overlap only | 109 | 159 | 175 | 198 |
| Retrieval (embedding + overlap) | 154 | 201 | 213 | 233 |

Fused finds 233 of 269 (87%) in the top 10, the best of the three. Luther's New Testament often repeats his Old Testament wording, so overlap alone nearly matches the embedder.
