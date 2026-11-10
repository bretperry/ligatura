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
- `gold.jsonl`: 718 links from 550 sentences, `{"source", "target", "note"}`, where `note` is the sidenote as
  printed. 14 carry `"kind": "old-latin"`: the sidenote says Augustine quotes an Old Latin version
  (Sabatier, *vers. vet.*), so the Vulgate wording differs.
- `fixture.json` sets both languages to `la`, so `eval` needs no flags for them.

```
ligatura eval fixtures/augustine-vulgate --neighbours 1
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 150 | 200 | 225 | 257 |
| Overlap only | 206 | 289 | 322 | 356 |
| Retrieval (embedding + overlap) | 214 | 307 | 343 | 398 |

Of 708 scored links, `--neighbours 1`. Run 2026-11-09 on a Mac mini (Apple M2 Pro, 10 CPU cores) with bge-m3 q8; 929 s, nearly all of it embedding the 35,837 verses.
Fused, 56% are in the top 10. Lower than the Greek fixture, as expected: Augustine quotes from
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
- **10 links point at verses the Vulgate here doesn't have** (for example Ps. 115:15–17: the
  edition numbers Psalm 115 from *Credidi* as verse 1, the dataset as 10; Luke 3:45 is a misprint).
  `eval` reports them and doesn't score them.
- **A range keeps its first verse.** "Ps. 102, 3-5" is one link to PSA.102.3. Use `--neighbours 1`.
- **Sidenotes are not every link.** Many echoes have no sidenote, so a suggestion outside the gold
  set is not necessarily wrong.
