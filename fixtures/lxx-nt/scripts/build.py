"""Build the Septuagint-in-the-New-Testament fixture from raw/.

    scripts/fetch.sh                      # clones SBLGNT and Swete's LXX into raw/
    python3 -I scripts/build.py           # writes source.jsonl, target.jsonl, gold.jsonl
    python3 -I scripts/build.py --show    # also prints every gold link with both verses

source.jsonl: the Greek New Testament, SBLGNT (CC BY 4.0), one unit per verse.
target.jsonl: the Septuagint, Swete's edition (1909-1930 printing) as encoded by First1KGreek
(CC BY-SA 4.0), one unit per verse, LXX numbering. gold.jsonl comes from scripts/gold.tsv.
"""
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'
SWETE = RAW / 'First1KGreek' / 'data' / 'tlg0527'
SBLGNT = RAW / 'SBLGNT' / 'data' / 'sblgnt' / 'text'
TEI = '{http://www.tei-c.org/ns/1.0}'

# First1KGreek work number -> USFM code. Daniel, Susanna and Bel are Theodotion's version, the
# one the New Testament quotes; the Old Greek is left out so each ref is unique. Ecclesiastes has
# no Greek file in First1KGreek; the Odes and Psalms of Solomon have no USFM book in the NT's
# Old Testament and are left out.
BOOKS = {
    'tlg001': 'GEN', 'tlg002': 'EXO', 'tlg003': 'LEV', 'tlg004': 'NUM', 'tlg005': 'DEU', 'tlg006': 'JOS', 'tlg008': 'JDG',
    'tlg010': 'RUT', 'tlg011': '1SA', 'tlg012': '2SA', 'tlg013': '1KI', 'tlg014': '2KI', 'tlg015': '1CH', 'tlg016': '2CH',
    'tlg017': '1ES', 'tlg018': 'EZR', 'tlg019': 'EST', 'tlg020': 'JDT', 'tlg021': 'TOB', 'tlg023': '1MA', 'tlg024': '2MA',
    'tlg025': '3MA', 'tlg026': '4MA', 'tlg027': 'PSA', 'tlg029': 'PRO', 'tlg031': 'SNG', 'tlg032': 'JOB', 'tlg033': 'WIS',
    'tlg034': 'SIR', 'tlg036': 'HOS', 'tlg037': 'AMO', 'tlg038': 'MIC', 'tlg039': 'JOL', 'tlg040': 'OBA', 'tlg041': 'JON',
    'tlg042': 'NAM', 'tlg043': 'HAB', 'tlg044': 'ZEP', 'tlg045': 'HAG', 'tlg046': 'ZEC', 'tlg047': 'MAL', 'tlg048': 'ISA',
    'tlg049': 'JER', 'tlg050': 'BAR', 'tlg051': 'LAM', 'tlg052': 'LJE', 'tlg053': 'EZK', 'tlg055': 'SUS', 'tlg057': 'DAN',
    'tlg059': 'BEL',
}

# SBLGNT file names -> USFM.
NT = {
    'Matt': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT', 'Rom': 'ROM', '1Cor': '1CO', '2Cor': '2CO',
    'Gal': 'GAL', 'Eph': 'EPH', 'Phil': 'PHP', 'Col': 'COL', '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI', '2Tim': '2TI',
    'Titus': 'TIT', 'Phlm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS', '1Pet': '1PE', '2Pet': '2PE', '1John': '1JN', '2John': '2JN',
    '3John': '3JN', 'Jude': 'JUD', 'Rev': 'REV',
}
NT_ORDER = list(NT)

# OCR in the Swete files sometimes types a Latin capital for a Greek one (ΜΑΚAPΙΟΣ). Inside a
# word that has Greek letters, map the look-alikes back.
LOOKALIKE = str.maketrans('ABEHIKMNOPTXYZo', 'ΑΒΕΗΙΚΜΝΟΡΤΧΥΖο')


def fix_lookalikes(text):
    return re.sub(r'\S+', lambda m: m.group(0).translate(LOOKALIKE) if re.search(r'[Ͱ-Ͽἀ-῿]', m.group(0)) else m.group(0), text)


def nfc(s):
    return unicodedata.normalize('NFC', ' '.join(s.split()))


def lxx():
    units, dup = [], 0
    for work, code in BOOKS.items():
        f = next((SWETE / work).glob('*grc*.xml'))
        root = ET.parse(f).getroot()
        for note in root.iter(f'{TEI}note'):
            note.clear()
        seen = set()
        for ch in root.iter(f'{TEI}div'):
            if ch.get('subtype') != 'chapter':
                continue
            for v in ch:
                if v.tag != f'{TEI}div' or v.get('subtype') != 'verse':
                    continue
                ref = f"{code}.{ch.get('n')}.{v.get('n')}"
                text = nfc(fix_lookalikes(''.join(v.itertext())))
                if not text:
                    continue
                if ref in seen:  # a verse printed twice (Joshua and Tobit give two codices)
                    dup += 1
                    continue
                seen.add(ref)
                units.append({'ref': ref, 'text': text})
    return units, dup


def nt():
    units = []
    for name in NT_ORDER:
        for line in (SBLGNT / f'{name}.txt').read_text().split('\n')[1:]:
            if '\t' not in line:
                continue
            loc, text = line.split('\t', 1)
            ch, vs = loc.split(' ')[-1].split(':')
            # Strip SBLGNT's variant markers.
            text = re.sub('[⸀-⸏]', '', text)
            units.append({'ref': f'{NT[name]}.{ch}.{vs}', 'text': nfc(text)})
    return units


def write(path, rows):
    with open(path, 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def gold(source, target):
    """scripts/gold.tsv: NT ref, LXX ref, note. Lines starting with # are comments."""
    path = HERE / 'scripts' / 'gold.tsv'
    if not path.exists():
        return [], []
    rows, bad = [], []
    for line in path.read_text().split('\n'):
        if not line.strip() or line.startswith('#'):
            continue
        s, t, *note = line.split('\t')
        row = {'source': s, 'target': t, **({'note': note[0]} if note and note[0] else {})}
        (rows if s in source and t in target else bad).append(row)
    return rows, bad


def main():
    target, dup = lxx()
    source = nt()
    links, bad = gold({u['ref'] for u in source}, {u['ref'] for u in target})
    write(HERE / 'source.jsonl', source)
    write(HERE / 'target.jsonl', target)
    write(HERE / 'gold.jsonl', links)
    print(f'{len(source)} NT verses, {len(target)} LXX verses ({dup} duplicate verses dropped), {len(links)} gold links, '
          f'{len(bad)} naming a verse not in the texts: {", ".join(b["source"] + ">" + b["target"] for b in bad)}')
    if '--show' in sys.argv:
        s = {u['ref']: u['text'] for u in source}
        t = {u['ref']: u['text'] for u in target}
        for g in links:
            print(f"{g['source']} -> {g['target']}  {g.get('note', '')}\n  {s[g['source']]}\n  {t[g['target']]}\n")


main()
