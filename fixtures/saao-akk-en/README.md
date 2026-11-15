# Letters of Assyrian and Babylonian scholars (Akkadian to English)

Neo-Assyrian and Neo-Babylonian letters from the court of Esarhaddon and Assurbanipal, in
transliteration, against their English translation. Each Akkadian passage should find its own
translation among 1,944 English passages: translation retrieval, the cross-lingual floor.

- `source.jsonl`: 1,944 passages, ORACC transliteration (hyphenated signs, `⸢ ⸣` and `[ ]` for
  damage, determinatives in `{}`). A passage is the lines one translation cell covers. Ref
  `P<CDLI number>.<n>`, n the passage's order in the letter.
- `target.jsonl`: the English of each passage, same refs.
- `gold.jsonl`: 1,944 links, each passage to its own English.
- `fixture.json` sets the source to `akk` and the target to `en`. Word overlap is left out of
  fusion across two languages, so retrieval is the embedder alone.

```
ligatura eval fixtures/saao-akk-en --neighbours 1
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 36 | 72 | 103 | 141 |

Of 1,944 links, `--neighbours 1`. Run 2026-11-15 on a Mac mini (10 CPU cores), bge-m3 q8; it
took 94 s to embed the English and 210 s the Akkadian. That is 1.9% at R@1 and 7.3% at R@10.
bge-m3 has seen little Akkadian transliteration, and many letters repeat the same formulas
(greetings, "may Nabû and Marduk bless the king"), so neighbouring passages look alike.
Passages with many broken signs (`x`) carry little to match.

The word and character lists of the `akk` profile are not exercised here, since gold links
only cross languages. No Akkadian-to-Akkadian fixture exists yet, so those lists are unmeasured.

## Source and license

[SAAo/SAA10](https://oracc.museum.upenn.edu/saao/saa10/), *Letters from Assyrian and Babylonian
Scholars* (S. Parpola, State Archives of Assyria 10, 1993), in the State Archives of Assyria
Online, part of ORACC. The project's `metadata.json` states "released under the CC0 license"
(https://creativecommons.org/publicdomain/zero/1.0/). The translations come from the same
project's page for each letter (`https://oracc.museum.upenn.edu/saao/saa10/<P number>/html`);
I did not find a separate licence statement for them, so check the project's terms before
redistributing beyond this fixture.

`scripts/fetch.sh` downloads the 389 pages to the NAS; `scripts/build.py` writes the three
files from them. The raw pages are not in the repository.

## Known problems

- Passages are cut where the translator's cell breaks, not where the Akkadian does, so a
  passage may begin mid-sentence.
- Passages under 3 words on either side, or with fewer than 3 readable words, are dropped
  (389 letters gave 1,944 passages).
- Spellings follow the edition's (Neo-Assyrian) conventions, so other periods may fold less well.
