# Reranking and small-LLM judging for subtle, reasoning-heavy relevance (2024–2026)

Context: ligatura retrieval (2 embedders + lexical, RRF) gets R@1 32 / R@10 45 of 49 on Imitation of Christ → Gospels. Qwen3-Reranker-0.6B (q8 ONNX) scored R@1 29–30; fp32 matched retrieval at best. Notes below collected 2026-11-17 from ~17 searches/fetches. Numbers are from the cited papers' own tables unless marked.

## Reasoning rerankers (Rank1, ReasonRank, Rank-R1, JudgeRank, RankZephyr, setwise/listwise/pointwise): results on BRIGHT and smallest sizes that work

### Takeaway
On BRIGHT, most rerankers fail to beat a strong reasoning-aware first stage: over ReasonIR-8B (30.59 nDCG@10), only Rearank-7B (31.75), Rank-K-32B (32.61) and ReasonRank-7B/32B (35.74/38.03) improve it; Rank1-7B (27.23), RankZephyr-7B (22.64) and Rank-R1-7B (20.57) make it worse. Reasoning helps when the first stage is weak (BM25), but explicit chain-of-thought can hurt pointwise rerankers by polarizing scores. The smallest models that reliably help are ~7B listwise reasoners; below 3B, gains are small or negative.

### Cited Findings
- **ReasonRank** (Wenhan Liu, Xinyu Ma, Weiwei Sun, Yutao Zhu, Yuchen Li, Dawei Yin, Zhicheng Dou; arXiv Aug 2025, ACL 2026). Listwise reasoning reranker, SFT + RL. BRIGHT avg nDCG@10 reranking ReasonIR top-100: ReasonIR baseline 30.59; RankT5-3B 16.60; RankZephyr-7B 22.64; Rank-R1-7B 20.57; Rank-R1-14B 29.66; Rank1-7B 27.23; Rank1-32B 28.34; Rearank-7B 31.75; Rank-K-32B 32.61; **ReasonRank-7B 35.74; ReasonRank-32B 38.03**. — [arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- ReasonRank backbone ablation (BRIGHT avg): Qwen2.5-7B SFT-only 33.15 → SFT+RL 35.74; Llama-3.1-8B 32.68 → 34.08; Qwen3-8B 35.22 → 36.14. — [arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- ReasonRank on R2MED (medical reasoning retrieval, E5-Mistral top-100): baseline 23.84; RankZephyr-7B 22.58; Rank1-7B 32.30; Rank1-32B 39.13; ReasonRank-7B 39.53; ReasonRank-32B 42.85. — [arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- ReasonRank-7B (listwise) is reported 2–2.7× faster than Rank1-7B (pointwise with reasoning) on eight BRIGHT datasets (4×A800 GPUs). — [arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- A secondary summary reports ReasonRank-32B at 40.6 BRIGHT avg (likely a different first stage or later version); not verified against the paper. — [Emergent Mind](https://www.emergentmind.com/topics/reasonrank)
- **Rank1** (Orion Weller, Kathryn Ricci, Eugene Yang, Andrew Yates, Dawn Lawrie, Benjamin Van Durme; Feb 2025, CoLM 2025). Pointwise reranker distilled from 600k+ DeepSeek-R1 reasoning traces on MS MARCO. BRIGHT avg nDCG@10 (BM25 top-100 over GPT-4o CoT-expanded queries): BM25 14.8; BM25 on GPT-4o CoT 26.5; MonoT5-3B 16.8; RankLLaMA-7B 13.9; RankLLaMA-13B 13.7; **Rank1-7B 27.5; Rank1-14B 28.7; Rank1-32B 29.4**; Qwen-7B same training without reasoning 17.5. Sizes 0.5B–3B exist; the paper says Rank1-0.5B is roughly comparable to RankLLaMA-13B (exact averages only in a figure). — [arXiv 2502.18418](https://arxiv.org/html/2502.18418)
- Rank1 on NevIR (negation, pairwise acc.): RankLLaMA-7B 31.6; MonoT5-3B 50.6; Rank1-7B 65.1; Rank1-32B 70.1; GPT-4o RankGPT 70.1. Rank1 also strong on mFollowIR (multilingual, instruction-following): Rank1-7B 0.586 nDCG@20 vs mE5-base 0.450. — [arXiv 2502.18418](https://arxiv.org/html/2502.18418)
- **"Don't Overthink Passage Reranking"** (Nour Jedidi, Yung-Sung Chuang, James Glass, Jimmy Lin; May 2025). Same training, Qwen2.5 pointwise, avg nDCG@10: 
  - 1.5B: StandardRR 19.0 BRIGHT / 61.3 MS MARCO; ReasonRR 15.6 / 55.9.
  - 3B: StandardRR 24.6 / 61.5; ReasonRR 23.6 / 57.8.
  - 7B: StandardRR 31.0 / 62.4; ReasonRR 27.8 / 57.4; ReasonRR-NoReason 30.8 / 58.8.
  - Cause: reasoning pushes scores to 0 or 1 ("polarized"), losing partial relevance; e.g. a passage the reasoning calls "somewhat relevant" gets 0.999. — [arXiv 2505.16886](https://arxiv.org/html/2505.16886)
- **JudgeRank** (Tong Niu, Shafiq Joty, Ye Liu, Caiming Xiong, Yingbo Zhou, Semih Yavuz; Oct 2024). Zero-shot agentic prompting: (1) query analysis, (2) query-aware document summary, (3) relevance judgment. Reports substantial gains over first-stage retrieval on BRIGHT and that ensembling several LLMs beats any single one. Exact numbers not retrieved. — [arXiv 2411.00142](https://arxiv.org/abs/2411.00142)
- **Setwise prompting** (Zhuang et al., SIGIR 2024): pointwise is cheap but weak, pairwise effective but costly; setwise ("which of these k is most relevant?") keeps most of pairwise effectiveness at far lower cost. Reproduction with small open models (Podolak et al., 2025) adds "Setwise Insertion", cutting query time 31% and inferences 23% with slightly better effectiveness. — [arXiv 2310.09497](https://arxiv.org/pdf/2310.09497v1.pdf); [arXiv 2504.10509](https://arxiv.org/html/2504.10509v1)
- **Rank-R1** (Zhuang et al., SIGIR 2026; arXiv 2025): setwise reranker trained with GRPO RL to reason before picking. — [Rank-R1 PDF](https://cs.uwaterloo.ca/%7Ejimmylin/publications/Zhuang_etal_SIGIR2026_RankR1.pdf)
- Lin group's reproducible BRIGHT baselines (Sharifymoghaddam, Ge, Lin; SIGIR 2026) note reasoning-trained retrievers Diver-4B and Reason-Embed-4B among the BRIGHT top-3 as of 2026-02-12, with Qwen3-8B, gpt-oss-120b and ReasonRank-32B as second stages. — [arXiv 2509.02558](https://arxiv.org/pdf/2509.02558) (summary via search snippet; PDF text did not extract)

### Inferences
- ligatura's result (reranker ≤ retrieval) matches BRIGHT: once the first stage is good, most rerankers subtract. Only listwise reasoning rerankers ≥7B reliably add.
- For a pointwise judge, ask for a graded score (or token-probability score) rather than CoT + yes/no; CoT polarizes scores and destroys ordering among near-misses.
- Listwise/setwise suits allusion ranking: the model compares Gospel candidates against each other ("which verse is this echoing?"), which is closer to how a scholar decides than absolute relevance.
- Practical small candidates: ReasonRank-7B (Qwen2.5-7B), Rank1-7B, or a setwise prompt on a Qwen3-8B chat model, run over top-10/20 only.

### Gaps
- No BRIGHT numbers for models <3B other than Rank1 (figure only) and Jedidi et al.
- JudgeRank exact BRIGHT scores and sizes not retrieved.
- RankVicuna/RankZephyr/FIRST BRIGHT numbers only via ReasonRank's table (RankZephyr 22.64); FIRST and ReasonIR's own reranker numbers not checked.
- No reasoning reranker has been evaluated on allusion/intertext data.

## Recent small cross-encoders (bge-reranker-v2-m3, gte, jina v2/v3, mxbai-rerank-v2, Qwen3-Reranker, MiniLM): performance and multilingual

### Takeaway
On standard benchmarks Qwen3-Reranker-4B/8B are clearly better than 0.6B (MMTEB-R 72.7/72.9 vs 66.4), but none of these cross-encoders has published BRIGHT-style reasoning results I could find, and on BRIGHT even 3B MS MARCO cross-encoders (MonoT5-3B 16.8, RankT5-3B 16.6) barely beat BM25.

### Cited Findings
- Qwen3-Reranker (Qwen team, Jun 2025) over Qwen3-Embedding-0.6B top-100, own runs: MTEB-R 0.6B 65.80 / 4B 69.76 / 8B 69.02; CMTEB-R 71.31 / 75.94 / 77.45; MMTEB-R 66.36 / 72.74 / 72.94. — [Qwen3 Embedding blog](https://qwenlm.github.io/blog/qwen3-embedding); [arXiv 2506.05176](https://arxiv.org/pdf/2506.05176)
- MS MARCO-style cross-encoders on BRIGHT: MonoT5-3B 16.8, RankLLaMA-7B 13.9, vs BM25 14.8. — [Rank1, arXiv 2502.18418](https://arxiv.org/html/2502.18418). RankT5-3B 16.60 vs ReasonIR first stage 30.59. — [ReasonRank, arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- Vendor/blog figures (not independent): bge-reranker-v2-m3 51.8 BEIR nDCG@10 vs jina-reranker-v3 61.94; jina-reranker-v3 is listwise (sees all candidates at once), 0.6B, CC BY-NC 4.0; mxbai-rerank-v2 Apache 2.0, ~8k context; bge-reranker-v2-m3 Apache 2.0. — [ianas.fr comparison](https://ianas.fr/en/blog/2026/06/07/reranker-comparatif-cohere-bge-jina-voyage/); [mixpeek](https://mixpeek.com/curated-lists/best-rerankers)
- Domain-shift evidence: on a patent benchmark, off-the-shelf general cross-encoders lowered nDCG@10 relative to the dense first stage. — [arXiv 2605.24297](https://arxiv.org/html/2605.24297v1)

### Inferences
- Swapping 0.6B for Qwen3-Reranker-4B is the cheapest experiment with known upside (+6 MMTEB-R points), but the 4B gain on generic retrieval does not imply gains on allusion.
- jina-reranker-v3's listwise design is the right shape for "pick the echoed verse", but its non-commercial license may matter.

### Gaps
- No BRIGHT or literary-domain numbers for bge-reranker-v2-m3, gte-reranker, jina v2/v3, mxbai-rerank-v2, MiniLM, or Qwen3-Reranker. Check the BRIGHT leaderboard directly.

## Why MS MARCO-trained rerankers mismatch allusive similarity, and fixes (fine-tuning, instructions, fusion)

### Takeaway
Generic rerankers learn "does this passage answer this question?" Allusion is symmetric, paraphrastic and often lexically disjoint, so the learned signal points the wrong way. The one strong domain result (Latin intertext) comes from a cross-encoder fine-tuned on in-domain pairs, not an off-the-shelf model.

### Cited Findings
- **Loci Similes** (Schelb, Wittweiler, Revellio, Feichtinger, Spitz; arXiv Jan 2026). Latin intertextuality benchmark, ~176k segments, 1,490 expert-verified references (v3). BM25 on lemma unigrams has best Recall@100: 77.62 verbatim, 29.43 allusions; BGE-M3 (fine-tuned) 63.50 / 20.62. Retrieve-and-rerank with a fine-tuned XLM-R Large cross-encoder at k=100 recovers 185/294 references (63%), F1 0.17 vs 0.02 retrieval-only. Training used 1:1 to 1:10 positive:negative ratios. No off-the-shelf reranker or LLM judge tested. — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3)
- Allusions (non-verbatim) are far harder than quotes for every retriever in Loci Similes (≈29 vs ≈78 R@100 for BM25). — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3)
- Rank1 without reasoning (plain MS MARCO-distilled Qwen-7B) gets 17.5 on BRIGHT vs 27.5 with reasoning traces, showing MS MARCO relevance alone transfers poorly to reasoning relevance. — [arXiv 2502.18418](https://arxiv.org/html/2502.18418)
- Biblical Hebrew parallel detection: E5 strongest at finding parallels, AlephBERT better at rejecting non-parallels. — [arXiv 2506.24117](https://arxiv.org/html/2506.24117)
- Off-the-shelf general cross-encoders hurt nDCG@10 on patents vs dense first stage. — [arXiv 2605.24297](https://arxiv.org/html/2605.24297v1)

### Inferences
- With 49 gold pairs, full fine-tuning risks overfitting; a few-shot LoRA on bge-reranker-v2-m3 or Qwen3-Reranker with mined hard negatives (from other Gospel verses) plus cross-validation is the realistic path. Loci Similes shows fine-tuning on a few hundred positives works.
- Qwen3-Reranker accepts a task instruction; an instruction like "Judge whether the passage alludes to, paraphrases, or echoes the Gospel verse" is a zero-cost test (not verified for this task).

### Gaps
- No paper found that measures instruction wording effects on reranker accuracy for allusion.
- No few-shot (<100 pairs) reranker fine-tuning study on intertext.

## Fusing reranker scores with first-stage scores vs replacing

### Takeaway
Evidence is thinner than expected for 2024–2026, but it points one way: zero-shot or instruction-tuned LLM rerankers benefit from interpolation with first-stage scores, while in-domain supervised cross-encoders do not. Given ligatura's reranker is roughly neutral-to-negative, fusing it as one more RRF list is the low-risk choice.

### Cited Findings
- Zero-shot LLM reranking study (Zhuang et al., 2023): interpolating with BM25 scores consistently benefits instruction-tuned and zero-shot LLM rerankers but consistently hurts monoT5-3B (trained in-domain). — [arXiv 2310.13243](https://arxiv.org/pdf/2310.13243) (attribution from search snippet; 2023, outside date range)
- BM25–dense interpolation gives +0.002 to +0.015 nDCG@10 across 5 dense models on patents; benefit shrinks as the base model gets stronger. — [arXiv 2605.24297](https://arxiv.org/html/2605.24297v1)
- BRIGHT: most rerankers fall below the ReasonIR first stage when they replace it (see table above), implying replacement discards useful first-stage signal. — [arXiv 2508.07050](https://arxiv.org/html/2508.07050)
- JudgeRank: ensembling several LLM judges beats any one judge. — [arXiv 2411.00142](https://arxiv.org/abs/2411.00142)
- RRF (k=60) used widely as a default for combining scorers; no head-to-head vs interpolation found. — [DEV Community guide](https://dev.to/velsof/production-reranker-layer-for-rag-in-python-cross-encoder-cohere-fallback-and-reciprocal-rank-1a29) (practitioner source)

### Inferences
- Add the reranker as a fourth RRF list, or interpolate normalized scores with a weight tuned by leave-one-out on the 49 pairs. Expect at best small gains; the main value is not losing R@1.
- Apply reranker only to top-10/20 candidates; R@10 is already 45/49, so reranking deeper buys little and costs time.

### Gaps
- No 2024–2026 paper directly compares interpolation, RRF-with-reranker, and replacement on a reasoning benchmark.

## LLM-as-judge for literary allusion and intertext; small models; prompting

### Takeaway
LLMs can confirm allusions when shown the right pair but over-attribute thematic overlap and fail at open-ended recall. The bottleneck is usually retrieval, not judgment. All strong published results use frontier models; no study found evaluates 1–8B judges on allusion.

### Cited Findings
- **McCarthy/KJV case study** (Ewan Cameron; arXiv Apr 2026). Pipeline: Voyage embeddings retrieve ~3,000 pairs; Claude Haiku 4.5 screens each pair as Strong/Moderate/Weak/None (rejects ~87% of ~16k pairs); GPT-5.4 classifies connection type with quotes; temperature 0. Recall 62/115 attested allusions (54%), 30% for transformed imagery to 80% for register collisions. ~94% of misses never reached the LLM (retrieval failure); "in no audited case did an LLM receive the correct passage pair and reject it." Haiku still rated 2 mismatched pairs Moderate on thematic overlap. Precision not reported. — [arXiv 2604.19447](https://arxiv.org/html/2604.19447)
- **Persian allusions** (Nobakhtian, Yaghoobzadeh, Pilehvar; Findings EMNLP 2025): 11 LLMs; high multiple-choice accuracy but large drop in open-ended recognition, especially indirect references; reasoning-optimized models generalize better, distilled models degrade. — [ACL Anthology 2025.findings-emnlp.1403](https://aclanthology.org/2025.findings-emnlp.1403/)
- **Woolf and Homer** (ACH 2025): similarity search then prompt-based LLM analysis; expert-informed prompts raise theoretical alignment +16.23% but 90% of analyses claim classical transformations (over-interpretation). — [ACH Anthology](https://anthology.ach.org/volumes/vol0003/between-woolf-homer-explorative-approach-to-using/)
- **Koine Greek NT intertext** (Umphrey, Roberts, Roberts; arXiv 2024): LLMs detect quotations, allusions and echoes, but struggle with long query passages and propose false intertextual dependences. — [arXiv 2409.01882](https://arxiv.org/abs/2409.01882)
- Survey: evaluation criteria for intertextuality are ambiguous; narrative intertextuality unsolved. — [arXiv 2510.27045](https://arxiv.org/pdf/2510.27045)
- Prompting evidence from IR: CoT before a binary decision polarizes scores (Jedidi et al.); multi-step analyze-query → summarize-document → judge (JudgeRank) helps on BRIGHT; setwise/listwise comparison is cheaper and stronger than pointwise. — [arXiv 2505.16886](https://arxiv.org/html/2505.16886); [arXiv 2411.00142](https://arxiv.org/abs/2411.00142); [arXiv 2310.09497](https://arxiv.org/pdf/2310.09497v1.pdf)

### Inferences
- For ligatura's chat judge: show one Imitation passage with its top ~5–10 Gospel candidates and ask which (if any) it echoes (setwise/listwise), keep passages short, and allow "none". This targets both known failure modes (long inputs, over-attribution).
- Neutral prompts matter: the McCarthy study flags that naming "biblical allusions" in the prompt may bias attribution.
- Since retrieval R@10 is 45/49, a judge that only reorders top-10 can at most lift R@1 from 32 toward 45.

### Gaps
- No study of 1–8B open models (Llama, Qwen, Gemma) judging allusion or intertext.
- No precision numbers for any LLM allusion judge.

## Quantization effects on rerankers and fast local inference (MLX, llama.cpp)

### Takeaway
Direct evidence on reranker quantization is scarce. Rank1's int4 AWQ loses several points on 7B/14B but not 32B; general LLM data says Q8 is near-lossless and Q4_K_M costs ~1–2% perplexity. ligatura's q8 vs fp32 Qwen3-Reranker-0.6B gap (R@1 29–30 vs 32) suggests small models are more sensitive.

### Cited Findings
- Rank1 int4 (AWQ), BRIGHT Biology nDCG@10 full → quantized: 7B 48.8 → 42.8; 14B 49.3 → 44.6; 32B 49.7 → 52.3; Llama3-8B 45.8 → 41.5. NevIR: 7B 65.1 → 62.0; 32B 70.1 → 69.9. — [arXiv 2502.18418](https://arxiv.org/html/2502.18418)
- Activation quantization in a reranker kept ranking accuracy near FP32 down to 4-bit because ranking depends on order, not absolute scores. — [arXiv 2605.25716](https://arxiv.org/pdf/2605.25716)
- A distilled LLM cross-encoder kept full accuracy at 4-bit. — [arXiv 2607.11933](https://arxiv.org/pdf/2607.11933)
- General GGUF (not rerankers): Q8_0 ≈ FP16; Q4_K_M ~1–2% perplexity cost, ~1.1 MMLU points. — [DEV Community](https://dev.to/mrsaynothing/gguf-quantization-which-level-should-you-use-3lbe); [tinyweights.dev](https://tinyweights.dev/posts/gguf-quantization-levels-q4-q5-q8/)

### Inferences
- Quantize big, not small: a 4B–8B reranker at Q8/Q4 is likely better than a 0.6B at fp32, and smaller quantization loss in larger models (Rank1-32B) supports this.
- For speed on Apple Silicon, scoring ~10–20 candidates per query (not 1,320 pairs) with a 4B–8B model on MLX or llama.cpp Metal should cut wall time far more than any quantization choice.

### Gaps
- No published Q4/Q8 benchmarks for Qwen3-Reranker, bge-reranker-v2-m3 or jina rerankers.
- No published MLX vs llama.cpp reranker throughput numbers found.
