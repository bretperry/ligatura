# Benchmarks and gold datasets for intertextuality, allusion and text reuse

Researched 2026-11-17. About 17 search/fetch calls; many facts come from search snippets and abstracts, not full papers. Unverified items are marked.

## Which gold datasets exist and are usable (size, languages, link type, license, URL)?

### Takeaway
The best new fixtures for ligatura are Latin: **Loci Similes** (545 expert links, Jerome/Lactantius to 10 classical authors, typed quote/paraphrase/allusion, on Hugging Face), the **Valerius Flaccus Argonautica 1 database** (945 commentary-derived links to Vergil, Ovid, Lucan, Statius; CC0 per one listing), and the **Tesserae Lucan–Vergil** benchmarks (graded by commentary). For Hebrew, the **ACT midrash quotation set** (Zenodo) adds typed rabbinic Bible quotations. Chinese allusion, Greek, English-poetry and philosophy gold sets mostly exist only inside papers or commentaries, not as clean downloads.

### Cited Findings

**Latin**
- Loci Similes (2026): ~172k segments (~83k query, ~88k source), 545 expert-verified links. Query authors Jerome and Lactantius; source authors Cicero, Lucretius, Catullus, Virgil, Horace, Tibullus, Propertius, Ovid, Lucan, Martial — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Loci Similes taxonomy: verbatim quote (marked/unmarked), paraphrase (minor/major), allusion (single/systemic). Per-type counts not given — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Loci Similes gold: 270 links from Schropp et al. 2024 (Virgil/Cicero in Jerome's Epistulae), 275 found by n-gram pipeline then confirmed by 4 Latin experts. Dataset license not stated — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Loci Similes download: [HF collection](https://huggingface.co/collections/julian-schelb/datasets-for-latin-intertextuality-search); package [github.com/julianschelb/locisimiles](https://github.com/julianschelb/locisimiles); fine-tuned model [julian-schelb/multilingual-e5-large-emb-lat-intertext-v1](https://huggingface.co/julian-schelb/multilingual-e5-large-emb-lat-intertext-v1)
- Conflict: one search summary cited "~176k segments and 1,490 expert-verified parallels" for Loci Similes, possibly a later version; arXiv v1 says 545 — [docshare mirror](https://docshare.wps.com/document/loci-similes-a-benchmark-for-extracting-intertextualities-in-latin-literature/86373/_payload.json) vs [arXiv v1](https://arxiv.org/html/2601.07533v1)
- Schropp et al. 2024b Jerome→Virgil/Cicero references: [doi.org/10.11588/data/FVCULR](https://doi.org/10.11588/data/FVCULR) (heiDATA); n-gram pipeline [github.com/MWittweiler/citation_analysis](https://github.com/MWittweiler/citation_analysis) — cited in [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Valerius Flaccus Argonautica 1 database (Dexter, Chaudhuri et al., JOHD vol 10, Jan 2024, DOI 10.5334/johd.153): 945 references from commentaries of Kleywegt, Spaltenstein, Zissos, to Vergil Aeneid, Ovid Metamorphoses, Lucan Bellum Civile, Statius Thebaid; metadata for several search tools; benchmarked with Fīlum — [ancientworldonline](https://ancientworldonline.blogspot.com/2024/02/a-database-of-intertexts-in-valerius.html); [reference-global](https://reference-global.com/article/10.5334/johd.153)
- Same dataset on Harvard Dataverse DOI 10.7910/DVN/S6RD4M; one catalogue lists license CC0 1.0 (article itself CC BY 4.0) — [bib-bvb record](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_datacite_primary_10_7910_dvn_s6rd4m)
- A separate Dexter & Chaudhuri study reports >1,200 parallels in Argonautica 1 and finds embeddings + Tesserae + Fīlum combined beat any single tool — [SCS abstract](https://classicalstudies.org/semantic-intertextual-search-latin-word-embedding-models). Count differs from 945; check which set a paper uses.
- Tesserae Lucan BC 1 vs Vergil Aeneid: two hand-ranked benchmarks (benchmark1 "Complete", benchmark2), plus 2010 and 2012 benchmark files; also Lucan BC 2–10 vs Aeneid (raw) — [Tesserae blog, Collected Benchmark Sets](https://tesserae.caset.buffalo.edu/blog/); [older post](https://tesserae.caset.buffalo.edu/blog/?p=406)
- Tesserae 2012 parallels compiled from Lucan commentaries of Heitland & Haskins 1887, Thompson & Bruère 1968, Viansino 1995, Roche 2009; commentator initials mark which commentary records each parallel — [Tesserae blog](https://tesserae.caset.buffalo.edu/blog/?p=406)
- Tesserae code: [github.com/tesserae/tesserae](https://github.com/tesserae/tesserae). No license statement found for the benchmark files.
- Bamman 2009 released a test set of allusions between Milton's Paradise Lost and Vergil's Aeneid (English→Latin, cross-lingual) — [Bamman 2009 PDF](https://static.perseus.tufts.edu/publications/2009-Bamman.pdf)

**Greek**
- 376 Greek parallels between Apollonius Argonautica 3 and Iliad/Odyssey, compiled from Hunter's commentary (min two-word parallels); used in a Coffee/Galway study, not released as a clean dataset as far as found — [Coffee & Galway PDF](https://tesserae.caset.buffalo.edu/blog/wp-content/uploads/2020/09/Intertextuality-in-Flavian-Epic-Poetry-How-Rare-are-the-Words-that-Make-Up-Intertexts-A-Study-in-Latin-and-Greek-Epic-Poetry-Coffee-Galway.pdf)
- D'Angelo et al. (CLiC-it 2025): 11,305 Ancient Greek triplets (query, paraphrase positive, confounder negative) from Homer, Thucydides, Herodotus via Opera Graeca Adnotata — [CEUR Vol-4112 paper 33](https://ceur-ws.org/Vol-4112/33_main_long.pdf)
- NLP4DH 2026: synthetic benchmark for cross-lingual Ancient Greek–Latin parallel sentence mining — [ACL 2026.nlp4dh-1.11](https://aclanthology.org/2026.nlp4dh-1.11/)
- Konstantinidou et al. (ML4AL 2024): intra-Homeric intertextuality with language models — [ACL 2024.ml4al-1.25](https://aclanthology.org/2024.ml4al-1.25)

**Biblical, patristic, rabbinic**
- BiblIndex indexes biblical references in Christian literature, typed as quotation, mention, allusion — [Manjavacas, Long, Kestemont 2019](https://arxiv.org/pdf/1905.02973)
- Manjavacas et al. 2019 use manually annotated BiblIndex references in Bernard of Clairvaux's sermons (Latin) as an IR task (query = sermon passage, documents = Vulgate verses); allusions have low Jaccard overlap — [arXiv 1905.02973](https://arxiv.org/pdf/1905.02973). Public availability of their subset not confirmed.
- BiblIndex TEI encoding of patristic reuses — [JDMDH 2017](https://doaj.org/article/d2cb26ed1ff745e7ba867121ccea1b57)
- 2026 preprint builds a gold text-reuse set from BiblIndex XML-TEI editions: expert-verified biblical quotations and allusions in Latin and Ancient Greek patristic texts, each linked to one or more verses — [arXiv 2607.24542](https://arxiv.org/pdf/2607.24542). Access terms unchecked.
- ACT (Miller, Kuflik, Lavee, Dec 2025): expert-annotated Bible quotations in Bereshit Rabba (Albek ed.), Vayikra Rabba (Milikovski ed.), New Midrash (Wachman ed.); styles Simple, Wave, Echo, Compound; data on [Zenodo 15831340](https://zenodo.org/record/15831340); license not stated — [arXiv 2512.23504](https://arxiv.org/html/2512.23504v1)
- ACT results (F1/R/P): ACT-QE 0.91/0.89/0.94; Dicta 0.78/0.69/0.89; Passim 0.62/0.55/0.71; Text-Matcher 0.51/0.44/0.59; manual edition footnotes 0.64/0.48/1.00 — [arXiv 2512.23504](https://arxiv.org/html/2512.23504v1). Note: printed editions miss about half of quotations, which is direct evidence that edition-footnote gold is incomplete.

**Arabic**
- KITAB text reuse release 2023.1.8 (Zenodo, 2024-06-05, ~10.2 GB): passim pairwise alignments across OpenITI, one CSV per book pair — [zenodo.org/records/11501559](https://zenodo.org/records/11501559)
- KITAB runs passim on 300-word "milestones"; TSV reuse data on GitHub; alignment strings need the metadata app — [kitab-project.org/data/download](https://kitab-project.org/data/download); [methods](https://kitab-project.org/methods/text-reuse)
- These are machine-detected (silver), not expert gold. No Quran-citation gold set found.

**Buddhist**
- SansTib (LREC 2022): ~317k Sanskrit–Tibetan sentence pairs; gold = 3 manually aligned sets, 6,916 pairs across genres; in BuddhaNexus — [ACL 2022.lrec-1.724](https://aclanthology.org/2022.lrec-1.724.pdf)
- MITRA-parallel (2026): 1,742,786 auto-aligned Sanskrit/Chinese/Tibetan sentence pairs plus a 7-task multilingual semantic retrieval benchmark for Buddhist languages — [arXiv 2601.06400](https://arxiv.org/html/2601.06400v1); [Dharmamitra datasets](https://dharmamitra.github.io/dharmamitra-guides/datasets)
- Nehrdich 2025 describes two evaluation sets for Chinese Buddhist parallel-passage detection, one of 2,900 phrase pairs — [JJADH](https://www.jstage.jst.go.jp/article/jjadh/5/2/5_6/_html/-char/en)

**Chinese poetry allusion (典故)**
- SCAD: 1,025 allusions and 14,016 poems quoting them; self-supervised contrastive detection. No public release found — [synapsesocial summary](https://synapsesocial.com/papers/69a768a3badf0bb9e87e566d)
- Liu, Chen, He, "End-to-End Multi-task Learning for Allusion Detection in Ancient Chinese Poems," KSEM 2020 — [dblp](https://dblp.org/rec/conf/ksem/LiuCH20)
- Ancient Chinese Allusion Resource Database (Mo, Qiu, Wang, Hu; J. Chinese Information Processing) — [project page](https://yplarrywang.github.io//portfolio/portfolio-allusion). No download link seen.
- CCPM (THUNLP): match modern Chinese description to classical poem line; on GitHub THUNLP-AIPoet/CCPM. Cross-register paraphrase, not allusion — [arXiv 2106.01979](https://arxiv.org/abs/2106.01979v1)

**English**
- Reception Reader: Shakespeare text reuse in ECCO and EEBO (Helsinki); machine-detected reuse, not annotated allusion — [Helsinki data catalogue](https://datakatalogi.helsinki.fi/handle/123456789/4600)
- 2026 LLM study of biblical allusion in Cormac McCarthy checks against a manually compiled reference table — [arXiv 2604.19447](https://arxiv.org/pdf/2604.19447)

**General text reuse / paraphrase**
- PAN-PC-09: 41,223 docs, 94,202 artificial plagiarism cases, free for research — via [webis.de corpora](https://webis.de/research/corpora) (per search snippet)
- PAN 2015 text alignment corpora on Zenodo are "Dataset Restricted" (request access) — [zenodo 3712710](https://zenodo.org/record/3712710); [PAN15 construction](https://pan.webis.de/clef15/pan15-web/text-alignment.html)
- METER: 445 text-reuse cases among 1,716 news articles (journalism) — [LREC 2010 paper](https://lexitron.nectec.or.th/public/LREC-2010_Malta/pdf/35_Paper.pdf). License/access not found.

### Inferences
- Priority fixtures: (1) Loci Similes (typed links let ligatura report recall per link type); (2) Valerius Flaccus (multi-commentary, ~4 target authors); (3) Tesserae Lucan–Vergil (graded); (4) ACT midrash (Hebrew, typed styles incl. "Echo"); (5) Bamman Milton–Vergil (cross-lingual, cross-century, English poetry).
- KITAB, MITRA-parallel and PAN are useful as scale/silver stress tests, not as allusion gold.
- PAWS/MRPC/STS are modern-English sentence paraphrase sets; they test the embedding model, not allusion retrieval over a corpus. Low priority. (Not re-verified this session.)

### Gaps
- Licenses unconfirmed for Loci Similes, Tesserae benchmarks, ACT Zenodo set, BiblIndex-derived gold.
- Tesserae "Collected Benchmark Sets" page (?p=1020) did not render via fetch; file list from search snippets only.
- No downloadable gold found for: Chinese 典故, Quran citations in Arabic prose, Greek Homer–Apollonius, Dante commentaries, Joyce/Eliot annotations, Kant/Hegel/Aristotle citations. Not searched in depth: Dante Lab / Dartmouth Dante Project, Perseus Homer–Vergil, philosophy citation sets, Webis-CPC.
- Whether Manjavacas et al. released their Bernard of Clairvaux subset.

## Recent (2024–2026) benchmarks and shared tasks for literary/reasoning retrieval

### Takeaway
No shared task (EvaLatin, LT4HALA, SemEval) has covered intertextuality through 2026 as far as found. The relevant recent benchmarks are Loci Similes (Latin), MITRA's retrieval benchmark (Buddhist), the Greek triplet set, the synthetic Greek–Latin mining benchmark, and BRIGHT as a general reasoning-retrieval analogue.

### Cited Findings
- EvaLatin 2024 tasks: dependency parsing and emotion polarity only — [LT4HALA 2024 overview](https://aclanthology.org/2024.lt4hala-1.21); 2026 EvaLatin edition covered dependency parsing — [ACL 2026.lt4hala-1.46](https://aclanthology.org/2026.lt4hala-1.46/)
- BRIGHT (ICLR 2025): 1,384 queries across economics, psychology, math, coding etc.; relevance from documents cited in accepted answers; MTEB leader scores 59.0 nDCG@10 on MTEB but 18.0 on BRIGHT; reasoning about the query adds up to 12.2 points — [arXiv 2407.12883](https://arxiv.org/abs/2407.12883). Some sources report 1,398 queries and 22.1 best nDCG@10 (later revision).
- Loci Similes baselines: E5-large retrieval R@10 ≈ 0.61, R@100 ≈ 0.72, R@1000 ≈ 0.83; XLM-R Large classifier F1 ≈ 0.50; retrieve-then-rerank at k=100 recovered 85/108 refs while reviewing 780 vs 93,700 candidates; at k=5 F1 0.66 vs 0.26 retrieval-only — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Burns et al. (NAACL 2021) ranked Valerius Flaccus candidates with word2vec against the 945 known parallels — [NAACL 2021.naacl-main.389](https://preview.aclanthology.org/landing_page/2021.naacl-main.389.pdf)

### Inferences
- Loci Similes R@10 ≈ 0.61 for E5-large is a direct external baseline ligatura can compare against, if it reproduces the segmenting.
- BRIGHT's finding (strong MTEB models collapse on reasoning queries; query rewriting helps) parallels allusion retrieval, where lexical overlap is low. Suggests testing LLM query expansion ("what source might this echo?") before embedding.

### Gaps
- No literary-allusion retrieval benchmark in the BRIGHT/MTEB family was found.
- Neo-Classic (ACL 2026, classical Chinese poetry reasoning) surfaced but was not examined — [arXiv 2609.19154](https://arxiv.org/pdf/2609.19154)

## Evaluation methodology for incomplete gold, metric choice, agreement, graded relevance

### Takeaway
Gold for allusion is always incomplete: printed editions caught only 48% of midrash quotations, and Loci Similes authors say their "false positives" may be real links. So keep recall@k (it only needs the known links), add MRR or condensed-list nDCG′ for rank quality, report per link type, and treat precision as a lower bound, ideally with expert review of top unlabeled hits.

### Cited Findings
- Edition footnotes as a "system": precision 1.00, recall 0.48 against expert annotation of midrash quotations — [arXiv 2512.23504](https://arxiv.org/html/2512.23504v1)
- Loci Similes: labels not exhaustive; some false positives may be real undocumented links; boundaries between citation, allusion and thematic resonance are contested; disagreements resolved by group discussion — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Loci Similes reports R@k, MRR, MAP, nDCG for retrieval, and SMR/FPR/FNR normalized over all pairs; 5-fold CV — [arXiv 2601.07533](https://arxiv.org/html/2601.07533v1)
- Sakai: with incomplete judgments, drop unjudged docs and compute AP′/Q′/nDCG′ on the condensed list; this beats bpref — [Springer 2008](https://link.springer.com/doi/10.1007/s10791-008-9059-7)
- Under biased judgments the condensed-list advantage shrinks, but AP′ and Q′ still generally beat bpref and RBP — [Sakai 2009, IMT](https://www.jstage.jst.go.jp/article/imt/4/2/4_2_547/_article/-char/en)
- Fröbe et al. (ECIR 2023): condensed-list nDCG often overestimates; propose bootstrapping judgments for unjudged docs — [webis PDF](https://webis.de/downloads/publications/papers/froebe_2023a.pdf)
- Multi-source gold: Tesserae marks which of 4 commentaries record each parallel; VF database draws on 3 commentaries — [Tesserae blog](https://tesserae.caset.buffalo.edu/blog/?p=406); [ancientworldonline](https://ancientworldonline.blogspot.com/2024/02/a-database-of-intertexts-in-valerius.html)
- Graded types available in data: Tesserae hand-ranked scale; BiblIndex quotation/mention/allusion; Loci Similes quote/paraphrase/allusion; ACT Simple/Wave/Echo/Compound — sources above

### Inferences
- Use commentary-overlap as graded relevance (parallel noted by 3 commentators > 1) for nDCG, since independent agreement is the closest thing to inter-annotator agreement these sets offer.
- Report recall@k split by link type; aggregate recall hides failure on allusions, which is the hard case.
- Precision@k against incomplete gold is a lower bound. A cheap fix: sample top-k unlabeled hits per fixture, have an expert (or LLM judge plus spot check) label them, and report "pooled" precision. This is TREC-style pooling.
- Pairs ligatura already has with edition footnotes (Imitation of Christ, Augustine) likely have recall-ceiling problems like the midrash editions.

### Gaps
- No published Cohen's kappa / Krippendorff's alpha for allusion annotation was found this session.
- PAWS/MRPC/STS details (sizes, licenses) not re-verified this session.
