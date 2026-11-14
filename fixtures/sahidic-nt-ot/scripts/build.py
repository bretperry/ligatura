"""Build the Sahidic-NT-quotes-Sahidic-OT fixture from raw/.

    scripts/fetch.sh                      # clones Coptic Scriptorium's Sahidic NT and OT into raw/
    python3 -I scripts/build.py           # writes source.jsonl, target.jsonl, gold.jsonl
    python3 -I scripts/build.py --show    # also prints every gold link with both verses

source.jsonl: the Sahidic New Testament (the sahidica.nt, sahidica.mark and sahidica.1corinthians corpora) (Sahidica, J Warren Wells; "for academic use only", so
this file is git-ignored and rebuilt, not shipped), one unit per verse.
target.jsonl: the Sahidic Old Testament (CoptOT / Crosswire, CC BY-SA 4.0, via Coptic
Scriptorium), one unit per verse. gold.jsonl comes from scripts/gold.tsv, the Swete tables
used by fixtures/lxx-nt (the Sahidic OT follows the Septuagint, so the references carry over).
"""
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'

NT_CODES = ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH',
            '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV']
# Coptic Scriptorium's file number -> USFM.
OT_CODES = {
    1: 'GEN', 2: 'EXO', 3: 'LEV', 4: 'NUM', 5: 'DEU', 6: 'JOS', 7: 'JDG', 8: 'RUT', 9: '1SA', 10: '2SA', 11: '1KI',
    12: '2KI', 13: '1CH', 14: '2CH', 17: 'EST', 18: 'JOB', 19: 'PSA', 20: 'PRO', 21: 'ECC', 22: 'SNG', 23: 'ISA',
    24: 'JER', 25: 'LAM', 26: 'EZK', 27: 'DAN', 28: 'HOS', 29: 'JOL', 30: 'AMO', 31: 'OBA', 32: 'JON', 33: 'MIC',
    34: 'NAM', 35: 'HAB', 36: 'ZEP', 37: 'HAG', 38: 'ZEC', 67: 'TOB', 68: 'JDT', 70: 'WIS', 71: 'SIR', 72: 'BAR',
    73: 'LJE', 75: 'SUS', 76: 'BEL', 78: '2MA',
}


def units(folder, code_of):
    """One {ref, text} per verse. A verse is the bound groups (norm_group) between its <verse_n> tags."""
    out, seen = [], set()
    for f in sorted((RAW / folder).glob('*.tt')):
        m = re.match(r'(?:(\d+)_)?.*_(\d+)\.tt$', f.name)
        if not m:
            continue
        code = code_of(int(m.group(1)) if m.group(1) else None)
        if not code:
            continue
        chapter = int(m.group(2))
        verse, words = None, []

        def flush():
            if verse is not None and words:
                ref = f'{code}.{chapter}.{verse}'
                if ref not in seen:
                    seen.add(ref)
                    out.append({'ref': ref, 'text': unicodedata.normalize('NFC', ' '.join(words))})

        for line in f.read_text().split('\n'):
            v = re.match(r'<verse_n [^>]*?\bverse_n="([^"]+)"', line)
            if v:
                flush()
                verse, words = v.group(1), []
                continue
            g = re.match(r'<norm_group (?:orig_group|norm_group)="([^"]*)"', line)
            if g and verse is not None:
                words.append(html.unescape(g.group(1)))
        flush()
    return out


def write(path, rows):
    with open(path, 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def gold(source, target):
    rows, bad = [], []
    for line in (HERE / 'scripts' / 'gold.tsv').read_text().split('\n'):
        if not line.strip() or line.startswith('#'):
            continue
        s, t, *note = line.split('\t')
        row = {'source': s, 'target': t, **({'note': note[0]} if note and note[0] else {})}
        (rows if s in source and t in target else bad).append(row)
    return rows, bad


def main():
    source = units('nt', lambda n: NT_CODES[n - 40] if 40 <= n <= 66 else None)
    # Mark and 1 Corinthians are separate, hand-checked corpora; the combined NT lacks them.
    # Where both have a verse, the hand-checked corpus wins.
    extra = units('mk', lambda n: 'MRK') + units('co', lambda n: '1CO')
    replaced = {u['ref'] for u in extra}
    source = [u for u in source if u['ref'] not in replaced] + extra
    target = units('ot', OT_CODES.get)
    links, bad = gold({u['ref'] for u in source}, {u['ref'] for u in target})
    write(HERE / 'source.jsonl', source)
    write(HERE / 'target.jsonl', target)
    write(HERE / 'gold.jsonl', links)
    print(f'{len(source)} NT verses, {len(target)} OT verses, {len(links)} gold links, '
          f'{len(bad)} naming a verse not in the texts')
    if '--show' in sys.argv:
        s = {u['ref']: u['text'] for u in source}
        t = {u['ref']: u['text'] for u in target}
        for g in links:
            print(f"{g['source']} -> {g['target']}  {g.get('note', '')}\n  {s[g['source']]}\n  {t[g['target']]}\n")


main()
