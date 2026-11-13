# Fusion buried it: keep each list's top hits?

TL;DR (2026-11-13, Mac mini M2 Pro, bge-m3 q8 / nomic for Kempis, `--neighbours 1`, rerank off):

- **Keeping each list's top n in the top 10 does not help.** Reserving slots loses R@10 overall
  (735 → 731 to 718 on dev); appending them gains 5 to 14 links of 2,624 for 0.2 to 3.5 more rows
  per source.
- **Latin fusion weights do.** Character overlap gets 4 votes (`la.fusion = { chars: 4 }`): R@1
  +11 dev / +5 test, R@10 +4 / +3 on `augustine-vulgate`, same review volume. Now the default.
- Buried links on Latin fall from 39 to 31. Other languages are unchanged.

Script: `lab/keep-top.mjs <fixture> [--grid]`. It runs the real pipeline (`link()`, rerank off)
and rebuilds each variant's top 10 from its lists. Gold sources are split into dev and test by the
same SHA-1 hash as `lab/variants.mjs`; variants were picked on dev only.

## Terms

- **Buried:** a gold link (or its neighbour) that some list has in its top 10, but the output does
  not. Overlap lists count only targets they score above 0. Base count: 77 (Latin 39, Spanish 14,
  German 9, French 8, Greek 5, Kempis 2; the miss analysis counted 75 with slightly different rules).
- **Noise:** the pipeline is deterministic, so every change is real on its half. A change of 2
  links or fewer on a half is treated as noise for whether it generalizes.
- R@k counts the output position, as `eval` reports "final". On `shankara-upanisads` that is 3 links
  below the tied fused rank README quotes (1,001 vs 1,004 at R@1).

## What was tried

- **reserve n:** each list's top n (ties broken by fused rank) take a place in the top 10,
  replacing the lowest fused rows that no list reserved. The top 10 stays in fused order, so rows
  above the newcomers keep their places. "voting" uses lists with weight above 0; "all" adds
  Sanskrit's zero-weight lists. Same 10 rows to review.
- **append n:** the fused top 10, then each list's top n not already in it. More rows to review.
- **maxblend β k:** RRF plus β × the best single list's 1/(k + rank), scaled so a list's first
  place earns β RRF votes at rank 1.
- **weights:** per-list RRF votes. Grids on Latin and Greek.

## Keep-top: sums over the 6 fixtures with more than one voting list

Kempis, Latin, Greek, German, Spanish, French (dev 1,302 links, test 1,322). R@1 / R@3 / R@10.
Sanskrit votes on one list and the 5 cross-language fixtures have one list, so no variant
changes them. "all" equals "voting" everywhere.

| Variant | Dev | Test | Extra rows per source |
|---|---|---|---|
| base | 468 / 625 / 735 | 430 / 590 / 676 | 0 |
| reserve n1 | 468 / 625 / 731 | 430 / 590 / 677 | 0 |
| reserve n2 | 468 / 625 / 728 | 430 / 590 / 675 | 0 |
| reserve n3 | 468 / 621 / 718 | 430 / 585 / 661 | 0 |
| append n1 | 468 / 625 / 740 | 430 / 590 / 681 | 0.2 to 0.8 |
| append n2 | 468 / 625 / 741 | 430 / 590 / 685 | 0.8 to 2.1 |
| append n3 | 468 / 625 / 747 | 430 / 590 / 690 | 1.8 to 3.5 |
| maxblend β0.5 k1 | 485 / 640 / 731 | 444 / 608 / 678 | 0 |
| maxblend β0.5 k5 | 488 / 640 / 730 | 438 / 603 / 681 | 0 |
| maxblend β1 k5 | 488 / 643 / 725 | 442 / 603 / 677 | 0 |

Why reserve fails: a buried link sits at rank 2 to 10 of its list, rarely 1, so n = 1 rarely
reaches it. Larger n reserves many list-top rows that are wrong, and they push out gold links that
fusion had at ranks 8 to 10 (Latin test, n3: R@10 234 → 220).

Why append isn't kept: +5 to +14 links at R@10 (0.4 to 1.1%) for up to 35% more rows to review.
Latin weights alone bring more on Latin with no extra rows.

Maxblend is an R@1 lever, not a burial fix: +17 / +14 R@1 but R@10 -4 dev, and German loses 4 to
5 links at R@10 on dev. Not adopted; worth a separate test on top of the Latin weights.

## Latin weights (augustine-vulgate, la → la, 713 links)

Picked on dev from dense {0, 1} × words {0, 0.25, 0.5, 1} × chars {1, 2, 3, 4, 6}. Votes are
ratios, so dense 1 covers every mix that keeps the embedding.

| Votes (dense / words / chars) | Dev R@1 / R@3 / R@10 (353) | Test (360) | Buried dev + test |
|---|---|---|---|
| 1 / 1 / 1 (old default) | 125 / 192 / 229 | 131 / 197 / 234 | 39 |
| 1 / 1 / 2 | 132 / 198 / 229 | 134 / 201 / 237 | 35 |
| 1 / 1 / 3 | 134 / 198 / 232 | 135 / 200 / 237 | 32 |
| **1 / 1 / 4 (new default)** | **136 / 200 / 233** | **136 / 200 / 237** | **31** |
| 1 / 1 / 6 | 137 / 197 / 232 | 138 / 202 / 233 | 30 |
| 1 / 0.5 / 4 | 134 / 192 / 235 | 135 / 198 / 234 | 26 |
| 0 / 0.5 / 3 (no embedding) | 131 / 185 / 226 | 128 / 188 / 224 | 40 |
| 0 / 0 / 1 (characters alone) | 127 / 180 / 222 | 131 / 184 / 219 | 46 |

1 / 1 / 4 had the best dev R@1 + R@3 + R@10, and chars 3 to 6 form a plateau, so the pick is not a
lone spike. Full pipeline after the change (`ligatura eval fixtures/augustine-vulgate
--neighbours 1`): 272 / 401 / 428 / 470 at R@1 / 3 / 5 / 10, from 256 / 389 / 427 / 463.

Greek (`lxx-nt`, same grid): nothing beat equal votes on both halves (best dev, 1 / 0.5 / 2:
89 / 107 / 123 vs 89 / 106 / 119, but test 77 / 97 / 108 vs 76 / 101 / 109). Left at equal votes.

## Per fixture, before and after

R@1 / R@3 / R@10. Only `augustine-vulgate` changes; every other fixture is identical after.

| Fixture | Langs | Dev before | Dev after | Test before | Test after |
|---|---|---|---|---|---|
| kempis-gospels | en → en | 20 / 22 / 23 of 25 | same | 15 / 18 / 21 of 24 | same |
| augustine-vulgate | la → la | 125 / 192 / 229 of 353 | 136 / 200 / 233 | 131 / 197 / 234 of 360 | 136 / 200 / 237 |
| augustine-drc | la → en | 51 / 69 / 102 of 352 | same | 52 / 72 / 101 of 360 | same |
| lxx-nt | grc → grc | 89 / 106 / 119 of 142 | same | 76 / 101 / 109 of 124 | same |
| shankara-upanisads | sa → sa | 522 / 581 / 597 of 628 | same | 479 / 541 / 556 of 589 | same |
| itihasa-sa-en | sa → en | 70 / 103 / 135 of 230 | same | 99 / 128 / 176 of 270 | same |
| nt-ot-de | de → de | 79 / 105 / 126 of 142 | same | 72 / 96 / 107 of 127 | same |
| nt-ot-de-en | de → en | 52 / 72 / 92 of 142 | same | 52 / 66 / 83 of 127 | same |
| nt-ot-es | es → es | 75 / 98 / 113 of 142 | same | 66 / 85 / 105 of 127 | same |
| nt-ot-es-en | es → en | 55 / 75 / 99 of 142 | same | 52 / 75 / 87 of 127 | same |
| nt-ot-fr | fr → fr | 80 / 102 / 125 of 142 | same | 70 / 93 / 100 of 127 | same |
| nt-ot-fr-en | fr → en | 51 / 80 / 101 of 142 | same | 49 / 67 / 84 of 127 | same |

Review volume is unchanged: the same number of rows per source, reordered.

## Max-of-ranks blend on top of the Latin weights

Run 2026-11-13 against branch head `ec01e60` (Latin `chars: 4`). Sweep: β {0.25, 0.5, 1, 2} ×
k {1, 5, 20}, picked on dev. R@1 / R@3 / R@10; dev, then test.

| Fixture | Base | β0.25 k5 | β0.5 k5 | β1 k5 | β1 k20 |
|---|---|---|---|---|---|
| kempis-gospels | 20/22/23, 15/18/21 | 22/22/23, 15/19/21 | 22/23/24, 14/19/20 | 21/23/24, 14/19/20 | 22/23/24, 14/19/20 |
| augustine-vulgate | 136/200/233, 136/200/237 | 141/195/233, 141/201/234 | 135/192/233, 136/195/230 | 131/186/230, 132/189/229 | 138/195/230, 138/196/229 |
| lxx-nt | 89/106/119, 76/101/109 | 92/107/120, 75/101/109 | 92/107/120, 76/103/109 | 93/110/119, 77/102/110 | 92/107/120, 74/103/110 |
| nt-ot-de | 79/105/126, 72/96/107 | 82/107/122, 70/95/108 | 80/108/121, 70/97/109 | 77/109/120, 72/97/108 | 80/107/120, 71/97/108 |
| nt-ot-es | 75/98/113, 66/85/105 | 76/98/113, 67/88/106 | 76/101/113, 69/89/105 | 74/98/114, 69/88/104 | 76/100/114, 69/89/105 |
| nt-ot-fr | 80/102/125, 70/93/100 | 83/105/125, 72/94/101 | 84/107/125, 74/95/102 | 88/108/124, 76/97/102 | 82/105/124, 74/95/102 |
| **Sum** | 479/633/739, 435/593/679 | 496/634/736, 440/598/679 | 489/638/736, 439/598/675 | 484/634/731, 440/592/673 | 490/637/732, 440/599/674 |

Rule: adopt only if R@1 rises on both halves and R@10 drops by at most 2 links on every fixture's
half. **No global setting passes:** German loses 4 to 6 links at R@10 on dev at every β and k, and
Latin loses 3 or more on test at every setting that raises its R@1.

Per language (best dev setting, then test):

- **French passes, not adopted:** β1 k5, R@1 80 → 88 dev, 70 → 76 test; R@10 125 → 124, 100 → 102.
  Full eval: 164 / 205 / 212 / 226 at R@1 / 3 / 5 / 10, from 150 / 195 / 209 / 225. Added as a
  profile field (`fr.blend`) in `523ecef`, then removed by the owner (2026-11-13): one fixture is
  too thin to set a per-language default.
- **Spanish: not adopted.** Best dev R@1 is +1 (75 → 76), within noise; test +3.
- **Greek: not adopted.** Best dev R@1 + R@3 + R@10 (β0.5 k1 or β1 k5): R@1 dev +4, test +1
  (noise). β2 k1 has the best dev R@1 (+5, test +3) but costs R@3 8 links on test (101 → 93).
- **Kempis: not adopted.** Test R@1 never rises.
- **German, Latin: not adopted.** They lose R@10 as above.

French is one fixture (142 dev, 127 test links), and German, from the same kind of fixture, loses
with the blend. The setting rests on that one fixture.

## Revisit

The French blend is parked, not rejected. Bring it back (`git show 523ecef`: `Lang.blend`,
`fuseWeighted`'s blend argument, 2 tests) if a second fixture shows the same trend: a language
whose R@1 rises on both halves with R@10 within 2 links. Check first on any new same-language
fixture, especially another French text or an Italian or Spanish one
(`node lab/keep-top.mjs <fixture> --blend`, needs the blend code restored).

## Not checked

- Keep-top on top of the Latin weights (append might still add a few Latin links).
- Reranking with the new Latin and French orders.
