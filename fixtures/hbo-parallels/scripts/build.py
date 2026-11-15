"""Build the Hebrew Bible parallel-passages fixture from raw/.

    scripts/fetch.sh               # clones the Open Scriptures Hebrew Bible into raw/
    python3 -I scripts/build.py    # writes source.jsonl, target.jsonl, gold.jsonl

Text: Open Scriptures Hebrew Bible, from the Westminster Leningrad Codex (public domain); the
encoding is CC BY 4.0. Pointed text with cantillation, kept as the codex has it: maqaf joins
words, sof pasuq ends a verse. One unit per verse, ref BOOK.chapter.verse (USFM codes), Hebrew
versification. source.jsonl is Chronicles, Isaiah, Obadiah and Deuteronomy; target.jsonl is
Genesis, Exodus, Samuel, Kings, Psalms, Jeremiah and Ezra. gold.jsonl expands scripts/gold.tsv.
"""
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
WLC = HERE / 'raw' / 'morphhb' / 'wlc'
NS = '{http://www.bibletechnologies.net/2003/OSIS/namespace}'

# File name -> (USFM code, osisID prefix).
SOURCE = {'1Chr': '1CH', '2Chr': '2CH', 'Isa': 'ISA', 'Obad': 'OBA', 'Deut': 'DEU'}
TARGET = {'Gen': 'GEN', 'Exod': 'EXO', '1Sam': '1SA', '2Sam': '2SA', '1Kgs': '1KI', '2Kgs': '2KI', 'Ps': 'PSA', 'Jer': 'JER', 'Ezra': 'EZR'}
OSIS_BOOK = {'1Chr': '1Chr', '2Chr': '2Chr', 'Isa': 'Isa', 'Obad': 'Obad', 'Deut': 'Deut', 'Gen': 'Gen', 'Exod': 'Exod', '1Sam': '1Sam', '2Sam': '2Sam',
             '1Kgs': '1Kgs', '2Kgs': '2Kgs', 'Ps': 'Ps', 'Jer': 'Jer', 'Ezra': 'Ezra'}


def verse_text(v):
    """Words, maqaf and sof pasuq of one verse. '/' marks morpheme breaks in the encoding."""
    out = []
    for el in v:
        tag = el.tag.replace(NS, '')
        if tag == 'w':
            out.append(('w', ''.join(el.itertext()).replace('/', '')))
        elif tag == 'seg':
            kind = el.get('type')
            if kind == 'x-maqqef':
                out.append(('m', '־'))
            elif kind == 'x-sof-pasuq':
                out.append(('s', '׃'))
            elif kind == 'x-paseq':
                out.append(('p', '׀'))
    s = ''
    for kind, t in out:
        if kind in ('m', 's'):
            s += t
        else:
            s += ('' if s.endswith('־') or not s else ' ') + t
    return unicodedata.normalize('NFC', ' '.join(s.split()))


def read(books):
    units = {}
    for name, usfm in books.items():
        root = ET.parse(WLC / f'{name}.xml').getroot()
        for v in root.iter(f'{NS}verse'):
            ref = v.get('osisID')
            if ref is None or '-' in ref or ' ' in ref:
                continue
            _, ch, vs = ref.split('.')
            text = verse_text(v)
            if text:
                units[f'{usfm}.{ch}.{vs}'] = text
    return units


def expand(spec):
    m = re.fullmatch(r'(\w+)\.(\d+)\.(\d+)(?:-(\d+))?', spec)
    book, ch, a, b = m.group(1), m.group(2), int(m.group(3)), int(m.group(4) or m.group(3))
    return [f'{book}.{ch}.{i}' for i in range(a, b + 1)]


def main():
    source, target = read(SOURCE), read(TARGET)
    gold, missing = [], []
    for line in (HERE / 'scripts' / 'gold.tsv').read_text(encoding='utf8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        s, t, *note = line.split('\t')
        ss, tt = expand(s), expand(t)
        if len(ss) != len(tt):
            sys.exit(f'unequal ranges: {line}')
        for a, b in zip(ss, tt):
            if a in source and b in target:
                gold.append({'source': a, 'target': b, 'note': (note[0] if note else '')})
            else:
                missing.append((a, b))
    for name, rows in (('source', source), ('target', target)):
        with open(HERE / f'{name}.jsonl', 'w', encoding='utf8') as f:
            for ref, text in rows.items():
                f.write(json.dumps({'ref': ref, 'text': text}, ensure_ascii=False) + '\n')
    with open(HERE / 'gold.jsonl', 'w', encoding='utf8') as f:
        for g in gold:
            f.write(json.dumps(g, ensure_ascii=False) + '\n')
    print(f'{len(source)} source, {len(target)} target, {len(gold)} gold ({len({g["source"] for g in gold})} source verses); {len(missing)} gold rows missing a verse: {missing}')


if __name__ == '__main__':
    main()
