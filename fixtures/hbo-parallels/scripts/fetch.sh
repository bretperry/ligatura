#!/bin/sh
# Clones the Open Scriptures Hebrew Bible into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
mkdir -p "$(dirname "$0")/../raw"
cd "$(dirname "$0")/../raw"
[ -d morphhb ] || git clone --depth 1 https://github.com/openscriptures/morphhb
git -C morphhb rev-parse HEAD
