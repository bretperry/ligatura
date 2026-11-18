#!/bin/zsh
# Tuning --runs (weight, gate) and --rerank-fuse (weight, more fixtures).
export PATH=/opt/homebrew/bin:$PATH
cd ~/Dev/ligatura-exp
out=lab/exp123-results
mkdir -p $out
typeset -A extra
extra[kempis-gospels]="--neighbours 1"
extra[waste-land]="--neighbours 1 --gloss target-en.jsonl"
for f in kempis-gospels waste-land augustine-vulgate lxx-nt hbo-parallels nt-ot-fr augustine-drc; do
  for cfg in w0.25 w0.5 g10 g30 g10w0.5; do
    case $cfg in
      w0.25) flags="--runs --runs-weight 0.25";;
      w0.5) flags="--runs --runs-weight 0.5";;
      g10) flags="--runs --runs-gate 10";;
      g30) flags="--runs --runs-gate 30";;
      g10w0.5) flags="--runs --runs-gate 10 --runs-weight 0.5";;
    esac
    node dist/cli.js eval fixtures/$f ${=extra[$f]} ${=flags} --json --quiet > $out/$f.runs-$cfg.json 2> $out/$f.runs-$cfg.err
    echo "$f runs-$cfg rc=$?"
  done
done
for w in 0.5 2; do
  node dist/cli.js eval fixtures/kempis-gospels --neighbours 1 --rerank qwen3-reranker-0.6b --pool 20 --rerank-fuse $w --json --quiet > $out/kempis-rerank.fuse$w.20.json 2> $out/kempis-rerank.fuse$w.20.err
  echo "kempis fuse $w rc=$?"
done
for f in waste-land lxx-nt; do
  for mode in replace fuse; do
    flags="--rerank qwen3-reranker-0.6b --pool 20"
    [[ $mode == fuse ]] && flags="$flags --rerank-fuse 1"
    node dist/cli.js eval fixtures/$f ${=extra[$f]} ${=flags} --json --quiet > $out/$f-rerank.$mode.20.json 2> $out/$f-rerank.$mode.20.err
    echo "$f rerank $mode rc=$?"
  done
done
echo DONE
