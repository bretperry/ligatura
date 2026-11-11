# Itihāsa: Sanskrit epic verse to English (Sanskrit to English)

Sanskrit shlokas of the *Rāmāyaṇa* and *Mahābhārata* against M. N. Dutt's English translation.
Each shloka should find its own translation among 5,000 English verses. This is translation
retrieval, the cross-lingual floor: if the embedder can't find a verse's own translation, it
won't find a paraphrase or an allusion in English either.

- `source.jsonl`: 500 shlokas in Devanagari, ref `test.<row>` (the row in Itihāsa's test split).
- `target.jsonl`: the English of 5,000 rows of the same split, in row order: the 500 above plus
  4,500 distractors. Same refs.
- `gold.jsonl`: 500 links, each shloka to its own English.
- `fixture.json` sets the source to `sa` and the target to `en`. Word overlap is left out of
  fusion across two languages, so retrieval is the embedder alone.

```
ligatura eval fixtures/itihasa-sa-en --neighbours 1
```

## Source and license

[Itihāsa](https://huggingface.co/datasets/rahular/itihasa) (Aralikatte, de Lhoneux, Kunchukuttan
and Søgaard, *Itihasa: A large-scale corpus for Sanskrit to English translation*, WAT 2021),
Apache-2.0. It pairs 93,000 shlokas with Dutt's translations (1890s–1900s, public domain).

The 5,000 rows are the test and pool of the Sanskrit yardstick in `ligatura-multilingual/lab`
(`lab/corpora.py`, seed 20261108): rows of Itihāsa's **test** split only, shlokas of 20–600
characters and English of 20–900, duplicate shlokas dropped. `scripts/queries.txt` and
`scripts/pool.txt` list them. The lab's bge-m3 fine-tune trains on Itihāsa's train split and
picks checkpoints on its dev split, so none of these rows were seen in training. The fixture is
scored with stock bge-m3, which was not trained on Itihāsa as far as its model card says.

## Rebuild

```
scripts/fetch.sh                  # clones rahular/itihasa into raw/ (git-ignored)
python3 -I scripts/build.py       # writes source, target and gold
```

`build.py` takes another path to the dataset as its first argument.

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Retrieval (bge-m3 only; no overlap across languages) | 169 | 231 | 269 | 311 |

Of 500 links, `--neighbours 1`. Run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores) with
bge-m3 q8; 738 s, nearly all of it embedding. 34% of shlokas find their own translation first,
62% in the top 10; 15 are past rank 1,000. With one right answer among 5,000, R@1 is the
number to watch.

## Known problems

- **Alignment noise.** Itihāsa was extracted automatically from Dutt's printed volumes. Some rows
  hold two or three shlokas against one sentence of English (`test.912`), and a few English rows
  belong to a neighbouring verse. A miss may be the data's.
- **Dutt is loose in places.** He paraphrases, merges verses and leaves epithets out, so a
  correct pair can share little beyond the names.
- **Names carry much of the signal.** Proper nouns (Rāma, Arjuna, Viśvāmitra) appear in both
  languages, and a verse full of names is easy. Verses of pure description are the hard cases.
- **One right answer each.** The epics repeat formulas, so a near-identical English verse may be
  ranked first and still count as a miss.
