# Small embedders and adaptation techniques for allusion retrieval (2024–2026)

Researched 2026-11-17. Scope: models under ~1B parameters that run on Mac CPU / Apple Silicon (transformers.js / ONNX), and ways to adapt them to loose, motif-level allusion. Ligatura's current stack for context: nomic-embed-text-v1.5 and bge-m3 dense, fused with lexical overlap by RRF; `lab/finetune.py` already fine-tunes bge-m3 with LoRA + CachedMultipleNegativesRankingLoss on English↔Latin/Greek/Sanskrit parallel text.

## Which small embedders lead MMTEB and reasoning-heavy retrieval (BRIGHT), and which ship as ONNX?

### Takeaway
On general multilingual benchmarks the sub-1B leaders are jina-embeddings-v5-text (small 677M: 67.0 MMTEB; nano 239M: 65.5), Qwen3-Embedding-0.6B (64.33) and EmbeddingGemma-300M (61.15); all beat bge-m3's generation. But on BRIGHT (reasoning retrieval), no sub-1B dense model has a published strong score; the best small results are late-interaction models (Reason-ModernColBERT 150M ≈ 22.6, SmallReason-ColBERT 32M ≈ 21.4 nDCG@10), roughly level with 7B dense embedders (≈22–24). Of the leaders, Qwen3-Embedding-0.6B and EmbeddingGemma have ONNX builds usable from transformers.js; jina v5 ships GGUF/MLX but is CC BY-NC.

### Cited Findings
- **jina-embeddings-v5-text** (Jina AI, released 2026-02-18): small = 677M params, base Qwen3-0.6B-Base, 1024-d, 32k context, MMTEB 67.0, MTEB-English 71.7; nano = 239M, base EuroBERT-210m, 768-d, 8k context, MMTEB 65.5, MTEB-English 71.0. Matryoshka dims down to 32. Four LoRA task adapters (retrieval, text-matching, classification, clustering); retrieval uses "Query:" / "Document:" prefixes. License CC BY-NC 4.0. GGUF (14 quants) and MLX (fp, 4-bit, 8-bit) published; ONNX not mentioned. v5-small claims to beat Qwen3-Embedding-0.6B (64.3 MMTEB) by 2.7 points — [Jina, "jina-embeddings-v5-text" (2026)](https://jina.ai/news/jina-embeddings-v5-text-distilling-4b-quality-into-sub-1b-multilingual-embeddings/); [model page](https://jina.ai/models/jina-embeddings-v5-text-nano/). Nano is reported ahead of KaLM-mini-v2.5 (60.1) and voyage-4-nano (58.9) — same source (vendor-reported).
- **Qwen3-Embedding-0.6B** (Zhang et al., Qwen team, 2025): MTEB-Multilingual mean task 64.33, MTEB-English v2 70.70, 32k context, MRL dims 32–1024, Apache-2.0 — [HF model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B); [Qwen3 Embedding tech report, arXiv 2506.05176 (2025)](https://arxiv.org/abs/2506.05176). Ablation in the report: 0.6B drops to 58.49 without synthetic-data pretraining and to 62.56 without model merging — [arXiv 2506.05176](https://arxiv.org/pdf/2506.05176).
- Qwen3-Embedding-0.6B ONNX: onnx-community build supported in transformers.js ≥ 3.6 with fp32/fp16/q8 dtypes — [transformers.js 3.6.0 release notes](https://newreleases.io/project/github/huggingface/transformers.js/release/3.6.0); Qdrant export: fp32 ≈ 2.38 GB, int8 ≈ 1.12 GB — [Qdrant/Qwen3-Embedding-0.6B-onnx](https://huggingface.co/Qdrant/Qwen3-Embedding-0.6B-onnx).
- **EmbeddingGemma-300M** (Google DeepMind, Vera et al., 2025, arXiv 2509.20354): 308M params, 2k context, 100+ languages, MTEB(Multilingual v2) mean task 61.15, "+7.68 over next best sub-500M model" at release; QAT Q4_0 = 60.62, Q8_0 = 60.93. Activations do not support fp16 — use fp32, q8 or q4 — [HF blog](https://huggingface.co/blog/embeddinggemma); [arXiv 2509.20354](https://arxiv.org/abs/2509.20354). ONNX: [onnx-community/embeddinggemma-300m-ONNX](https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX).
- **Granite Embedding Multilingual R2** (IBM, 2026, arXiv 2605.13521): 311M model scores 65.2 on MTEB-v2 retrieval average, top 3 open multilingual models under 500M; 97M variant 60.3 — [arXiv 2605.13521](https://arxiv.org/html/2605.13521v2).
- **Bekko Embedding** (2026, arXiv 2607.25180): 7.67M active params, 56.2 on the 18 MMTEB-multilingual retrieval tasks, reported ahead of multilingual-e5 and bge-m3 on that subset — [HF blog](https://huggingface.co/blog/hotchpotch/bekko-embedding); [arXiv 2607.25180](https://arxiv.org/pdf/2607.25180).
- **BRIGHT baseline** (Su et al., ICLR 2025): the then-top MTEB model SFR-Embedding-Mistral scored only 18.0 nDCG@10; LLM-written reasoning used as the query helped retrievers — [BRIGHT, arXiv 2407.12883](https://arxiv.org/html/2407.12883.pdf).
- **BRIGHT nDCG@10 (original queries)** from ReasonEmbed's Table 2: BM25 14.5, OpenAI-3-Large 17.9, Gecko-1B 20.0, Qwen3-Embedding-4B 21.8, Qwen3-Embedding-8B 22.8, ReasonIR-8B 24.4, DIVER-4B 28.9, ReasonEmbed-Qwen3-4B 37.1, ReasonEmbed-Qwen3-8B 38.1 — [Chen, Lan, Li, Lian, Liu, "ReasonEmbed" arXiv 2510.08252 (2025)](https://arxiv.org/html/2510.08252v2). No sub-1B dense model appears in that table.
- **Small late-interaction on BRIGHT** (mean nDCG@10): Reason-ModernColBERT 150M 22.62; GTE-ModernColBERT 150M 21.72; SmallReason-ColBERT 32M 21.41; answerai-colbert-small 33M 18.49; mxbai-edge-colbert 17M 18.60; Qwen3-Embedding (7–8B) 22.51; ReasonIR-8B 24.38; BM25 14.53 — [Abdallah, Ali, Jatowt, "SmallReason-ColBERT" arXiv 2609.29652 (2026)](https://arxiv.org/html/2609.29652v1).
- Cross-paper BRIGHT numbers are not strictly comparable: BM25 scores differ between papers (14.5 here vs 17.0 for StackExchange-only subsets) — [ThinkQE, arXiv 2506.09260](https://arxiv.org/pdf/2506.09260).

### Inferences
- For ligatura's multilingual, CPU-local setting, **Qwen3-Embedding-0.6B** is the best general-quality model already in its supported list and already ONNX + transformers.js. It is also the only listed candidate that takes free-form task instructions (see below), which matters for allusion.
- **EmbeddingGemma-300M** is the best quality-per-MB option (≈half Qwen3-0.6B's size, ~3 points lower MMTEB). Watch the no-fp16 rule when picking ONNX dtype.
- **jina v5-text-nano** looks strongest per parameter, but CC BY-NC and no confirmed ONNX make it a poor default for a free, redistributable tool; fine as an optional server-backed model.
- General MMTEB rank does not predict allusion recall: on Latin allusions (see the next section), BM25 on lemmas beat every pooled bi-encoder.

### Gaps
- No sourced MMTEB/BRIGHT numbers found for nomic-embed-text-v2-moe, gte-multilingual-base, snowflake-arctic-embed-l-v2.0, mxbai, or F2LLM in this pass.
- No BRIGHT score found for Qwen3-Embedding-0.6B or EmbeddingGemma specifically.
- The live MTEB leaderboard was not checked; figures above are vendor/paper-reported.
- ONNX availability for jina v5, Granite R2, Reason-ModernColBERT not verified.

## Do late-interaction / multi-vector models (ColBERT, bge-m3 heads) help fine-grained phrase-level matching?

### Takeaway
Yes, with the best evidence coming from allusion work itself: on a Latin intertextuality benchmark, token-level contextual embeddings nearly matched BM25 on allusions and beat every fine-tuned pooled bi-encoder. The authors blame pooling for hiding short local cues. On BRIGHT, 32–150M ColBERT models match 7–8B dense models. bge-m3's own multi-vector head beats its dense head by ~1.2 nDCG on MIRACL, and all three heads together add ~2.2.

### Cited Findings
- **Loci Similes** (Schelb, Wittweiler, Revellio, Feichtinger, Spitz; arXiv 2601.07533, 2026): Latin intertextuality benchmark. Allusion recall R@10 / R@100 / R@1000 (%): BM25-lemma 11.96 / 29.43 / 57.92; BM25-surface 12.22 / 28.40 / 50.29; LatinBERT token embeddings 10.03 / 28.14 / 52.70; BGE-M3 7.52 / 20.62 / 44.01; E5-large 7.34 / 18.25 / 48.42; SPhilBERTa 6.19 / 19.27 / 48.29. Verbatim recall is far higher for every model (BM25-lemma R@10 63.97). The authors give three reasons for the lexical lead: lemmatization handles Latin morphology better than subword tokens, pooled embeddings hide short local cues, and allusions still share ~1.65 lemmas on average — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3).
- Same paper, pooled (verbatim+allusion) fine-tuned bi-encoders: BGE-M3 R@10 0.436, MRR@10 0.402; E5-large 0.434 / R@1000 0.743; untuned LatinBERT token embeddings R@10 0.485 beat all of them — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3).
- BRIGHT: Reason-ModernColBERT (150M) 22.62 vs Qwen3-Embedding-7B/8B 22.51; SmallReason-ColBERT (32M) 21.41. No controlled same-data dense-vs-late-interaction ablation in that paper — [arXiv 2609.29652](https://arxiv.org/html/2609.29652v1).
- LightOn claims Reason-ModernColBERT beats dense single-vector models trained on identical data, "consistent, striking lead", trained in under 2 hours with <100 lines of PyLate; no numbers given (vendor claim) — [LightOn blog](https://blog.lighton.ai/blog-posts/lighton-unlocks-agentic-rag-with-new-sota-model-reason-moderncolbert).
- answerai-colbert-small-v1 (Clavié, 2024): 33M params, claims to beat 110M ColBERTv2 on standard benchmarks — [Answer.AI blog](https://www.answer.ai/posts/2024-08-13-small-but-mighty-colbert.html); [HF](https://huggingface.co/AnswerDotAI/answerai-colbert-small-v1).
- **BGE-M3 heads** (Chen et al., 2024), MIRACL nDCG@10 avg over 18 languages: dense 67.8, sparse 53.9, multi-vector 69.0, dense+sparse 68.9, all three 70.0 (mE5-large 65.4). Secondary aggregator; one listing gives 71.9 instead, so verify in the paper's Table — [emergentmind summary](https://www.emergentmind.com/topics/bge-m3-embedding); paper: [arXiv 2402.03216](https://arxiv.org/abs/2402.03216).

### Inferences
- Ligatura already holds bge-m3. Exposing its **multi-vector (ColBERT) head as a reranker over the fused top-k** is the cheapest phrase-level upgrade: no new model download, ~+1–2 nDCG on general retrieval, likely more on allusion where cues are local.
- A tiny ColBERT (answerai-colbert-small 33M, mxbai-edge-colbert 17–32M) is CPU-cheap enough to rerank top-100 per query, but they are English-centric; for Latin/Greek/Sanskrit the bge-m3 multi-vector head is the realistic option.
- Lemmatized BM25 is a strong partner: Loci Similes shows lexical lemma overlap still carries most allusion recall. Keep it in RRF; lemmatize where a lemmatizer exists.

### Gaps
- No direct evidence found on bge-m3 multi-vector vs dense on allusion/intertext data.
- ONNX/transformers.js support for ColBERT token outputs (and bge-m3's colbert_linear head) not verified.

## Can a task instruction ("find passages this verse alludes to") improve allusion retrieval?

### Takeaway
Plausibly a few points, at zero cost, but only for models trained with instructions. Qwen3-Embedding says a missing instruction costs ~1–5%. Promptriever showed instruction-trained bi-encoders follow per-query relevance instructions, while non-instruction-trained ones get worse when given one. No study tests allusion-style instructions directly.

### Cited Findings
- Qwen3-Embedding-0.6B card: "not using an instruct on the query side can lead to a drop in retrieval performance by approximately 1% to 5%"; format `Instruct: {task}\nQuery:{query}`, one-sentence task — [HF card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B).
- **Promptriever** (Weller et al., ICLR 2025): bi-encoder trained on ~500k instance-level instruction examples from MS MARCO; +14.3 p-MRR / +3.1 nDCG on FollowIR, +12.9 Robustness@10 on InstructIR, +1.4 avg on BEIR via prompt search. The RepLLaMA baseline got a negative score (worse with instructions) — [ICLR 2025 paper](https://proceedings.iclr.cc/paper_files/paper/2025/hash/2cefdb2c4c3274b78cd450bac35228df-Abstract-Conference.html).
- jina v5 uses fixed task adapters and "Query:"/"Document:" prefixes, not free-form instructions — [Jina](https://jina.ai/news/jina-embeddings-v5-text-distilling-4b-quality-into-sub-1b-multilingual-embeddings/).

### Inferences
- Try Qwen3-Embedding-0.6B with a short instruction on the query side only, e.g. "Given a passage, retrieve earlier passages it quotes, paraphrases, or alludes to through shared imagery or argument." Evaluate against the current fixtures; A/B 2–3 phrasings (Promptriever's +1.4 from prompt search suggests phrasing matters).
- nomic-v1.5 and bge-m3 are prefix-based or prompt-free; instructions won't help them without training.
- If fine-tuning Qwen3-0.6B, train with the same instruction so it stays aligned.

### Gaps
- No evaluation of instruction text on literary allusion or intertext retrieval found.

## Fine-tuning with little data: synthetic pairs, hard negatives, GPL, Matryoshka, LoRA, domain pretraining — reported gains?

### Takeaway
Reasoning-oriented synthetic data gives the largest gains reported anywhere (+15–20 nDCG on BRIGHT for 4–8B models). Classic unsupervised domain adaptation (GPL) gives +4.6 nDCG on average, up to +9.3. Generic synthetic-pair recipes for small models give +2–10. For allusion specifically, the negative mix matters: mixed hard + query-conditioned random negatives beat hard-only by ~2.5× fewer false positives.

### Cited Findings
- **ReasonEmbed / ReMixer** (Chen et al., 2025): LLM (Qwen2.5-72B) generates reasoning-heavy queries from corpus docs; candidates mined by a 7B retriever with the source doc excluded; a distilled Qwen3-8B annotator scores 1–5 (3–5 positive, 1–2 negative); 81,659 queries, ~12 positives each. Gains over MS-MARCO-trained baselines on BRIGHT: Qwen3-4B 19.4 → 37.1, Qwen3-8B 18.7 → 38.1, Llama-8B 16.1 → 36.2. Redapter loss adds ~+1 over InfoNCE — [arXiv 2510.08252](https://arxiv.org/html/2510.08252v2).
- **SmallReason-ColBERT**: 245K warmup triples + 2.7M ReasonIR-HQ/BGE-Reasoner tuples with hard negatives lifts a 32M ColBERT from 18.16 to 19.61 (base) and 21.41 (with a 129-parameter importance head) — [arXiv 2609.29652](https://arxiv.org/html/2609.29652v1).
- **GPL** (Wang, Thakur, Reimers, Gurevych, NAACL 2022): query generation + cross-encoder pseudo-labels + mined negatives; up to +9.3 nDCG@10 over MS-MARCO dense retriever, up to +4.5 over QGen; on TAS-B across 18 BEIR sets +4.6 avg (max +21.5 on TREC-COVID); adding TSDAE domain pretraining gives +1.4 more — [arXiv 2112.07577](https://arxiv.org/pdf/2112.07577).
- **CustomIR** (arXiv 2510.21729, 2025): synthetic query-doc pairs for a known corpus; small models gain up to +2.3 Recall@10 — [aitopics summary](https://aitopics.org/doc/arxivorg:E0597F1B).
- **"Don't Retrieve, Generate"** (arXiv 2504.21015, 2025): LLM-generated hard negatives alone underperform (avg nDCG@10 0.292 in one version); mixed with mined negatives they compete with cross-encoder mining — [arXiv 2504.21015](https://arxiv.org/html/2504.21015v3).
- **Loci Similes** negative-sampling ablation (classification, Latin intertext): false positives 7,084 with mixed negatives vs 10,154 query-conditioned random, 17,554 hard-only, 44,578 fully random. Larger negative ratios (≥1:5) generally help retrieval — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3).
- **Ancient Greek semantic reuse** (CLiC-it 2025): contrastive fine-tuning of an encoder on positives auto-generated by Ancient Greek WordNet paraphrase plus a morphological re-inflection model, evaluated on Homeric formulae — [ACL Anthology 2025.clicit-1.34](https://aclanthology.org/2025.clicit-1.34.pdf). (Numbers not extracted; PDF unreadable via fetch.)
- Riemenschneider & Frank (2023): SPhilBERTa for Latin→Greek allusion, with machine-translated English→Greek to augment parallel pairs — [arXiv 2308.12008](https://arxiv.org/pdf/2308.12008). Gretino (LREC 2026) adds Greek–Latin parallel sets for retrieval benchmarking and fine-tunes SPhilBERTa on them — [LREC 2026](https://aclanthology.org/2026.lrec-1.70.pdf).
- Qwen3-Embedding ablation shows synthetic weak-supervision pretraining is worth ~5.8 MMTEB points at 0.6B (64.33 vs 58.49) — [arXiv 2506.05176](https://arxiv.org/pdf/2506.05176).

### Inferences
- `lab/finetune.py` trains on parallel translations (anchor = English, positive = original). That teaches cross-lingual equivalence, not allusion. The highest-value change is a **ReMixer-style synthetic allusion set**: an LLM (local or server) reads a source passage and writes a later-style passage that *alludes* to it (shared image/motif/argument, few shared words), plus distractors that share words but not the motif. Then mine negatives with the current pipeline and filter with an LLM judge.
- Use a **mixed negative pool** (in-batch + mined hard + query-conditioned random), per Loci Similes; exclude known true parallels from mined negatives to avoid false negatives.
- Keep LoRA on top layers (already in the script): it fits the 24 GB Mac. Per the heavy-work rule, training runs belong on the Mac mini, not the MacBook.
- Matryoshka loss is cheap to add (sentence-transformers MatryoshkaLoss wrapping MNRL) if index size matters; no allusion-specific evidence for it.
- TSDAE/MLM domain pretraining on historical text: GPL's +1.4 suggests modest gains; lower priority.

### Gaps
- Fine-tuned vs base bi-encoder gains on Loci Similes not reported (base models not in Table 7).
- No reported results on LLM-synthesized *allusion* pairs (as opposed to QA or paraphrase pairs).
- No Matryoshka or adapter ablations on literary data found.

## Does HyDE / LLM query expansion help allusion-style retrieval?

### Takeaway
On BRIGHT, LLM reasoning-based expansion is among the biggest single levers (BM25 17.0 → 34.9 with a 14B LLM), but it needs a capable LLM and several calls per query. No evidence was found for small (<4B) local LLMs or for allusion data.

### Cited Findings
- **ThinkQE** (arXiv 2506.09260, 2025): BRIGHT (StackExchange) nDCG@10 BM25 17.0 → LameR-14B 29.3 → ThinkQE-14B 34.9; explicit chain-of-thought adds +2.7 over the same pipeline without reasoning; multiple LLM calls per query; English only — [arXiv 2506.09260](https://arxiv.org/pdf/2506.09260).
- **BRIGHT** paper: using LLM-written reasoning as the query improves BM25 and dense retrievers — [arXiv 2407.12883](https://arxiv.org/html/2407.12883.pdf).
- **DIVER** combines LLM expansion with a reasoning-tuned retriever: 41.6 (with expansion) vs 28.9 on original queries — [arXiv 2508.07995](https://arxiv.org/html/2508.07995v2).
- HyDE original: Gao, Ma, Lin, Callan, "Precise Zero-Shot Dense Retrieval without Relevance Labels" (2022) — [arXiv 2212.10496](https://arxiv.org/abs/2212.10496).

### Inferences
- For ligatura, an optional expansion step through the existing OpenAI-compatible server path fits: ask the LLM to name the motifs, images and arguments in the query passage (and likely source texts), embed that description, and add it as another RRF list. Keep it opt-in; it breaks the "fast, local, free" default.
- Expansion is query-side only, so the corpus index is unchanged; it pairs naturally with an instruction-tuned embedder.

### Gaps
- No numbers found for HyDE/expansion with ≤4B local LLMs, or on literary/allusion data, or across languages.

## Sentence vs span vs sliding window; context-aware chunk embeddings (late chunking)

### Takeaway
Late chunking (embed the whole document, then pool tokens per chunk) gives a small, free gain (+2.7–3.6% relative nDCG@10) that grows with document length. For allusion, the stronger evidence points the other way: finer token-level matching beats pooled units, so short units plus late-interaction scoring matter more than context pooling.

### Cited Findings
- **Late Chunking** (Günther, Mohr, Williams, Wang, Xiao; arXiv 2409.04701, 2024): no training needed with any long-context embedder; average relative nDCG@10 gains of 2.70–3.63% over naive chunking on BEIR (secondary summary); SciFact naive 64.20 → late 66.10 (no-chunk 63.89); TREC-COVID naive 63.36 → late 64.70 (no-chunk 65.18); gains correlate with document length; authors also propose "span pooling" fine-tuning — [arXiv 2409.04701](https://arxiv.org/html/2409.04701v1); [Jina blog](https://jina.ai/news/late-chunking-in-long-context-embedding-models/); [code](https://github.com/jina-ai/late-chunking).
- Loci Similes attributes bi-encoder weakness to pooling hiding short local cues — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3).

### Inferences
- Ligatura could late-chunk verses within their chapter/poem using bge-m3 (8k context) or Qwen3-0.6B (32k), so a verse vector carries its surrounding argument. That suits allusions to an argument or scene rather than one line. Implement as an option and measure on the fixtures.
- Keep sentence/verse units as the scoring granularity; add overlapping 2–3-unit windows as a second index only if eval shows multi-verse allusions being missed.

### Gaps
- No study found comparing granularities on intertext/allusion retrieval.
- transformers.js late-chunking support (token-level outputs with ONNX pooling disabled) not verified.

## Ranked recommendations for ligatura

### Takeaway
In order of expected gain per unit of effort: (1) bge-m3 multi-vector reranking + lemmatized lexical; (2) Qwen3-Embedding-0.6B with an allusion instruction; (3) a synthetic-allusion fine-tune with mixed negatives; (4) opt-in LLM motif expansion; (5) late chunking.

### Cited Findings
- Token-level matching ≈ BM25-lemma > pooled bi-encoders on Latin allusions — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3).
- bge-m3 multi-vector 69.0 vs dense 67.8; all heads 70.0 (MIRACL) — [emergentmind](https://www.emergentmind.com/topics/bge-m3-embedding).
- Qwen3-0.6B: 64.33 MMTEB, instructions worth 1–5%, ONNX in transformers.js — [HF card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B); [transformers.js 3.6.0](https://newreleases.io/project/github/huggingface/transformers.js/release/3.6.0).
- Reasoning-style synthetic data: +15–20 BRIGHT nDCG — [arXiv 2510.08252](https://arxiv.org/html/2510.08252v2); GPL +4.6 avg — [arXiv 2112.07577](https://arxiv.org/pdf/2112.07577).
- LLM expansion BM25 17.0 → 34.9 on BRIGHT-StackExchange — [arXiv 2506.09260](https://arxiv.org/pdf/2506.09260).
- Late chunking +2.7–3.6% relative — [arXiv 2409.04701](https://arxiv.org/html/2409.04701v1).

### Inferences
1. **Rerank fused top-k with bge-m3 multi-vector (MaxSim) scores**, and lemmatize the lexical channel where possible. No new model; addresses the pooling weakness directly.
2. **Add Qwen3-Embedding-0.6B (q8 ONNX) with a query-side allusion instruction** as a dense channel; A/B instruction phrasings. EmbeddingGemma-300M (q8/fp32, not fp16) as the lighter alternative.
3. **Fine-tune on synthetic allusion pairs** (LLM-written allusive rewrites + lexical-overlap distractors, LLM-judged), with mixed negatives at ≥1:5, LoRA top layers; extend `lab/finetune.py` beyond parallel translations. Run on the Mac mini. Highest ceiling, most work.
4. **Opt-in LLM motif/argument expansion** via the OpenAI-compatible server path, as an extra RRF list.
5. **Late chunking** of verses within their passage as an optional mode.
- Watch-list: Reason-ModernColBERT / SmallReason-ColBERT (English-only reasoning ColBERTs), jina v5-nano (license), Granite R2 311M (Apache-likely, retrieval 65.2).

### Gaps
- None of these has been measured on ligatura's own fixtures; every expected gain above is extrapolated from other benchmarks.
