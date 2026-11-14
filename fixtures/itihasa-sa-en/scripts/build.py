"""Build the Itihasa Sanskrit-to-English fixture from raw/itihasa.

    scripts/fetch.sh                  # clones rahular/itihasa into raw/
    python3 -I scripts/build.py       # writes source.jsonl, target.jsonl, gold.jsonl

Itihasa (Aralikatte et al., WAT 2021; Apache-2.0) pairs 93,000 shlokas of the Ramayana and
Mahabharata with M. N. Dutt's English. Only its test split is used. scripts/queries.txt and
scripts/pool.txt name the rows: the 500 queries and 4,500 distractors of the yardstick in
ligatura-multilingual/lab (seed 20261108; shlokas of 20-600 characters, English of 20-900,
duplicate Sanskrit dropped), so a model fine-tuned on Itihasa's train split stays clean here.

source.jsonl: the 500 query shlokas, Devanagari, ref "test.<row>".
target.jsonl: the English of all 5,000 rows, same refs.
gold.jsonl: each shloka links to its own English.
"""
import json
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'raw' / 'itihasa'


def nfc(s):
    return unicodedata.normalize('NFC', ' '.join(s.split()))


def rows(name):
    return (HERE / 'scripts' / name).read_text().split()


def main():
    data = RAW / 'data' if (RAW / 'data').is_dir() else RAW
    sn = (data / 'test.sn.csv').read_text().splitlines()
    en = (data / 'test.en.csv').read_text().splitlines()
    queries, pool = rows('queries.txt'), rows('pool.txt')
    line = lambda ref, lines: nfc(lines[int(ref.split('.')[1])])
    write = lambda name, recs: (HERE / name).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in recs))
    write('source.jsonl', [{'ref': r, 'text': line(r, sn)} for r in queries])
    # Target in row order, so its order says nothing about which rows are queries.
    target = sorted(queries + pool, key=lambda r: int(r.split('.')[1]))
    write('target.jsonl', [{'ref': r, 'text': line(r, en)} for r in target])
    write('gold.jsonl', [{'source': r, 'target': r, 'note': 'Itihasa alignment (Dutt)'} for r in queries])
    print(f'{len(queries)} source, {len(target)} target, {len(queries)} gold')


main()
