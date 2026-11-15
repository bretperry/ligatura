"""Build the Akkadian-to-English fixture from the SAAo/SAA10 letter pages on the NAS.

    bash scripts/fetch.sh                              # downloads the 389 pages to the NAS
    python3 -I scripts/build.py PAGES_DIR              # writes source.jsonl, target.jsonl, gold.jsonl

PAGES_DIR holds P<id>.html, one ORACC page per letter (https://oracc.museum.upenn.edu/saao/saa10/<id>/html).
Each page prints the transliterated lines in a table; a translation cell spans the rows of the
lines it translates (rowspan), so each cell and its lines are one aligned pair.

source.jsonl: the lines of one pair, transliteration (hyphenated signs, brackets for damage,
              determinatives in braces), ref "<P number>.<n>" with n the pair's order in the letter.
target.jsonl: the English of every pair, same refs.
gold.jsonl:   each pair's transliteration links to its own English.
"""
import html as H
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
MIN_WORDS = 3

TAG = re.compile(r'<[^>]+>')
nfc = lambda s: unicodedata.normalize('NFC', ' '.join(s.split()))


def akkadian(row):
    """The words of one line, in transliteration."""
    words = re.findall(r'<span class="w [^"]*akk[^"]*"[^>]*>(.*?)</span>(?= <span class="w |</p>|</td>)', row, flags=re.S)
    out = []
    for w in words:
        w = re.sub(r'<sup[^>]*>(.*?)</sup>', r'{\1}', w)
        out.append(H.unescape(TAG.sub('', w)))
    return ' '.join(out)


def english(cell):
    cell = re.sub(r'<span class="xtr-label">.*?</span>', '', cell)
    return nfc(H.unescape(TAG.sub('', cell)).replace('[', '').replace(']', ''))


def pairs(page):
    t = re.sub(r'\s+', ' ', page)
    cur = None
    for row in re.findall(r'<tr id="P\d+\.\d+" class="l"[^>]*>.*?</tr>', t):
        line = akkadian(row)
        cell = re.search(r'<td class="[^"]*xtr[^"]*"[^>]*><p class="tr">(.*?)</p></td>', row)
        if cell:
            if cur: yield cur
            cur = [[], english(cell.group(1))]
        if cur is not None and line: cur[0].append(line)
    if cur: yield cur


def main():
    pages = Path(sys.argv[1])
    src, tgt, gold = [], [], []
    for f in sorted(pages.glob('P*.html')):
        pid, n = f.stem, 0
        for lines, en in pairs(f.read_text(encoding='utf-8')):
            n += 1
            ak = nfc(' '.join(lines))
            if len(en.split()) < MIN_WORDS or len(re.findall(r'[A-Za-zšṣṭḫ]{2,}', re.sub(r'[\[\]⌈⌉⸢⸣]', '', ak))) < MIN_WORDS:
                continue  # too broken or too short to match on
            ref = f'{pid}.{n}'
            src.append({'ref': ref, 'text': ak})
            tgt.append({'ref': ref, 'text': en})
            gold.append({'source': ref, 'target': ref, 'note': 'SAAo translation cell'})
    write = lambda name, recs: (HERE / name).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in recs))
    write('source.jsonl', src); write('target.jsonl', tgt); write('gold.jsonl', gold)
    print(len(src), 'pairs')


main()
