#!/usr/bin/env bash
# Downloads the 389 SAAo/SAA10 letter pages (Akkadian lines with their English translation) from
# ORACC, then moves them to the NAS. Run once; build.py reads them from the NAS.
#   bash fixtures/saao-akk-en/scripts/fetch.sh
set -euo pipefail
NAS_DIR=/volume1/NetBackup/ligatura-data/akkadian-fixtures
TMP=$(mktemp -d)
ids=$(ssh nas "ls $NAS_DIR/saa10/saao/saa10/corpusjson" 2>/dev/null | sed -n 's/^\(P[0-9]*\)\.json$/\1/p')
n=0
for id in $ids; do
  curl -fsL -m 60 "https://oracc.museum.upenn.edu/saao/saa10/$id/html" -o "$TMP/$id.html" || echo "failed $id" >&2
  n=$((n+1)); sleep 0.3
done
echo "fetched $n pages"
rsync -a "$TMP/" "nas:$NAS_DIR/saa10-html/"
rm -rf "$TMP"
