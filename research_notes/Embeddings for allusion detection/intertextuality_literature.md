# Computational intertextuality and allusion detection, 2020–2026

Scope: methods, numbers, and code for detecting quotation, paraphrase and allusion in literary and religious texts. Emphasis on 2024–2026. Written for ligatura (local pipeline: nomic-embed-text-v1.5 + bge-m3 + rare-word + char n-gram, fused with RRF; optional Qwen3-Reranker-0.6B). Notes compiled 2026-11-17 from 22 tool calls; most numbers come from arXiv abstracts or HTML full text read through a summarizing fetcher, so verify exact figures against the PDFs before quoting them.

## Strongest recent methods by language (2023–2026)

### Takeaway
No single method dominates. On the best recent Latin benchmark, lemma-level BM25 still beats every dense bi-encoder at retrieval, and a fine-tuned cross-encoder on top of BM25 roughly doubles F1. Elsewhere the strongest results come from cheap domain adaptation of small encoders (Greek/Latin patristics, Biblical Hebrew, Chinese poetry) and from LLM-in-the-loop verification on top of a lexical/embedding candidate stage (McCarthy→KJV, Chinese histories).

### Cited Findings

**Latin**
- **Loci Similes** (Schelb, Wittweiler, Revellio, Feichtinger, Spitz; arXiv 2601.07533, v1 2026-01-12, v3 2026-08-31). Benchmark of ~176k Latin segments with 1,490 expert-verified parallels, including 945 references from an earlier Valerius Flaccus dataset. Task spans verbatim quotation to paraphrase and allusion. — [arXiv abs](https://arxiv.org/abs/2601.07533)
  - Retrieval baselines: TF-IDF and BM25 on surface tokens or CLTK lemmas; Word2Vec bigram and LatinBERT token embeddings; fine-tuned bi-encoders BGE-M3, E5-small/base/large, Granite-107m/278m, SPhilBERTa. — [arXiv HTML v3](https://arxiv.org/html/2601.07533v3)
  - Recall@100 (verbatim / allusion): BM25 lemma unigrams 77.6 / 29.4 (best); LatinBERT 68.8 / 28.1; BGE-M3 63.5 / 20.6; E5-large 63.1 / 18.3. — [arXiv HTML v3](https://arxiv.org/html/2601.07533v3)
  - Classification F1 (verbatim / allusion): LatinBERT cross-encoder 77.8 on verbatim; XLM-R Large 75.7; allusion F1 only ~11–13 for all transformers (mmBERT Small best at 12.8); logistic regression on lexical features 46.0 / 4.5. — [arXiv HTML v3](https://arxiv.org/html/2601.07533v3)
  - Retrieve-and-rerank (BM25 → fine-tuned XLM-R Large cross-encoder): F1 0.42 vs 0.19 retrieval-only at k=5; recovers 185 of 294 references (63%) while cutting candidates from 28,240 to 1,901 (−93%). — [arXiv HTML v3](https://arxiv.org/html/2601.07533v3)
  - Code: https://github.com/julianschelb/locisimiles (pip package `locisimiles`); data (Apache 2.0) https://hf.co/collections/julian-schelb/datasets-for-latin-intertextuality-search; fine-tuned models https://hf.co/collections/julian-schelb/models-for-latin-intertextuality-search. — [arXiv HTML v3](https://arxiv.org/html/2601.07533v3)
- **Valerius Flaccus benchmark** (Dexter, Chaudhuri, Burns et al., 2024, Journal of Open Humanities Data): 945 references in *Argonautica* 1 to earlier and contemporary Roman authors, built to evaluate computational intertextual search. — [JOHD data paper PDF](https://openhumanitiesdata.metajnl.com/articles/153/files/65b7ab32731ea.pdf)
- **Burns, Brofos, Li, Chaudhuri, Dexter, "Profiling of Intertextuality in Latin Literature Using Word Embeddings"** (NAACL 2021). Word2vec on lemmatized Latin; state of the art on synonym detection and beats a widely used lexical method (Tesserae) for intertextual search. — [ACL Anthology](https://aclanthology.org/2021.naacl-main.389/)
- **Tesserae** baseline: two passages count as a parallel if they share two or more (lemmatized) words; later versions added embeddings. — [summary in Xing 2025 / search snippet](https://arxiv.org/pdf/2509.06637)
- **Xing, "Modelling Intertextuality with N-gram Embeddings"** (arXiv 2509.06637, 2025). Pairwise comparison of n-gram embeddings averaged to a text-level score, plus network analysis; validated on 4 texts and scaled to 267. No quantitative accuracy in the abstract; no code found. Document-level, not passage-level. — [arXiv](https://arxiv.org/abs/2509.06637)

**Greek and Latin, cross-lingual**
- **SPhilBERTa** (Riemenschneider & Frank, "Graecia capta ferum victorem cepit. Detecting Latin Allusions to Ancient Greek Literature", ALP 2023). Trilingual (Greek/Latin/English) Sentence-RoBERTa distilled from PhilBERTa, with training data made by machine-translating English into Ancient Greek. Reports >95% translation-retrieval accuracy; case study on Latin authors' borrowings from Greek. Model on Hugging Face (bowphs/SPhilBerta). — [ACL Anthology](https://aclanthology.org/2023.alp-1.4/); [arXiv](https://arxiv.org/abs/2308.12008v1)
- **Greetino / "Gretino"** (Toyin, Iezzi, Scapini, Federico, Puccetti; LREC 2026): Greek and Latin dataset to benchmark retrieval systems in classical languages; compares PhilBERTa-based students with SPhilBERTa. The PDF could not be parsed, so numbers are unverified. — [LREC 2026 PDF](https://aclanthology.org/2026.lrec-1.70.pdf)

**Patristics and Bible reuse (Latin, Greek)**
- **de la Selle et al., "From transcription to semantic corpus analysis: unsupervised learning of sentence representations for ancient languages"** (arXiv 2607.24542, 2026-07-27). Gold: 2,935 expert-verified biblical-reuse parallels in Augustine, Jerome, Athanasius (largely from BiblIndex TEI editions). Method: adapt a token-level specialist LM into a sentence encoder with only raw in-domain sentences, via TSDAE or contrastive sentence embedding (CSE, SimCSE-style). Both beat multilingual, specialized, distilled and *supervised fine-tuned* baselines on detection and retrieval. CSE leads retrieval and peaks with ~4–8k raw in-domain sentences, training in tens of seconds on a laptop GPU; TSDAE leads detection with a large in-domain corpus. Transfers across authors and to noisy HTR text. Tool: Paraphrasis. Exact numbers not in abstract. — [arXiv abs](https://arxiv.org/abs/2607.24542)
- **Scripture Detector (Patristic Text Archive)**: Gemini-based biblical quotation/allusion annotator; authors say quality depends on the Gemini model. Not local. — [GitHub](https://github.com/PatristicTextArchive/scripture-detector-pta)
- **Psalmic reuse in the NT** (*Religions* 17(1):88, 2026): deliberately non-neural pipeline; per-type accuracy from 0.38 (implicit echoes) to 0.98 (literal quotations). Authors argue a neural approach lacks a validated ancient-Bible training corpus. — [doi 10.3390/rel17010088](https://doi.org/10.3390/rel17010088)
- **Umphrey, Roberts, Roberts, "Investigating Expert-in-the-Loop LLM Discourse Patterns for Ancient Intertextual Analysis"** (arXiv 2409.01882, 2024). LLMs on Koine Greek NT find explicit quotes, allusions and echoes and propose new links; performance drops with long query passages and with false dependences; no numbers. — [arXiv](https://arxiv.org/abs/2409.01882)

**Hebrew / Rabbinic**
- **ACT** (Miller, Kuflik, Lavee, "Automatic Detection of Complex Quotation Patterns in Aggadic Literature", arXiv 2512.23504, 2025; under review at *Cogent Arts & Humanities*). Three-stage: morphology-aware alignment, then context-sensitive enrichment for "Wave" and "Echo" quotations. Full pipeline ACT-QE: P 0.94 / R 0.89 / F1 0.91; ACT-2 (no stylistic enrichment) R 0.90 with lower precision. Benchmarked against Dicta, Passim and Text-Matcher (their numbers not in abstract). No code link. — [arXiv](https://arxiv.org/abs/2512.23504)
- **MiqraBERT** (Smiley, arXiv 2606.19638, 2026). SBERT fine-tuned from AlephBERT with cosine-similarity regression on 1,650 pairs (825 parallels from Chronicles synoptics and poetic parallelism, 825 random negatives). 2.7× better distributional separation; ambiguous overlap 24% → 6%. **Recall@10 87.1% for narrative synoptic parallels, <9% for poetic parallels.** Model: https://huggingface.co/davidmsmiley/MiqraBERT. — [arXiv](https://arxiv.org/abs/2606.19638)
- Earlier Smiley benchmark (arXiv 2506.24117, 2025): E5 best at parallel detection in Samuel/Kings vs Chronicles; AlephBERT better at rejecting non-parallels. — [arXiv](https://www.arxiv.org/abs/2506.24117v1)

**Arabic**
- **KITAB** runs passim (alignment-based reuse detection, built for English newspapers) over OpenITI, in 300-token "milestones" with non-Arabic characters stripped; reuse data on Zenodo. Muther & Smith evaluated passim on Arabic with annotated ground truth: "performs well, room to improve". A separate KITAB effort tags Quranic quotations (sura/aya) and flags the hard boundary between Quranic language and quotation. — [KITAB projects](https://kitab-project.org/about/our-projects); [KITAB alignment post](https://kitab-project.org/Adventures-in-Alignments-Training-an-Algorithm-to-Recognise-Text-Reuse/); [Zenodo data](https://zenodo.org/records/4362369)
- I found no 2024–2026 neural Arabic allusion benchmark.

**Chinese**
- **SCAD** (self-supervised contrastive learning for allusion detection in Chinese poems; *Humanities and Social Sciences Communications*, 2026). Dataset of 1,025 allusions (典故) and 14,016 poems that use them, from Souyun annotated against *The Complete Book of Allusions*. Weak supervision from the text; claims zero-shot detection of unseen allusions; LIME for interpretability. Headline gain reported as 0.80 → 0.87 (metric not confirmed; one version says 0.76 → 0.87). — [Nature HSSC](https://www.nature.com/articles/s41599-026-06627-z); [ResearchGate](https://www.researchgate.net/publication/400552651_SCAD_self-supervised_contrastive_learning_for_allusion_detection_in_Chinese_poems)
- A related paper ("AI Taiyan" classical Chinese LLM, arXiv 2505.11810) reports GPT-4 F1 < 0.1 on specific allusion identification, while its domain model beats professional annotators (claim from search snippet, unverified). — [arXiv](https://arxiv.org/pdf/2505.11810)
- **Wang, Si, Wang, "Beyond Similarity: Grounded Agentic Extraction and Expert-Adjudicated Evaluation of Intertextuality in Classical Chinese Histories"** (arXiv 2607.27595, 2026). LLM reads two units in full, grounds each reuse in exact character spans via a tool interface, labels it on 5 dimensions (form, aspect, source-marking, function, stance). Gold: 2,533 pairs (Analects × Book of Han), adjudicated by 3 experts; scaled to the Twenty-Four Histories (65,380 comparisons, 5,766 pairs). 12 LLMs: precision 56–93%, 51× cost spread at comparable quality. Releases protocol and benchmark. — [arXiv](https://arxiv.org/abs/2607.27595)
- **"Vector Poetics: Parallel Couplet Detection in Classical Chinese Poetry"** (Kurzynski, Xu, Feng; NLP4DH 2024) — adjacent (parallelism, not allusion). — [ACL Anthology](https://aclanthology.org/2024.nlp4dh-1.19/)

**Buddhist languages (Pali, Sanskrit, Tibetan, Buddhist Chinese)**
- **MITRA** (Nehrdich & Keutzer, arXiv 2601.06400, 2026): MITRA-parallel corpus of 1.74M parallel sentence pairs and Gemma 2 MITRA model for MT and semantic retrieval; pipeline exploits that parallel sentences come in continuous chains. Code: dharmamitra/mitra-parallel, mitra-semantic-similarity. DharmaNexus is the maintained successor of BuddhaNexus (intertextual matching across the four languages). — [arXiv](https://arxiv.org/pdf/2601.06400); [GitHub](https://github.com/dharmamitra/mitra-parallel); [Indology list](https://www.mail-archive.com/indology@list.indology.info/msg05582.html)

**English / modern literature**
- **Cameron, "'The Order in the Horse's Heart': LLM-Assisted Stylometry for the Discovery of Biblical Allusion in Modern Literary Fiction"** (arXiv 2604.19447, 2026-04). McCarthy novels → KJV. Track 1: rare words (IDF > 4.0) shared with KJV, disambiguated by Voyage embeddings of local context, ~3,000 pairs, density-map rerank, Claude Haiku screen (blind to trigger words), GPT-5.4 classification. Track 2 ("register"): Claude Sonnet reads McCarthy *without* KJV, flags biblical cadence/imagery and proposes verses; second call confirms. Gemini 3.1 Pro long-context cross-check. Result: 62 of 115 documented allusions recovered (54% recall); 30% for transformed imagery, 80% for "register collisions". 349 textual allusions found, 234 not in scholarship. **~94% of misses were retrieval failures; the LLM never rejected a correct pair it was shown.** Cost $50–80, 8–12 h. — [arXiv HTML](https://arxiv.org/html/2604.19447v1)
- **Persian allusions** (Nobakhtian, Yaghoobzadeh, Pilehvar; Findings of EMNLP 2025): 11 LLMs strong on multiple choice, much weaker on open-ended recognition, especially indirect references; the gap is activating references without cues, not missing knowledge. — [ACL Anthology](https://aclanthology.org/2025.findings-emnlp.1403/)
- Shakespeare: "Shakespeare in the Vectorian Age" (LaTeCH-CLfL 2020) — about half of queries are near-verbatim and easy; early-modern semantic drift hurts modern embeddings. Reception Reader dataset of Shakespeare reuse in ECCO/EEBO on Zenodo. — [ACL Anthology PDF](https://aclanthology.org/2020.latechclfl-1.7.pdf); [Zenodo](https://zenodo.org/records/7610480)
- Hamlet in postmodern fiction: n-gram candidates then modified Needleman–Wunsch alignment over word embeddings (CHR 2020). — [CEUR PDF](https://ceur-ws.org/Vol-2723/long22.pdf)
- "Characterizing the Effects of Translation on Intertextuality using Multilingual Embedding Spaces" (arXiv 2501.10731, 2025), on Bible translations. — [arXiv](https://arxiv.org/pdf/2501.10731)
- Manjavacas, Long, Kestemont, "On the Feasibility of Automated Detection of Allusive Text Reuse" (2019; pre-window but the standard reference): n-gram/alignment methods vs distributional semantics on allusive Bible reuse. — [arXiv](https://arxiv.org/pdf/1905.02973)

**Survey**
- Duan, "Quantitative Intertextuality from the Digital Humanities Perspective: A Survey" (arXiv 2510.27045, 2025): data, methods (statistical to deep learning), applications and platforms. — [arXiv](https://arxiv.org/abs/2510.27045)

### Inferences
- For ligatura, the closest analogues are Loci Similes (Latin, Valerius Flaccus gold) and the patristic Bible-reuse paper (Augustine/Jerome → Vulgate). Both say lexical/lemma signals remain the backbone and dense models help mainly after domain adaptation.
- Locally runnable with small models: `locisimiles` (BM25 + XLM-R/LatinBERT cross-encoder), SPhilBERTa, MiqraBERT, LatinBERT, the TSDAE/CSE adaptation recipe (sentence-transformers; tens of seconds on a laptop GPU), passim (Spark/Scala), MITRA embeddings (Gemma-2 sized, heavier). LLM-verification pipelines (McCarthy, Chinese histories, Scripture Detector) used frontier APIs; their recipe could be tried with a local 7–14B model but no paper reports that.

### Gaps
- Exact numbers for de la Selle et al. 2026, Greetino (LREC 2026), SCAD metric definition, and ACT's baselines were not visible in what I could read.
- Did not find a 2024–2026 Milton reuse paper, an Arabic neural allusion benchmark, or a Coptic/Syriac/Akkadian/Old English intertext-detection paper.
- Did not verify any reported numbers by running code.

## Verbatim vs. loose allusion: how papers handle the gap and which signals helped

### Takeaway
Every paper that splits results by type finds the same cliff: verbatim reuse is largely solved (F1 0.75–0.98), allusion is not (Latin allusion F1 ~0.13, Recall@100 ~0.29; Hebrew poetic parallels R@10 < 9%; implicit echoes 0.38). The signals that helped: lemma-level lexical match, rare-word anchors, in-domain contrastive adaptation of a small encoder, a *fine-tuned* cross-encoder reranker, and LLM verification of a wide candidate pool. The bottleneck is candidate recall, not the judge.

### Cited Findings
- Latin: lexical overlap predicts correctness for verbatim links but not for allusions; cross-encoders beat lexical classifiers on allusions, while pooled bi-encoders struggle with them. — [Loci Similes HTML](https://arxiv.org/html/2601.07533v3)
- Latin: lemma BM25 (R@100 29.4 on allusions) beats BGE-M3 (20.6) and E5-large (18.3) even after these were fine-tuned. — [Loci Similes HTML](https://arxiv.org/html/2601.07533v3)
- Latin: BM25 → fine-tuned XLM-R Large reranker more than doubles F1 at k=5 (0.19 → 0.42). — [Loci Similes HTML](https://arxiv.org/html/2601.07533v3)
- Patristics: unsupervised in-domain adaptation (TSDAE, CSE) of a specialized encoder beats even a supervised fine-tuned baseline; CSE needs only ~4–8k raw sentences. — [arXiv 2607.24542](https://arxiv.org/abs/2607.24542)
- Hebrew: regression-fine-tuned SBERT reaches R@10 87.1% on narrative synoptics but < 9% on poetic parallels. — [MiqraBERT](https://arxiv.org/abs/2606.19638)
- Hebrew/Rabbinic: morphology-aware alignment plus context enrichment for "Wave"/"Echo" quotes reaches F1 0.91; removing stylistic enrichment lowers precision. — [ACT](https://arxiv.org/abs/2512.23504)
- NT Psalms: accuracy 0.98 for literal quotes vs 0.38 for implicit echoes with a non-neural pipeline. — [Religions 2026](https://doi.org/10.3390/rel17010088)
- McCarthy→KJV: rare-word (IDF > 4) anchors + context embeddings + LLM judge; recall 80% on register collisions vs 30% on transformed imagery; 94% of misses never reached the judge. A source-blind "register" reading track found allusions with no shared vocabulary. — [arXiv 2604.19447](https://arxiv.org/html/2604.19447v1)
- Chinese histories: similarity scores locate reuse but cannot say how or why; quotations become less literal over 18 centuries. — [arXiv 2607.27595](https://arxiv.org/abs/2607.27595)
- Chinese poetry: contrastive learning with weak supervision lifts allusion detection to ~0.87 and generalizes zero-shot to unseen allusions. — [SCAD](https://www.nature.com/articles/s41599-026-06627-z)
- LLMs alone: strong on multiple-choice allusion knowledge, weak at open-ended spotting of indirect references (Persian); GPT-4 F1 < 0.1 on specific Chinese allusion identification (snippet). — [EMNLP Findings 2025](https://aclanthology.org/2025.findings-emnlp.1403/); [arXiv 2505.11810](https://arxiv.org/pdf/2505.11810)
- TRACER and similar n-gram tools work well for verbatim reuse, less well for paraphrase. — [KITAB/Tracer search snippet](https://kitab-project.org/about/our-projects)

### Inferences
- ligatura's Qwen3-Reranker-0.6B result (hurt R@1) matches Loci Similes: off-the-shelf rerankers and pooled bi-encoders are weak on allusions; the gain came from a cross-encoder *fine-tuned on in-domain pairs*. A small fine-tuned XLM-R or domain BERT cross-encoder is the more promising reranker.
- Kempis→Gospels misses (R@10 45/49 leaves 4 never retrieved; R@1 32/49) look like the McCarthy finding: most errors are ordering, a few are retrieval. Widening the candidate pool (k=50–100) before a stronger judge is the evidence-backed move.
- Lemmatized BM25 is a missing signal in ligatura's fusion: it was the best single retriever on Latin allusions. Lemmatizers exist for Latin/Greek (CLTK), Hebrew, Arabic.
- Cheapest likely dense gain: CSE (SimCSE-style) adaptation of bge-m3 or nomic on 4–8k raw sentences of each target corpus. No labels needed; minutes on the Mac mini.
- A "register" track (LLM reads the target alone and names likely sources) is the only reported way to reach zero-overlap allusions. A local LLM could run it on the Mac mini; unproven at small model sizes.
- Poetic and transformed-imagery allusions remain at 10–30% recall in every paper; expect diminishing returns there.

### Gaps
- No paper found that tests RRF fusion of lexical + multiple dense retrievers on an allusion gold set, so ligatura's fusion design has no direct comparison point.
- No reported results for small local LLMs (≤ 14B) as allusion judges.

## Recent workshop and conference output (ACL/EMNLP/NAACL, LaTeCH-CLfL, NLP4DH, ALP, CHR, LREC)

### Takeaway
Venue output on allusion specifically is thin; much 2025–2026 work is arXiv-first. Identifiable venue papers: ALP 2023 (SPhilBERTa), NLP4DH 2024 (Chinese parallel couplets), EMNLP Findings 2025 (Persian allusions), LREC 2026 (Greetino), plus NAACL 2021 and LaTeCH-CLfL 2020 foundations.

### Cited Findings
- ALP 2023: Riemenschneider & Frank, Latin allusions to Greek (SPhilBERTa). — [ACL Anthology](https://aclanthology.org/2023.alp-1.4/)
- ALP 2025 (2nd workshop, NAACL 2025, Albuquerque, 2025-05-03/04): proceedings online; I found no intertext-detection paper in it. — [ACL Anthology volume](https://aclanthology.org/2025.alp-1.0)
- LaTeCH-CLfL 2025 (9th SIGHUM workshop, Albuquerque, May 2025): proceedings online; no clearly intertext-focused paper surfaced in search. — [ACL Anthology volume](https://aclanthology.org/volumes/2025.latechclfl-1/)
- NLP4DH 2024: Vector Poetics (parallel couplets, Classical Chinese). — [ACL Anthology](https://aclanthology.org/2024.nlp4dh-1.19/)
- Findings of EMNLP 2025: Persian allusions benchmark. — [ACL Anthology](https://aclanthology.org/2025.findings-emnlp.1403/)
- LREC 2026: Greetino Greek/Latin retrieval benchmark. — [PDF](https://aclanthology.org/2026.lrec-1.70.pdf)
- CHR 2020: Hamlet reuse via n-grams + embedding alignment. — [CEUR](https://ceur-ws.org/Vol-2723/long22.pdf)

### Inferences
- The 2026 arXiv cluster (Loci Similes, de la Selle, MiqraBERT, McCarthy, Chinese histories, MITRA) is where the current state of the art lives; several will likely appear at 2026–2027 venues.

### Gaps
- Did not browse full tables of contents for LaTeCH-CLfL 2024/2025, NLP4DH 2025, CHR 2024/2025, or DSH/JDMDH; there may be relevant papers not surfaced by search.

## Reported accuracies and gold sets

### Takeaway
Comparable gold sets with public data: Loci Similes (Latin, 1,490 pairs, HF), Valerius Flaccus (945, JOHD), patristic Bible reuse (2,935), MiqraBERT (1,650 pairs), SCAD (1,025 allusions / 14,016 poems), Analects×Book of Han (2,533), McCarthy→KJV (115). Headline numbers are not comparable across them because metrics differ.

### Cited Findings
| Gold set | Size | Best reported | Source |
|---|---|---|---|
| Loci Similes (Latin) | 1,490 parallels, 176k segments | R@100 77.6 verbatim / 29.4 allusion (BM25 lemma); F1 0.42 @k=5 (BM25→XLM-R) | [arXiv](https://arxiv.org/html/2601.07533v3) |
| Valerius Flaccus *Arg.* 1 | 945 refs | benchmark only | [JOHD](https://openhumanitiesdata.metajnl.com/articles/153/files/65b7ab32731ea.pdf) |
| Patristic Bible reuse (Lat/Grc) | 2,935 | adapted TSDAE/CSE beat all baselines (numbers not seen) | [arXiv](https://arxiv.org/abs/2607.24542) |
| Rabbinic Bible quotes (ACT) | not stated in abstract | P 0.94 / R 0.89 / F1 0.91 | [arXiv](https://arxiv.org/abs/2512.23504) |
| Biblical Hebrew parallels | 1,650 pairs | R@10 87.1% narrative, <9% poetic | [arXiv](https://arxiv.org/abs/2606.19638) |
| NT Psalm reuse | not seen | 0.98 literal, 0.38 implicit echo | [Religions](https://doi.org/10.3390/rel17010088) |
| Chinese poetry allusions (SCAD) | 1,025 allusions, 14,016 poems | ~0.87 (metric unconfirmed) | [Nature HSSC](https://www.nature.com/articles/s41599-026-06627-z) |
| Analects × Book of Han | 2,533 pairs | LLM precision 56–93% | [arXiv](https://arxiv.org/abs/2607.27595) |
| McCarthy → KJV | 115 documented allusions | recall 54% (62/115) | [arXiv](https://arxiv.org/html/2604.19447v1) |
| Greek↔Latin↔English translation retrieval (SPhilBERTa) | not seen | >95% accuracy | [ACL](https://aclanthology.org/2023.alp-1.4/) |

### Inferences
- ligatura's Kempis→Gospels R@10 of 45/49 (92%) is above every allusion-level number found here, which suggests that gold set leans toward paraphrase/near-quotation. Loci Similes and McCarthy→KJV would be harder external tests; Loci Similes is downloadable and Apache-licensed.

### Gaps
- No shared multilingual allusion benchmark exists; every paper uses its own gold set and metric.
