#!/bin/sh
# Downloads the fixture's raw texts into raw/ (ignored by git). Data only; nothing downloaded is executed.
set -eu
RAW="$(cd "$(dirname "$0")/.." && pwd)/raw"
mkdir -p "$RAW"; cd "$RAW"
PG=https://www.gutenberg.org/cache/epub
GH=https://github.com
# get <url> <file>: saves only a 2xx response, so an error page never lands as data. A failed URL
# is listed and the script exits 1 at the end; earlier rounds' URLs may have gone dead since.
FAILED=""
get() {
  if curl -fsSL "$1" -o "$2.part"; then mv "$2.part" "$2"
  else rm -f "$2.part"; echo "fetch: failed $1" >&2; FAILED="$FAILED $2"; fi
}
get https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv pg_catalog.csv
get $PG/1321/pg1321.txt pg1321-wasteland.txt
get $PG/1012/pg1012.txt pg1012-commedia-it.txt
get $PG/1001/pg1001.txt pg1001-longfellow-inferno.txt
get $PG/1002/pg1002.txt pg1002-longfellow-purgatorio.txt
get $PG/10/pg10.txt pg10-kjv.txt
get $PG/26/pg26.txt pg26-paradise-lost.txt
get $PG/2667/pg2667.txt pg2667-vicar.txt
get $PG/6099/pg6099.txt pg6099-fleurs.txt
get $PG/3296/pg3296.txt pg3296-confessions-pusey.txt
get $GH/PerseusDL/canonical-latinLit/tree/master/data/phi0959/phi006 gh-ovid-tree.html
get $GH/PerseusDL/canonical-latinLit/tree/master/data/phi0690/phi003 gh-virgil-tree.html
get $GH/PerseusDL/canonical-latinLit/tree/master/data/stoa0040 gh-augustine-tree.html
get $GH/suttacentral/bilara-data/tree/published/root/pli/ms/sutta/sn/sn35 gh-bilara-sn35.html

# Round 2: works found in the Gutenberg catalog and the GitHub listings above.
get $PG/12915/pg12915.txt pg12915-white-devil.txt
get $PG/6043/pg6043.txt pg6043-spanish-tragedie.txt
get $PG/10602/pg10602.txt pg10602-spenser-v5.txt
get $PG/26288/pg26288.txt pg26288-coy-mistress.txt
get $PG/33849/pg33849.txt pg33849-confessiones-la.txt
get $PG/57390/pg57390.txt pg57390-sappho-wharton.txt
get $PG/55554/pg55554.txt pg55554-nerval.txt
get $PG/61039/pg61039.txt pg61039-verlaine-religieuses.txt
get $PG/16250/pg16250.txt pg16250-tristan.txt
get $PG/49507/pg49507.txt pg49507-twilight-gods-en.txt
get $PG/21765/pg21765.txt pg21765-ovid-riley.txt
get $PG/1135/pg1135.txt pg1135-tempest.txt
get $PG/1130/pg1130.txt pg1130-antony.txt
for v in 75603 75604 75605 75606 75607; do get $PG/$v/pg$v.txt pg$v-middleton.txt; done
RAWGH=https://raw.githubusercontent.com
LAT=$RAWGH/PerseusDL/canonical-latinLit/master/data
get $LAT/phi0959/phi006/phi0959.phi006.perseus-lat2.xml perseus-ovid-met-lat.xml
get $LAT/phi0959/phi006/phi0959.phi006.perseus-eng3.xml perseus-ovid-met-eng3.xml
get $LAT/phi0959/phi006/phi0959.phi006.perseus-eng4.xml perseus-ovid-met-eng4.xml
get $LAT/phi0690/phi003/phi0690.phi003.perseus-lat2.xml perseus-aeneid-lat.xml
get $LAT/phi0690/phi003/phi0690.phi003.perseus-eng2.xml perseus-aeneid-eng2.xml
mkdir -p bilara
BIL=$RAWGH/suttacentral/bilara-data/published
for n in $(seq 1 32); do
  get $BIL/root/pli/ms/sutta/sn/sn35/sn35.${n}_root-pli-ms.json bilara/sn35.${n}_root.json
  get $BIL/translation/en/sujato/sutta/sn/sn35/sn35.${n}_translation-en-sujato.json bilara/sn35.${n}_en.json
done
# archive.org catalogue searches, to find the remaining works.
AS='https://archive.org/advancedsearch.php?fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=date&rows=15&output=json&q='
mkdir -p search
get "${AS}title%3A%28froude%20history%20england%29%20AND%20title%3Aelizabeth" search/froude.json
get "${AS}title%3A%28parliament%20bees%29" search/day.json
get "${AS}title%3A%28works%20john%20day%29" search/day2.json
get "${AS}title%3A%28devil%27s%20law%20case%29%20OR%20title%3A%28works%20john%20webster%29" search/webster.json
get "${AS}title%3A%28blick%20ins%20chaos%29" search/hesse.json
get "${AS}title%3A%28buddhism%20in%20translations%29" search/warren.json
get "${AS}title%3A%28upanishads%29%20AND%20creator%3Amuller" search/muller.json
get "${AS}title%3A%28brihadaranyaka%29" search/bu.json
get "${AS}title%3A%28catullus%20tibullus%20pervigilium%29" search/pervig.json
get "${AS}title%3A%28gotterdammerung%29" search/gdd.json
get "${AS}title%3A%28tristan%20und%20isolde%29" search/tristan.json
get "${AS}creator%3Averlaine%20AND%20title%3Aamour" search/verlaine.json

# Round 3: archive.org scans (OCR text), more Gutenberg, Greek Sappho, Wagner in German.
get $PG/35330/pg35330.txt pg35330-spanish-tragedy.txt
get $PG/66619/pg66619.txt pg66619-oxford-verse.txt
DL=https://archive.org/download
get $DL/catullustibullus00catu/catullustibullus00catu_djvu.txt ia-pervigilium-loeb.txt
get $DL/worksofjohnwebst02webs/worksofjohnwebst02webs_djvu.txt ia-webster-dyce-v2.txt
get $DL/worksofjohnwebst03webs/worksofjohnwebst03webs_djvu.txt ia-webster-dyce-v3.txt
get $DL/amoureditionrevu00verl/amoureditionrevu00verl_djvu.txt ia-verlaine-amour.txt
get $DL/bub_gb_vKbrAc4LfyYC/bub_gb_vKbrAc4LfyYC_djvu.txt ia-hesse-blick.txt
get $DL/wg915/wg915_djvu.txt ia-sbe15-muller.txt
get $DL/parliamentofbeesjohndaye1641/parliamentofbeesjohndaye1641_djvu.txt ia-day-bees.txt
get $DL/buddhismintransl00warr/buddhismintransl00warr_djvu.txt ia-warren.txt
get "${AS}creator%3Afroude%20AND%20title%3A%28history%20england%29&fl%5B%5D=volume" search/froude2.json
get "${AS}mediatype%3Atexts%20AND%20creator%3Awagner%20AND%20%28title%3Ag%C3%B6tterd%C3%A4mmerung%20OR%20title%3Anibelungen%20OR%20title%3Atristan%20OR%20title%3Adichtungen%29" search/wagner-texts.json
get $GH/PerseusDL/canonical-greekLit/tree/master/data/tlg0009 gh-sappho-tree.html
get "$GH/search?q=brihadaranyaka&type=repositories" gh-search-bu.html
get "$GH/search?q=upanishad+sanskrit&type=repositories" gh-search-upanishad.html

# Round 4
get $DL/in.ernet.dli.2015.22552/in.ernet.dli.2015.22552_djvu.txt ia-sbe15-muller.txt
get $DL/smtlicheschrif06wagn/smtlicheschrif06wagn_djvu.txt ia-wagner-ssd06.txt
get $DL/smtlicheschrif07wagn/smtlicheschrif07wagn_djvu.txt ia-wagner-ssd07.txt
get $DL/derringdesnibel00klingoog/derringdesnibel00klingoog_djvu.txt ia-wagner-ring-1904.txt
get $DL/india.history.resource.74125/india.history.resource.74125_djvu.txt ia-froude-elizabeth.txt
get $DL/bim_early-english-books-1641-1700_the-parliament-of-bees-_day-john_1641/bim_early-english-books-1641-1700_the-parliament-of-bees-_day-john_1641_djvu.txt ia-day-bees.txt
get $GH/dharmarooms/brihadaranyaka gh-dharmarooms-bu.html
get $GH/kishorssk/Brihadaranyaka_Web gh-kishorssk-bu.html
get $GH/ProjectBharatBodh/Upanishads gh-bharatbodh-up.html
get "${AS}title%3A%28lyra%20graeca%29" search/lyra.json
get "${AS}title%3A%28specimens%20english%20dramatic%20poets%29" search/lamb.json
get "${AS}identifier%3Asmtlicheschrif%2A" search/wagner-ssd.json

# Round 5
get $DL/in.ernet.dli.2015.461205/in.ernet.dli.2015.461205_djvu.txt ia-sbe15-muller.txt
get $DL/upanishads00mlgoog/upanishads00mlgoog_djvu.txt ia-upanishads-1897.txt
get $DL/lyragraecabeingr01edmouoft/lyragraecabeingr01edmouoft_djvu.txt ia-lyra-graeca-1.txt
get $RAWGH/dharmarooms/brihadaranyaka/master/part5.md gh-dharmarooms-part5.md
mkdir -p froude
for id in bub_gb_NIB0bBUlSOAC bub_gb_JDcNVRMV7xsC bub_gb_kUWJp7hovi0C bub_gb_h3uG9eI-5JsC bub_gb_MF1pkvnLxjAC bub_gb_hLiEDmefal8C; do
  get $DL/$id/${id}_djvu.txt froude/$id.txt
done

# Round 6: file lists for SBE 15 (Max Müller, Upanishads part 2) scans
mkdir -p meta
for id in in.ernet.dli.2015.22552 wg915 in.ernet.dli.2015.461205 mlbd.upanishadssacred0000vol-15.unse_x5j4; do
  get https://archive.org/metadata/$id meta/$id.json
done

# Round 7
get "$DL/in.ernet.dli.2015.22552/2015.22552.The-Upanishads--Part-2_djvu.txt" ia-sbe15-muller.txt
get "$DL/mlbd.upanishadssacred0000vol-15.unse_x5j4/mlbd.upanishadssacred0000vol-15.unse_x5j4_djvu.txt" ia-sbe15-muller-mlbd.txt
get $RAWGH/kishorssk/Brihadaranyaka_Web/master/chapter5_san.html gh-kishorssk-ch5.html

# Round 8: Cambridge Shakespeare (Globe line numbering)
get $PG/23042/pg23042.txt pg23042-tempest-cambridge.txt
get $PG/49008/pg49008.txt pg49008-cambridge-v8.txt
get $PG/47715/pg47715.txt pg47715-cambridge-v7.txt

# Round 9: Antony and Cleopatra with act and scene divisions
get $PG/2268/pg2268.txt pg2268-antony.txt
get $PG/1796/pg1796.txt pg1796-antony.txt

if [ -n "$FAILED" ]; then echo "fetch: not saved:$FAILED" >&2; exit 1; fi
