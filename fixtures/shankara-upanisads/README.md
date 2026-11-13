# Śaṅkara quotes the Upaniṣads (Sanskrit to Sanskrit)

Śaṅkara's commentary on the *Brahmasūtra* against the Upaniṣads and the *Bhagavadgītā* it
quotes. The gold set is the commentary's own citations: the GRETIL edition prints a reference
after each quotation, as in `'tattvamasi' (chāndo. 6.8.7)`.

- `source.jsonl`: 1,212 quotations from the *Brahmasūtrabhāṣya* (all four adhyāyas), IAST. Each
  unit is the words before one citation mark, back to where the quotation opens (at most 8
  daṇḍa-pieces), with the marks removed. Ref `BBs_<adhyāya>,<pāda>.<sūtra>:<n>`: the sūtra the
  commentary is on, and the citation's number in it. Only quoting sentences are included, since
  recall is scored per gold link.
- `target.jsonl`: 2,148 units of mūla text, one per mantra or verse, IAST: Chāndogya 623,
  Bṛhadāraṇyaka (Kāṇva) 432, Kaṭha 119, Śvetāśvatara 113, Praśna 67, Aitareya 33, Taittirīya 31
  (one per anuvāka, as Śaṅkara cites it), Īśā 18, Māṇḍūkya 12, and the *Bhagavadgītā* 700. Refs
  follow Śaṅkara's numbering: `CHU.6.8.7`, `BAU.2.4.13`, `TU.2.1`, `KU.2.19` (vallī.verse, six
  vallīs), `PU.1.2`, `AU.1.1.1`, `IU.2`, `MaU.2`, `SU.1.1`, `BG.2.19`.
- `gold.jsonl`: 1,217 links.
- `fixture.json` sets both languages to `sa`.

```
ligatura eval fixtures/shankara-upanisads --neighbours 1
```

## Results

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Embedding only (bge-m3, transformers.js 4.3.2, 2026-11-13) | 323 | 423 | 483 | 570 |
| Word overlap only (stems) | 630 | 785 | 835 | 882 |
| Character overlap only (6-grams, spaces removed) | 1,004 | 1,123 | 1,142 | 1,153 |
| Retrieval (fused; character overlap only, see below) | 1,004 | 1,124 | 1,143 | 1,154 |
| Retrieval, equal votes (before 2026-11-10) | 695 | 896 | 960 | 1,031 |

Of 1,217 links, `--neighbours 1`. Run 2026-11-10 on a Mac mini (Apple M2 Pro, 10 CPU cores) with
bge-m3 q8. Character overlap alone finds 95% in the top 10. Word stems lose to n-grams by 271
links at R@10, which is sandhi at work.

**Fusion weights.** With equal votes in reciprocal rank fusion, bge-m3 (46% at R@10) pulled
correct verses down: fused R@10 was 85%. The Sanskrit profile now sets the embedder's and the
stems' votes to 0 (`fusion` in `src/lang/sa.ts`), so the fused list is the character list; the
other two break the tie only for a source unit that shares no 6-gram with any target (one link
here, hence 1,154). The weights were chosen on adhyāyas 1–2 of the *Brahmasūtra* (558 links)
and checked on adhyāyas 3–4 (659 links), R@1 / R@10:

| Votes: embedding, stems, characters | Adhyāyas 1–2 (chosen on) | Adhyāyas 3–4 (held out) |
|---|---|---|
| 1, 1, 1 (equal) | 354 / 508 | 341 / 523 |
| 0, 1, 1 (embedder left out) | 450 / 545 | 472 / 587 |
| 0.1, 0.1, 1 | 457 / 557 | 461 / 594 |
| 0, 0.1, 1 | 487 / 558 | 504 / 596 |
| 0, 0, 1 (chosen) | 492 / 558 | 512 / 596 |

A grid of 0 to 1 for the embedder and the stems found no setting above character overlap
alone on either half; tie-breaking votes of 0.001 to 0.03 moved R@1 by at most 2 links. The
n-gram length was tuned on all of this fixture, so the held-out half is not fully clean.

## Sources and licenses

All from [GRETIL](https://gretil.sub.uni-goettingen.de/gretil.html) (Göttingen Register of
Electronic Texts in Indian Languages), downloaded 2026-11-10.

- *Brahmasūtra* with Śaṅkara's *Śārīrakamīmāṃsābhāṣya* (`sa_bAdarAyaNa-brahmasUtra-comm.xml`),
  input by the Sansknet project, converted from a Devanagari encoding. Not proofread.
- Chāndogya, Bṛhadāraṇyaka (Kāṇva), Praśna, Aitareya, Īśā and Māṇḍūkya Upaniṣads with the
  commentary ascribed to Śaṅkara (Sansknet); only the mūla text is used. Taittirīya with
  Śaṅkara's bhāṣya; Kaṭha after Olivelle, *The Early Upaniṣads* (1998), Vienna student team;
  Śvetāśvatara.
- *Bhagavadgītā*, BORI critical edition, text entered by Muneo Tokunaga et al., revised by
  John Smith (`1_sanskr/2_epic/mbh/ext/bhgce__u.htm`).

**Terms.** The TEI files are distributed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution,
non-commercial, share-alike. The fixture's JSONL files are derived from them and carry the same
license, not ligatura's MIT. The *Gītā* file is an older GRETIL text that says it is "for
reference purposes only" with terms "as for source file" (the BORI edition); its 700 units are
included for research use and could be dropped (one line in `scripts/build.py`) if that is a
concern.

## Rebuild

```
scripts/fetch.sh                 # downloads the GRETIL files into raw/ (git-ignored)
python3 -I scripts/build.py      # writes source, target and gold
```

`--show` prints every gold link with both texts.

## How the gold was made

`scripts/build.py` reads every parenthesised reference in the commentary and maps Śaṅkara's
abbreviations to the target: `chā.`/`chāndo.` Chāndogya, `bṛ.`/`bṛha.` Bṛhadāraṇyaka, `tai.`
/`taitti.` Taittirīya (vallī.anuvāka only; three-part `tai.` is the Saṃhitā or Brāhmaṇa),
`kā.`/`kaṭha.`/`ka.` Kaṭha (adhyāya.vallī.verse becomes vallī.verse), `pra.` Praśna, `ai.`
Aitareya (three parts only), `īśā.` Īśā, `śve.`/`śvetā.` Śvetāśvatara, `gī.`/`bha.gī.` Gītā.
A range or list keeps its first verse. Two marks in a row cite the same words.

Of 1,677 citation marks, 423 are skipped: texts not in the target (Muṇḍaka, about 95, and Kena
have no converted file on GRETIL; Kauṣītaki, Jābāla, Nārāyaṇa, the *Brahmasūtra* itself, the
Mīmāṃsā and Vaiśeṣika sūtras, smṛti) or abbreviations the build doesn't read. 37 more point at
verses the target lacks and are left out.

As a check, 1,092 of the 1,217 links (90%) share at least two 8-letter runs with the cited
verse once both are folded. Most of the other 125 are paraphrases, one- or two-word quotations
(`tattvamasi`), or a citation of a long mantra by a phrase from its middle that the source
unit's boundary cut short.

## Known problems

- **The commentary is not proofread** and keeps the conversion's irregular word boundaries
  (`'ayamātamā brahma'` for *ayam ātmā brahma*).
- **Source unit boundaries are a heuristic.** The quotation's start is found by matching
  quote marks, and the avagraha is also written `'`, so some units stop short of the quotation's
  start and some carry a clause of Śaṅkara's lead-in (`tathāhi-`, `iti śrutiḥ`).
- **Quotation, mostly.** Śaṅkara quotes closely, so overlap is strong here. Allusion without a
  citation mark is not in the gold, and a suggested link outside it may still be real.
- **Long target units.** Some Bṛhadāraṇyaka and Chāndogya mantras run to hundreds of words and
  Taittirīya units are whole anuvākas; a short quotation is a small part of them.
- **The n-gram length was chosen on this fixture** (see `src/lang/sa.ts`), so the overlap
  numbers are slightly optimistic. Lengths 5 to 7 are within 5 links of each other at R@10.
- **The fusion weights fit quotation.** Śaṅkara quotes closely, so shared letters decide. For
  paraphrase or allusion the embedder may earn its vote back; this fixture can't show it.
