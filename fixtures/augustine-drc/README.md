# Augustine to the Douay-Rheims (Latin to English)

The Latin *Confessions* against the Bible in English: the cross-lingual version of
`../augustine-vulgate`. Same source and same gold links; the target is the Douay-Rheims
(Challoner revision), whose verses carry the same Vulgate refs.

- `source.jsonl`: 3,529 Latin sentences of the *Confessions* (see `../augustine-vulgate`).
- `target.jsonl`: 35,461 Douay-Rheims verses, ref `BOOK.chapter.verse`, Vulgate numbering. From
  [jam963/parallel-catholic-bible-versions](https://huggingface.co/datasets/jam963/parallel-catholic-bible-versions)
  (CC0), which takes the text from scrollmapper's bible_databases. Public domain. 376 verses
  have no English in the dataset (220 in Sirach, 66 each in Esther and Lamentations) and are
  left out. The same 5 gold links as in the Latin fixture point at missing verses, and one more: Sir. 18:30 (SIR.19.30), one of the Sirach verses with no English.
- `gold.jsonl`: the 718 links of `../augustine-vulgate`.
- `fixture.json` sets the source to `la` and the target to `en`. Word overlap is left out of
  fusion across two languages, so retrieval is the embedder alone.

```
ligatura eval fixtures/augustine-drc --neighbours 1
```

Built by `../augustine-vulgate/scripts/build.py`.

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Retrieval (bge-m3 only; no overlap across languages) | 100 | 140 | 162 | 190 |

Of 708 scored links, `--neighbours 1`. Run 2026-11-09 on a Mac mini (Apple M2 Pro, 10 CPU cores) with bge-m3 q8; 1,194 s. 27% in the top 10, against 36% for the
same embedder Latin to Latin (257) and 62% fused. Across languages there is no overlap signal,
and that is most of what is lost.

## Is it honest?

The links are Pusey's, made between the Latin text and the Latin Bible. Douay-Rheims translates
the Vulgate verse by verse, so a link to a Vulgate verse is a link to the same Douay-Rheims verse.
What changes is the task: a Latin sentence must find an English verse by meaning alone. All the
known problems of `../augustine-vulgate` apply, and the gap between Augustine's Old Latin wording
and the Vulgate is wider again after translation.
