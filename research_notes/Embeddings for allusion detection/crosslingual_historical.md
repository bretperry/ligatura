# Cross-lingual and diachronic NLP for text reuse across languages and centuries (2022–2026)

Scope note: ~17 tool calls. Items marked "unverified" in Gaps come from prior knowledge and were not confirmed with a source this session. Treat them as leads, not findings.

## Historical/ancient-language encoders and sentence embedders

### Takeaway
Only Latin/Greek/English has a purpose-built cross-lingual sentence embedder (SPhilBERTa, 2023); Ancient Greek has a distilled sentence embedder (Krahn et al. 2023). For other ancient languages the public models are token encoders (BEREL, GuwenBERT, ByT5-Sanskrit) or taggers, not sentence embedders. On the one large Latin reuse benchmark, lemmatized BM25 beats bge-m3 and SPhilBERTa for retrieval.

### Cited Findings
- SPhilBERTa: trilingual (Ancient Greek, Latin, English) Sentence-RoBERTa built on PhilBERTa; first model applied to cross-lingual Latin-to-Greek allusion detection; training pairs augmented by machine-translating English into Ancient Greek; "detects translations with high accuracy" and augmentation "significantly enhances" performance. Riemenschneider & Frank, ALP 2023. Models on GitHub Heidelberg-NLP/ancient-language-models — [arXiv 2308.12008](https://arxiv.org/abs/2308.12008v1); [ALP 2023 proceedings](https://aclanthology.org/volumes/2023.alp-1/)
- Ancient Greek sentence embeddings via multilingual knowledge distillation (English teacher, Greek student) on Greek–English aligned pairs; evaluated on translation search, STS, retrieval, translation bias; datasets released at kevinkrahn/ancient-greek-datasets. Abstract gives no numbers. Krahn, Tate, Lamicela, ALP 2023 — [arXiv 2308.13116](https://arxiv.org/abs/2308.13116)
- A 2026 preprint reports massively multilingual encoders transfer poorly to Latin/Ancient Greek, and that SPhilBERTa stays below a Latin-specific model in both detection and retrieval — [arXiv 2607.24542](https://arxiv.org/pdf/2607.24542) (seen via search snippet only; not fetched)
- Loci Similes benchmark (Latin intertextuality): ~176k segments (85k query, 91k source), 1,490 expert-verified references. Schelb, Wittweiler, Revellio, Feichtinger, Spitz (Konstanz/Zurich), 2026. Data and fine-tuned models Apache 2.0 on Hugging Face; Python package `locisimiles` — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3)
  - Recall@100 (verbatim / allusion): BM25 on CLTK lemmas 77.62 / 29.43 (best); BGE-M3 63.50 / 20.62; E5-large 63.06 / 18.25. SPhilBERTa, Granite, LatinBERT, Word2Vec also tested (below BM25-lemma). — same source
  - Classification F1 (verbatim): fine-tuned LatinBERT cross-encoder 77.82; XLM-R Large 75.65. Allusion F1 best ~12.8. — same source
  - Retrieve-then-rerank at k=100: recovers 185/294 references (63%), shrinks candidates 28,240 → 1,901, F1 0.17 vs 0.02 for retrieval alone. — same source
- BEREL (Rabbinic Hebrew BERT-base): ~220M words from Sefaria and Dicta; beats AlephBERT and word2vec on a homograph challenge set; released for unrestricted use. Shmidman et al., 2022 — [arXiv 2208.01875](https://arxiv.org/abs/2208.01875v1)
- GuwenBERT: RoBERTa pre-trained on Classical Chinese; for sentence breaking, punctuation, NER; not a sentence embedder (needs fine-tuning for retrieval) — [HF ethanyt/guwenbert-large](https://huggingface.co/ethanyt/guwenbert-large)
- A Hugging Face cross-language search model (modern Chinese query → Classical Chinese text) exists; date/architecture not stated — [HF raynardj/xlsearch-cross-lang-search-zh-vs-classicical-cn](https://huggingface.co/raynardj/xlsearch-cross-lang-search-zh-vs-classicical-cn)
- Classical Chinese intertextuality: a 2026 paper argues for grounded LLM agentic extraction over pure similarity for Chinese histories — [arXiv 2607.27595](https://arxiv.org/pdf/2607.27595) (title/snippet only)
- ByT5-Sanskrit: byte-level T5 (further pretrained on Sanskrit) jointly doing segmentation (sandhi), lemmatization, morphosyntactic tagging; beats prior data-driven segmenters, matches the best lexicon-based one; new SOTA lemmatization/parsing on other morphologically rich languages. Nehrdich, Hellwig, Keutzer, Findings EMNLP 2024 — [ACL 2024.findings-emnlp.805](https://aclanthology.org/2024.findings-emnlp.805); [arXiv 2409.13920](https://arxiv.org/abs/2409.13920)
- Coptic, Demotic, Earlier Egyptian neural lemmatization and POS models. Sahala & Lincke, ML4AL 2024 — [ACL 2024.ml4al-1.10](https://aclanthology.org/2024.ml4al-1.10/). Coptic SCRIPTORIUM corpora underlie this and MicroBERT (Gessler & Zeldes 2022) — [EvaCun 2025 shared task paper](https://aclanthology.org/2025.alp-1.33.pdf)
- Ancient Greek semantic reuse: contrastive fine-tuning of a pretrained encoder to catch paraphrased and morphologically altered reuse; lemmatization used in its synonym pipeline (effect not isolated in snippet) — [CLiC-it 2025](https://aclanthology.org/2025.clicit-1.34.pdf) (PDF not readable via fetch)

### Inferences
- For Latin/Greek↔English pairs, SPhilBERTa is the only drop-in cross-lingual embedder; ligatura could add it as a vote for la/grc pairs. It is RoBERTa-base size, so ONNX export for transformers.js should be feasible (not verified).
- Loci Similes is the best public yardstick for ligatura's Latin path and it says lexical retrieval on lemmas beats dense retrieval, even for allusions. This argues for adding lemmatization before adding another embedder.
- For Hebrew, Sanskrit, Coptic, Classical Chinese, the realistic gain is lemmatization/segmentation, not a new embedder.

### Gaps
- No sentence-embedding model found for Classical Chinese, Classical Arabic, Syriac, Akkadian, Old English, Pali, Coptic, or Persian (historical).
- Unverified leads (prior knowledge, not checked this session): LatinBERT (Bamman & Burns 2020); GreBerta/PhilTa (Riemenschneider & Frank 2023); Ancient-Greek-BERT (Singh et al. 2021); SikuBERT/SikuRoBERTa (Siku Quanshu, 2022); CAMeLBERT-CA (classical Arabic variant, Inoue et al. 2021); DictaBERT (2023) and Dicta's Biblical Hebrew tools; MicroBERT for Coptic. Licenses and ONNX availability not checked.
- Syriac: no 2022–2026 lemmatizer or embedder found. Pali: only a corpus paper (SiPaKosa, [arXiv 2603.29221](https://arxiv.org/pdf/2603.29221), bibliography only) surfaced.
- Krahn et al. numbers vs LaBSE not retrieved; model release status unclear.

## Cross-lingual sentence embedders beyond bge-m3

### Takeaway
No benchmark compares LaBSE, SONAR, LASER3, mE5, Qwen3-Embedding or MEXMA on ancient languages. The one ancient-language alignment study found LaBSE (+Vecalign) best of LASER/LaBSE on Greek and Latin. On Loci Similes (monolingual Latin), bge-m3 ≈ E5-large.

### Cited Findings
- Craig et al., CHR 2023: LASER and LaBSE untuned on Thucydides (Greek) and Lucretius (Latin) alignment with translations; LaBSE + Vecalign best; LaBSE "worked surprisingly well" on Ancient Greek, likely from Modern Greek data; all systems weak under strict scoring — [CEUR Vol-3558](https://ceur-ws.org/Vol-3558/paper6193.pdf); [PDF](https://www.khoury.northeastern.edu/home/dasmith/craig-chr-2023.pdf)
- SONAR (Meta, 2023): one text encoder for 200 languages; reports beating LASER3 and LaBSE on xsim/xsim++ similarity search — [arXiv 2308.11466](https://www.alphaxiv.org/abs/2308.11466)
- LASER3: distilled per-language-family encoders for low-resource bitext mining — [arXiv 2205.12654](https://arxiv.org/html/2205.12654v1)
- MEXMA (2024): adds token-level objectives to sentence-level cross-lingual training; improves sentence representations — [arXiv 2409.12737](https://arxiv.org/pdf/2409.12737)
- A 2026 Greek treebank (AthDGC) uses LaBSE to match Greek NT verses to Latin Vulgate, Gothic, Old Church Slavonic, Classical Armenian — [arXiv 2606.15510](https://arxiv.org/pdf/2606.15510) (snippet only)
- Linear cross-lingual mapping of sentence embeddings (translation-invariance constraint) improves alignment cheaply; tested on modern languages only. Vasilyev et al., Findings ACL 2024 — [ACL 2024.findings-acl.486](https://aclanthology.org/2024.findings-acl.486/)
- McGovern, Sirin, Lippincott 2025: corpus-level intertextuality metric in multilingual embedding space over Bible translations; machine translations act as a neutral reference, human translators amplify or damp intertextuality — [arXiv 2501.10731](https://arxiv.org/abs/2501.10731)

### Inferences
- LaBSE is the best-evidenced off-the-shelf cross-lingual embedder for Greek/Latin; worth an eval against bge-m3 on ligatura's grc/la fixtures. Its Modern-Greek transfer argument suggests similar luck for Persian (modern Persian data) and possibly Hebrew, but not Akkadian, Coptic, Pali.
- SONAR covers 200 languages, but its 1.5B-ish size and license (CC-BY-NC in prior knowledge, unverified) may block a free local tool.
- A learned linear map (Vasilyev et al.) fitted on a few hundred verse-aligned Bible pairs per language could cheaply align weak languages (Pali, Coptic, Syriac) into bge-m3 space. Untested on ancient languages.

### Gaps
- No ancient-language numbers for mE5, Qwen3-Embedding, Glot500, MEXMA, SONAR.
- Licenses, sizes and ONNX/transformers.js availability not checked for LaBSE/SONAR/MEXMA this session. (Prior knowledge, unverified: LaBSE Apache-2.0 with ONNX ports on HF; Glot500 covers 500+ languages incl. some historical ones but is not a sentence embedder.)

## Machine translation as a bridge (translate-then-embed)

### Takeaway
Small dedicated MT exists for Akkadian (BLEU ~37) and Coptic, and SPhilBERTa itself was trained with MT-augmented Greek. No study found directly measures translate-then-embed for allusion detection; ligatura's optional English gloss is the same idea.

### Cited Findings
- Akkadian→English NMT: transliteration→English BLEU4 37.47, cuneiform→English 36.52; best on sentences ≤ ~118 chars; hallucinations occur; usable as first pass. Gutherz, Gordin, Sáenz, Levy, Berant, PNAS Nexus 2023 — [PNAS Nexus pgad096](https://academic.oup.com/pnasnexus/article/2/5/pgad096/7147349)
- Coptic MT: 2024 paper notes no specialized pretraining/fine-tuning dataset for Coptic — [ACL 2024.arabicnlp-1.25](https://aclanthology.org/2024.arabicnlp-1.25.pdf). Coptic–French NMT strategies for low-resource ancient languages, 2025 — [arXiv 2508.10683](https://arxiv.org/html/2508.10683v1)
- RAG-enhanced NMT of an ancient language, NLP4DH 2025 — [ACL 2025.nlp4dh-1.4](https://aclanthology.org/2025.nlp4dh-1.4.pdf) (title only)
- SPhilBERTa used MT (multilingual T5 pretrained on grc/la/en) to create Greek training pairs — [arXiv 2308.12008](https://arxiv.org/abs/2308.12008v1)
- Machine translations as a neutral pivot for intertextuality measurement in Bible corpora — [arXiv 2501.10731](https://arxiv.org/abs/2501.10731)

### Inferences
- For Akkadian (transliteration input, as ligatura uses), the Gutherz et al. T2E model is the obvious pivot to English, then use English lexical + embedding scoring. Check its license/weights before adopting.
- Translate-then-embed is most promising where embedders are weakest (Sanskrit, Coptic, Pali, Akkadian). It costs inference time and adds hallucination risk; keep the original-language lexical channel as a guard.

### Gaps
- No evidence found for NLLB or MADLAD quality on Latin, Ancient Greek, Sanskrit, Pali, Syriac, or for small LLMs as pivots. (Prior knowledge, unverified: NLLB-200 does not list Latin or Ancient Greek; MADLAD-400 includes Latin and some classical languages.)
- No ablation of "embed original" vs "translate to English then embed" for reuse detection found.

## Lemmatizers and morphology tools; does lemmatization help reuse detection?

### Takeaway
Yes, for Latin, with the strongest recent evidence: on Loci Similes, BM25 over lemmas tops every dense retriever (R@100 77.6 vs bge-m3 63.5 verbatim; 29.4 vs 20.6 allusion). Older work found lemmatized input improved nearly all allusion-detection models.

### Cited Findings
- Loci Similes: BM25 on CLTK lemmas best retriever; authors attribute this to lemmas countering subword fragmentation of Latin morphology — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v3)
- Allusive reuse detection (2019): lemmatized input improved nearly all models; plain TF-IDF beat purely semantic models — [arXiv 1905.02973](https://arxiv.org/pdf/1905.02973)
- ByT5-Sanskrit: one model for sandhi segmentation + lemmatization + tagging — [ACL 2024.findings-emnlp.805](https://aclanthology.org/2024.findings-emnlp.805)
- Coptic/Egyptian neural lemmatizers — [ACL 2024.ml4al-1.10](https://aclanthology.org/2024.ml4al-1.10/)
- Akkadian lemmatization shared task (EvaCun 2025) — [ACL 2025.alp-1.33](https://aclanthology.org/2025.alp-1.33.pdf)
- Latin lemma embeddings trained on a hand-annotated Classical corpus (plus Aquinas vectors). Miller, Kuflik, Lavee, Applied Sciences 2025 — cited via [ResearchGate/search snippet](https://www.researchgate.net/publication/390028840_Text_Alignment_in_the_Service_of_Text_Reuse_Detection) (link resolution uncertain)

### Inferences
- ligatura's suffix stemmer + char n-grams are a cheap proxy for lemmas; Loci Similes suggests a real lemmatizer could add ~10+ points of recall on Latin. ByT5-Sanskrit would likewise unlock Sanskrit lexical overlap through sandhi splitting, which is the main reason Sanskrit lexical matching fails today.
- Lemmatizers are mostly Python (CLTK, Stanza, spaCy). For a JS/local tool, options are: precomputed lemma lookup tables (form→lemma dictionaries exported from treebanks), or ONNX export of a small seq2seq/byte model.

### Gaps
- Not checked this session: Stanza, LatinCy, GreCy, UDPipe 2, CAMeL Tools, Dicta lemmatizer — coverage, licenses, ONNX. (Prior knowledge, unverified: UDPipe 2 has UD models for Latin, Ancient Greek, Coptic, Classical Chinese, Old English? (not certain), Sanskrit, Hebrew; CAMeL Tools is MIT; LatinCy is spaCy-based.)
- No lemmatization ablation found for Greek, Hebrew, Arabic, Sanskrit reuse detection.

## Diachronic change and spelling normalization

### Takeaway
Historical spelling normalization is a mature task (character-level NMT/seq2seq, rule plus neural hybrids), but no 2022–2026 paper ties it to reuse detection. Evidence is mostly 2018–2019 plus a 2024 Polish T5 normalizer.

### Cited Findings
- NMT for historical spelling normalization across five languages incl. English; RNNs competitive; transformers better with more data; hybrid helps. Tang et al. 2018 — [arXiv 1806.05210](https://arxiv.org/pdf/1806.05210.pdf)
- Largest normalization comparison (8 languages); no consensus SOTA. Bollmann 2019 — [N19-1389](https://preview.aclanthology.org/fix_video/N19-1389.pdf)
- Normalizing Early English letters (CEEC) to present-day spelling with NMT. Hämäläinen et al. 2019 — [paperswithcode](https://cs.paperswithcode.com/paper/normalizing-early-english-letters-to-present)
- Normalization improved POS tagging on historical English. Robertson & Goldwater 2018 — [arXiv 1804.02545](https://arxiv.org/pdf/1804.02545.pdf)
- Polish diachronic normalization: rule-based vs T5 neural model, 2024 — [arXiv 2402.01300](https://arxiv.org/pdf/2402.01300v1)
- Ancient Egyptian stages aligned via normalization-aware multitask learning, 2026 — [arXiv 2603.24258](https://arxiv.org/pdf/2603.24258) (title only)

### Inferences
- For Early Modern English vs modern English, a rule/lookup normalizer (e.g. VARD-style variant table) before stemming is the cheap win; character n-grams already absorb some variation.
- Old English↔modern English is a translation problem, not normalization; treat it like any cross-language pair.

### Gaps
- No 2022–2026 study on diachronic semantic-change methods (e.g. temporal embeddings) applied to reuse detection found.
- Tool availability (VARD 2, MorphAdorner) and licenses not checked.

## Cross-lingual reuse/allusion detection papers

### Takeaway
Direct cross-lingual allusion work is rare: Latin→Greek (SPhilBERTa), Bible-translation intertextuality in embedding space (McGovern et al. 2025), and Bible word alignment resources. Nothing found for Arabic↔Persian or Hebrew↔Greek LXX reuse detection with neural methods.

### Cited Findings
- Latin allusions to Greek literature with SPhilBERTa, case study included — [arXiv 2308.12008](https://arxiv.org/abs/2308.12008v1)
- Bible translations and intertextuality in multilingual embedding spaces — [arXiv 2501.10731](https://arxiv.org/abs/2501.10731)
- Septuagint UD treebank: words aligned to the Hebrew source and annotations projected; 1,576 sentences, 39K tokens (~7% of LXX). Swanson, Bussert, Tyers, LREC-COLING 2024 — [ACL 2024.lrec-main.1145](https://aclanthology.org/2024.lrec-main.1145.pdf)
- Word-alignment models for Bible translations in 100+ historical and contemporary languages (OPUS + PROIEL) — [GitHub npedrazzini/parallelbibles](https://github.com/npedrazzini/parallelbibles)
- Multilingual PLMs give good word alignments without parallel data (SimAlign line of work); Bible-corpus alignments for all pairs. Jalili Sabet, LMU dissertation — [PDF](https://edoc.ub.uni-muenchen.de/30831/1/Jalili_Sabet_Masoud.pdf)
- eBible corpus: 1,009 translations in 833 languages (incl. Septuagint) — via [arXiv 2304.09919](https://arxiv.org/pdf/2304.09919v1.pdf)
- Survey: Quantitative intertextuality from the digital humanities perspective, 2025 — [arXiv 2510.27045](https://arxiv.org/pdf/2510.27045)

### Inferences
- The Bible is the universal parallel corpus for ligatura's languages (Hebrew, Greek, Latin, Syriac Peshitta, Coptic, Arabic, Persian, Old English gospels, Classical Chinese versions). Verse-aligned Bibles could (a) serve as cross-lingual eval fixtures, (b) supply pairs for a linear map or light fine-tune of the embedder, (c) seed bilingual lemma dictionaries via word alignment (SimAlign-style using bge-m3 token vectors) to restore a lexical channel across languages.
- A cross-lingual lexical channel (aligned lemma pairs) would replace "lexical overlap dropped when languages differ," which today leaves cross-language pairs embedding-only.

### Gaps
- No neural Hebrew↔Greek LXX reuse study, Arabic↔Persian reuse study, or Syriac↔Greek study found in this pass.
- Did not fetch the 2026 grc/la detection preprint (2607.24542) or the CLiC-it 2025 Greek paper to get numbers.
