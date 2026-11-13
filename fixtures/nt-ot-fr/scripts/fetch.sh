#!/bin/sh
# Fetches the Bibles into raw/ (git-ignored). Then: python3 -I scripts/build.py
# seven1m/open-bibles at the commit the fixtures were built from (2026-07-21).
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw
if [ ! -d raw/open-bibles ]; then
  git clone --filter=blob:none --no-checkout https://github.com/seven1m/open-bibles raw/open-bibles
  git -C raw/open-bibles checkout f257a3559025c3f873b48a75019f53a9354ed7de -- \
    fra-ostervald.osis.xml spa-rv1909.usfx.xml deu-luther1912.osis.xml eng-kjv.osis.xml
fi
# eBible.org's USFX of the Riveduta 1927 and the Van Dyck Arabic, as downloaded 2026-11-13.
# eBible regenerates its zips, so a later download may differ from these hashes; the script says so.
mkdir -p raw/ebible
for pair in \
  ita1927:dba8b8271f5f01c59638332b24e7535c2db304c16404a9619a59c4b9cc5e22ce \
  arb-vd:328a7927525cccdd89b21b3b35616fab39ff3771d6698e04fa02a713e5736011; do
  id=${pair%%:*}; sum=${pair#*:}
  zip=raw/ebible/${id}_usfx.zip
  [ -f "$zip" ] || curl -fsSL -o "$zip" "https://ebible.org/Scriptures/${id}_usfx.zip"
  echo "$sum  $zip" | shasum -a 256 -c - || echo "warning: $zip differs from the build's copy" >&2
  unzip -o -q "$zip" "${id}_usfx.xml" -d raw/ebible
done
