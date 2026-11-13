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

1. **Embed** both texts with two models, nomic-embed-text-v1.5 (English) and bge-m3
   (multilingual), and score every target unit by meaning with each.
2. **Overlap:** score every target unit by shared rare words. This catches quotation, which
   embeddings blur. Archaic forms (followeth, walketh) fold to their stems.
3. **Fuse** the three rankings (reciprocal rank fusion).
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
  numbers.

## Output

One JSON object per suggested link:

```json
{"source":"4.14.5","target":"LUK.24.35","rank":1,"score":0.792,"dense":0.792,"lex":0.295,
 "shared":["breaking","bread","way"],"status":"suggested","method":{"embed":"nomic-embed-text-v1.5+bge-m3","rerank":"none"},"date":"2026-11-08"}
```

`score` is the reranker's P(yes) when a reranker ran, else the embedding cosine. `--top` (default
3) and `--min-score` decide how many links reach review.

## Models and servers

| Stage | In process | Or a server you run |
|---|---|---|
| Embed | default `nomic-embed-text-v1.5+bge-m3`; any one of `nomic-embed-text-v1.5`, `bge-small-en-v1.5`, `bge-large-en-v1.5`, `bge-m3`, `snowflake-arctic-embed-l-v2.0`, `multilingual-e5-large`, `multilingual-e5-small`, `qwen3-embedding-0.6b`; join several with `+` | `--embed openai:<base-url>#<model>`: any OpenAI-compatible `/embeddings` (Ollama, LM Studio, llama.cpp, vLLM) |
| Rerank | off by default; `--rerank qwen3-reranker-0.6b` | `--rerank api:<url>#<model>`: a Cohere/Jina-shaped `/rerank` endpoint (llama.cpp `llama-server`, vLLM, TEI, Infinity) |
| Judge | – | `--rerank chat:<base-url>#<model>`: a chat model picks the links (Ollama, LM Studio, `mlx_lm.server`) |

- **Speed:** the in-process reranker runs on the CPU at 0.5 to 0.75 s per pair. A 2,400-sentence
  book at `--pool 30` takes many hours. A reranker server on a GPU is much faster: the same model
  under MLX on an Apple M3 took 0.17 s per pair. Lowering `--pool` trades recall for time.
- **Default download:** about 700 MB on first run (nomic 140 MB, bge-m3 570 MB, both q8).
  Embedding with two models takes about twice as long as with one; vectors are cached, so a
  rerun embeds nothing. For English-only texts, `--embed nomic-embed-text-v1.5` is half the cost
  and scores within a link or two.
- **Translations:** `--gloss <file>` takes English translations of the target's units
  (`{"ref","text"}`, same refs). Each target unit then scores the better of its own text and its
  translation, and word overlap reads both.
- **Keys:** a server that needs one gets `LIGATURA_API_KEY` as a bearer token.
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
| Retrieval, default (nomic + bge-m3 + overlap) | 33 | 41 | 43 | 45 |
| Retrieval, `--embed nomic-embed-text-v1.5` | 35 | 40 | 42 | 44 |
| Reranked, `--rerank qwen3-reranker-0.6b` (ONNX q8, generic task) | 28 | 38 | 43 | 44 |
| Reranked, q8, `--task` naming the two texts | 29 | 41 | 43 | 44 |

Recall counts a link found when the gold verse or its neighbour is in the top k (`--neighbours 1`),
of 49. Runs from 2026-11-08 on an Apple M3 CPU; the q8 reranker took 710 to 980 s for the 1,320 pairs.

A second fixture, *The Waste Land* against its sources in seven languages
(`fixtures/waste-land`, 64 links, built by a script from public-domain texts), shows why the
default has a multilingual model. With `--gloss target-en.jsonl --neighbours 1`:

| Embed | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|
| default, nomic + bge-m3 | 22 | 30 | 30 | 35 |
| nomic only | 21 | 28 | 31 | 31 |
| bge-m3 only | 19 | 26 | 26 | 32 |

Without translations, nomic alone reaches 18 / 24 / 24 / 26 and misses most links into Dante.
Runs from 2026-11-09 and 2026-11-10 on an Apple M3.

Reranking costs R@1 on Kempis, so it's off by default. The cause is the q8 quantization of the only
ONNX export: an fp32 export of the same model, built locally, scores pairs within 0.006 of the
Python (MLX) run but still reached only 32 / 43 / 44 / 45.

## Limits

- **English first.** The overlap scorer folds English forms only. bge-m3 matches English against
  Italian, French, German, Latin and Greek well, and Sanskrit poorly (MRR .49 on a held-out
  test). A translation through `--gloss` helps most where the embedder is weakest.
- **Allusions to a whole story** (the prodigal son), or sayings with no shared words, rarely reach
  the top 30, so no reranker sees them.
- **Suggestions, not findings.** Check every link against the texts.

## License

MIT. The fixture texts are public domain. Models download from Hugging Face under their own
licenses; check each model card before redistributing a model.
