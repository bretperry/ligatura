#!/bin/zsh
# Experiments 1-3: rare word pairs, runs, reranker fused with retrieval.
export PATH=/opt/homebrew/bin:$PATH
cd ~/Dev/ligatura-exp
out=lab/exp123-results
mkdir -p $out
typeset -A extra
extra[kempis-gospels]="--neighbours 1"
extra[waste-land]="--neighbours 1 --gloss target-en.jsonl"
for f in kempis-gospels waste-land augustine-vulgate lxx-nt hbo-parallels nt-ot-fr augustine-drc; do
  for cfg in base pairs runs both; do
    flags=""
    [[ $cfg == pairs ]] && flags="--pairs"
    [[ $cfg == runs ]] && flags="--runs"
    [[ $cfg == both ]] && flags="--pairs --runs"
    [[ $f == augustine-drc && ( $cfg == pairs || $cfg == both ) ]] && continue
    node dist/cli.js eval fixtures/$f ${=extra[$f]} ${=flags} --json --quiet > $out/$f.$cfg.json 2> $out/$f.$cfg.err
    echo "$f $cfg rc=$?"
  done
done
for pool in 10 20; do
  for mode in replace fuse; do
    flags="--rerank qwen3-reranker-0.6b --pool $pool"
    [[ $mode == fuse ]] && flags="$flags --rerank-fuse 1"
    node dist/cli.js eval fixtures/kempis-gospels --neighbours 1 ${=flags} --json --quiet > $out/kempis-rerank.$mode.$pool.json 2> $out/kempis-rerank.$mode.$pool.err
    echo "kempis rerank $mode $pool rc=$?"
  done
done
echo DONE
