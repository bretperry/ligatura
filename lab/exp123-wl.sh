#!/bin/zsh
# Waste Land re-run after upstream scored each gloss as its own document (2026-11-18).
export PATH=/opt/homebrew/bin:$PATH
cd ~/Dev/ligatura-exp
out=lab/exp123-results
x="--neighbours 1 --gloss target-en.jsonl"
for cfg in base pairs runs both runs-g10; do
  case $cfg in base) f="";; pairs) f="--pairs";; runs) f="--runs";; both) f="--pairs --runs";; runs-g10) f="--runs --runs-gate 10";; esac
  node dist/cli.js eval fixtures/waste-land ${=x} ${=f} --json --quiet > $out/waste-land.$cfg.json 2> $out/waste-land.$cfg.err; echo "$cfg rc=$?"
done
for mode in replace 1; do
  node dist/cli.js eval fixtures/waste-land ${=x} --rerank qwen3-reranker-0.6b --pool 20 --rerank-fuse $mode --json --quiet > $out/waste-land-rerank.$mode.20.json 2> $out/waste-land-rerank.$mode.20.err; echo "rerank $mode rc=$?"
done
echo DONE
