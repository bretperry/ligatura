#!/bin/sh
# Clones the Itihasa dataset (Apache-2.0) into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw && cd raw
[ -d itihasa ] || git clone --depth 1 https://huggingface.co/datasets/rahular/itihasa
