#!/bin/sh
# Clones Coptic Scriptorium's corpora (sparse: Sahidic NT and OT only) and unzips the
# TreeTagger files into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$here/raw"
cd "$here/raw"
if [ ! -d corpora ]; then
  git clone --depth 1 --filter=blob:none --sparse https://github.com/CopticScriptorium/corpora corpora
  git -C corpora sparse-checkout set sahidica.nt sahidic.ot sahidica.mark sahidica.1corinthians
fi
mkdir -p nt ot mk co
unzip -qo corpora/sahidica.nt/sahidica.nt_TT.zip -d nt
unzip -qo corpora/sahidic.ot/sahidic.ot_TT.zip -d ot
cp corpora/sahidica.mark/sahidica.mark_TT/*.tt mk/
cp corpora/sahidica.1corinthians/sahidica.1corinthians_TT/*.tt co/
