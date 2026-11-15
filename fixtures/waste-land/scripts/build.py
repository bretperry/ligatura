"""Builds source.jsonl, target.jsonl, target-en.jsonl and gold.jsonl from raw/.

Run from anywhere:  python3 -I scripts/build.py
Reads only files under raw/ (downloaded by scripts/fetch.sh). Writes the four .jsonl files
next to README.md and prints per-work counts plus each gold link with its target text.
"""
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'
TEI = '{http://www.tei-c.org/ns/1.0}'


def read(name):
    return (RAW / name).read_text(encoding='utf-8', errors='replace').replace('\r\n', '\n')


def lines(name):
    return read(name).split('\n')


def ws(s):
    return re.sub(r'\s+', ' ', s).strip()


def clean(s):
    """Drop Gutenberg italics marks and footnote markers, normalise spaces."""
    s = s.replace('_', '')
    s = re.sub(r'\[\d+\]', '', s)
    s = re.sub(r'\[\*+\]', '', s)
    return ws(s)


def pg_body(name):
    L = lines(name)
    a = next(i for i, l in enumerate(L) if '*** START OF' in l)
    b = next(i for i, l in enumerate(L) if '*** END OF' in l)
    return L[a + 1:b]


ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}


def roman(s):
    s = s.upper()
    total = 0
    for i, c in enumerate(s):
        v = ROMAN[c]
        if i + 1 < len(s) and ROMAN[s[i + 1]] > v:
            total -= v
        else:
            total += v
    return total


# ---------------------------------------------------------------- source: The Waste Land

def waste_land():
    L = lines('pg1321-wasteland.txt')
    start = next(i for i, l in enumerate(L) if l.strip() == 'I. THE BURIAL OF THE DEAD' and i > 50)
    end = next(i for i, l in enumerate(L) if 'NOTES ON' in l and i > start)
    raw = []
    for l in L[start:end]:
        if not l.strip() or re.match(r'\s+[IV]+\. [A-Z ]+$', l):
            continue
        if l.strip().startswith('Line 4'):  # transcriber's errata, not verse
            continue
        printed = re.search(r'\s{3,}(\d+)\s*$', l)
        text = re.sub(r'\s{3,}\d+\s*$', '', l)
        raw.append((clean(text), int(printed.group(1)) if printed else None))
    # The 1922 numbering gives 10 numbers to the 11 lines between printed 350 and 360. The
    # notes key "Who is the third..." / "When I count..." as 360, so those two lines share WL.360.
    units = []
    n = 0
    i = 0
    while i < len(raw):
        text, printed = raw[i]
        if text.startswith('Who is the third who walks always beside you?'):
            nxt, nprinted = raw[i + 1]
            n += 1
            units.append((n, text + ' / ' + nxt))
            assert nprinted == n, (n, nprinted)
            i += 2
            continue
        n += 1
        if printed is not None:
            assert printed == n, (text, printed, n)
        units.append((n, text))
        i += 1
    assert n == 433, n
    return [{'ref': f'WL.{k}', 'text': t} for k, t in units]


# ---------------------------------------------------------------- Dante

def dante_it():
    L = lines('pg1012-commedia-it.txt')
    out = OrderedDict()
    cur = None
    for l in L:
        m = re.match(r'\s+(Inferno|Purgatorio|Paradiso) • Canto ([IVXLC]+)\s*$', l)
        if m:
            if m.group(1) == 'Paradiso':
                break
            cur = ('Inf' if m.group(1) == 'Inferno' else 'Purg', roman(m.group(2)))
            out[cur] = []
            continue
        if '*** END OF' in l:
            break
        if cur and l.strip() and l.strip() not in ('PURGATORIO', 'PARADISO'):
            out[cur].append(clean(l))
    return out


def dante_en():
    out = OrderedDict()
    for f, part, short in (('pg1001-longfellow-inferno.txt', 'Inferno', 'Inf'),
                           ('pg1002-longfellow-purgatorio.txt', 'Purgatorio', 'Purg')):
        cur = None
        for l in pg_body(f):
            m = re.match(rf'{part}: Canto ([IVXLC]+)\s*$', l.strip())
            if m:
                cur = (short, roman(m.group(1)))
                out[cur] = []
                note = False
                continue
            if l.startswith('* '):  # Longfellow's footnote translation of the Provençal (Purg. 26)
                note = True
            if cur and l.strip() and not note:
                out[cur].append(clean(l.replace('*', '')))
    return out


# ---------------------------------------------------------------- Bible (KJV)

def kjv():
    L = pg_body('pg10-kjv.txt')
    heads = {'The Book of the Prophet Ezekiel': 'Ezek', 'Ecclesiastes': 'Eccl',
             'The Gospel According to Saint Luke': 'Luke'}
    allheads = [i for i, l in enumerate(L) if i > 200 and re.match(r'^[A-Z][A-Za-z ]+$', l)
                and any(re.match(r'^1:1 ', x) for x in L[i + 1:i + 8])]
    allheads = [i for i in allheads if not (L[i].strip() in ('or', 'The Preacher'))]
    units = []
    for i in allheads:
        name = L[i].strip()
        if name not in heads:
            continue
        j = next(k for k in allheads if k > i) if any(k > i for k in allheads) else len(L)
        text = ws(' '.join(L[i + 1:j]))
        parts = re.split(r'(?:(?<=\s)|^)(\d+):(\d+) ', text)
        top = 0
        for k in range(1, len(parts) - 2, 3):
            ch = int(parts[k])
            if ch < top:  # ran into the next book
                break
            top = ch
            parts[k + 2] = re.sub(r'\s+[A-Z][A-Za-z ]+$', '', parts[k + 2]) if k + 3 < len(parts) and int(parts[k + 3]) < ch else parts[k + 2]
            units.append({'ref': f'KJV.{heads[name]}.{parts[k]}.{parts[k + 1]}', 'text': ws(parts[k + 2]), 'lang': 'en'})
    return units


# ---------------------------------------------------------------- Milton

def paradise_lost():
    L = pg_body('pg26-paradise-lost.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'Book IV')
    b = next(i for i, l in enumerate(L) if l.strip() == 'Book V')
    verse = [clean(l) for l in L[a + 1:b] if l.strip()]
    return [{'ref': f'PL.4.{n}', 'text': t, 'lang': 'en'} for n, t in enumerate(verse, 1)]


# ---------------------------------------------------------------- Shakespeare

def tempest():
    """Cambridge edition (PG 23042). Globe line numbers are printed every five lines."""
    L = pg_body('pg23042-tempest-cambridge.txt')
    act = scene = None
    blocks = OrderedDict()  # (act, scene) -> list of (text, printed)
    in_notes = False
    for l in L:
        s = l.strip()
        if s.startswith('EPILOGUE') and not l.startswith(' '):
            break  # the Epilogue, then the editors' notes
        m = re.match(r'^ACT ([IVX]+)\.$', s)
        if m:
            act = roman(m.group(1)); in_notes = False
            continue
        m = re.match(r'^SCENE ([IVX]+)\. ', s)
        if m and act and not l.startswith(' '):
            scene = roman(m.group(1)); blocks[(act, scene)] = []; in_notes = False
            continue
        if re.match(r'^\s*\d+(-\d+)?: ', l) or s.startswith('[Footnote') or re.match(r'^NOTES|^Notes:', s):
            in_notes = True
            continue
            in_notes = True
        if not s:
            continue
        if act is None or scene is None:
            continue
        if re.match(r'^\s*\d+(-\d+)?: ', l):
            continue
        if in_notes and not re.match(r'^_[A-Z][a-z]+\._', s) and not re.search(r'\s{5,}\d+$', l):
            # collation notes run until the next speech; verse lines resume with a speaker or number
            if not re.match(r'^[A-Z][a-z]', s):
                continue
        if s.startswith('[') or re.match(r'^_[A-Z ]+[a-z ,.]*_\.?$', s) or re.match(r'^_?(Enter|Exit|Exeunt|Re-enter)', s):
            continue
        if re.match(r'^_[A-Z][A-Z ,]+(sings|singing)?[^_]*\._$', s):
            continue
        if re.search(r'\b(Theobald|Capell|Pope|Rowe|Hanmer|Warburton|Steevens|Malone|Collier|Dyce|Staunton|F\d|Q\d)\b|\bFf\.|\.\.\.\]', s):
            continue  # collation notes printed under the text
        printed = re.search(r'\s{5,}(\d+)\s*$', l)
        text = re.sub(r'\s{5,}\d+\s*$', '', l)
        text = re.sub(r'^\s*_[A-Z][A-Za-z]*\._\s*', '', text)          # speaker prefix
        text = re.sub(r'^\s*_[A-Z][a-z]+_ \[[^\]]*\]\.\s*', '', text)
        text = re.sub(r'\[_[^\]]*\]', '', text)
        text = clean(text)
        if text:
            blocks[(act, scene)].append((text, int(printed.group(1)) if printed else None))
            in_notes = False
    units = []
    for (a, sc), rows in blocks.items():
        units += number_by_anchors(f'Tempest.{a}.{sc}', rows)
    return units


def number_by_anchors(prefix, rows):
    """Give each physical line a Globe number, using printed numbers as anchors. Where a stretch
    has more physical lines than numbers (split half-lines, songs), the shortest lines are joined
    to the line before them."""
    out = []
    seg = []
    last = 0
    for text, printed in rows:
        seg.append(text)
        if printed is not None:
            need = printed - last
            while len(seg) > need and len(seg) > 1:
                k = min(range(1, len(seg)), key=lambda j: len(seg[j]))
                seg[k - 1] = seg[k - 1] + ' / ' + seg[k]
                del seg[k]
            start = printed - len(seg) + 1
            for j, t in enumerate(seg):
                out.append({'ref': f'{prefix}.{start + j}', 'text': t, 'lang': 'en'})
            last = printed
            seg = []
    for j, t in enumerate(seg):
        out.append({'ref': f'{prefix}.{last + 1 + j}', 'text': t, 'lang': 'en'})
    return out


def play(lines_, prefix, act_re, scene_re, speaker_re, skip_re=None, lang='en', start=None, stop=None):
    """Generic play parser: one unit per printed line, counted within each scene."""
    units = []
    act = scene = None
    n = 0
    seen = set()
    for i, l in enumerate(lines_):
        if start is not None and i < start:
            continue
        if stop is not None and i >= stop:
            break
        s = l.strip()
        m = act_re.search(s) if act_re else None
        if m:
            act = roman(m.group(1)) if not m.group(1).isdigit() else int(m.group(1))
            scene = None
            n = 0
            m2 = scene_re.search(s)
            if m2:
                scene = roman(m2.group(1)) if not m2.group(1).isdigit() else int(m2.group(1))
            continue
        m = scene_re.search(s)
        if m and act is not None:
            scene = roman(m.group(1)) if not m.group(1).isdigit() else int(m.group(1))
            n = 0
            continue
        if act is None or scene is None or not s:
            continue
        if skip_re and skip_re.search(s):
            continue
        text = speaker_re.sub('', s) if speaker_re else s
        text = re.sub(r'\[[^\]]*\]?', '', text)
        text = clean(text)
        if not text or not re.search(r'[A-Za-z]', text):
            continue
        n += 1
        ref = f'{prefix}.{act}.{scene}.{n}'
        assert ref not in seen, ref
        seen.add(ref)
        units.append({'ref': ref, 'text': text, 'lang': lang})
    return units


def antony():
    L = pg_body('pg1796-antony.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'ACT I. SCENE I.')
    b = next(i for i, l in enumerate(L) if i > a and l.strip() == 'THE END')
    return play(L, 'Antony', re.compile(r'^ACT ([IVX]+)\.'), re.compile(r'SCENE ([IVX]+)\.'),
                re.compile(r'^[A-Z][A-Z ]+\.\s*'), skip_re=re.compile(r'^(Enter|Exit|Exeunt|Re-enter|Flourish|Sennet|Alarum|Trumpets?|Music|Dies|Dying)\b|^<<|^SCENE:'),
                start=a, stop=b)


# ---------------------------------------------------------------- Spenser, Marvell

def spenser():
    L = pg_body('pg10602-spenser-v5.txt')
    units = []
    for name, short, nxt in (('EPITHALAMION.', 'Epith', 'PROTHALAMION:'), ('PROTHALAMION:', 'Proth', 'FOWRE HYMNES')):
        idx = [i for i, l in enumerate(L) if l.strip() == name]
        a = idx[-1]
        if short == 'Proth':
            a = next(i for i in range(a, len(L)) if L[i].strip() == 'A SPOUSALL VERSE.')
        b = next(i for i in range(a + 1, len(L)) if L[i].strip() == nxt)
        n = 0
        for l in L[a + 1:b]:
            s = l.strip()
            if not s or s.startswith('[') or s.isupper():
                continue
            text = clean(re.sub(r'\s{4,}\d+\s*$', '', l).replace('*', ''))
            if not text:
                continue
            n += 1
            units.append({'ref': f'{short}.{n}', 'text': text, 'lang': 'en'})
    return units


def obev(first=340, last=380):
    L = pg_body('pg66619-oxford-verse.txt')
    units = []
    poem = None
    n = 0
    done = set()
    for l in L:
        m = re.match(r'^_(\d+)\._', l.strip())
        if m:
            k = int(m.group(1))
            poem = k if first <= k <= last and k not in done else None
            done.add(k)
            n = 0
            if k > last:
                break
            continue
        if poem is None or not l.strip():
            continue
        if not l.startswith('    '):  # titles, author headings
            continue
        text = clean(re.sub(r'\s{4,}\d+\s*$', '', l))
        if not text or re.match(r'^[A-Z .]+$', text):
            continue
        n += 1
        units.append({'ref': f'OBEV.{poem}.{n}', 'text': text, 'lang': 'en'})
    return units


# ---------------------------------------------------------------- Webster, Middleton, Kyd, Day

SPEAKER_ABBR = re.compile(r'^[A-Z][A-Za-z]{1,10}\.\s+')


def white_devil():
    L = pg_body('pg12915-white-devil.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'ACT I')
    stop = next((i for i in range(a, len(L)) if re.match(r'^\s*(FINIS|THE END|NOTES)\b', L[i])), len(L))
    return play(L, 'WhiteDevil', re.compile(r'^ACT ([IVX]+)$'), re.compile(r'^SCENE ([IVX]+)$'),
                SPEAKER_ABBR, skip_re=re.compile(r'^\[|^(Enter|Exit|Exeunt)\b'), start=a, stop=stop)


def devils_law_case():
    L = [l.replace('ſ', 's') for l in lines('ia-webster-dyce-v2.txt')]
    a = next(i for i, l in enumerate(L) if re.match(r'^ACT I\.— SCENE I\.', ws(l)))
    stop = next(i for i in range(a, len(L)) if ws(L[i]) == 'APPIUS AND VIRGINIA.')
    units = []
    act = scene = None
    n = 0
    footnote = False
    for l in L[a:stop]:
        s = ws(l)
        m = re.match(r'^ACT ([IVXivx]+)\.?—\s*SCENE ([IVXT]+)\.', s)
        if m:
            act = roman(m.group(1)); scene = roman(m.group(2).replace('T', 'I')); n = 0
            continue
        m = re.match(r'^SCENE ([IVXT]+)\.$', s)
        if m:
            scene = roman(m.group(1).replace('T', 'I')); n = 0
            continue
        if not s:
            footnote = False
            continue
        if re.match(r'^[\*†‡§]|^\d+\s|^[a-z]\s', s):  # footnotes ("* ..."), page headers ("10 THE ...")
            footnote = True
            continue
        if footnote or re.search(r"DEVIL'S\s+LAW-CASE", s, re.I) or re.match(r'^\d+$', s):
            continue
        if re.match(r'^(Enter|Exit|Exeunt|Re-enter)\b', s) or s.startswith('['):
            continue
        text = re.sub(r'^(First |Second |Third )?[A-Z][A-Za-z]{1,10}\.\s+', '', s)
        text = text.strip()
        if act is None or scene is None or len(re.findall(r'[A-Za-z]', text)) < 3:
            continue
        n += 1
        units.append({'ref': f'DevilsLaw.{act}.{scene}.{n}', 'text': text, 'lang': 'en'})
    return units


def women_beware():
    L = pg_body('pg75606-middleton.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'ACT I. SCENE I.' and i > 15000)
    b = next(i for i in range(a, len(L)) if '46 St. Martin' in L[i])
    units = []
    act = scene = None
    n = 0
    for l in L[a:b]:
        s = l.strip()
        m = re.match(r'^ACT ([IVX]+)\. SCENE ([IVX]+)\.$', s)
        if m:
            act, scene, n = roman(m.group(1)), roman(m.group(2)), 0
            continue
        m = re.match(r'^SCENE ([IVX]+)\.$', s)
        if m:
            scene, n = roman(m.group(1)), 0
            continue
        if not s or s.startswith('[') or s.startswith('_') or re.match(r'^(Enter|Exit|Exeunt)\b', s):
            continue
        if re.match(r'^\d+ ', s) or s.startswith('{'):
            continue
        text = clean(re.sub(r'^[A-Z][A-Z ]*\.\s*', '', s))
        if not text or not re.search(r'[a-z]', text):
            continue
        n += 1
        units.append({'ref': f'WomenBeware.{act}.{scene}.{n}', 'text': text, 'lang': 'en'})
    return units


def spanish_tragedy():
    L = pg_body('pg35330-spanish-tragedy.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'ACTVS PRIMVS.')
    b = next((i for i in range(a, len(L)) if re.match(r'^\s*(FINIS|THE END)', L[i])), len(L))
    units = []
    act = 1
    scene = 0  # induction
    n = 0
    for l in L[a + 1:b]:
        s = l.strip()
        m = re.match(r'^\[ACT ([IV]+)\.\s+S(?:CENE|cene) (\d+)\.\]', s)
        if m:
            act, scene, n = roman(m.group(1)), int(m.group(2)), 0
            continue
        if re.match(r'^ACTUS ', s):
            continue
        if not s or s.startswith('[') or s.startswith('_') or re.match(r'^(Enter|Exit|Exeunt)\b', s):
            continue
        text = clean(re.sub(r'^[A-Z][A-Z]+\.\s*', '', s))
        if not text or not re.search(r'[a-z]', text):
            continue
        n += 1
        units.append({'ref': f'SpanishTragedy.{act}.{scene}.{n}', 'text': text, 'lang': 'en'})
    return units


def parliament_of_bees():
    L = [l.replace('ſ', 's') for l in lines('ia-day-bees.txt')]
    units = []
    for l in L:
        s = ws(l)
        words = re.findall(r"[A-Za-z']+", s)
        if len(words) < 4:
            continue
        letters = len(re.findall(r'[A-Za-z]', s))
        if letters < 0.7 * len(s.replace(' ', '')):
            continue
        units.append(s)
    return [{'ref': f'ParliamentBees.{i}', 'text': t, 'lang': 'en'} for i, t in enumerate(units, 1)]


# ---------------------------------------------------------------- Goldsmith, Froude

def vicar():
    L = pg_body('pg2667-vicar.txt')
    heads = [i for i, l in enumerate(L) if re.match(r'^CHAPTER ([IVXL]+)\.?$', l.strip())]
    heads = [h for h in heads if h > 100]
    units = []
    for k, h in enumerate(heads):
        ch = roman(re.match(r'^CHAPTER ([IVXL]+)', L[h].strip()).group(1))
        end = heads[k + 1] if k + 1 < len(heads) else len(L)
        paras = []
        buf = []
        for l in L[h + 1:end] + ['']:
            if l.strip():
                buf.append(l)
            elif buf:
                paras.append(clean(' '.join(buf)))
                buf = []
        paras = [p for p in paras if p and not (p.isupper() and len(p) < 120)]
        for n, p in enumerate(paras, 1):
            units.append({'ref': f'Vicar.{ch}.{n}', 'text': p, 'lang': 'en'})
    return units


def froude():
    L = lines('froude/bub_gb_JDcNVRMV7xsC.txt')
    a = next(i for i, l in enumerate(L) if ws(l) == 'CHAPTER IV.' and i > 10000)
    b = next(i for i in range(a + 1, len(L)) if re.match(r'^CHAPTE[ER] V\.', ws(L[i])))  # OCR reads "CHAPTEE"
    paras = []
    buf = []
    for l in L[a + 1:b] + ['']:
        s = ws(l)
        if not s:
            if buf:
                paras.append(' '.join(buf)); buf = []
            continue
        if re.match(r'^\d+$', s) or re.search(r'REIGN OF ELIZABETH|^Ch\.?\s*IV|^CHAP|Digitized by', s):
            continue
        buf.append(s)
    out = []
    for p in paras:
        p = re.sub(r'(\w)- (\w)', r'\1\2', p)
        if len(re.findall(r'[a-z]', p)) < 40:
            continue
        out.append(p)
    return [{'ref': f'Froude.Eliz1.4.{n}', 'text': t, 'lang': 'en'} for n, t in enumerate(out, 1)]


# ---------------------------------------------------------------- French

def fleurs():
    L = pg_body('pg6099-fleurs.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'AU LECTEUR')
    units = []
    poem = 0
    n = 0
    expecting_dedication = False
    for l in L[a:]:
        s = l.strip()
        if not s:
            continue
        if s.startswith('End of') or 'END OF' in s:
            break
        if re.match(r"^[A-ZÀ-ÜÉÈÊËÎÏÔÛÙÇ0-9 '’,.:;!?\-—()«»]+$", s) and re.search(r'[A-Z]{2}', s):
            if re.match(r'^[IVXL]+$', s):
                continue
            if expecting_dedication and (s.startswith('A ') or s.startswith('À ')):
                continue
            poem += 1
            n = 0
            expecting_dedication = True
            continue
        expecting_dedication = False
        if re.match(r'^[IVXL]+\.?$', s):
            continue
        text = clean(s.replace('--', '—'))
        n += 1
        units.append({'ref': f'Fleurs.{poem}.{n}', 'text': text, 'lang': 'fr'})
    return units


def chimeres():
    L = pg_body('pg55554-nerval.txt')
    a = next(i for i, l in enumerate(L) if l.strip() == 'LES CHIMÈRES.')
    units = []
    poem = 0
    n = 0
    for l in L[a + 1:]:
        s = l.strip()
        if not s:
            continue
        if re.match(r"^[A-ZÀ-ÜÉÈ' ]+\.$", s):
            if poem >= 8:
                break
            poem += 1
            n = 0
            continue
        if re.match(r'^[IVX]+\.?$', s):
            continue
        if not l.startswith('    '):
            break
        n += 1
        units.append({'ref': f'Chimeres.{poem}.{n}', 'text': clean(s.replace('--', '—')), 'lang': 'fr'})
    return units


def verlaine_amour():
    L = lines('ia-verlaine-amour.txt')
    a = next(i for i, l in enumerate(L) if ws(l) == 'PARSIFAL')
    # whole collection: from the first poem to the editor's notes
    first = next(i for i, l in enumerate(L) if re.match(r'^PRI[EÈ]RE', ws(l)) or ws(l) == 'ÉCRIT EN 1875') if False else 0
    units = []
    poem = 0
    n = 0
    started = False
    for i, l in enumerate(L):
        s = ws(l)
        if not s:
            continue
        if re.match(r'^NOTES ET VARIANTES|^NOTES$|^TABLE', s) and started and i > a:
            break
        if re.search(r'\d', s) and len(re.findall(r'[A-Za-zÀ-ÿ]', s)) < 4:  # page numbers
            continue
        if re.match(r"^[A-ZÀ-ÜÉÈÊ' .,\-]+$", s) and len(s) > 3:
            started = started or i > 200
            if started:
                poem += 1
                n = 0
            continue
        if not started or poem == 0:
            continue
        if re.match(r'^\[\d{4}\.?\]$', s):
            continue
        n += 1
        units.append({'ref': f'Amour.{poem}.{n}', 'text': s.replace(' î', ' !').replace('î$', '!'), 'lang': 'fr'})
    return units


# ---------------------------------------------------------------- German (English Wagner), Hesse

def strip_directions(L):
    """Remove italic (_..._), bracketed and parenthesised stage directions, even across lines."""
    text = '\n'.join(L)
    text = re.sub(r'\[_.*?(\]|_\n\n)', '\n', text, flags=re.S)
    text = re.sub(r'\(_.*?\)', '', text, flags=re.S)
    text = re.sub(r'_[^_]*_', '', text, flags=re.S)
    return text.split('\n')


def tristan_en():
    L = strip_directions(pg_body('pg16250-tristan.txt'))
    a = next(i for i, l in enumerate(L) if l.strip() == 'ACT I.')
    units = []
    act = scene = None
    n = 0
    stage = False
    for l in L[a:]:
        s = l.strip()
        m = re.match(r'^ACT ([IV]+)\.$', s)
        if m:
            act, scene, n = roman(m.group(1)), None, 0
            continue
        m = re.match(r'^SCENE ([IVX]+)\.$', s)
        if m:
            scene, n = roman(m.group(1)), 0
            continue
        if not s:
            continue
        if s.startswith('[') :
            stage = not s.endswith(']')
            continue
        if stage:
            stage = not s.endswith(']')
            continue
        if scene is None:
            continue
        if re.match(r'^\(_.*_\)\.?$', s) or re.match(r'^\(_', s) and s.endswith(').'):
            continue
        s = re.sub(r'^[A-Z][A-Z ,]+(\([^)]*\)\.?)?\s*', '', s) if re.match(r'^[A-Z]{3,}', s) else s
        s = re.sub(r'\(_[^)]*_?\)\.?', '', s)
        text = clean(s)
        if not text or not re.search(r'[a-z]', text):
            continue
        n += 1
        units.append({'ref': f'Tristan.{act}.{scene}.{n}', 'text': text, 'lang': 'en'})
    return units


def twilight_en():
    L = strip_directions(pg_body('pg49507-twilight-gods-en.txt'))
    a = next(i for i, l in enumerate(L) if l.strip() == 'THE TWILIGHT OF THE GODS')
    acts = {'THE FIRST ACT': 1, 'THE SECOND ACT': 2, 'THE THIRD ACT': 3, 'PROLOGUE': 0}
    units = []
    act = None
    n = 0
    stage = False
    for l in L[a:]:
        s = l.strip()
        if s in acts:
            act, n = acts[s], 0
            continue
        if act is None or not s:
            continue
        if s.startswith('[') or (l.startswith('    _') and s.startswith('_')):
            stage = not (s.endswith(']') or s.endswith('_') or s.endswith('_.'))
            continue
        if stage:
            stage = not (s.endswith(']') or s.endswith('_') or s.endswith('_.'))
            continue
        if re.match(r"^[A-Z][A-Z ,'&-]+$", s):  # speaker names
            continue
        text = clean(s)
        if not text or not re.search(r'[a-z]', text):
            continue
        n += 1
        units.append({'ref': f'Gotterdammerung.{act}.{n}', 'text': text, 'lang': 'en'})
    return units


def hesse():
    L = lines('ia-hesse-blick.txt')
    paras = []
    buf = []
    for l in L + ['']:
        s = ws(l)
        if not s:
            if buf:
                paras.append(' '.join(buf)); buf = []
            continue
        if re.match(r'^[\d\W]+$', s):
            continue
        buf.append(s)
    text = ' '.join(p for p in paras if len(re.findall(r'[a-zäöüß]', p)) > 30)
    text = re.sub(r'(\w)- (\w)', r'\1\2', text)
    sents = re.split(r'(?<=[.!?“])\s+(?=[A-ZÄÖÜ„])', text)
    sents = [ws(s) for s in sents if len(s) > 15]
    return [{'ref': f'Hesse.Chaos.{n}', 'text': t, 'lang': 'de'} for n, t in enumerate(sents, 1)]


# ---------------------------------------------------------------- Latin

def perseus_lines(f, book):
    r = ET.parse(RAW / f).getroot()
    for d in r.iter(TEI + 'div'):
        if d.get('subtype') == 'book' and d.get('n') == str(book):
            for note in list(d.iter(TEI + 'note')):
                note.text = ''
                note.tail = note.tail
            out = []
            for l in d.iter(TEI + 'l'):
                out.append((int(re.match(r'\d+', l.get('n')).group()) if l.get('n') else None, ws(''.join(
                    t for t in itertext_skip_notes(l)))))
            return out
    raise KeyError((f, book))


def itertext_skip_notes(el):
    if el.tag == TEI + 'note':
        return
    if el.text:
        yield el.text
    for c in el:
        yield from itertext_skip_notes(c)
        if c.tail:
            yield c.tail


def perseus_en_cards(f, book):
    r = ET.parse(RAW / f).getroot()
    for d in r.iter(TEI + 'div'):
        if d.get('subtype') == 'book' and d.get('n') == str(book):
            cards = [c for c in d.iter(TEI + 'div') if c.get('subtype') == 'card']
            return [(int(c.get('n')), ws(''.join(itertext_skip_notes(c)))) for c in cards]
    raise KeyError((f, book))


def latin_passages(lat_file, en_file, book, prefix):
    lat = perseus_lines(lat_file, book)
    # number unnumbered lines by position
    numbered = []
    last = 0
    for n, t in lat:
        n = n if n is not None else last + 1
        numbered.append((n, t))
        last = n
    cards = perseus_en_cards(en_file, book)
    starts = [c[0] for c in cards]
    maxline = numbered[-1][0]
    units, en = [], []
    for k, (s, etext) in enumerate(cards):
        e = starts[k + 1] - 1 if k + 1 < len(starts) else maxline
        ref = f'{prefix}.{book}.{s}-{e}'
        ltext = ' / '.join(t for n, t in numbered if s <= n <= e)
        units.append({'ref': ref, 'text': ltext, 'lang': 'la'})
        en.append({'ref': ref, 'text': etext, 'lang': 'en'})
    return units, en


def confessions(books=(2, 3, 10, 11)):
    la = lines('pg33849-confessiones-la.txt')
    en = lines('pg3296-confessions-pusey.txt')
    lstarts = [i for i, l in enumerate(la) if re.match(r'LIBER [A-Z ]+\.$', l) and i > 360]
    lstarts.append(next(i for i, l in enumerate(la) if '*** END OF' in l))
    estarts = [i for i, l in enumerate(en) if re.match(r'BOOK [IVX]+$', l)]
    estarts.append(next(i for i, l in enumerate(en) if '*** END OF' in l))
    units, trans = [], []
    for b in books:
        seg = la[lstarts[b - 1]:lstarts[b]]
        secs = OrderedDict()
        cur = None
        for l in seg:
            m = re.match(r'(\d+)\. (.*)', l)
            if m and (cur is None or int(m.group(1)) == cur + 1):
                cur = int(m.group(1)); secs[cur] = [m.group(2)]
                continue
            if cur is not None:
                if l.startswith('       *') or re.match(r'^\{\d+\}$', l.strip()):
                    continue
                secs[cur].append(l)
        lat = []
        for k, v in secs.items():
            t = ' '.join(v)
            t = re.sub(r'\[Sidenote:[^\]]*\]', '', t)
            t = re.sub(r'\[\d+\]', '', t).replace('*', '')
            lat.append((k, clean(t)))
        eseg = en[estarts[b - 1] + 1:estarts[b]]
        paras, buf = [], []
        for l in eseg + ['']:
            if l.strip():
                buf.append(l)
            elif buf:
                paras.append(clean(' '.join(buf))); buf = []
        assert len(paras) == len(lat), (b, len(paras), len(lat))
        for (k, lt), et in zip(lat, paras):
            ref = f'Conf.{b}.{k}'
            units.append({'ref': ref, 'text': lt, 'lang': 'la'})
            trans.append({'ref': ref, 'text': et, 'lang': 'en'})
    return units, trans


def pervigilium():
    L = [ws(l) for l in lines('ia-pervigilium-loeb.txt')]
    a = next(i for i, l in enumerate(L) if l == 'PERVIGILIUM VENERIS' and i > 15000)
    b = next(i for i in range(a, len(L)) if re.match(r'^INDEX', L[i]))
    blocks = []  # (stanza number, lines)
    cur = None
    for l in L[a:b]:
        l2 = {'Ill': 'III', '1': 'I', 'l': 'I'}.get(l, l)
        m = re.match(r'^([IVX]+)$', l2)
        if m and roman(m.group(1)) <= 22:
            cur = [roman(m.group(1)), []]
            blocks.append(cur)
            continue
        if cur is None or not l:
            continue
        if re.match(r'^\d+$', l) or l.startswith('PERVIGILIVM') or l.startswith('THE VIGIL') or l.startswith('PERVIGILIUM'):
            continue
        cur[1].append(l)
    la, en = {}, {}
    for k, ls in blocks:
        text = ws(' '.join(ls))
        text = re.sub(r'\s\d{1,2}(?=\s|$)', '', text)
        eng = len(re.findall(r'\b(the|and|of|to|is|shall|her|with)\b', text))
        target = en if eng > 3 else la
        if k not in target:
            target[k] = text
    # The OCR lost some stanza numbers (V on both pages, X and XVII in the English), so a block
    # can hold two stanzas. Group stanzas so each unit covers the same stanzas in both languages.
    groups = []
    for k in range(1, 23):
        if k in la and k in en or not groups:
            groups.append([k])
        else:
            groups[-1].append(k)
    units, trans = [], []
    for g in groups:
        ref = f'PervVen.{g[0]}' if len(g) == 1 else f'PervVen.{g[0]}-{g[-1]}'
        units.append({'ref': ref, 'text': ws(' '.join(la[k] for k in g if k in la)), 'lang': 'la'})
        trans.append({'ref': ref, 'text': ws(' '.join(en[k] for k in g if k in en)), 'lang': 'en'})
    return units, trans


# ---------------------------------------------------------------- Greek (Sappho, transliterated)

def sappho():
    L = pg_body('pg57390-sappho-wharton.txt')
    heads = [i for i, l in enumerate(L) if re.match(r'^\d+$', l) and i > 1000]
    units, trans = [], []
    for k, h in enumerate(heads):
        n = int(L[h])
        end = heads[k + 1] if k + 1 < len(heads) else len(L)
        seg = L[h + 1:end]
        # the Greek (transliterated) runs until the literal translation, the first italic paragraph
        greek, buf, started = [], [], False
        for l in seg:
            s = l.strip()
            if not started and s.startswith('_'):
                started = True
            if started:
                if not s:
                    break
                buf.append(s)
            elif '[Greek:' in s:
                greek.append(ws(re.sub(r'\[Greek: ?([^\]]*(?:\[[^\]]*\][^\]]*)*)\]', r'\1', s).replace('- v', '').replace('v -', '')))
            elif s and greek:
                break  # commentary, no translation given
        eng = clean(' '.join(buf))
        if not greek:
            continue
        ref = f'Sappho.W{n}'
        if any(u['ref'] == ref for u in units):
            continue
        units.append({'ref': ref, 'text': ws(' / '.join(greek)), 'lang': 'grc-Latn'})
        if eng:
            trans.append({'ref': ref, 'text': eng, 'lang': 'en'})
    return units, trans


# ---------------------------------------------------------------- Pali, Upanishad

def pali():
    units, trans = [], []
    for k in range(1, 33):
        root = json.loads(read(f'bilara/sn35.{k}_root.json'))
        try:
            en = json.loads(read(f'bilara/sn35.{k}_en.json'))
        except Exception:
            en = {}
        groups = OrderedDict()
        for seg, txt in root.items():
            m = re.match(r'sn35\.\d+:(\d+)\.', seg)
            if not m or m.group(1) == '0':
                continue
            groups.setdefault(int(m.group(1)), []).append(seg)
        for g, segs in groups.items():
            ref = f'SN35.{k}.{g}'
            units.append({'ref': ref, 'text': ws(' '.join(root[s] for s in segs)), 'lang': 'pi'})
            et = ws(' '.join(en.get(s, '') for s in segs))
            if et:
                trans.append({'ref': ref, 'text': et, 'lang': 'en'})
    return units, trans


ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
       'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth']


def upanishad_muller():
    L = lines('ia-sbe15-muller.txt')
    a = next(i for i, l in enumerate(L) if ws(l) == 'FIFTH ADHYAYA.' and i > 11000)
    b = next(i for i in range(a, len(L)) if ws(L[i]) == 'SIXTH ADHYAYA.')
    units = []
    br = 0
    sec = None
    buf = []
    footnote = False

    def flush():
        if br and sec is not None and buf:
            t = ws(re.sub(r'(\w)- (\w)', r'\1\2', ' '.join(buf)).replace('*', ''))
            ref = f'BU.5.{br}.{sec}'
            if units and units[-1]['ref'] == ref:
                units[-1]['text'] += ' ' + t
            else:
                units.append({'ref': ref, 'text': t, 'lang': 'en'})

    for l in L[a + 1:b]:
        s = ws(l)
        if not s:
            footnote = False
            continue
        m = re.match(r'^(\w+) Br', s)
        if m and m.group(1).lower() in ORD:
            flush(); buf = []
            br = ORD.index(m.group(1).lower()) + 1
            sec = None
            continue
        if s.startswith('*') or s.startswith('^') or footnote and not re.match(r'^\d+\. ', s):
            footnote = True
            continue
        if re.search(r'UPANISHAD|ADHYAYA,', s) or re.match(r'^\d+$', s):
            continue
        m = re.match(r'^(\d+|I)\. (.*)', s)
        if m:
            flush(); buf = []
            new = 1 if m.group(1) == 'I' else int(m.group(1))
            if new == 1 and sec is not None:  # a Brahmana heading the OCR lost
                br += 1
            sec = new
            buf.append(m.group(2))
            continue
        if br and sec is None:
            sec = 1
        buf.append(s)
    flush()
    return units


# ---------------------------------------------------------------- assemble

def main():
    source = waste_land()
    target, target_en = [], []
    works = OrderedDict()

    def add(name, units, en=None):
        works[name] = (len(units), units[0]['lang'] if units else '?', len(en or []))
        target.extend(units)
        if en:
            target_en.extend(en)

    it, en = dante_it(), dante_en()
    for part in ('Inf', 'Purg'):
        u, e = [], []
        for key, ls in it.items():
            if key[0] != part:
                continue
            for n, t in enumerate(ls, 1):
                u.append({'ref': f'{part}.{key[1]}.{n}', 'text': t, 'lang': 'it'})
            els = en.get(key, [])
            if len(els) == len(ls):
                for n, t in enumerate(els, 1):
                    e.append({'ref': f'{part}.{key[1]}.{n}', 'text': t, 'lang': 'en'})
            else:
                print(f'  Longfellow line count differs for {part} {key[1]}: {len(ls)} vs {len(els)}', file=sys.stderr)
        add('Dante, Inferno' if part == 'Inf' else 'Dante, Purgatorio', u, e)

    # Perseus has More (1922) for every book but 3; book 3 uses Golding (1567).
    for book, name, enf in ((3, 'Ovid, Metamorphoses 3', 'perseus-ovid-met-eng4.xml'),
                            (6, 'Ovid, Metamorphoses 6', 'perseus-ovid-met-eng3.xml')):
        u, e = latin_passages('perseus-ovid-met-lat.xml', enf, book, 'Met')
        add(name, u, e)
    u, e = latin_passages('perseus-aeneid-lat.xml', 'perseus-aeneid-eng2.xml', 1, 'Aen')
    add('Virgil, Aeneid 1', u, e)
    u, e = confessions()
    add('Augustine, Confessions 2, 3, 10, 11', u, e)
    u, e = pervigilium()
    add('Pervigilium Veneris', u, e)
    u, e = sappho()
    add('Sappho (Wharton)', u, e)
    u, e = pali()
    add('Samyutta Nikaya 35.1-32', u, e)
    add('Brihadaranyaka Upanishad 5 (Müller)', upanishad_muller())
    add('Baudelaire, Les Fleurs du mal', fleurs())
    add('Verlaine, Amour', verlaine_amour())
    add('Nerval, Les Chimères', chimeres())
    add('Hesse, Blick ins Chaos', hesse())
    add('Wagner, Tristan (English)', tristan_en())
    add('Wagner, Götterdämmerung (English)', twilight_en())
    add('KJV: Ecclesiastes, Ezekiel, Luke', kjv())
    add('Milton, Paradise Lost 4', paradise_lost())
    add('Shakespeare, The Tempest', tempest())
    add('Shakespeare, Antony and Cleopatra', antony())
    add('Spenser, Epithalamion and Prothalamion', spenser())
    add('Oxford Book of English Verse 340-380', obev())
    add('Webster, The White Devil', white_devil())
    add("Webster, The Devil's Law-Case", devils_law_case())
    add('Middleton, Women Beware Women', women_beware())
    add('Kyd, The Spanish Tragedy', spanish_tragedy())
    add('Day, The Parliament of Bees', parliament_of_bees())
    add('Goldsmith, The Vicar of Wakefield', vicar())
    add('Froude, Reign of Elizabeth I, ch. 4', froude())

    refs = [u['ref'] for u in target]
    dup = {r for r in refs if refs.count(r) > 1} if len(refs) != len(set(refs)) else set()
    assert not dup, sorted(dup)[:20]

    from gold import GOLD  # noqa: E402  (scripts/gold.py)
    index = {u['ref']: u for u in target}
    gold = []
    for g in GOLD:
        for ref in g['targets'](target):
            gold.append({'source': g['source'], 'target': ref, 'note': g['note'], 'kind': g['kind']})
    for g in gold:
        assert g['target'] in index, g

    def dump(name, rows):
        with open(HERE / name, 'w', encoding='utf-8') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')

    dump('source.jsonl', source)
    dump('target.jsonl', target)
    dump('target-en.jsonl', target_en)
    dump('gold.jsonl', gold)

    print(f'source units: {len(source)}')
    print(f'target units: {len(target)}; English-aligned: {len(target_en)}')
    for name, (n, lang, ne) in works.items():
        print(f'  {n:6d} {lang:9s} en={ne:5d}  {name}')
    langs = OrderedDict()
    for u in target:
        langs[u['lang']] = langs.get(u['lang'], 0) + 1
    print('by language:', dict(langs))
    print(f'gold links: {len(gold)}')
    src = {u['ref']: u['text'] for u in source}
    if '--show' in sys.argv:
        for g in gold:
            print(f"\n{g['source']}: {src[g['source']]}\n  -> {g['target']}: {index[g['target']]['text'][:220]}")


if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    main()
