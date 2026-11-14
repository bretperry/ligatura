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

Not yet measured: the first run was stopped on 2026-11-14 after 1.5 hours (CPU shared with other
jobs, bge-m3 embedding 6,236 verses). The embedding cache keeps finished batches, so a rerun
resumes. Do not quote numbers for Arabic until this table is filled in.

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
