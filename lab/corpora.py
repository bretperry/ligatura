# Build the parallel corpora and fixed splits the yardstick (lab/yardstick.mjs) reads.
#
#   uv run --with pandas --with pyarrow python3 -I lab/corpora.py
#
# Reads Hugging Face downloads in lab/data/raw/, writes lab/data/corpora/<lang>.jsonl
# ({id, en, orig, source, work}) and lab/data/splits/<lang>.json.
import json, random, re, sys, unicodedata
from pathlib import Path

import pandas as pd

LAB = Path(sys.argv[0]).resolve().parent
DATA = LAB / 'data'
RAW = DATA / 'raw'
SEED = 20261108
N_TEST, N_POOL, N_DEV = 500, 4500, 1000
MIN_CHARS, MAX_ORIG, MAX_EN = 20, 600, 900

# Works cited in The Waste Land notes (plus the epigraph's Petronius and the Sappho of the
# line-221 note). Their passages go in no split, so the fixture stays held out of train/dev/test.
EXCLUDED_WORKS = [
    'Dante Inferno', 'Dante Purgatorio', 'Ovid Metamorphoses', 'Virgil Aeneid',
    'Augustine Confessions', 'Pervigilium Veneris', 'Brihadaranyaka Upanishad',
    'Buddha Fire Sermon (Adittapariyaya Sutta, SN 35.28)', 'Petronius Satyricon', 'Sappho',
    'Bible: Ezekiel, Ecclesiastes, Isaiah (whole books), Luke 24',
]
EXCLUDED_BIBLE_BOOKS = {'Ezekiel', 'Ecclesiastes', 'Isaiah'}
EXCLUDED_ROSENTHAL = {'Virgil_Aeneid', 'Ausonius_Nuptial_Cento'}  # the Cento is stitched from Aeneid lines; no Ovid Met., Augustine, Petronius files in that set
# Text tripwires for works with no work label (Perseus rows in bowphs) or anthologised poems.
TRIPWIRES = [r'cras amet qui (nunquam|numquam) amavit', r'Ἕσπερε', r'φαίνολις', r'Σίβυλλα,? τί θέλεις',
             r'Trimalchio', r'Encolpi', r'tapa[ḥh]? svādhyāya', r'datta dayadhvam', r'दयध्वम्',
             r'Arma virumque', r'In nova fert animus', r'Philomel']


def nfc(s):
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', str(s))).strip()


def tidy_en(s):  # bowphs tokenises punctuation: "David , the son"
    return re.sub(r'\s+([,.;:?!’)])', r'\1', nfc(s))


def keep(r):
    return MIN_CHARS <= len(r['orig']) <= MAX_ORIG and MIN_CHARS <= len(r['en']) <= MAX_EN


def tripped(r):
    return any(re.search(p, r['orig'] + ' ' + r['en'], re.I) for p in TRIPWIRES)


def latin():
    rows, excluded = [], []
    j = pd.read_csv(RAW / 'jam963_parallel-catholic-bible-versions/parallel_bible_data.csv')
    for x in j.itertuples():
        if not isinstance(x.drc, str) or not isinstance(x.vulgate, str):
            continue
        r = dict(id=f'vul:{x.book}.{x.chapter}.{x.verse}', en=nfc(x.drc), orig=nfc(x.vulgate), source='vulgate-drc', work=x.book)
        (excluded if x.book in EXCLUDED_BIBLE_BOOKS or (x.book == 'Luke' and x.chapter == 24) else rows).append(r)
    g = pd.concat([pd.read_parquet(f) for f in sorted((RAW / 'grosenthal_latin_english_parallel/data').glob('*.parquet'))])
    for x in g.itertuples():
        work = x.file.split('\\')[-1][:-5]
        base = re.sub(r'_Book_?\d+$', '', work)
        if base == 'Vulgate_Bible':  # unreferenced duplicate of the jam963 Vulgate
            continue
        r = dict(id=f'ros:{x.id}', en=nfc(x.en), orig=nfc(x.la), source='rosenthal', work=work)
        (excluded if base in EXCLUDED_ROSENTHAL else rows).append(r)
    return rows, excluded


def greek():
    b = pd.read_parquet(next((RAW / 'bowphs_latin-greek-english-parallel/data').glob('*.parquet')))
    b = b.reset_index().rename(columns={'index': 'row'})
    g = b[b.source_language == 'greek']
    nt = g[g.source == 'bible']
    # NT verses are in canonical order with no references: Luke 24 runs from its first verse
    # to the verse before John 1:1.
    start = nt.index[nt.non_english.str.startswith('Τῇ δὲ μιᾷ τῶν σαββάτων ὄρθρου')]
    end = nt.index[nt.non_english.str.startswith('Ἐν ἀρχῇ ἦν ὁ λόγος')]
    assert len(start) == 1 and len(end) == 1, (list(start), list(end))
    rows, excluded = [], []
    for x in g.itertuples():
        if x.source not in ('bible', 'perseus'):
            continue  # tatoeba sentences are modern Greek-ish phrasebook lines
        r = dict(id=f'{"nt" if x.source == "bible" else "per"}:{x.row}', en=tidy_en(x.english), orig=nfc(x.non_english),
                 source='nt-kjv' if x.source == 'bible' else 'perseus', work='Luke 24' if start[0] <= x.Index < end[0] else '')
        (excluded if r['work'] == 'Luke 24' else rows).append(r)
    return rows, excluded


def sanskrit():
    rows = []
    for split in ('train', 'dev', 'test'):
        en = (RAW / f'rahular_itihasa/{split}.en.csv').read_text().splitlines()
        sn = (RAW / f'rahular_itihasa/{split}.sn.csv').read_text().splitlines()
        assert len(en) == len(sn), split
        for i, (e, s) in enumerate(zip(en, sn)):
            rows.append(dict(id=f'iti:{split}.{i}', en=nfc(e), orig=nfc(s), source='itihasa', work=f'itihasa-{split}'))
    return rows, []


def split(lang, rows, excluded, strata):
    rows = [r for r in rows if keep(r)]
    seen, uniq = set(), []
    for r in rows:  # drop repeated originals (refrains, formulae) so each query has one gold
        if r['orig'] not in seen:
            seen.add(r['orig']); uniq.append(r)
    trip = [r for r in uniq if tripped(r)]
    uniq = [r for r in uniq if not tripped(r)]
    rng = random.Random(SEED)
    out = {'test': [], 'pool': [], 'dev': [], 'train': []}
    for name, pred in strata:
        s = [r for r in uniq if pred(r)]
        rng.shuffle(s)
        k = len(strata)
        out['test'] += [r['id'] for r in s[:N_TEST // k]]
        out['pool'] += [r['id'] for r in s[N_TEST // k:(N_TEST + N_POOL) // k]]
    held = set(out['test']) | set(out['pool'])
    rest = [r for r in uniq if r['id'] not in held]
    if lang == 'sa':  # keep Itihasa's own train split out of dev; dev from its dev split
        dev = [r for r in rest if r['work'] == 'itihasa-dev']
        rng.shuffle(dev)
        out['dev'] = [r['id'] for r in dev[:N_DEV]]
    else:
        rng.shuffle(rest)
        out['dev'] = [r['id'] for r in rest[:N_DEV]]
    dset = set(out['dev'])
    out['train'] = [r['id'] for r in rest if r['id'] not in dset and not (lang == 'sa' and r['work'] != 'itihasa-train')]
    (DATA / 'corpora').mkdir(parents=True, exist_ok=True)
    with open(DATA / 'corpora' / f'{lang}.jsonl', 'w') as f:
        for r in uniq:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    rule = {
        'seed': SEED,
        'sizes': {k: len(v) for k, v in out.items()},
        'strata': [n for n, _ in strata],
        'filters': f'orig {MIN_CHARS}-{MAX_ORIG} chars, en {MIN_CHARS}-{MAX_EN} chars; duplicate originals dropped (first kept)',
        'haystack': 'test (queries + gold) plus pool; neither is ever in train or dev',
        'exclusion': {
            'rule': 'Passages from works cited in The Waste Land notes are in no split (not train, dev, test or pool).',
            'works': EXCLUDED_WORKS,
            'tripwire_regexes': TRIPWIRES,
            'excluded_by_work': len(excluded),
            'excluded_by_tripwire': [r['id'] for r in trip],
        },
    }
    if lang == 'sa':
        rule['note'] = "test+pool come from Itihasa's test split, dev from its dev split, train from its train split, so models trained on Itihasa train stay clean. Itihasa holds no Upanishad or Pali text."
    (DATA / 'splits').mkdir(parents=True, exist_ok=True)
    (DATA / 'splits' / f'{lang}.json').write_text(json.dumps({**rule, 'ids': out}, ensure_ascii=False))
    print(lang, len(rows), 'kept', len(uniq), rule['sizes'], 'excluded', len(excluded), 'tripwire', len(trip))


la, la_x = latin()
split('la', la, la_x, [('vulgate-drc', lambda r: r['source'] == 'vulgate-drc'), ('rosenthal', lambda r: r['source'] == 'rosenthal')])
grc, grc_x = greek()
split('grc', grc, grc_x, [('nt-kjv', lambda r: r['source'] == 'nt-kjv'), ('perseus', lambda r: r['source'] == 'perseus')])
sa, _ = sanskrit()
split('sa', sa, [], [('itihasa-test', lambda r: r['work'] == 'itihasa-test')])
