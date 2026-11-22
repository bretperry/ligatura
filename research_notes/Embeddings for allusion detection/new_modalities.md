# New signal modalities for allusion, poetic reference and philosophical extension

Scope: signals beyond ligatura's current two (dense sentence embeddings + lexical overlap fused by RRF). Each section ends with evidence strength, local cost, and how to measure in ligatura's eval (recall@k on gold fixtures in `fixtures/`). Research date 2026-11-17; 16 searches; most findings come from abstracts, search snippets and project pages, not full-text reads. That limit is stated where it matters.

Summary ranking (inference, see each section):
1. **Sequence/neighbourhood alignment of match runs** — strong evidence, near-zero cost, fits verse fixtures. Do first.
2. **Collocation-pair rarity (Tesserae bigram + PMI)** — strong evidence in Latin, cheap.
3. **Cross-encoder reranker over the top-k** — strongest 2026 benchmark evidence; ligatura already has `src/rerank.ts`, so it is a tuning lever rather than a new modality.
4. **LLM-written multi-view / propositional expansions** — good IR evidence, untested on allusion; moderate cost offline.
5. Sound (char n-gram / phonetic) and meter — weak direct evidence, cheap for some languages, high value only on verse fixtures (`waste-land`, Latin/Greek poetry).
6. Syntax templates, AMR, stance, metaphor — weakest evidence for allusion; costlier; mostly English-only tooling.

## Sound and meter

### Takeaway
Sound-based intertext detection exists but is thin: Tesserae approximates sound with shared character trigrams, and its team proposed sequence alignment for phonetic echoes. Phonetic word embeddings exist (PWESuite, Parrish) but mainly for English. Meter scanners exist for Greek/Latin hexameter; I found no allusion paper that uses meter as a retrieval signal.

### Cited Findings
- Tesserae offers a "character 3-gram" sound search: passages with more shared character trigrams score higher; orthography is treated as a proxy for phonology. — [Tesserae blog](https://tesserae.caset.buffalo.edu/blog/?p=360); [Coffee et al., The Tesserae Project (Edizioni Ca' Foscari)](https://edizionicafoscari.unive.it/it/edizioni/libri/978-88-6969-183-6/the-tesserae-project/)
- Example given by Tesserae: Vergil's *resonante* re-echoes the sounds of Catullus 11.3 *tunditur unda*, a link with little shared vocabulary. — [Tesserae blog](https://tesserae.caset.buffalo.edu/blog/?p=360)
- "Bioinformatics and Classical Literary Study" (Chaudhuri, Dexter et al., 2016) proposes sequence alignment to find inexact verbal and phonetic echoes in Latin corpora; it warns sound similarity alone misleads (*commune* / *immane*) and notes that one-shared-word intertexts are not findable with Tesserae's method. — [arXiv 1602.08844](https://arxiv.org/abs/1602.08844v2)
- Dexter, Chaudhuri et al., "Quantitative criticism of literary relationships", PNAS 2017: stylometric profiles (word usage, punctuation, sentence structure) used to find material Livy loosely appropriated from sources; Chaudhuri: "Much computational text analysis focuses on words, but there are many other important hallmarks of style, such as sound, rhythm and syntax." Code: features.py, functionalngrams.py etc. — [UT Austin news](https://news.utexas.edu/2017/04/05/mapping-the-evolution-of-literature-using-science-techniques); [GitHub qcrit/PNAS_2017_QuantitativeCriticism](https://www.github.com/qcrit/PNAS_2017_QuantitativeCriticism)
- PWESuite (Zouhar et al., 2023): phonetic word embeddings built from articulatory features, plus an evaluation suite (sound-similarity correlation, rhyme, cognate detection, sound analogies). Code github.com/zouharvi/pwesuite. — [arXiv 2304.02541](https://arxiv.org/abs/2304.02541)
- Parrish (2017) learned 50-dim pronunciation-similarity embeddings for poetry generation from the CMU Pronouncing Dictionary (English only). — described in [PWESuite](https://arxiv.org/html/2304.02541v4)
- Schumann, Beierle, Blößner (2021): finite-state automatic scansion of Classical Greek hexameter, code on GitHub. — [arXiv 2101.11437](https://arxiv.org/abs/2101.11437v1)
- Latin neural scansion: Leiden thesis (Nolden 2021–22) LSTM models reach F1 ~0.75 for long and ~0.50 for short syllables when transferring to harder metres; a Wolfram student project reports ~2.9% validation error on ~844 Aeneid lines. — [Nolden thesis](https://theses.liacs.nl/pdf/2021-2022-NoldenL.pdf); [Wolfram project](https://community.wolfram.com/groups/-/m/t/1732445)

### Inferences
- Cheapest sound signal: a **separate char-n-gram channel on phonetically folded text** (Latin v/u, i/j, ae/e; Greek accent-stripped; English via CMUdict or a grapheme-to-phoneme model). ligatura's lexical channel already uses char n-grams, so the gain is in (a) phonetic folding, (b) scoring cross-word n-grams (spanning word boundaries) that catch assonance. Local cost: trivial.
- **Meter fingerprint** (e.g., the 6-foot D/S pattern of a hexameter, caesura position, line-end cadence) is a weak signal alone; useful as a tiebreaker feature for verse-to-verse pairs within one language and metre. Scanners exist for Greek/Latin hexameter; for Sanskrit, Chinese tone patterns and English stress I found no source in this pass (gap below).
- Rhyme/alliteration: line-final rhyme keys and initial-consonant sequences are rule-computable per language; payoff likely confined to `waste-land` and any English/Latin verse fixtures.
- Measure: add as an extra RRF list; report recall@10/@100 deltas per fixture, and separately on the subset of gold pairs with ≤1 shared lemma (the subset where sound should help). Expect a null result on prose fixtures (`nt-ot-*`, `augustine-*`); treat that as expected, not failure.
- Evidence strength: **weak-moderate** (method exists, no recall numbers found). Local cost: **very low** (rules) to **low** (PWESuite model, English).

### Gaps
- No recall or precision figures for Tesserae's trigram sound search were found.
- No sources found (in one search) for automatic Sanskrit chandas scansion, Chinese tonal-pattern (pingze) matching or English stress scansion used for allusion detection.
- No multilingual phonetic embedding model covering Latin, Greek, Hebrew, Sanskrit was found.

## Syntax and structure

### Takeaway
Syntax-based allusion detection has one foundational paper (Bamman & Crane 2008) and little follow-up; 2021–2026 work moved to embeddings. Syntactic restructuring is a named reason paraphrastic allusions are missed, but no recent paper shows dependency similarity improving recall.

### Cited Findings
- Bamman & Crane, "The Logic and Discovery of Textual Allusion" (LaTeCH 2008): combines token similarity and n-grams with a comparison of syntactic structure for Latin poetry; syntax comparison is not bound by word order or inflection; claimed language independent. Only abstract/excerpts read; algorithm and numbers unverified. — [PDF](https://static.perseus.tufts.edu/publications/latech2008.pdf)
- Loci Similes (Schelb, Wittweiler, Revellio, Feichtinger, Spitz, 2026): 172k Latin segments, 545 expert-verified links (Jerome, Lactantius → Virgil, Cicero, Ovid). Notes Jerome often changes word order or syntax when reusing Virgil; dense retrieval fails when little lexical material is shared and context differs; "two-word congruencies" remain hard. — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Vanni et al. (Springer 2023/24): multi-channel convolutional transformer for Latin, aimed at showing lexical and syntactic intersections; no explicit dependency structure. — [ORBi PDF](https://orbi.uliege.be/bitstream/2268/346054/1/MCT_Springer_2023.pdf)
- Dexter et al. PNAS 2017 used sentence-structure and function-word n-gram features (functionalngrams.py) to find loose appropriation in Livy. — [GitHub](https://www.github.com/qcrit/PNAS_2017_QuantitativeCriticism)

### Inferences
- Two cheap forms worth testing: (1) **function-word / POS n-gram template** of each unit (content words masked), indexed as a sparse channel; (2) **dependency-path pairs** (head-lemma, relation, dependent-lemma) as rarer "words" in the lexical index. Form (2) is close to Tesserae bigrams but grammatical, so it survives reordering.
- Tooling: UD treebanks and Stanza/UDPipe models exist for Latin, Ancient Greek, Classical Chinese, Coptic, Old English, Arabic, Persian, Sanskrit, Hebrew (general knowledge, not verified in this pass). Running a parser over corpora is offline batch work; CPU-feasible.
- Risk: POS templates in highly formulaic corpora (Bible, Pali) will match everywhere; weight by template rarity (IDF over the reference corpus).
- Measure: recall@k delta on the Latin/Greek and `kempis-gospels` fixtures; check whether gains come from pairs with reordered words.
- Evidence strength: **weak** (one 2008 paper, untested on modern benchmarks). Local cost: **moderate** (parser per language, offline).

### Gaps
- No 2020–2026 paper found that measures dependency-tree similarity for allusion recall.
- Bamman & Crane full-text results not read.

## Rare image/motif and keyword co-occurrence

### Takeaway
The best-validated non-embedding allusion signal is Tesserae-style scoring: ≥2 shared words, weighted by rarity and closeness, with a proposed PMI correction for common words combined unusually. It reportedly recovers about two-thirds of scholarly-noted intertexts.

### Cited Findings
- Tesserae requires ≥2 shared words (forms or lemmata) per pair; score rewards rarer matched words and smaller distance between the two least-frequent matches; frequency is computed per text. — [Tesserae scoring post](https://tesserae.caset.buffalo.edu/blog/?p=186); [Coffee blog](https://tesserae.caset.buffalo.edu/blog/author/ncoffee/page/3)
- Bigram matching captures roughly 67% of intertexts previously noted in scholarship (Tesserae multitext abstract). — [DH abstracts](https://dh-abstracts.library.virginia.edu/works/2473)
- 2014 NEH white paper: automatic scoring on average ranked as most significant the same results human interpreters did. — [CORE PDF](https://core.ac.uk/download/147824962.pdf)
- Tesserae team: rare-word weighting underrates Vergil, who combines common words in unusual ways; proposed PMI scoring for word pairs, with cutoffs for very rare words and log normalization. Release status unconfirmed. — [Tesserae blog ?p=1241](https://tesserae.caset.buffalo.edu/blog/?p=1241)
- Burns, Brofos, Li, Chaudhuri, Dexter, "Profiling of Intertextuality in Latin Literature Using Word Embeddings" (NAACL 2021): word2vec on lemmatized Latin; 945-parallel gold set from Latin epic scholarship; outperforms a common lexical method. Code/data in QuantitativeCriticismLab GitHub. — [ACL Anthology](https://aclanthology.org/2021.naacl-main.389)
- Chinese: SCAD self-supervised contrastive allusion detection on 1,025 allusions and 14,016 quoting poems; a later benchmark reports GPT-4 below 0.1 F1 on identifying the specific allusion. Details from snippets only. — [arXiv 2106.01979](https://arxiv.org/abs/2106.01979v1); [ACL SRW 2023](https://preview.aclanthology.org/fix-sig-urls/2023.acl-srw.15.pdf)
- Sturgeon: unsupervised identification of text reuse and allusions in early Chinese literature, evaluated against a manually compiled reference work. — [dsturgeon.net](https://dsturgeon.net/automated-identification-of-parallels-and-allusions-in-classical-chinese-texts/)

### Inferences
- ligatura's lexical channel scores single rare words, stems and char n-grams. The missing piece is **pair-level evidence**: score a candidate by its best co-occurring pair of shared lemmas (rarity of each × inverse distance), and separately by the **pair's own rarity** (PMI or document frequency of the pair across a reference corpus). This targets the "two-word congruency" class Loci Similes says dense models miss.
- **Soft pairs**: allow one member of a pair to match via embedding synonym (Burns et al.'s finding that static embeddings beat exact lexical matching suggests this). Cheap with a small static-vector table per language.
- Reference-corpus frequency: weight rarity by frequency over a large background corpus per language, not only the two texts compared. Big corpora belong on the NAS per project rule.
- Measure: add "best pair score" as its own RRF list; recall@10/@100 per fixture; Burns et al.'s 945-pair set and Loci Similes' 545 links are candidate new Latin gold fixtures.
- Evidence strength: **strong** for Latin (Tesserae, Burns), **moderate** for Chinese. Local cost: **very low**.

### Gaps
- No recall figures for PMI pair scoring found; unclear if Tesserae shipped it.
- No cross-lingual version of pair co-occurrence found (cross-lingual pairs would need a bilingual lexicon or embedding alignment).

## Conceptual and argumentative signals

### Takeaway
No source found applies argument mining, AMR or stance detection to allusion or philosophical-influence retrieval. Closest useful evidence: proposition-level indexing improves dense retrieval, and LLM prompting can explain known intertexts but over-interprets. Treat these as exploratory.

### Cited Findings
- Chen et al., "Dense X Retrieval: What Retrieval Granularity Should We Use?" (2023/24): indexing by propositions (atomic, self-contained factoids) significantly outperforms passage-level units in dense retrieval. — [arXiv 2312.06648](https://arxiv.org/abs/2312.06648)
- Werner & Reiter, "Between Woolf and Homer" (ACH Anthology vol. 3, 2025): two-stage semantic search + prompt analysis; expert-informed prompts gain +16.23% theoretical alignment but over-interpret, with 90% of analyses claiming classical transformations. — [ACH Anthology](https://anthology.ach.org/volumes/vol0003/between-woolf-homer-explorative-approach-to-using/)
- Umphrey et al. (NLP4DH 2024): expert-in-the-loop LLMs can detect quotations, allusions and echoes in ancient texts but struggle with long query passages and produce false intertextual dependences. — [arXiv 2409.01882](https://arxiv.org/abs/2409.01882)
- Lawrence et al. (2014) mined arguments from 19th-century philosophical texts with topic-based modelling; argument mining of complex historical philosophy is described as hard. — [ACL W14-2111](https://aclanthology.org/W14-2111/)
- WIBA (2024): pipeline of argument detection, claim-topic extraction, stance classification; stance needs a given topic. — [arXiv 2405.00828](https://arxiv.org/abs/2405.00828)
- AMR similarity: S2match (Opitz et al. 2020) grades AMR graph overlap with embedding-based concept similarity; Leung, Wein, Schneider (GEM 2022) compare AMR metrics with SBERT/BERTScore on STS; XS2match with LaBSE correlates well with human cross-lingual similarity judgments. — [arXiv 2001.10929](https://arxiv.org/abs/2001.10929); [GEM 2022](https://aclweb.org/anthology/2022.gem-1.8.pdf)

### Inferences
- Most practical form: **LLM-generated "claim" view** per unit (one-sentence proposition: "X holds that Y because Z"), embedded with the existing model as an extra channel. Inverted or argued-against ideas share topic and propositional content even when stance flips, so a *topic-claim* embedding should rank them high; a stance label is better used as an annotation on the returned link than as a ranking signal.
- **Stance as reranking is risky**: an embedding of "X is good" and "X is bad" are already near; stance classifiers would only separate them, which hurts recall for refutations. Use stance to label, not filter.
- AMR: parsers are English-centric and slow; AMR over Latin, Pali, Akkadian is not available. Low expected payoff relative to cost.
- Hallucination risk: LLM views must be generated per unit independently (not per candidate pair) so the model cannot invent links; Werner & Reiter's 90% over-claiming shows pairwise LLM judgment needs a strict gold-based check.
- Measure: build a small "philosophical extension" fixture (e.g., Aristotle → Aquinas commentary, Kant ↔ Hume replies, `shankara-upanisads` already partly fits) and compare recall@k with and without the claim channel.
- Evidence strength: **weak** for allusion (indirect from IR). Local cost: **moderate** (one LLM call per unit offline; a 3–8B local model on the Mac mini).

### Gaps
- No paper found on computational detection of philosophical influence/response between historical texts.
- No numbers on proposition indexing for non-English or historical text.
- Counterargument retrieval literature not found in this pass.

## Metaphor, figurative language, frame semantics

### Takeaway
Metaphor detectors exist for English (MelBERT) but detect *whether* a word is metaphorical, not *which* image is shared. The useful signal for allusion is a shared rare source-domain image, which is better approximated by an LLM "image/motif" view or by the rare-pair channel.

### Cited Findings
- MelBERT (Choi et al., NAACL 2021): metaphor detection combining Metaphor Identification Procedure (contextual vs isolated embedding gap) and Selectional Preference Violation; beats baselines on VUA-18, VUA-20, MOH-X, TroFi; code jin530/MelBERT. — [ACL Anthology](https://aclanthology.org/2021.naacl-main.141)

### Inferences
- MelBERT-style "contextual vs isolated" gap can mark which words in a unit carry figurative load; those words could get extra weight in the lexical channel (a figurative rare word shared across texts is a stronger allusion cue). English-only; would need a multilingual encoder to port.
- Frame semantics (FrameNet parsers) is English-only in practice; skip for ligatura's language set.
- Evidence strength: **weak** for allusion. Local cost: **low-moderate** (BERT-size model).

### Gaps
- No paper found linking metaphor detection to intertext retrieval.
- No frame-semantic intertext work found (one search not run specifically; flagged as unverified).

## Contextual and neighbourhood signals

### Takeaway
Alignment of match runs is the most proven technique in text-reuse work (Passim, BLAST, TextPAIR, Viral Texts) and costs almost nothing as a post-retrieval step. It directly encodes "if verse n links to x, n+1 links near x+1".

### Cited Findings
- Passim (David Smith, Northeastern): indexes character n-grams (default order 25), aligns only document pairs sharing enough n-grams, then runs full character-level alignment outward from seed matches. — [Programming Historian lesson](https://programminghistorian.org/en/lessons/detecting-text-reuse-with-passim); [GitHub dasmiq/passim](https://github.com/dasmiq/passim)
- Smith, Cordell, Dillon, "Infectious Texts" adapted Smith-Waterman local alignment to text reuse in 19th-century newspapers; implemented in R `textreuse::align_local`. — [textreuse docs](https://packages.ropensci.org/textreuse/textreuse.pdf)
- Vierthaler & Gelein, "A BLAST-based, Language-agnostic Text Reuse Algorithm with a MARKUS Implementation and Sequence Alignment Optimized for Large Chinese Corpora", Journal of Cultural Analytics 4(2), 2019; reported threshold ≥10 chars at ≥90% identity; 18 of 19 origin/borrower directions correct in one test (lecture summary). — [Princeton record](https://collaborate.princeton.edu/en/publications/a-blast-based-language-agnostic-text-reuse-algorithm-with-a-marku/); [UVA lecture note](https://dh.library.virginia.edu/node/6426)
- Vesanto (2019) applied BLAST to Finnish newspaper text reuse. — [UTUPub](https://www.utupub.fi/items/3697a355-1383-446e-9bc7-dfc692187133/full)
- KITAB project trained alignment for Arabic text reuse (passim-based). — [KITAB blog](https://kitab-project.org/Adventures-in-Alignments-Training-an-Algorithm-to-Recognise-Text-Reuse/)
- Bamman & Crane note allusions are best judged within their full sentence context. — [PDF](https://static.perseus.tufts.edu/publications/latech2008.pdf)

### Inferences
- **Run boost (diagonal smoothing)**: after retrieval, for each candidate (n, x) add score from neighbours (n±1, x±1..3). Equivalent to a 2-D convolution along the diagonal of the source×target score matrix. Works on any of ligatura's channels and across languages, since it uses positions, not tokens.
- **Smith-Waterman over unit similarity**: treat each text as a sequence of units and run local alignment using fused similarity as the match score; outputs passage-level alignments for long paraphrases (`lxx-nt`, `kempis-gospels`, `itihasa-sa-en`).
- **Work-level prior**: once several strong links to work W appear, raise all candidates from W (an empirical-Bayes "this author read W" prior). Cheap; risks amplifying false positives from formulaic sources (Psalms, Homeric formulae), so cap the boost.
- **Graph propagation**: if A↔B and B↔C, propose A↔C (useful for chains like Hebrew Bible → LXX → NT → Augustine). Cheap on small graphs.
- Measure: recall@k on all fixtures; expected biggest gain on fixtures with contiguous gold runs. Also report the precision side (false runs) since diagonal boosts can promote neighbours of a true link that are not themselves gold.
- Evidence strength: **strong** for verbatim/near-verbatim reuse; **untested** for loose allusion. Local cost: **very low**.

### Gaps
- No study found measuring neighbourhood smoothing on allusion (as opposed to reuse) recall.
- No Bayesian "reading list" prior paper found.

## Multi-view embeddings

### Takeaway
IR work shows LLM-generated document expansions, indexed separately and fused, improve dense retrieval. No allusion-specific study found, but it is the most general way to add theme, image, argument and emotion views with ligatura's existing embed + RRF pipeline.

### Cited Findings
- Doc2Query++ (Kuo & Chiu, Oct 2025): topic-model + keyword-conditioned LLM query generation per document; Dual-Index Fusion keeps original text and generated queries in separate dense indices fused at search time, to stop expansion noise. — [arXiv 2510.09557](https://arxiv.org/abs/2510.09557)
- HyDE embeds LLM-written pseudo-documents; assumes the pseudo-doc expresses the same semantics as the target. Query2doc expands queries with LLM pseudo-documents; helps strong dense retrievers with smaller gains. — [Query2doc arXiv 2303.07678](https://arxiv.org/abs/2303.07678)
- Dense X Retrieval: proposition units beat passages. — [arXiv 2312.06648](https://arxiv.org/abs/2312.06648)
- Loci Similes: E5-large R@10 ≈61%, R@100 ≈72%, R@1000 ≈83% on Latin; retrieve-then-rerank (XLM-RoBERTa Large cross-encoder) recovers 85/108 at k=100 (~79%). — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- SPhilBERTa (Riemenschneider & Frank 2023): trilingual Greek/Latin/English sentence encoder for cross-lingual allusion; on HF as bowphs/SPhilBerta (Apache-2.0). — [arXiv 2308.12008](https://arxiv.org/abs/2308.12008v1)

### Inferences
- Concrete design: per unit, a local LLM writes 4 short views in English (theme; concrete images/motifs; claim/argument; emotional register), each embedded; each view becomes one RRF list (keep them separate per Doc2Query++'s dual-index finding). Writing views in English also serves as a pivot for cross-lingual pairs (Akkadian, Pali, Coptic) where the encoder is weak.
- The "images/motifs" view targets "shared rare image" allusions; the "claim" view targets philosophical extension.
- Cost: units × 4 LLM calls, one-off per corpus, cacheable. Heavy work: run on the Mac mini.
- Measure: ablate each view as its own list; recall@k per fixture; check that gains are not only on pairs already found by the raw-text channel (report "new finds at k").
- Evidence strength: **moderate** (IR benchmarks, not allusion). Local cost: **moderate** (offline LLM generation).

### Gaps
- No paper tests multi-view LLM expansions on intertext benchmarks.
- Unknown how much a small local LLM (3–8B) hallucinates views for ancient-language input.

## Other modalities: names, numerals, topics, stylometry

### Takeaway
Stylometric features have been used to find loose source appropriation (Livy, PNAS 2017). Proper names and numerals are untested as allusion channels in the sources found but are cheap.

### Cited Findings
- Dexter et al. PNAS 2017 found citational material Livy loosely appropriated using stylometric profiles and machine learning. — [UT Austin news](https://news.utexas.edu/2017/04/05/mapping-the-evolution-of-literature-using-science-techniques)
- Burns et al. 2021: embeddings trained on small corpora captured stylistic features, replicating a Livy stylometry study. — [ACL Anthology](https://aclanthology.org/2021.naacl-main.389)
- LLM-assisted stylometry for biblical allusion in Cormac McCarthy, arXiv 2604.19447 (April 2026); only a translated summary seen, details unverified. — [fugumt summary](https://fugumt.com/fugumt/paper_check/2604.19447v1)

### Inferences
- **Proper-name/numeral channel**: transliteration-folded names (Jerusalem/Hierosolyma/Urušalim) and numbers (forty days, seven seals) as a high-precision sparse list. Cheap; mostly helps the Bible and Akkadian fixtures.
- **Topic models**: likely redundant with embeddings; skip unless as a work-level prior.
- **Stylometry**: useful for "loose appropriation" at passage level, not sentence level; low priority for recall@k on unit pairs.
- Evidence strength: **weak-moderate**. Local cost: **very low**.

### Gaps
- No source measured proper-name overlap as an allusion signal.
- The McCarthy paper not read in full.
