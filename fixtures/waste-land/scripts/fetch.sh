#!/bin/sh
# Downloads the fixture's raw texts into raw/ (ignored by git). Data only; nothing downloaded is executed.
set -eu
RAW="$(cd "$(dirname "$0")/.." && pwd)/raw"
mkdir -p "$RAW"; cd "$RAW"
PG=https://www.gutenberg.org/cache/epub
GH=https://github.com
curl -sSL https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv -o pg_catalog.csv
curl -sSL $PG/1321/pg1321.txt -o pg1321-wasteland.txt
curl -sSL $PG/1012/pg1012.txt -o pg1012-commedia-it.txt
curl -sSL $PG/1001/pg1001.txt -o pg1001-longfellow-inferno.txt
curl -sSL $PG/1002/pg1002.txt -o pg1002-longfellow-purgatorio.txt
curl -sSL $PG/10/pg10.txt -o pg10-kjv.txt
curl -sSL $PG/26/pg26.txt -o pg26-paradise-lost.txt
curl -sSL $PG/2667/pg2667.txt -o pg2667-vicar.txt
curl -sSL $PG/6099/pg6099.txt -o pg6099-fleurs.txt
curl -sSL $PG/3296/pg3296.txt -o pg3296-confessions-pusey.txt
curl -sSL $GH/PerseusDL/canonical-latinLit/tree/master/data/phi0959/phi006 -o gh-ovid-tree.html
curl -sSL $GH/PerseusDL/canonical-latinLit/tree/master/data/phi0690/phi003 -o gh-virgil-tree.html
curl -sSL $GH/PerseusDL/canonical-latinLit/tree/master/data/stoa0040 -o gh-augustine-tree.html
curl -sSL $GH/suttacentral/bilara-data/tree/published/root/pli/ms/sutta/sn/sn35 -o gh-bilara-sn35.html

# Round 2: works found in the Gutenberg catalog and the GitHub listings above.
curl -sSL $PG/12915/pg12915.txt -o pg12915-white-devil.txt
curl -sSL $PG/6043/pg6043.txt -o pg6043-spanish-tragedie.txt
curl -sSL $PG/10602/pg10602.txt -o pg10602-spenser-v5.txt
curl -sSL $PG/26288/pg26288.txt -o pg26288-coy-mistress.txt
curl -sSL $PG/33849/pg33849.txt -o pg33849-confessiones-la.txt
curl -sSL $PG/57390/pg57390.txt -o pg57390-sappho-wharton.txt
curl -sSL $PG/55554/pg55554.txt -o pg55554-nerval.txt
curl -sSL $PG/61039/pg61039.txt -o pg61039-verlaine-religieuses.txt
curl -sSL $PG/16250/pg16250.txt -o pg16250-tristan.txt
curl -sSL $PG/49507/pg49507.txt -o pg49507-twilight-gods-en.txt
curl -sSL $PG/21765/pg21765.txt -o pg21765-ovid-riley.txt
curl -sSL $PG/1135/pg1135.txt -o pg1135-tempest.txt
curl -sSL $PG/1130/pg1130.txt -o pg1130-antony.txt
for v in 75603 75604 75605 75606 75607; do curl -sSL $PG/$v/pg$v.txt -o pg$v-middleton.txt; done
RAWGH=https://raw.githubusercontent.com
LAT=$RAWGH/PerseusDL/canonical-latinLit/master/data
curl -sSL $LAT/phi0959/phi006/phi0959.phi006.perseus-lat2.xml -o perseus-ovid-met-lat.xml
curl -sSL $LAT/phi0959/phi006/phi0959.phi006.perseus-eng3.xml -o perseus-ovid-met-eng3.xml
curl -sSL $LAT/phi0959/phi006/phi0959.phi006.perseus-eng4.xml -o perseus-ovid-met-eng4.xml
curl -sSL $LAT/phi0690/phi003/phi0690.phi003.perseus-lat2.xml -o perseus-aeneid-lat.xml
curl -sSL $LAT/phi0690/phi003/phi0690.phi003.perseus-eng2.xml -o perseus-aeneid-eng2.xml
mkdir -p bilara
BIL=$RAWGH/suttacentral/bilara-data/published
for n in $(seq 1 32); do
  curl -sSL $BIL/root/pli/ms/sutta/sn/sn35/sn35.${n}_root-pli-ms.json -o bilara/sn35.${n}_root.json
  curl -sSL $BIL/translation/en/sujato/sutta/sn/sn35/sn35.${n}_translation-en-sujato.json -o bilara/sn35.${n}_en.json
done
# archive.org catalogue searches, to find the remaining works.
AS='https://archive.org/advancedsearch.php?fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=date&rows=15&output=json&q='
mkdir -p search
curl -sSL "${AS}title%3A%28froude%20history%20england%29%20AND%20title%3Aelizabeth" -o search/froude.json
curl -sSL "${AS}title%3A%28parliament%20bees%29" -o search/day.json
curl -sSL "${AS}title%3A%28works%20john%20day%29" -o search/day2.json
curl -sSL "${AS}title%3A%28devil%27s%20law%20case%29%20OR%20title%3A%28works%20john%20webster%29" -o search/webster.json
curl -sSL "${AS}title%3A%28blick%20ins%20chaos%29" -o search/hesse.json
curl -sSL "${AS}title%3A%28buddhism%20in%20translations%29" -o search/warren.json
curl -sSL "${AS}title%3A%28upanishads%29%20AND%20creator%3Amuller" -o search/muller.json
curl -sSL "${AS}title%3A%28brihadaranyaka%29" -o search/bu.json
curl -sSL "${AS}title%3A%28catullus%20tibullus%20pervigilium%29" -o search/pervig.json
curl -sSL "${AS}title%3A%28gotterdammerung%29" -o search/gdd.json
curl -sSL "${AS}title%3A%28tristan%20und%20isolde%29" -o search/tristan.json
curl -sSL "${AS}creator%3Averlaine%20AND%20title%3Aamour" -o search/verlaine.json

# Round 3: archive.org scans (OCR text), more Gutenberg, Greek Sappho, Wagner in German.
curl -sSL $PG/35330/pg35330.txt -o pg35330-spanish-tragedy.txt
curl -sSL $PG/66619/pg66619.txt -o pg66619-oxford-verse.txt
DL=https://archive.org/download
curl -sSL $DL/catullustibullus00catu/catullustibullus00catu_djvu.txt -o ia-pervigilium-loeb.txt
curl -sSL $DL/worksofjohnwebst02webs/worksofjohnwebst02webs_djvu.txt -o ia-webster-dyce-v2.txt
curl -sSL $DL/worksofjohnwebst03webs/worksofjohnwebst03webs_djvu.txt -o ia-webster-dyce-v3.txt
curl -sSL $DL/amoureditionrevu00verl/amoureditionrevu00verl_djvu.txt -o ia-verlaine-amour.txt
curl -sSL $DL/bub_gb_vKbrAc4LfyYC/bub_gb_vKbrAc4LfyYC_djvu.txt -o ia-hesse-blick.txt
curl -sSL $DL/wg915/wg915_djvu.txt -o ia-sbe15-muller.txt
curl -sSL $DL/parliamentofbeesjohndaye1641/parliamentofbeesjohndaye1641_djvu.txt -o ia-day-bees.txt
curl -sSL $DL/buddhismintransl00warr/buddhismintransl00warr_djvu.txt -o ia-warren.txt
curl -sSL "${AS}creator%3Afroude%20AND%20title%3A%28history%20england%29&fl%5B%5D=volume" -o search/froude2.json
curl -sSL "${AS}mediatype%3Atexts%20AND%20creator%3Awagner%20AND%20%28title%3Ag%C3%B6tterd%C3%A4mmerung%20OR%20title%3Anibelungen%20OR%20title%3Atristan%20OR%20title%3Adichtungen%29" -o search/wagner-texts.json
curl -sSL $GH/PerseusDL/canonical-greekLit/tree/master/data/tlg0009 -o gh-sappho-tree.html
curl -sSL "$GH/search?q=brihadaranyaka&type=repositories" -o gh-search-bu.html
curl -sSL "$GH/search?q=upanishad+sanskrit&type=repositories" -o gh-search-upanishad.html

# Round 4
curl -sSL $DL/in.ernet.dli.2015.22552/in.ernet.dli.2015.22552_djvu.txt -o ia-sbe15-muller.txt
curl -sSL $DL/smtlicheschrif06wagn/smtlicheschrif06wagn_djvu.txt -o ia-wagner-ssd06.txt
curl -sSL $DL/smtlicheschrif07wagn/smtlicheschrif07wagn_djvu.txt -o ia-wagner-ssd07.txt
curl -sSL $DL/derringdesnibel00klingoog/derringdesnibel00klingoog_djvu.txt -o ia-wagner-ring-1904.txt
curl -sSL $DL/india.history.resource.74125/india.history.resource.74125_djvu.txt -o ia-froude-elizabeth.txt
curl -sSL $DL/bim_early-english-books-1641-1700_the-parliament-of-bees-_day-john_1641/bim_early-english-books-1641-1700_the-parliament-of-bees-_day-john_1641_djvu.txt -o ia-day-bees.txt
curl -sSL $GH/dharmarooms/brihadaranyaka -o gh-dharmarooms-bu.html
curl -sSL $GH/kishorssk/Brihadaranyaka_Web -o gh-kishorssk-bu.html
curl -sSL $GH/ProjectBharatBodh/Upanishads -o gh-bharatbodh-up.html
curl -sSL "${AS}title%3A%28lyra%20graeca%29" -o search/lyra.json
curl -sSL "${AS}title%3A%28specimens%20english%20dramatic%20poets%29" -o search/lamb.json
curl -sSL "${AS}identifier%3Asmtlicheschrif%2A" -o search/wagner-ssd.json

# Round 5
curl -sSL $DL/in.ernet.dli.2015.461205/in.ernet.dli.2015.461205_djvu.txt -o ia-sbe15-muller.txt
curl -sSL $DL/upanishads00mlgoog/upanishads00mlgoog_djvu.txt -o ia-upanishads-1897.txt
curl -sSL $DL/lyragraecabeingr01edmouoft/lyragraecabeingr01edmouoft_djvu.txt -o ia-lyra-graeca-1.txt
curl -sSL $RAWGH/dharmarooms/brihadaranyaka/master/part5.md -o gh-dharmarooms-part5.md
mkdir -p froude
for id in bub_gb_NIB0bBUlSOAC bub_gb_JDcNVRMV7xsC bub_gb_kUWJp7hovi0C bub_gb_h3uG9eI-5JsC bub_gb_MF1pkvnLxjAC bub_gb_hLiEDmefal8C; do
  curl -sSL $DL/$id/${id}_djvu.txt -o froude/$id.txt
done

# Round 6: file lists for SBE 15 (Max Müller, Upanishads part 2) scans
mkdir -p meta
for id in in.ernet.dli.2015.22552 wg915 in.ernet.dli.2015.461205 mlbd.upanishadssacred0000vol-15.unse_x5j4; do
  curl -sSL https://archive.org/metadata/$id -o meta/$id.json
done

# Round 7
curl -sSL "$DL/in.ernet.dli.2015.22552/2015.22552.The-Upanishads--Part-2_djvu.txt" -o ia-sbe15-muller.txt
curl -sSL "$DL/mlbd.upanishadssacred0000vol-15.unse_x5j4/mlbd.upanishadssacred0000vol-15.unse_x5j4_djvu.txt" -o ia-sbe15-muller-mlbd.txt
curl -sSL $RAWGH/kishorssk/Brihadaranyaka_Web/master/chapter5_san.html -o gh-kishorssk-ch5.html

# Round 8: Cambridge Shakespeare (Globe line numbering)
curl -sSL $PG/23042/pg23042.txt -o pg23042-tempest-cambridge.txt
curl -sSL $PG/49008/pg49008.txt -o pg49008-cambridge-v8.txt
curl -sSL $PG/47715/pg47715.txt -o pg47715-cambridge-v7.txt

# Round 9: Antony and Cleopatra with act and scene divisions
curl -sSL $PG/2268/pg2268.txt -o pg2268-antony.txt
curl -sSL $PG/1796/pg1796.txt -o pg1796-antony.txt
