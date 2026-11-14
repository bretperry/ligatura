"""Build the Augustine-to-Vulgate fixtures from raw/.

    python3 -I scripts/build.py            # writes source.jsonl, target.jsonl, gold.jsonl
    python3 -I scripts/build.py --show     # also prints every gold link with its sentence

Also writes ../augustine-drc/target.jsonl and gold.jsonl (same gold, English target), since the
Douay-Rheims verses in the same dataset carry the same refs.

Source: Augustine, Confessiones, ed. Du Bois and Pusey (Oxford, 1838), Project Gutenberg #33849.
The edition marks each scripture quotation in italics with a sidenote, e.g.
"[Sidenote: Rom. 10, 14.]_Quomodo autem invocabunt..._". Each sidenote that holds only
references becomes gold links from the sentence where it stands. Sidenotes that open a chapter
(a Roman numeral and a summary, sometimes with references) are dropped: they don't say which
sentence they mean.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'
DRC = HERE.parent / 'augustine-drc'

# jam963/parallel-catholic-bible-versions book names -> USFM codes.
USFM = {
    'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU', 'Joshua': 'JOS',
    'Judges': 'JDG', 'Ruth': 'RUT', '1-Samuel': '1SA', '2-Samuel': '2SA', '1-Kings': '1KI', '2-Kings': '2KI',
    '1-Chronicles': '1CH', '2-Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Tobit': 'TOB', 'Judith': 'JDT',
    'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song2': 'SNG',
    'Wisdom': 'WIS', 'Sirach': 'SIR', 'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Baruch': 'BAR',
    'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
    'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC',
    'Malachi': 'MAL', '1-Maccabees': '1MA', '2-Maccabees': '2MA', 'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK',
    'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM', '1-Corinthians': '1CO', '2-Corinthians': '2CO', 'Galatians': 'GAL',
    'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1-Thessalonians': '1TH', '2-Thessalonians': '2TH',
    '1-Timothy': '1TI', '2-Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
    '1-Peter': '1PE', '2-Peter': '2PE', '1-John': '1JN', '2-John': '2JN', '3-John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV',
}

# The edition's abbreviations -> USFM. Psalms and Kings follow the Vulgate, as the dataset does
# (Ps. 144 is Hebrew 145; 2 Reg. is 2 Samuel, 3 Reg. is 1 Kings).
ABBR = {
    'Gen': 'GEN', 'Ex': 'EXO', 'Exod': 'EXO', 'Num': 'NUM', 'Deut': 'DEU', 'Jos': 'JOS', '1 Reg': '1SA', '2 Reg': '2SA',
    '3 Reg': '1KI', '4 Reg': '2KI', 'Tob': 'TOB', 'Job': 'JOB', 'Ps': 'PSA', 'Prov': 'PRO', 'Ecc': 'ECC', 'Eccl': 'ECC',
    'Cant': 'SNG', 'Sap': 'WIS', 'Eccli': 'SIR', 'Ecclus': 'SIR', 'Is': 'ISA', 'Isa': 'ISA', 'Jer': 'JER', 'Dan': 'DAN',
    'Hos': 'HOS', 'Joel': 'JOL', 'Mal': 'MAL', 'Mat': 'MAT', 'Matt': 'MAT', 'Marc': 'MRK', 'Luc': 'LUK', 'Joh': 'JHN',
    'Jo': 'JHN', 'Act': 'ACT', 'Rom': 'ROM', 'Ro': 'ROM', '1 Cor': '1CO', '2 Cor': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
    'Phil': 'PHP', 'Col': 'COL', '1 Thess': '1TH', '2 Thess': '2TH', '1 Tim': '1TI', '2 Tim': '2TI', 'Tit': 'TIT',
    'Heb': 'HEB', 'Jac': 'JAS', '1 Pet': '1PE', '2 Pet': '2PE', '1 Joh': '1JN', '1 John': '1JN', 'Apoc': 'REV', 'Rev': 'REV',
}

LIBRI = ['PRIMUS', 'SECUNDUS', 'TERTIUS', 'QUARTUS', 'QUINTUS', 'SEXTUS', 'SEPTIMUS', 'OCTAVUS', 'NONUS', 'DECIMUS',
         'UNDECIMUS', 'DUODECIMUS', 'DECIMUS TERTIUS']


def nfc(s):
    return unicodedata.normalize('NFC', s)


def bible():
    """Vulgate and Douay-Rheims verses, in canonical order, keyed by USFM ref."""
    la, en = [], []
    with open(RAW / 'parallel_bible_data.csv', newline='') as f:
        for r in csv.DictReader(f):
            ref = f"{USFM[r['book']]}.{r['chapter']}.{r['verse']}"
            if r['vulgate'].strip():
                la.append({'ref': ref, 'text': nfc(r['vulgate'].strip())})
            if r['drc'].strip():
                en.append({'ref': ref, 'text': nfc(r['drc'].strip())})
    return la, en


def parse_refs(note, prev):
    """'Ps. 21, 27. Mat. 7, 7.' -> [('PSA', 21, 27), ('MAT', 7, 7)]. 'ver. 23.' reuses the last
    book and chapter; 'Ib.' or 'Ibid.' repeats the last reference. A range keeps its first verse."""
    note = ' '.join(note.split())
    out = []
    pat = re.compile(r'(?:(?P<book>(?:[1-4] )?[A-Z][a-z]+)\.? ?(?P<ch>\d+), ?(?P<vs>\d+)|(?P<ver>[Vv]ers?\.) ?(?P<vs2>\d+)|(?P<ib>Ib(?:id)?\.|Id\.))')
    for m in pat.finditer(note):
        if m.group('book'):
            b = ABBR.get(m.group('book'))
            if not b:
                continue
            prev = (b, int(m.group('ch')), int(m.group('vs')))
        elif m.group('ver') and prev:
            prev = (prev[0], prev[1], int(m.group('vs2')))
        elif m.group('ib') and prev:
            pass
        else:
            continue
        out.append(prev)
    return out, prev


def sentences(par):
    # The splitter in src/lang/la.ts; a sidenote marker may stand before the capital.
    return re.split(r'(?<=[.;:?!])\s+(?=(?:\u27e6\d+\u27e7)?[A-ZÆŒ“"\'‘«])', par)


def confessions():
    lines = (RAW / 'pg33849-confessiones-la.txt').read_text().split('\n')
    start = next(i for i, l in enumerate(lines) if l == 'LIBER PRIMUS.')
    end = next(i for i, l in enumerate(lines) if i > start and l.startswith('       *       *') and 'Omnia de nihilo' in '\n'.join(lines[start:i]))
    text = '\n'.join(lines[start:end])
    # Book boundaries.
    parts = re.split(r'^LIBER ([A-Z ]+)\.$', text, flags=re.M)
    units, gold, kinds, prev = [], [], {}, None
    for name, body in zip(parts[1::2], parts[2::2]):
        book = LIBRI.index(name.strip()) + 1
        body = re.sub(r'^    .*$', '', body, flags=re.M)  # the indented book summary
        marks = []

        def mark(m):
            nonlocal prev
            note = m.group(1)
            if re.match(r'\s*[IVXL]+\.\s', note):
                return ' '  # chapter summary: no sentence to point at
            refs, prev = parse_refs(note, prev)
            if not refs:
                return ' '
            old_latin = bool(re.search(r'Sab(at)?(ier)?\.|[Vv]et\.', note))
            marks.append((refs, old_latin, ' '.join(note.split())))
            return f' ⟦{len(marks) - 1}⟧'
        body = re.sub(r'\[Sidenote:(.*?)\]', mark, body, flags=re.S)
        body = re.sub(r'\[\d+\]|\{\d+\}|\*|_', '', body)
        section, k = 0, 0
        for par in re.split(r'\n\s*\n', body):
            par = ' '.join(par.split())
            if not par:
                continue
            m = re.match(r'(\d+)\. (.*)', par)
            if m:
                section, k, par = int(m.group(1)), 0, m.group(2)
            for s in sentences(par):
                ids = [int(x) for x in re.findall(r'⟦(\d+)⟧', s)]
                clean = ' '.join(re.sub(r'⟦\d+⟧', ' ', s).split())
                clean = re.sub(r' ([,.;:?!])', r'\1', clean)
                if not clean:
                    continue
                k += 1
                ref = f'{book}.{section}.{k}'
                units.append({'ref': ref, 'text': clean})
                for i in ids:
                    refs, old_latin, note = marks[i]
                    for b, c, v in refs:
                        gold.append({'source': ref, 'target': f'{b}.{c}.{v}', 'note': note, **({'kind': 'old-latin'} if old_latin else {})})
    return units, gold


# The dataset numbers Sirach's prologue as chapter 1, so its Sir. 19:1 is SIR.20.1.
SIRACH_SHIFT = 1

# Sidenotes whose verse is wrong, checked by hand: the sentence quotes the corrected verse
# word for word. Most are Pusey giving a Hebrew Psalm number or a misprinted verse.
# Ranges ("Prov. 9, 13-17"), faint echoes and sidenotes set beside the wrong sentence are left alone.
CORRECTIONS = {
    ('1.6.4', 'PSA.115.10'): 'PSA.115.1',     # Credidi, propter quod locutus sum (Heb. 116:10)
    ('10.1.3', 'PSA.115.10'): 'PSA.115.1',    # same verse
    ('12.2.3', 'PSA.113.16'): 'PSA.113.24',   # Caelum caeli Domino (Heb. 115:16)
    ('12.8.1', 'PSA.113.15'): 'PSA.113.24',
    ('12.30.4', 'PSA.113.16'): 'PSA.113.24',
    ('11.3.6', 'PSA.130.1'): 'PSA.129.1',     # De profundis (Heb. 130:1)
    ('10.59.10', 'PSA.10.3'): 'PSA.9.24',     # laudatur peccator in desideriis animae suae (Heb. 10:3)
    ('10.50.7', 'PSA.77.10'): 'PSA.76.11',    # Heb. 77:10
    ('9.2.4', 'PSA.129.3'): 'PSA.119.4',      # sagittae acutae, carbones desolatorii
    ('5.23.8', 'PSA.118.115'): 'PSA.118.155', # longe a peccatoribus salus
    ('10.5.10', 'PSA.50.1'): 'PSA.50.3',      # Miserere mei secundum magnam misericordiam
    ('11.32.6', 'PSA.17.25'): 'PSA.17.29',    # illuminas lucernam meam
    ('13.3.4', 'PSA.72.18'): 'PSA.72.28',     # adhaerere Deo bonum est
    ('13.22.4', 'PSA.64.2'): 'PSA.64.12',     # coronae anni
    ('13.18.12', 'SNG.1.6'): 'SNG.1.4',       # curremus in odorem
    ('7.13.1', 'JAS.2.6'): 'JAS.4.6',         # superbis resistit, humilibus autem dat gratiam
    ('9.34.2', 'MAT.12.3'): 'MAT.12.36',      # omne verbum otiosum
    ('10.25.1', 'GEN.3.7'): 'GEN.3.17',       # in laboribus comedes ex ea
    ('10.67.12', 'ROM.6.20'): 'ROM.6.23',     # stipendia peccati mors
    ('13.22.4', 'ROM.13.1'): 'ROM.13.11',     # propior est nostra salus
    ('13.31.6', 'ECC.3.19'): 'SIR.3.19',      # "Eccl." here is Ecclesiasticus: in mansuetudine opera tua perfice
}


def correct(g):
    t = CORRECTIONS.get((g['source'], g['target']), g['target'])
    b, c, v = t.split('.')
    if b == 'ECC' and int(c) > 12:
        b = 'SIR'  # Ecclesiastes has 12 chapters: "Ecc. 18, 30" is Ecclesiasticus.
    if b == 'PSA' and c == '115' and int(v) > 10:
        v = str(int(v) - 9)  # Vulgate Ps. 115 is Hebrew 116:10-19; "Ps. 115, 16" is Heb. 116:16.
    t = f'{b}.{c}.{v}'
    if b == 'SIR':
        t = f'{b}.{int(c) + SIRACH_SHIFT}.{v}'
    if t != g['target']:
        g = {**g, 'target': t, 'fixed': True}
    return g


def write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def main():
    la, en = bible()
    units, gold = confessions()
    # One gold row per (sentence, verse).
    seen, uniq = set(), []
    for g in map(correct, gold):
        if (g['source'], g['target']) not in seen:
            seen.add((g['source'], g['target']))
            uniq.append(g)
    refs_la = {u['ref'] for u in la}
    missing = [g for g in uniq if g['target'] not in refs_la]
    write(HERE / 'source.jsonl', units)
    write(HERE / 'target.jsonl', la)
    write(HERE / 'gold.jsonl', uniq)
    write(DRC / 'source.jsonl', units)
    write(DRC / 'target.jsonl', en)
    write(DRC / 'gold.jsonl', uniq)
    print(f'{len(units)} sentences, {len(la)} Vulgate verses, {len(en)} Douay-Rheims verses, {len(uniq)} gold links '
          f'({sum(1 for g in uniq if g.get("kind"))} old-latin), {len(missing)} with no such verse: '
          f'{", ".join(g["target"] for g in missing)}')
    if '--show' in sys.argv:
        text = {u['ref']: u['text'] for u in units}
        verse = {u['ref']: u['text'] for u in la}
        for g in uniq:
            print(f"{g['source']} -> {g['target']}  [{g['note']}]\n  {text[g['source']]}\n  {verse.get(g['target'], '(missing)')}\n")


main()
