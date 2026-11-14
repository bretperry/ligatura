#!/bin/sh
# Clones the two texts into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
cd "$(dirname "$0")/../raw" 2>/dev/null || { mkdir -p "$(dirname "$0")/../raw"; cd "$(dirname "$0")/../raw"; }
[ -d SBLGNT ] || git clone --depth 1 https://github.com/LogosBible/SBLGNT
if [ ! -d First1KGreek ]; then
  git clone --depth 1 --filter=blob:none --sparse https://github.com/OpenGreekAndLatin/First1KGreek
  git -C First1KGreek sparse-checkout set data/tlg0527
fi
