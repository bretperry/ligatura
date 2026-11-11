# The Septuagint in the New Testament

The Greek New Testament against the Greek Old Testament. The gold set is H. B. Swete's tables of
the passages the New Testament formally quotes.

- `source.jsonl`: 7,939 verses of the New Testament, ref `BOOK.chapter.verse` (USFM codes).
  [SBLGNT](https://github.com/LogosBible/SBLGNT), CC BY 4.0 (Society of Biblical Literature and
  Logos Bible Software). Its variant markers (⸀ ⸂ ⸃) are stripped.
- `target.jsonl`: 28,113 verses of the Septuagint, Swete's edition (*The Old Testament in Greek
  according to the Septuagint*, Cambridge), LXX numbering (Psalm 109 is Hebrew 110; Jeremiah
  in LXX order). From [First1KGreek](https://github.com/OpenGreekAndLatin/First1KGreek)
  (`data/tlg0527`), CC BY-SA 4.0. Daniel, Susanna and Bel are Theodotion's version; the Old
  Greek is left out so each ref is unique. Marginal notes are dropped, and Latin capitals that the
  OCR typed inside Greek words (ΜΑΚAPΙΟΣ) are mapped back to Greek.
- `gold.jsonl`: 266 links from 237 NT verses, `{"source", "target", "note"}`.
- `fixture.json` sets both languages to `grc`.

```
ligatura eval fixtures/lxx-nt --neighbours 1
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 110 | 140 | 154 | 164 |
| Overlap only | 146 | 178 | 195 | 208 |
| Character overlap only (4-grams) | 160 | 192 | 204 | 217 |
| Retrieval (embedding + both overlaps) | 165 | 207 | 217 | 228 |

Of 266 links, `--neighbours 1`. Run 2026-11-10 from cached vectors; the first run, 2026-11-09, on a Mac mini (Apple M2 Pro, 10 CPU cores) with bge-m3 q8, took 1,611 s, nearly all of it embedding the 28,113 LXX verses
once (later runs read the cache). Fused, 86% of the quotations are in the top 10. Overlap does more
than the embedder here: the New Testament quotes the Septuagint closely. The misses are loose or
composite quotations (1 Cor. 2:9 / Isa. 64:4 at rank 94) and verses the OCR garbled.

## Where the gold links come from

Swete, *An Introduction to the Old Testament in Greek* (Cambridge, 1900), Part III chapter 2,
pp. 381–391: six tables of formal quotations (Synoptic Gospels, John, Acts, Catholic Epistles,
Paul, Hebrews), checked against his master table in Old Testament order. Public domain. The
text is the Internet Archive OCR of `introductiontool00swet`.

The OCR runs the table columns together and garbles numerals, so the tables were transcribed by
hand into `scripts/gold.tsv`, one row per NT passage and OT passage. The note on each row gives
the table and Swete's reference, plus:

- `ocr-fixed` (55 of the 266 scored links): a garbled numeral was corrected by checking that both verses share the
  quoted words (Isa. "111. 4" is liii. 4).
- `from-master` (53): the Pauline table lost its NT column in the OCR, from Rom. xi to Gal.;
  the NT reference comes from the master table.
- `verse-fixed`: Swete's verse differs from this text's verse division. The First1KGreek Psalms
  count a title as verse 1 (Swete's Ps. viii. 2 is PSA.8.3), and Exodus 20 puts the commandments
  in LXX order.
- `alt` (8): a parallel Swete gives in brackets, such as Num. ix. 12 for John xix. 36.

Quotation counts match the totals Swete states (he gives none for the Catholic Epistles),
except the Synoptic table: 45 of his 46, since one row was lost in the OCR. One Pauline link
(1 Cor. iii. 19 / Job v. 13) was dropped as unreadable.

## Rebuild

```
scripts/fetch.sh                 # clones SBLGNT and First1KGreek (sparse) into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold from raw/ and scripts/gold.tsv
```

`--show` prints every gold link with both verses.

## Known problems

- **The LXX text has gaps.** First1KGreek's Swete is incomplete in places: Theodotion's Daniel
  stops at 12:4, and Exodus 25:40 and Deuteronomy 21:23 are missing. Four gold rows point at
  such verses; the build leaves them out of `gold.jsonl` (266 of 270 rows). Ecclesiastes has no Greek file.
- **Some verses are short or garbled by OCR** (Gen. 2:24, Exod. 20:13, Deut. 31:8, 32:35), so a
  correct pair can share few words.
- **A range keeps its first verse.** "Isa. xl. 3—5" is one link to ISA.40.3. Use `--neighbours 1`.
- **Formal quotations only.** Swete's tables leave out allusions. A suggested link outside the
  gold set may still be real.
- **Hand transcription.** The gold was read from OCR, not page images. Rows marked `ocr-fixed`
  or `from-master` were checked against the texts, but a misread that still produced a plausible
  pair would pass that check.
