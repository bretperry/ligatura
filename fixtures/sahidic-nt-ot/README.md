# The Sahidic New Testament against the Sahidic Old Testament

Coptic (Sahidic) quotations of the Old Testament in the New Testament. The gold set is
H. B. Swete's tables of formal quotations, the same links as `fixtures/lxx-nt`: the Sahidic Old
Testament translates the Septuagint, so the references carry over.

- `source.jsonl`: the Sahidic New Testament, one unit per verse (7,943 verses), ref
  `BOOK.chapter.verse` (USFM codes). **Not in the repository.** Sahidica (J Warren Wells) is
  licensed "for academic use only" and is rebuilt by the scripts below. Mark and 1 Corinthians
  come from Coptic Scriptorium's hand-checked corpora (`sahidica.mark`, `sahidica.1corinthians`);
  the rest from the automatically annotated `sahidica.nt`.
- `target.jsonl`: the Sahidic Old Testament, 20,036 verses, LXX numbering. CoptOT / Crosswire
  via [Coptic Scriptorium](https://github.com/CopticScriptorium/corpora) (`sahidic.ot`),
  CC BY-SA 4.0. It carries the manuscript's supralinear strokes and diaereses; the New Testament
  does not. That mismatch tests the folding.
- `gold.jsonl`: 251 links, `{"source", "target", "note"}`, from `scripts/gold.tsv` (270 rows from
  `lxx-nt`). 19 rows name a verse missing from the Sahidic texts (the Sahidic OT has no Ezra, Nehemiah or Malachi, one chapter of 1 Chronicles and three of
  2 Chronicles, and some chapters elsewhere, e.g. Exodus 30) are left out.
- `fixture.json` sets both languages to `cop`.

```
ligatura eval fixtures/sahidic-nt-ot --neighbours 1
```

## Results

**Pending.** The first eval run (bge-m3, 20,036 target verses) was started on 2026-11-13 and
interrupted. A rerun on the Mac mini is under way; numbers go here when it finishes.

## Rebuild

```
scripts/fetch.sh                 # sparse clone of Coptic Scriptorium's corpora into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold from raw/ and scripts/gold.tsv
```

`--show` prints every gold link with both verses.

## Known problems

- **Bound groups differ by edition.** Sahidica joins more than CoptOT does (ϫⲉⲉⲓⲥⲧⲡⲁⲣⲑⲉⲛⲟⲥ for
  ϫⲉ ⲉⲓⲥ ⲧⲡⲁⲣⲑⲉⲛⲟⲥ), so word overlap loses links that character 3-grams recover.
- **Versification may not match the Septuagint.** Coptic Scriptorium warns that verse numbers can
  differ; a gold row can point one verse off. Use `--neighbours 1`.
- **Formal quotations only**, as in `lxx-nt`; a suggested link outside the gold set may be real.
- **Two translations, not one text.** The Sahidic NT and OT were translated by different hands
  from Greek, so a quotation need not repeat the OT's wording.
