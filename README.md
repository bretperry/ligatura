# ligatura

Find where one text quotes, paraphrases or alludes to another.

```
npx ligatura link imitation.jsonl gospels.jsonl > links.jsonl
```

ligatura reads two texts as units (verses, sentences, paragraphs). For each unit of the first, it
finds the passages in the second that the unit echoes, and writes them as suggestions with their
evidence. A person confirms each one: ligatura finds candidates, it doesn't decide.

**The default is free and local.** Every model runs on your machine, downloads once, and needs no
account or API key.

## How it works

1. **Embed** both texts and score every target unit by meaning. English uses
   nomic-embed-text-v1.5; every other language, and any pair of two languages, uses bge-m3.
2. **Overlap:** score every target unit by shared rare words. This catches quotation, which
   embeddings blur. Archaic forms (followeth, walketh) fold to their stems. Latin, Greek, Coptic and
   Sanskrit also score shared character n-grams, which catch inflected forms the stems miss.
   Overlap needs one language on both sides, so it is left out when the two texts differ.
3. **Fuse** the rankings (reciprocal rank fusion). A language profile can weight each list;
   Sanskrit gives the embedder and word overlap no vote (see Results).
4. **Rerank (opt-in):** with `--rerank`, a reranker model reads the top 30 for each unit and
   scores each pair. It's off by default: the in-process Qwen3-Reranker-0.6B scored below plain
   retrieval on the test fixture (see Results). A reranker server or a chat model as judge may do
   better; measure it with `eval` first.

## Install

```
npm install -g ligatura
```

Or run it with `npx ligatura`. Needs Node 20 or later.

## Inputs

- **JSONL**, one unit per line: `{"ref": "MAT.5.3", "text": "Blessed are the poor in spirit..."}`.
  `ref` is any stable id: a verse, a Stephanus number, `book.chapter.sentence`.
- **Plain text**, split into sentences, or paragraphs or lines with `--split`. Refs are the unit
  numbers. Every nonempty unit is kept; `--min-words 3` drops fragments such as headings.
- **Refs must be unique** in each file. A repeated ref is an error that names both lines.

## Languages

| `--lang` | Text | Folding | Stems |
|---|---|---|---|
| `en` (default) | English | case | -eth, -est, -ed, -ing, -s |
| `la` | Latin | case, macrons, æ/œ, u/v, i/j; -que split off | noun and verb endings |
| `grc` | Ancient Greek | accents and breathings, final ς as σ; `;` and `·` end sentences | noun and verb endings |
| `sa` | Sanskrit | Devanagari to IAST, then diacritics dropped; daṇḍas end sentences, verse numbers dropped | endings; character 6-grams of the text with spaces removed |
| `fr` | French | case, accents, œ/æ; elisions (l', qu') split off | plural and verb endings, stems of 5+ letters |
| `es` | Spanish | case, accents (ñ kept); ¿ and ¡ open sentences | plural, gender and verb endings, 5+ letters |
| `it` | Italian | case, accents; elisions (l', dell') split off | plural, gender and verb endings, 5+ letters |
| `de` | German | case, umlauts, ß as ss, old th as t | case, plural and verb endings, 6+ letters |
| `ar` | Arabic | diacritics and tatweel, alef forms, ى as ي, ة as ه; و/ف and ال split off | pronoun suffixes and plural endings |
| `cop` | Coptic (Sahidic) | case, supralinear strokes and other marks; Greek-block letters (α ϲ) written as Coptic-block ones; Bohairic ϧ as ϩ; `.` `·` `;` `⳹` `⳾` end sentences | conjugation bases, articles and pronoun suffixes peeled off bound groups; character 3-grams |

`--lang` sets both texts. For two languages, set `--source-lang` and `--target-lang`:

```
ligatura link --lang grc nt.jsonl lxx.jsonl
ligatura link --source-lang la --target-lang en confessiones.txt douay.jsonl
ligatura link --source-lang sa --target-lang en gita.txt translation.jsonl
ligatura link --lang cop nt.jsonl ot.jsonl
```

The stems are suffix stripping, not a lemmatizer: they catch case endings but not stem changes
(Latin *fero, tuli*; Greek augments and reduplication). Latin and Greek also score character
4-grams, which catch forms the stems miss (*mortuos, mortuis*) and some OCR and spelling variants.
Sanskrit sandhi joins and alters words at their edges, so Sanskrit takes 6-grams from the whole
text with its spaces removed; there is no sandhi splitter.

Coptic is **Sahidic first**: the literary standard, with the most open text. Bohairic reads with
the same profile but shares fewer words with Sahidic (ⲡⲓ- for ⲡⲉ-, ⲫ ⲑ ⲭ for ⲡ ⲧ ⲕ), so only ϧ
is folded into ϩ. Unicode keeps seven Coptic letters (ϣ ϥ ϧ ϩ ϫ ϭ ϯ) in the Greek block and
many editions type the rest with Greek letters, so both are folded to the Coptic block.
Coptic writes bound groups (article, conjugation base, verb and suffix run together); there is
no segmenter, so the stems and character 3-grams do the work. Editions differ on where they
cut groups.

## Output

One JSON object per suggested link:

```json
{"source":"4.14.5","target":"LUK.24.35","rank":1,"score":0.792,"dense":0.792,"lex":0.295,
 "shared":["breaking","bread","way"],"status":"suggested","method":{"embed":"nomic-embed-text-v1.5","rerank":"none"},"date":"2026-11-08"}
```

`score` depends on what ranked the link:

- **No reranker (default):** the embedding cosine. With the default model it falls roughly in 0 to 1,
  but it isn't a probability.
- **`qwen3-reranker-0.6b`:** the model's P(yes) that the pair is a link, 0 to 1.
- **`api:`:** the server's relevance score, on whatever scale that server uses.
- **`chat:`:** rank order only: 1 for the judge's first pick, 0.99 for the second, and so on; 0 if
  not picked.

`--top` (default 3) and `--min-score` decide how many links reach review. Set `--min-score` per
backend, since the scales differ.

## Models and servers

| Stage | In process | Or a server you run |
|---|---|---|
| Embed | `nomic-embed-text-v1.5`, `bge-small-en-v1.5`, `bge-large-en-v1.5`; `bge-m3` (multilingual, MIT, default for every language but English, and for mixed pairs) | `--embed openai:<base-url>#<model>`: any OpenAI-compatible `/embeddings` (Ollama, LM Studio, llama.cpp, vLLM) |
| Rerank | off by default; `--rerank qwen3-reranker-0.6b` | `--rerank api:<url>#<model>`: a Cohere/Jina-shaped `/rerank` endpoint (llama.cpp `llama-server`, vLLM, TEI, Infinity) |
| Judge | – | `--rerank chat:<base-url>#<model>`: a chat model picks the links (Ollama, LM Studio, `mlx_lm.server`) |

- **Speed:** the in-process reranker runs on the CPU at 0.5 to 0.75 s per pair. A 2,400-sentence
  book at `--pool 30` takes many hours. A reranker server on a GPU is much faster: the same model
  under MLX on an Apple M3 took 0.17 s per pair. Lowering `--pool` trades recall for time.
- **Keys:** `LIGATURA_EMBED_API_KEY` and `LIGATURA_RERANK_API_KEY` each go only to their own
  server, as a bearer token. `LIGATURA_API_KEY` works when only one server needs a key; ligatura
  refuses to send it to two different servers. Keys go only over https, or to this machine.
- **Long passages** are cut to 256 tokens (the source unit) and 384 tokens (each candidate) before
  the in-process reranker reads them.
- **Cache:** vectors from the built-in models are cached in `~/.cache/ligatura` (or
  `LIGATURA_CACHE`), private to your user, keyed by model, prefixes and text. Vectors from a
  server aren't cached, since a server can change the model behind a name. `LIGATURA_NO_CACHE=1`
  turns the cache off.
- **Paid APIs bill your API account, not a chat subscription** such as Claude Pro or ChatGPT Plus.
  ligatura has no paid backend built in. If you point it at one, you pay that provider per call.

## Measure before you trust it

The test fixture lives in the repository, not the npm package. To run it:

```
git clone https://github.com/bretperry/ligatura
cd ligatura
npm install
npm run build
node dist/cli.js eval fixtures/kempis-gospels --neighbours 1
```

`eval` runs the pipeline on a fixture (`source.jsonl`, `target.jsonl`, and `gold.jsonl` of known
links) and prints recall at 1, 3, 5 and 10. Try a model change here before using it on new texts.

The fixture in this repo is The Imitation of Christ against the four Gospels, scored against the
edition's own footnotes (49 links; see `fixtures/kempis-gospels/README.md`):

| Stage | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| Retrieval (embedding + overlap) | 35 | 40 | 42 | 44 |
| Reranked, `--rerank qwen3-reranker-0.6b` (ONNX q8, generic task) | 29 | 41 | 43 | 43 |
| Reranked, q8, `--task` naming the two texts | 30 | 43 | 43 | 45 |

Recall counts a link found when the gold verse or its neighbour is in the top k (`--neighbours 1`),
of 49. Runs from 2026-11-09 on an Apple M3 CPU; the q8 reranker took 1,100 to 2,700 s for the 1,320 pairs.

Reranking costs R@1 here, so it's off by default. The cause is the q8 quantization of the only
ONNX export: an fp32 export of the same model, built locally, scores pairs within 0.006 of the
Python (MLX) run but still reached only 32 / 43 / 44 / 45 (measured 2026-11-08, before ties
shared a rank; not re-run).

### Latin, Greek and Sanskrit

More fixtures, each with a README on sources, licenses and known problems. Runs of
2026-11-09 and 2026-11-10 on a Mac mini (Apple M2 Pro CPU), bge-m3 q8, `--neighbours 1`; R@10
is shown for each list alone, then fused:

| Fixture | Languages | Links | Embedding | Words | Characters | Fused R@1 / R@10 |
|---|---|---|---|---|---|---|
| `lxx-nt`: NT quotations of the Septuagint, from Swete's tables | grc → grc | 266 | 164 | 208 | 217 | 165 / 228 (86%) |
| `augustine-vulgate`: Augustine's *Confessions*, from Pusey's sidenotes | la → la | 713 | 275 | 374 | 441 | 256 / 463 (65%) |
| `augustine-drc`: the same links, against the Douay-Rheims | la → en | 712 | 203 | – | – | 103 / 203 (29%) |
| `shankara-upanisads`: Śaṅkara's quotations, from the edition's citations | sa → sa | 1,217 | 557 | 882 | 1,153 | 1,004 / 1,154 (95%) |
| `itihasa-sa-en`: epic shlokas to Dutt's English, Itihāsa test split | sa → en | 500 | 311 | – | – | 169 / 311 (62%) |

- **Character overlap** (4-grams inside words, a third list in the fusion) added 6 points of R@10
  to Latin and 4 to Greek. It was chosen on one half of the links and held on the other.
- **Sanskrit** fuses on character overlap alone. bge-m3 is weak in Sanskrit, and with equal votes
  it dragged the fused list to 695 / 1,031, below character overlap alone. The weights were chosen
  on half the links and held on the other (see the fixture's README).
- **The Latin answer key** was corrected: 31 sidenotes cite the wrong verse while the sentence
  quotes another word for word (see the fixture's README).
- **Reranking** the Latin top 30 with `qwen3-reranker-0.6b` moved R@10 from 463 to 469 but R@1
  from 256 to 210, in 58 minutes, so it stays off.
- **Ceilings:** a reranker only reorders what retrieval found. Latin has 80.4% of its links in the
  top 100; Latin to English has 71.9% even in the top 1,000.

The Kempis numbers above are unchanged by the language work.

### French, Spanish and German

The same Swete quotations, renumbered for Bibles translated from the Hebrew: each New Testament
against its own Old Testament, and against the KJV Old Testament. Built by
`fixtures/nt-ot-fr/scripts/build.py`; runs of 2026-11-10 on the same Mac mini, bge-m3 q8,
`--neighbours 1`, 269 links each:

| Fixture | Bible | Languages | Embedding | Overlap | Fused R@1 / R@10 |
|---|---|---|---|---|---|
| `nt-ot-fr` | Ostervald | fr → fr | 201 | 186 | 150 / 225 |
| `nt-ot-fr-en` | Ostervald, KJV | fr → en | 185 | – | 100 / 185 |
| `nt-ot-es` | Reina-Valera 1909 | es → es | 192 | 183 | 143 / 218 |
| `nt-ot-es-en` | Reina-Valera 1909, KJV | es → en | 186 | – | 107 / 186 |
| `nt-ot-de` | Luther 1912 | de → de | 200 | 198 | 154 / 233 |
| `nt-ot-de-en` | Luther 1912, KJV | de → en | 175 | – | 104 / 175 |

Italian and Arabic have profiles and tests but no fixture yet, so their numbers are unmeasured.

## Limits

- **Latin and Greek morphology is suffix stripping.** Without a lemmatizer, irregular stems and
  augmented verbs don't match their other forms. Sanskrit has no sandhi splitter.
- **French, Spanish, Italian, German and Arabic stems are light.** They strip regular endings
  only; Arabic splits off و, ف, ال, بال, كال and لل but not a lone ب, ل or ك, and finds no roots.
- **One translator on both sides.** The modern-language fixtures quote within one Bible, whose
  translators often matched the two Testaments' wording, so overlap is easier there than in a
  later author quoting from memory.
- **Across languages, only the embedder ranks.** bge-m3 finds 29% of the Latin-to-English links in
  the top 10, against 65% fused within Latin. SPhilBERTa scored higher on Latin and Greek in a lab
  test but has no ONNX export yet; `--embed openai:...` can serve it.
- **bge-m3 is large** (about 540 MB at q8). Embedding a 36,000-verse Bible takes 15 to 20 minutes
  on 10 CPU cores; later runs read the cache.
- **Allusions to a whole story** (the prodigal son), or sayings with no shared words, rarely reach
  the top 30, so no reranker sees them.
- **Suggestions, not findings.** Check every link against the texts.

## License

MIT. The fixture texts are public domain, except the Greek New Testament (SBLGNT, CC BY 4.0)
and Swete's Septuagint (First1KGreek, CC BY-SA 4.0) in `fixtures/lxx-nt`; the GRETIL texts in
`fixtures/shankara-upanisads` (CC BY-NC-SA 4.0); and the Itihāsa dataset in
`fixtures/itihasa-sa-en` (Apache-2.0). Fixtures are not in the npm package. Models download
from Hugging Face under their own licenses; check each model card before redistributing a model.
