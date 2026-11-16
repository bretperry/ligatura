# Fused embedders and gloss scoring

Ruled 2026-11-15 by an arbiter, under the owner's grant to decide two-way doors. Neither feature
had been released: main and npm were at 0.2.1.

## 1. Each fused embedder votes `dense`

- **Decision:** with `--embed a+b`, each embedder's ranking gets the profile's full `dense` vote in
  rank fusion. No code change.
- **Why:** `fusion` is defined as each list's vote. The published English numbers (Kempis, Waste
  Land) were measured this way. With equal votes, a fused pair outweighs word overlap two to one.
- **Where:** `src/lang/types.ts` (`fusion`), `src/link.ts`, README → Models and servers.

## 2. A gloss scores like a second text, in overlap as in embeddings

- **Decision:** word and character overlap score each translation as a document of its own,
  indexed together with the target's units so they share one idf. A glossed unit keeps
  max(own, gloss), the same rule the embeddings use. The concatenation of text and gloss is
  gone.
- **Why:** concatenation lengthened glossed units. Their own-text matches then scored about half
  those of an identical unglossed unit (0.213 vs 0.408). A gloss should only ever add evidence.
- **Tested by:** `test/link.test.js` → "a gloss never lowers word overlap".
- **Measured:** Waste Land, `--gloss --neighbours 1`, recall at 1 / 3 / 5 / 10 on the Mac mini,
  2026-11-15. The default went from 21 / 28 / 29 / 33 to 21 / 29 / 30 / 36. nomic alone went from
  22 / 26 / 27 / 31 to 23 / 27 / 30 / 34, and bge-m3 alone from 18 / 24 / 24 / 27 to 18 / 24 / 27 / 32.
  No cell went down. A control run of the old code on the same machine reproduced 21 / 28 / 29 / 33.

## Reverse by

The owner says so.
