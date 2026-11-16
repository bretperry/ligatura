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
- **Follow-up:** the Waste Land `--gloss` rows in the README and `fixtures/waste-land/README.md`
  were measured with concatenation. Re-run them before PR 9 merges to main.

## Reverse by

The owner says so.
