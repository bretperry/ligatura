"""Build the New-Testament-quotes-the-Old fixtures in French, Spanish and German, and against English.

    scripts/fetch.sh                      # clones open-bibles into raw/ (git-ignored)
    python3 -I scripts/build.py           # writes ../nt-ot-{fr,es,de} and ../nt-ot-{fr,es,de}-en
    python3 -I scripts/build.py --show    # also prints every gold link in the KJV, with a word-overlap check

Each same-language fixture: source.jsonl is the New Testament and target.jsonl the Old Testament
of one Bible, one unit per verse, ref BOOK.chapter.verse (USFM codes) in that Bible's own
numbering. Each -en fixture keeps the same source and puts the KJV Old Testament in the target.

The gold is Swete's table of New Testament quotations (../lxx-nt/scripts/gold.tsv, LXX numbering),
renumbered by this script: first to the Hebrew chapters and English verses of the KJV, then to
each Bible's numbering (Ostervald and Luther count psalm titles as verses, as the Hebrew does).
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
FIXTURES = HERE.parent
RAW = HERE / 'raw' / 'open-bibles'

BIBLES = {
    'fr': 'fra-ostervald.osis.xml',
    'es': 'spa-rv1909.usfx.xml',
    'de': 'deu-luther1912.osis.xml',
    'en': 'eng-kjv.osis.xml',
}

OSIS = dict(zip(
    'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek '
    'Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess '
    '2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split(),
    'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK '
    'DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH '
    '2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(),
))
ORDER = list(OSIS.values())
NT_BOOKS = set(ORDER[39:])


def clean(s):
    s = re.sub(r'<note\b.*?</note>', '', s, flags=re.S)
    s = re.sub(r'<f\b.*?</f>', '', s, flags=re.S)
    s = re.sub(r'<title\b.*?</title>', '', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'")
    return ' '.join(s.split())


def osis(path):
    """Verses as containers (<verse osisID>…</verse>) or milestones (sID … eID)."""
    xml = path.read_text(encoding='utf-8-sig')
    out = {}
    if re.search(r"<verse [^>]*\bsID=", xml):
        pat = r'<verse osisID="([^"]+)" sID="([^"]+)"[^>]*/>(.*?)<verse eID="\2"\s*/>'
    else:
        pat = r"<verse osisID='([^']+)'>(.*?)</verse>"
    for m in re.finditer(pat, xml, flags=re.S):
        osis_id, text = m.group(1), m.group(m.lastindex)
        b, c, v = osis_id.split('.')
        if b not in OSIS:  # the KJV's Apocrypha
            continue
        out[f'{OSIS[b]}.{c}.{v}'] = clean(text)
    return out


def usfx(path):
    xml = path.read_text(encoding='utf-8-sig')
    out = {}
    for bm in re.finditer(r'<book id="(\w+)">(.*?)</book>', xml, flags=re.S):
        book = bm.group(1)
        for cm in re.finditer(r'<c id="(\d+)"\s*/>(.*?)(?=<c id=|$)', bm.group(2), flags=re.S):
            for vm in re.finditer(r'<v id="(\d+)"\s*/>(.*?)(?:<ve\s*/>|(?=<v id=)|$)', cm.group(2), flags=re.S):
                out[f'{book}.{cm.group(1)}.{vm.group(1)}'] = clean(vm.group(2))
    return out


def load(lang):
    path = RAW / BIBLES[lang]
    verses = osis(path) if path.name.endswith('.osis.xml') else usfx(path)
    return {r: t for r, t in verses.items() if t}


def counts(verses):
    n = Counter()
    for r in verses:
        b, c, _ = r.split('.')
        n[(b, int(c))] += 1
    return n


# LXX psalm -> Hebrew psalm, and the verse shift where the LXX joins or splits psalms.
def psalm_lxx_to_hebrew(c, v):
    if c <= 8 or c >= 148:
        return c, v
    if c == 9:
        return (9, v) if v <= 21 else (10, v - 21)
    if c <= 112:
        return c + 1, v
    if c == 113:
        return (114, v) if v <= 8 else (115, v - 8)
    if c == 114:
        return 116, v
    if c == 115:
        return 116, v + 9
    if c <= 145:
        return c + 1, v
    if c == 146:
        return 147, v
    return 147, v + 11  # LXX 147 is Hebrew 147:12-20


# Jeremiah chapters the New Testament quotes whose LXX number differs (Hebrew 31 is LXX 38).
JER_LXX = {38: 31}


# Verses whose LXX number in First1KGreek differs from the KJV's in a chapter otherwise numbered
# alike, each checked by reading both: the LXX orders the commandments adultery, theft, murder
# (Exod. 20:13-15), puts cursing parents before man-stealing (21:16-17), and numbers Num. 30 as
# the Hebrew does.
LXX_TO_KJV = {'EXO.20.13': 'EXO.20.14', 'EXO.20.14': 'EXO.20.15', 'EXO.20.15': 'EXO.20.13', 'EXO.21.16': 'EXO.21.17', 'NUM.30.3': 'NUM.30.2'}

# Words found only in the LXX: "let all the angels of God worship him" (Heb. 1:6) is not in the
# Hebrew of Deut. 32:43, so no Bible translated from the Hebrew can give the link.
LXX_ONLY = {('HEB.1.6', 'DEU.32.43')}

# KJV ref -> the ref of the same verse in a Bible whose chapters split where the Hebrew's do,
# for the gold verses that move. Each was checked by reading the verse.
HEBREW_CHAPTERS = {
    'fr': {'ISA.9.1': 'ISA.8.23', 'NUM.30.2': 'NUM.30.3'},
    'es': {},
    'de': {
        'ISA.9.1': 'ISA.8.23', 'NUM.30.2': 'NUM.30.3', 'JER.9.24': 'JER.9.23', 'ISA.64.4': 'ISA.64.3', 'JOL.2.28': 'JOL.3.1',
        'DEU.29.18': 'DEU.29.17', 'DEU.29.4': 'DEU.29.3', 'MIC.5.2': 'MIC.5.1', 'HOS.2.23': 'HOS.2.25', 'HOS.1.10': 'HOS.2.1',
        'NAM.1.15': 'NAM.2.1',
    },
}


def lxx_to_hebrew(ref):
    """First1KGreek numbering (LXX chapters, psalm titles counted as verses) to Hebrew chapters."""
    b, c, v = ref.split('.')
    c, v = int(c), int(v)
    if b == 'PSA':
        c, v = psalm_lxx_to_hebrew(c, v)
    elif b == 'JER':
        c = JER_LXX.get(c, c)
    return f'{b}.{c}.{v}'


def title_shift(hebrew, kjv):
    """Verses a Hebrew-numbered psalm has ahead of the KJV's: its title verses (0, 1 or 2)."""
    nh, nk = counts(hebrew), counts(kjv)
    return {c: nh[('PSA', c)] - nk[('PSA', c)] for b, c in nh if b == 'PSA'}


def to_kjv(ref, shift):
    b, c, v = ref.split('.')
    if b == 'PSA':
        v = int(v) - shift.get(int(c), 0)
    return f'{b}.{c}.{v}'


def from_kjv(ref, shift):
    b, c, v = ref.split('.')
    if b == 'PSA':
        v = int(v) + shift.get(int(c), 0)
    return f'{b}.{c}.{v}'


def write(path, rows):
    path.parent.mkdir(exist_ok=True)
    with open(path, 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def link(path, to):
    if path.is_symlink() or path.exists():
        path.unlink()
    path.symlink_to(to)


def ordered(verses, books):
    key = lambda r: (ORDER.index(r.split('.')[0]), int(r.split('.')[1]), int(r.split('.')[2]))
    return [{'ref': r, 'text': verses[r]} for r in sorted((r for r in verses if r.split('.')[0] in books), key=key)]


def words(s):
    stop = set('the and of to that in a is he for it not be his they all which with as but i you thou thee thy shall unto this them me my him are have will by from or so what was on no who when if there their we then do hath doth'.split())
    return {re.sub(r'(eth|est|ed|ing|s)$', '', w) for w in re.findall(r'[a-z]+', s.lower()) if len(w) > 2 and w not in stop}


def main():
    show = '--show' in sys.argv
    kjv = load('en')
    # Ostervald and Luther number psalms as the Hebrew does; their shifts agree (checked below).
    hebrew = load('fr')
    shift = title_shift(hebrew, kjv)
    lxx_gold = []
    for line in (FIXTURES / 'lxx-nt' / 'scripts' / 'gold.tsv').read_text().splitlines():
        if line.strip() and not line.startswith('#'):
            src, tgt, *note = line.split('\t')
            # not-in-text: missing from First1KGreek's LXX, present in these Bibles.
            lxx_gold.append({'source': src, 'target': tgt, 'note': (note[0] if note else '').replace('; not-in-text', '')})
    gold = []
    for g in lxx_gold:
        if (g['source'], g['target']) in LXX_ONLY:
            continue
        t = lxx_to_hebrew(LXX_TO_KJV.get(g['target'], g['target']))
        gold.append({'source': g['source'], 'target': to_kjv(t, shift), 'hebrew': t, 'note': g.get('note', '') + f"; LXX {g['target']}"})
    missing = [g for g in gold if g['source'] not in kjv or g['target'] not in kjv]
    if missing:
        print('not in the KJV:', missing, file=sys.stderr)
    if show:
        for g in gold:
            shared = words(kjv[g['source']]) & words(kjv[g['target']])
            flag = '' if len(shared) >= 2 else '  <-- few shared words'
            print(f"{g['source']} -> {g['target']} ({g['note']}){flag}\n  NT: {kjv[g['source']]}\n  OT: {kjv[g['target']]}\n  shared: {sorted(shared)}\n")
    ot = set(ORDER[:39])
    for lang in ('fr', 'es', 'de'):
        bible = hebrew if lang == 'fr' else load(lang)
        own = title_shift(bible, kjv)
        hebrew_psalms = sum(own.values()) > 50
        moved = HEBREW_CHAPTERS[lang]
        loc = lambda r: moved.get(r) or (from_kjv(r, shift) if hebrew_psalms else r)
        rows = [{'source': g['source'], 'target': loc(g['target']), 'note': g['note']} for g in gold]
        bad = [r for r in rows if r['source'] not in bible or r['target'] not in bible]
        same = FIXTURES / f'nt-ot-{lang}'
        write(same / 'source.jsonl', ordered(bible, NT_BOOKS))
        write(same / 'target.jsonl', ordered(bible, ot))
        write(same / 'gold.jsonl', [r for r in rows if r not in bad])
        (same / 'fixture.json').write_text(json.dumps({'sourceLang': lang, 'targetLang': lang}) + '\n')
        # The -en fixtures link to files they share instead of copying them: the source is the
        # same-language fixture's, the KJV target is nt-ot-fr-en's.
        cross = FIXTURES / f'nt-ot-{lang}-en'
        cross.mkdir(exist_ok=True)
        link(cross / 'source.jsonl', f'../nt-ot-{lang}/source.jsonl')
        if lang == 'fr':
            write(cross / 'target.jsonl', ordered(kjv, ot))
        else:
            link(cross / 'target.jsonl', '../nt-ot-fr-en/target.jsonl')
        write(cross / 'gold.jsonl', [{'source': g['source'], 'target': g['target'], 'note': g['note']} for g in gold if g['source'] in bible and g['target'] in kjv])
        (cross / 'fixture.json').write_text(json.dumps({'sourceLang': lang, 'targetLang': 'en'}) + '\n')
        diff = sorted(c for c in own if own[c] != (shift.get(c, 0) if hebrew_psalms else 0))
        print(f'{lang}: {sum(1 for r in bible if r.split(".")[0] in NT_BOOKS)} NT verses, {sum(1 for r in bible if r.split(".")[0] in ot)} OT verses, '
              f'{len(rows) - len(bad)} gold links; psalms {"Hebrew" if hebrew_psalms else "English"}-numbered'
              + (f'; psalms whose title count differs from Ostervald: {diff}' if diff else '') + (f'; dropped {bad}' if bad else ''))


if __name__ == '__main__':
    main()
