# Kempis to the Gospels

The Imitation of Christ, Books 1–4, against the four Gospels. The gold set is the edition's own
footnotes: where the printed text marks a sentence as quoting or echoing a Gospel verse.

- `source.jsonl`: 2,432 sentences of the Imitation, ref `book.chapter.sentence`. Translation by
  William Benham, from Project Gutenberg eBook #1653. Public domain.
- `target.jsonl`: 3,766 verses of Matthew, Mark, Luke and John, Douay-Rheims (1899 American
  Edition), from [open-bibles](https://github.com/seven1m/open-bibles). Public domain. The
  source file has placeholder text for 11 verses (John 4:17, 15:2–10, Matthew 12:43); they're
  left out.
- `gold.jsonl`: 51 footnoted links. 2 point at the left-out verses, so 49 are scored.

Known problems with the answer key:

- The footnotes number John 6 as the King James does; Douay-Rheims is one verse later. Some
  footnotes cite the verse next to the one quoted. Run eval with `--neighbours 1`.
- Most of the edition's footnotes point outside the Gospels (Psalms, Job, Paul). Only Gospel links
  are here.
- Footnotes are not every link. Many real echoes have no footnote, so a suggestion missing from
  the gold set is not necessarily wrong.

```
ligatura eval fixtures/kempis-gospels --neighbours 1
```
