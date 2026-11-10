"""Build the Śaṅkara-quotes-the-Upaniṣads fixture from raw/.

    scripts/fetch.sh                      # downloads the GRETIL files into raw/
    python3 -I scripts/build.py           # writes source.jsonl, target.jsonl, gold.jsonl
    python3 -I scripts/build.py --show    # also prints every gold link with both texts

source.jsonl: the words Śaṅkara's Brahmasūtrabhāṣya quotes before each citation mark the
edition prints, with the marks removed. Ref "BBs_<adhyāya>,<pāda>.<sūtra>:<n>": the sūtra the
commentary is on and the citation's number within it.
target.jsonl: the mūla text of nine Upaniṣads and the Bhagavadgītā, one unit per mantra or
verse (per anuvāka for the Taittirīya, as Śaṅkara cites it). Refs in Śaṅkara's citation
scheme: CHU.6.8.7, BAU.2.4.13, TU.2.1, KU.2.19 (vallī.verse), PU.1.2, AU.1.1.1, IU.2,
MaU.2, SU.1.1, BG.2.19.
gold.jsonl: one link per citation the edition prints, "(chā. 6.8.7)" and the like.
"""
import html
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'


def nfc(s):
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', s)).strip()


def text_of(path):
    """XML or HTML to plain text, one line per source line, entities decoded."""
    t = path.read_text()
    t = re.sub(r'<teiHeader.*?</teiHeader>', '', t, flags=re.S)
    t = re.sub(r'<head>.*?</head>', '', t, flags=re.S) if path.suffix == '.htm' else t
    t = re.sub(r'<br\s*/?>', '\n', t, flags=re.I)
    t = re.sub(r'<[^>]+>', '', t)
    return html.unescape(t)


# Mūla units marked "... || ChUp_6,8.7 ||" (or // ... //). A unit runs from the previous mark
# (of any kind) or blank line to its own mark, within one paragraph.
def marked_units(path, prefix, to_ref):
    t = text_of(path)
    units = {}
    for block in re.split(r'\n\s*\n', t):
        last = 0
        for m in re.finditer(r'(\|\||//)\s*([A-Za-z]+)_([0-9][0-9,.]*)\s*(\|\||//)', block):
            seg = block[last:m.start()]
            last = m.end()
            if m.group(2) != prefix:
                continue
            ref = to_ref(m.group(3))
            if ref and ref not in units:
                units[ref] = nfc(seg.replace('START', ' '))
    return units


def dotted(s):
    return '.'.join(re.split(r'[,.]', s))


def taittiriya(path):
    # <p xml:id="TaittU_2.1.1">...</p>: vallī.anuvāka.part; Śaṅkara cites vallī.anuvāka.
    t = path.read_text()
    units = defaultdict(list)
    for m in re.finditer(r'<p xml:id="TaittU_(\d+)\.(\d+)(?:\.\d+)?">(.*?)</p>', t, re.S):
        units[f'TU.{m.group(1)}.{m.group(2)}'].append(nfc(html.unescape(re.sub(r'<[^>]+>', '', m.group(3)))))
    return {k: ' '.join(v) for k, v in units.items()}


def svetasvatara(path):
    t = path.read_text()
    units = {}
    for m in re.finditer(r'<lg xml:id="SvetUp_(\d+)\.(\d+)">(.*?)</lg>', t, re.S):
        units[f'SU.{m.group(1)}.{m.group(2)}'] = nfc(html.unescape(re.sub(r'<[^>]+>', ' ', m.group(3))))
    return units


def gita(path):
    # Lines "pāda text  Bhg_02.019a [=MBh_...]"; "Bhg_10.019" with no letter is a speaker line.
    units = defaultdict(list)
    for line in text_of(path).splitlines():
        m = re.match(r'(.*?)\s+Bhg_(\d+)\.(\d+)([a-z]?)\s', line + ' ')
        if m and m.group(4):
            units[f'BG.{int(m.group(2))}.{int(m.group(3))}'].append(nfc(m.group(1)))
    return {k: ' / '.join(v) for k, v in units.items()}


def targets():
    t = {}
    t |= marked_units(RAW / 'sa_chAndogyopaniSad-comm.xml', 'ChUp', lambda r: 'CHU.' + dotted(r))
    t |= marked_units(RAW / 'sa_bRhadAraNyakopaniSadkANva-recension-comm.xml', 'BrhUp', lambda r: 'BAU.' + dotted(r))
    t |= taittiriya(RAW / 'sa_taittirIyopaniSad-zaMkarabhASya.xml')
    t |= marked_units(RAW / 'sa_kathopaniSad.xml', 'KaU', lambda r: 'KU.' + '.'.join(str(int(x)) for x in r.split('.')))
    t |= marked_units(RAW / 'sa_praznopaniSad-comm.xml', 'PrUp', lambda r: 'PU.' + dotted(r))
    t |= marked_units(RAW / 'sa_aitareyopaniSad-comm.xml', 'AitUp', lambda r: 'AU.' + dotted(r))
    t |= marked_units(RAW / 'sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.xml', 'IsUp', lambda r: 'IU.' + dotted(r))
    t |= marked_units(RAW / 'sa_mANDUkyopaniSad-comm.xml', 'MandUp', lambda r: 'MaU.' + dotted(r))
    t |= svetasvatara(RAW / 'sa_zvetAzvataropaniSad.xml')
    t |= gita(RAW / 'bhgce__u.htm')
    return {k: v for k, v in t.items() if len(v) >= 10}


# Śaṅkara's abbreviations -> (book, number of parts the target ref has). Abbreviations for texts
# not in the target (Muṇḍaka, Kena, Kauṣītaki, the Brahmasūtra itself, smṛti) are skipped.
BOOKS = [
    (r'chā|chāṃ|chāndo|chāndogya', 'CHU', 3),
    (r'bṛ|bṛha|bṛhadā', 'BAU', 3),
    (r'tai|taitti', 'TU', 2),
    (r'kā|kāṭha|kaṭha|ka', 'KU', None),
    (r'pra|praśna', 'PU', 2),
    (r'ai|aita', 'AU', 3),
    (r'īśā|īśa|ī', 'IU', 1),
    (r'mā\.?\s?u|māṇḍū', 'MaU', 1),
    (r'śve|śvetā|śvaṃ', 'SU', 2),
    (r'gī|bha\.\s?gī', 'BG', 2),
]
CITE = re.compile(r'\(\s*([^\s()0-9][^()0-9]{0,14}?)\.?\s*([0-9][0-9.,\s]*)\)')


def resolve(abbr, nums):
    abbr = abbr.strip().rstrip('.').strip()
    parts = [int(x) for x in re.split(r'[.\s]+', nums.split(',')[0].strip(' .')) if x]
    for pat, book, n in BOOKS:
        if re.fullmatch(pat, abbr):
            if book == 'KU':  # adhyāya.vallī.verse -> vallī of six; vallī.verse as is
                if len(parts) == 3:
                    parts = [(parts[0] - 1) * 3 + parts[1], parts[2]]
                n = 2
            if len(parts) != n:
                return None
            return book + '.' + '.'.join(map(str, parts))
    return None


def quotation(seg):
    """The end of seg back to where its last quotation opens: Śaṅkara's citation mark follows
    the words it cites. Lines and daṇḍas split it into pieces; walk back until the opening
    quotes (' after a space) cover the closing ones (' after a letter), at most 8 pieces.
    Avagraha is also written ' after a space, so this errs toward a shorter unit."""
    pieces = [p for p in (nfc(x) for x in re.split(r'\n|(?<=/)', seg)) if p and p != '/']
    out, opened, closed = [], 0, 0
    for p in reversed(pieces[-8:]):
        out.insert(0, p)
        closed += len(re.findall(r"\w'", p))
        opened += len(re.findall(r"(?:^|[\s\-—(])'(?=\w)", p))
        if opened >= closed:
            break
    return nfc(' '.join(out))


def sources():
    """(ref, text, [(abbr, nums)]): for each citation mark, the words before it."""
    t = text_of(RAW / 'sa_bAdarAyaNa-brahmasUtra-comm.xml')
    t = t[t.find('prathamādhyāye'):]
    out = []
    # The commentary after a sūtra mark is on that sūtra.
    chunks = re.split(r'\|\s*(BBs_[0-9,.]+)\s*\|', t)
    for sutra, chunk in zip(chunks[1::2], chunks[2::2]):
        last, n = 0, 0
        for c in CITE.finditer(chunk):
            seg = CITE.sub(' ', chunk[last:c.start()])
            last = c.end()
            text = quotation(seg)
            if len(re.findall(r'\w', text)) < 6:
                # Two marks in a row ("(chā. 6.2.1) (bṛ. 2.4.5)") cite the same words.
                if out and out[-1][0].startswith(sutra + ':'):
                    out[-1][2].append((c.group(1), c.group(2)))
                continue
            n += 1
            out.append([f'{sutra}:{n}', text, [(c.group(1), c.group(2))]])
    return out


def main():
    target = targets()
    src, gold, unknown, missing = [], [], 0, defaultdict(int)
    for ref, text, cites in sources():
        links = []
        for abbr, nums in cites:
            r = resolve(abbr, nums)
            if r is None:
                unknown += 1
            elif r not in target:
                missing[r.split('.')[0]] += 1
            elif r not in links:
                links.append(r)
        if links:
            src.append({'ref': ref, 'text': text})
            gold += [{'source': ref, 'target': r, 'note': 'edition citation'} for r in links]
    write = lambda name, recs: (HERE / name).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in recs))
    write('source.jsonl', src)
    write('target.jsonl', [{'ref': k, 'text': v} for k, v in target.items()])
    write('gold.jsonl', gold)
    books = defaultdict(int)
    for k in target:
        books[k.split('.')[0]] += 1
    print(f'{len(src)} source units, {len(target)} target units {dict(books)}, {len(gold)} gold links')
    print(f'citations skipped: {unknown} to texts not in the target or unparsed, {dict(missing)} to refs the target lacks')
    if '--show' in sys.argv:
        s = {r['ref']: r['text'] for r in src}
        for g in gold:
            print(f"\n{g['source']} -> {g['target']}\n  {s[g['source']][:200]}\n  {target[g['target']][:200]}")


main()
