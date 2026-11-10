# Augustine to the Vulgate

Augustine's *Confessions*, in Latin, against the Latin Bible. The gold set is the edition's own
sidenotes: where the 1838 Oxford text prints a quotation in italics and names its verse in the
margin.

- `source.jsonl`: 3,529 sentences of the *Confessions*, Books 1–13, ref `book.section.sentence`.
  Text of Du Bois, revised by E. B. Pusey (Oxford, 1838), from Project Gutenberg eBook #33849.
  Public domain.
- `target.jsonl`: 35,837 verses of the Clementine Vulgate, ref `BOOK.chapter.verse` (USFM book
  codes, Vulgate numbering: Psalm 144 is Hebrew 145). From
  [jam963/parallel-catholic-bible-versions](https://huggingface.co/datasets/jam963/parallel-catholic-bible-versions)
  (CC0), which takes the Latin from sacredbible.org.
- `gold.jsonl`: 718 links from 550 sentences (713 scored), `{"source", "target", "note"}`, where `note` is the sidenote as
  printed. 14 carry `"kind": "old-latin"`: the sidenote says Augustine quotes an Old Latin version
  (Sabatier, *vers. vet.*), so the Vulgate wording differs.
- `fixture.json` sets both languages to `la`, so `eval` needs no flags for them.

```
ligatura eval fixtures/augustine-vulgate --neighbours 1
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 159 | 210 | 240 | 275 |
| Overlap only | 218 | 303 | 338 | 374 |
| Character overlap only (4-grams) | 258 | 364 | 400 | 441 |
| Retrieval (embedding + both overlaps) | 256 | 389 | 427 | 463 |
| Reranked, top 30 (`qwen3-reranker-0.6b`) | 210 | 349 | 406 | 469 |

Of 713 scored links (after the corrections below), `--neighbours 1`. Run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores) with bge-m3 q8, from cached vectors (the first run, 2026-11-09, took 929 s, nearly all of it embedding the 35,837 verses).
Fused, 65% are in the top 10 (56% before character overlap, 62% before the corrections).

### What the misses are

All 268 misses of the 708-link run were read on 2026-11-10 (three model readers, one class each,
checked by hand where a fix was made): 111 quotations a retriever should find, 94 allusions with
no shared wording, 33 sidenotes citing the wrong verse (31 now corrected) and 30 sidenotes set
beside a sentence that doesn't quote the verse. Finding every quotation would give about 574 of
713 (80%); of those 111, 34 rank past 100, about 10 share only two or three words and about 8 are
Old Latin wording. 80% is the ceiling of a perfect retriever on this key, not a near target. Lower than the Greek fixture, as expected: Augustine quotes from
memory and from Old Latin versions, and a sidenote often names a verse he only echoes.

## Rebuild

```
scripts/fetch.sh                 # downloads into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold here and in ../augustine-drc
```

`--show` prints every gold link with its sentence and verse.

## Known problems with the answer key

- **Augustine's Bible isn't the Vulgate.** He quotes Old Latin versions, mostly from memory, so
  many quotations differ in wording from the verse they cite. That is the point of the fixture,
  but it means overlap alone can't find them all.
- **Chapter sidenotes are left out.** A sidenote that opens a chapter gives a summary and
  sometimes references (the first one cites Ps. 144:3 for *Magnus es, Domine*). It doesn’t say
  which sentence it means, so its references aren’t gold. 275 of the 1,003 sidenotes in Books
  1–13 are of this kind.
- **A quotation can run past its sentence.** The gold link goes to the sentence where the
  sidenote stands; a quotation that continues into the next sentence is linked only from the
  first.
- **31 sidenotes are corrected in the build** (`CORRECTIONS` and `correct()` in
  `scripts/build.py`; the rows carry `"fixed": true`). An audit of every miss, on 2026-11-10,
  found sidenotes that cite the wrong verse while the sentence quotes another word for word.
  Three rules, applied to every row: the dataset counts Sirach's prologue as chapter 1, so each
  Sirach chapter is one higher; "Ecc." with a chapter past 12 is Ecclesiasticus; Psalm 115 past
  verse 10 is Hebrew numbering (Heb. 116:16 is Vulgate 115:7). The rest are single rows: Hebrew
  Psalm numbers (Ps. 130:1 for *De profundis*, Vulgate 129:1) and misprinted verses (Jas. 2:6
  for 4:6, *superbis resistit*). Each is listed with the words that prove it. Ranges, faint
  echoes and sidenotes set beside the wrong sentence were left as printed.
- **5 links still point at verses the Vulgate here doesn't have** (Luke 3:45, Matt. 18:36 are
  misprints). `eval` reports them and doesn't score them.
- **A range keeps its first verse.** "Ps. 102, 3-5" is one link to PSA.102.3. Use `--neighbours 1`.
- **Sidenotes are not every link.** Many echoes have no sidenote, so a suggestion outside the gold
  set is not necessarily wrong.
