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

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 0 | 0 | 0 | 0 |
| Overlap only | 103 | 130 | 136 | 151 |
| Character overlap only (3-grams) | 141 | 169 | 182 | 196 |
| Retrieval, equal votes (embedding + both overlaps) | 102 | 152 | 162 | 177 |
| Retrieval, no embedder vote | 125 | 154 | 162 | 178 |
| Retrieval, as shipped (character overlap alone) | 141 | 169 | 182 | 196 |

Of 251 links, `--neighbours 1`. Run 2026-11-14 on the Mac mini (10 cores) with bge-m3 q8; embedding
the 20,036 target verses took 8,797 s under heavy load (later runs read the cache). Fused, 78% of
the quotations are in the top 10.

- **bge-m3 does not read Coptic.** It finds none of the 251 links at any rank cut. With an
  equal vote it pulled the fused R@1 down to 102, below character overlap alone.
- **Character 3-grams beat word overlap** (141 against 103 at R@1): the two editions cut bound
  groups differently, so whole stems often differ where the letters agree. The Coptic profile
  therefore fuses on character overlap alone, as Sanskrit does.
- **The weights were chosen on the whole fixture,** not on one half with the other held out, so
  the 196 is not a held-out number. The margin over the next best list (125 / 178) is large.
- The 55 links outside the top 10 are mostly short or loose quotations (the Exod. 20 commandments,
  Isa. 64:4); the pool-miss counts above were not re-tallied for the shipped weights.

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
