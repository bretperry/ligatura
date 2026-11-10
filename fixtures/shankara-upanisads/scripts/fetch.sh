#!/bin/sh
# Downloads the GRETIL texts (CC BY-NC-SA 4.0) into raw/ (git-ignored). Then: python3 -I scripts/build.py
set -eu
cd "$(dirname "$0")/.."
mkdir -p raw && cd raw
B=https://gretil.sub.uni-goettingen.de/gretil
for f in \
  bAdarAyaNa-brahmasUtra-comm chAndogyopaniSad-comm bRhadAraNyakopaniSadkANva-recension-comm \
  taittirIyopaniSad-zaMkarabhASya kathopaniSad zaMkara-kaThopaniSadbhASya praznopaniSad-comm \
  aitareyopaniSad-comm IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm zvetAzvataropaniSad \
  mANDUkyopaniSad-comm
do
  [ -s "sa_$f.xml" ] || curl -sSfL -o "sa_$f.xml" "$B/corpustei/sa_$f.xml"
  echo "ok sa_$f.xml"
done
[ -s bhgce__u.htm ] || curl -sSfL -o bhgce__u.htm "$B/1_sanskr/2_epic/mbh/ext/bhgce__u.htm"
echo ok bhgce__u.htm
