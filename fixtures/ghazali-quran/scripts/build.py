"""Build the Ghazali-quotes-the-Quran fixture from raw/.

    scripts/fetch.sh                 # downloads the two texts into raw/
    python3 -I scripts/build.py      # writes source.jsonl, target.jsonl, gold.jsonl
    python3 -I scripts/build.py --show

target.jsonl: the Quran, one unit per verse (Tanzil Uthmani text, with its marks), ref "Q<sura>.<aya>".
source.jsonl: every {...} span in al-Ghazali's Ihya' (OpenITI, from Shamela) of at least 3 words
that is found in the Quran. Ref "IHY_<volume>.<page>:<n>" by the Shamela page marker.
gold.jsonl: the verse(s) holding the span's words in order after folding (diacritics, alef forms,
ya, ta marbuta, spaces removed). A span that runs over several verses links to each of them.
Spans found in more than 3 verses (repeated formulas) are left out, as the verse is not unique.
"""
import bisect
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / 'raw'


def fold(s):
    s = unicodedata.normalize('NFC', s)
    s = re.sub('[ً-ٰٟۖ-ۭـ]', '', s)
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.sub('[^ء-ي]', '', s)


def words(s):
    return len(re.findall('[ء-ي]+', fold_keep(s)))


def fold_keep(s):
    return re.sub('[ً-ٰٟۖ-ۭـ]', '', s)


verses = []  # (ref, text)
for line in (RAW / 'quran-uthmani.txt').read_text(encoding='utf8').splitlines():
    if line.startswith('#') or not line.strip():
        continue
    s, a, t = line.split('|', 2)
    verses.append((f'Q{s}.{a}', t.strip()))
folded = [fold(t) for _, t in verses]
# One long string with verse boundaries, to find spans that cross verses.
joined = ''
starts = []
for f in folded:
    starts.append(len(joined))
    joined += f
# Ihya: strip OpenITI markup, keep a page marker with each piece of text.
raw = (RAW / 'ihya.txt').read_text(encoding='utf8')
raw = raw.split('#META#Header#End#', 1)[1]
text = ''
for line in raw.splitlines():
    line = re.sub(r'^(#+ ?|~~|\|+ ?)', '', line)
    line = re.sub(r'\bms\d+\b', '', line)
    m = re.search(r'PageV(\d+)P(\d+)', line)
    line = re.sub(r'PageV\d+P\d+', '', line)
    if m:
        line = line.rstrip() + f' \x00{int(m.group(1))}.{int(m.group(2))}\x00 '
    text += line.strip() + ' '

page = '0.0'
src, gold = [], []
n = {}
for m in re.finditer(r'\{([^{}]*)\}', text):
    span = re.sub(r'\x00[\d.]+\x00', ' ', m.group(1))
    span = re.sub(r'\s+', ' ', span).strip()
    if words(span) < 3:
        continue
    f = fold(span)
    idx = joined.find(f)
    found = []
    while idx != -1 and len(found) < 10:
        found.append(idx)
        idx = joined.find(f, idx + 1)
    if not found or len(found) > 3:
        continue
    refs = []
    for idx in found:
        v0 = bisect.bisect_right(starts, idx) - 1
        v1 = bisect.bisect_right(starts, idx + len(f) - 1) - 1
        refs += [verses[v][0] for v in range(v0, v1 + 1)]
    pg = None
    for pm in re.finditer(r'\x00([\d.]+)\x00', text[m.end():m.end() + 4000]):
        pg = pm.group(1)
        break
    pg = pg or '0.0'
    k = n[pg] = n.get(pg, 0) + 1
    ref = f'IHY_{pg}:{k}'
    src.append({'ref': ref, 'text': span})
    for r in dict.fromkeys(refs):
        gold.append({'source': ref, 'target': r, 'note': 'exact text'})

def write(name, rows):
    (HERE / name).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf8')

write('source.jsonl', src)
write('target.jsonl', [{'ref': r, 'text': t} for r, t in verses])
write('gold.jsonl', gold)
print(f'{len(src)} source units, {len(verses)} verses, {len(gold)} gold links')
if '--show' in sys.argv:
    t = dict(verses)
    s = {u['ref']: u['text'] for u in src}
    for g in gold:
        print(g['source'], '->', g['target'], '\n  ', s[g['source']], '\n  ', t[g['target']])
