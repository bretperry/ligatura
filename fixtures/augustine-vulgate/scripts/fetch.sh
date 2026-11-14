#!/bin/sh
# Downloads the two source files into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw
curl -fsSL -o raw/pg33849-confessiones-la.txt https://www.gutenberg.org/cache/epub/33849/pg33849.txt
curl -fsSL -o raw/parallel_bible_data.csv \
  https://huggingface.co/datasets/jam963/parallel-catholic-bible-versions/resolve/main/parallel_bible_data.csv
