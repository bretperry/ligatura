#!/bin/sh
# Downloads the Tanzil Quran text (CC BY 3.0) and OpenITI's Ihya (Shamela 9472) into raw/ (git-ignored).
# Then: python3 -I scripts/build.py
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw && cd raw
[ -s quran-uthmani.txt ] || curl -sSfL -o quran-uthmani.txt "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true"
[ -s ihya.txt ] || curl -sSfL -o ihya.txt "https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0505Ghazali/0505Ghazali.IhyaCulumDin/0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed"
echo ok
