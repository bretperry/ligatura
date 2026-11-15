# al-Ghazālī quotes the Quran (Arabic to Arabic)

Quranic verses quoted in {braces} in al-Ghazālī's *Iḥyāʾ ʿulūm al-dīn*, against the Quran, one
unit per verse. The gold set is the verse whose text holds the quotation.

- `source.jsonl`: 456 quotations of 3 or more words from the *Iḥyāʾ*, in the OpenITI text
  (Shamela 9472), unvocalised. Ref `IHY_<volume>.<page>:<n>`: the Shamela page marker after
  the quotation, and its number on that page.
- `target.jsonl`: 6,236 verses, Tanzil Uthmani text with its vowel and Quranic marks. Ref
  `Q<sura>.<aya>`.
- `gold.jsonl`: 526 links. `fixture.json` sets both languages to `ar`.

```
ligatura eval fixtures/ghazali-quran
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3) | 164 | 205 | 217 | 251 |
| Word overlap only (stems) | 401 | 483 | 503 | 510 |
| Retrieval (fused; embedder votes 0, see below) | 401 | 483 | 503 | 510 |
| Retrieval, equal votes (before 2026-11-14) | 253 | 334 | 358 | 399 |

Of 526 links, `--neighbours 0`. Run 2026-11-14 on the Mac mini (first embedding pass 100 minutes,
shared load), bge-m3 q8. Word overlap alone finds 97% in the top 10; 16 links are outside the
overlap top 10 (not examined).

**Fusion weight.** With equal votes, bge-m3 (48% at R@10) pulled correct verses down: fused R@10
was 399. The Arabic profile now sets the embedder's vote to 0 (`fusion` in `src/lang/ar.ts`).
Embedder vote, R@1 / R@10: 0 gives 401 / 510; 0.1 gives 355 / 509; 0.25 gives 302 / 500; 0.5 gives
275 / 484; 1 gives 253 / 399. The weight was chosen on all of this fixture, with no held-out half,
and the fixture is verbatim quotation, so it favours overlap. Paraphrase and allusion may earn the
embedder's vote back. Arabic character n-grams were not tried.

## Sources and licenses

- Quran: [Tanzil](https://tanzil.net) Uthmani text v1.1, downloaded 2026-11-13.
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Terms: the text may not be changed
  and the source and a link to tanzil.net must be given. `target.jsonl` holds the verses
  verbatim, split one per line; copy Tanzil's notice if you redistribute it.
- *Iḥyāʾ ʿulūm al-dīn*: [OpenITI](https://github.com/OpenITI) release
  `0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed`, from the Shamela library. OpenITI's
  data is shared under CC BY 4.0 by its README; the Shamela text's own terms are not stated in
  the file, so check them before redistributing `source.jsonl`.

## Rebuild

```
scripts/fetch.sh                 # downloads both files into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold; --show prints every link
```

## How the gold was made

`scripts/build.py` takes every `{...}` span of 3 or more words, folds it (marks, alef forms,
ى, ة, spaces removed) and finds it inside the folded Quran. A span in 1 to 3 places links to each
verse it touches; one in more than 3 places (a repeated formula) is dropped. 526 links for 456
quotations. The match is on text, so the gold is exact but easy: every quotation is verbatim.

## Known problems

- **Verbatim quotation only.** Paraphrase and allusion are not in the gold, so recall here is an
  upper bound for real intertextual work.
- **Spans cut short.** Al-Ghazālī often quotes part of a verse; a long verse is a small target.
- **Page refs are approximate:** the marker position in the OpenITI text decides the page.
- **Unvocalised source, vocalised target.** Folding makes them equal, so this fixture tests the
  folding and the clitic splitting, not vocalisation.
