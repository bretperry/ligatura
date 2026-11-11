#!/bin/sh
# Clones the Bibles into raw/open-bibles (git-ignored). Then: python3 -I scripts/build.py
# seven1m/open-bibles at the commit the fixtures were built from (2026-07-21).
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw
if [ ! -d raw/open-bibles ]; then
  git clone --filter=blob:none --no-checkout https://github.com/seven1m/open-bibles raw/open-bibles
  git -C raw/open-bibles checkout f257a3559025c3f873b48a75019f53a9354ed7de -- \
    fra-ostervald.osis.xml spa-rv1909.usfx.xml deu-luther1912.osis.xml eng-kjv.osis.xml
fi
