# Parallel passages in the Hebrew Bible

Chronicles, Isaiah, Obadiah and Deuteronomy against the books they retell. The gold set is the
standard synoptic parallels (Chronicles and Samuel–Kings, Isaiah 36–39 and 2 Kings 18–20,
Obadiah and Jeremiah 49, the two Decalogues), aligned verse by verse.

- `source.jsonl`: 4,036 verses of 1–2 Chronicles, Isaiah, Obadiah and Deuteronomy.
- `target.jsonl`: 9,959 verses of Genesis, Exodus, 1–2 Samuel, 1–2 Kings, Psalms, Jeremiah and
  Ezra. Source and target books never overlap, so no verse can match itself.
- Both from the [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb)
  (commit `d4265df`), which encodes the Westminster Leningrad Codex 4.20. The WLC text is public
  domain; the OSHB encoding is CC BY 4.0: "Original work of the Open Scriptures Hebrew Bible
  available at https://github.com/openscriptures/morphhb". The text is kept pointed, with
  cantillation, maqaf and sof pasuq, as the codex has it; only the encoding's `/` morpheme
  breaks and its notes are dropped. Ref `BOOK.chapter.verse` (USFM codes), Hebrew versification
  (Psalm titles are verse 1).
- `gold.jsonl`: 471 links from 471 source verses, `{"source", "target", "note"}`.
- `fixture.json` sets both languages to `hbo`.

```
ligatura eval fixtures/hbo-parallels
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 427 | 445 | 450 | 453 |
| Overlap only | 433 | 455 | 458 | 464 |
| Character overlap only (3-grams) | 441 | 460 | 463 | 464 |
| Retrieval (embedding + both overlaps) | 448 | 461 | 462 | 464 |

Of 471 links, `--neighbours 0`. Run 2026-11-14 on a Mac mini (Apple M2 Pro, 10 CPU cores) with
bge-m3 q8: 46 minutes, nearly all of it embedding the 9,959 target verses once. Fused, 98.5% of
the links are in the top 10. Character 3-grams beat 4-grams (R@1 445, overlap alone) and
5-grams (430), so the profile uses 3: Hebrew words are short once the vowels are gone. Of the
seven misses, two are outside the top 30: 2 Chr. 12:9 / 1 Kgs 14:25 (rank 47) and the
Decalogue's sabbath reason, Deut. 5:15 / Exod. 20:11 (rank 111), which give different reasons in
different words.

## Where the gold links come from

`scripts/gold.tsv` lists 114 rows of verse ranges, each pairing the i-th source verse with the
i-th target verse. They were written from the well-known synoptic parallels, not transcribed from
a published synopsis, and checked against the texts: every link was scored by shared stems, and
the rows with fewest shared stems were read. That check moved 1 Chronicles 19, where
Chronicles has one verse more than 2 Samuel 10 (19:6–7 for 10:6), and dropped two pairs that
share a topic but not wording (1 Chr. 13:5 / 2 Sam. 6:1, 2 Chr. 1:10 / 1 Kgs 3:9).

## Rebuild

```
scripts/fetch.sh                 # clones the OSHB into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold from raw/ and scripts/gold.tsv
```

## Known problems

- **Easy for overlap.** The Chronicler copied Samuel–Kings closely, so most pairs share many
  words; this fixture tests that Hebrew folding and splitting work, not how well ligatura finds
  a loose allusion. Expect lower recall on looser reuse (the prophets quoting the Torah).
- **Partial parallels are left out.** Where Chronicles abridges, expands or reorders (1 Chr. 21
  and 2 Sam. 24, 2 Chr. 32 and 2 Kgs 18–19), only the verses that clearly correspond are in the
  gold set. A suggested link outside it may still be real.
- **One verse each way.** Where a source verse covers two target verses (Isa. 37:15–16 against
  2 Kgs 19:15), the gold set keeps one.
- **Checked by overlap.** The check that confirmed the alignment used shared words, so a pair
  aligned wrongly but sharing words would pass it, and the gold set favours pairs that share words.
