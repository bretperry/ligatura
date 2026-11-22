"""Eliot's Notes on The Waste Land (1922), as gold links.

Each entry names the source line the note is keyed to, Eliot's citation as printed, a kind,
and how to find the target units. Targets are located by text, not hard-coded refs, so a parser
change cannot silently move a link: build.py fails if a pattern matches nothing.

kind: quote     the line reproduces or translates the cited words
      allusion  the line echoes the passage without quoting it
      reference the note points at a work or scene the line draws on, with no shared wording
"""
import re


def find(prefix, pattern, after=0, nth=1, flags=re.I):
    """The nth unit under `prefix` whose text matches `pattern`, plus `after` following units."""
    def run(target):
        pool = [u for u in target if u['ref'].startswith(prefix)]
        hits = [i for i, u in enumerate(pool) if re.search(pattern, u['text'], flags)]
        if len(hits) < nth:
            raise SystemExit(f'gold: no match for {prefix} /{pattern}/')
        i = hits[nth - 1]
        return [u['ref'] for u in pool[i:i + 1 + after]]
    return run


def refs(*rs):
    return lambda target: list(rs)


def both(*fs):
    return lambda target: [r for f in fs for r in f(target)]


GOLD = [
    # I. The Burial of the Dead
    dict(source='WL.20', note='Cf. Ezekiel 2:1.', kind='allusion', targets=refs('KJV.Ezek.2.1')),
    dict(source='WL.23', note='Cf. Ecclesiastes 12:5.', kind='allusion', targets=refs('KJV.Eccl.12.5')),
    dict(source='WL.31', note='V. Tristan und Isolde, i, verses 5-8.', kind='quote',
         targets=find('Tristan.1.2.', r'^The wind so wild', after=3)),
    dict(source='WL.42', note='Id. iii, verse 24.', kind='quote', targets=find('Tristan.3.', r'Blank appears the sea')),
    dict(source='WL.60', note="Cf. Baudelaire: 'Fourmillante cité, cité pleine de rêves, / Où le spectre en plein jour raccroche le passant.'",
         kind='allusion', targets=find('Fleurs.', r'^Fourmillante cité', after=1)),
    dict(source='WL.63', note='Cf. Inferno, iii. 55-7.', kind='quote', targets=refs('Inf.3.55', 'Inf.3.56', 'Inf.3.57')),
    dict(source='WL.64', note='Cf. Inferno, iv. 25-7.', kind='quote', targets=refs('Inf.4.25', 'Inf.4.26', 'Inf.4.27')),
    dict(source='WL.74', note="Cf. the Dirge in Webster's White Devil.", kind='allusion',
         targets=find('WhiteDevil.5.4.', r'keep the wolf far thence', after=1)),
    dict(source='WL.76', note='V. Baudelaire, Preface to Fleurs du Mal.', kind='quote',
         targets=find('Fleurs.1.', r'Hypocrite lecteur')),
    # II. A Game of Chess
    dict(source='WL.77', note='Cf. Antony and Cleopatra, II. ii., l. 190.', kind='allusion',
         targets=find('Antony.2.2.', r'barge she sat in', after=1)),
    dict(source='WL.92', note='Laquearia. V. Aeneid, I. 726.', kind='quote', targets=find('Aen.1.', r'laquearibus')),
    dict(source='WL.98', note='Sylvan scene. V. Milton, Paradise Lost, iv. 140.', kind='quote', targets=refs('PL.4.140')),
    dict(source='WL.99', note='V. Ovid, Metamorphoses, vi, Philomela.', kind='reference',
         targets=both(find('Met.6.', r'vi superat'), find('Met.6.', r'pennis pendere'))),
    dict(source='WL.118', note="Cf. Webster: 'Is the wind in that door still?'", kind='quote',
         targets=find('DevilsLaw.', r'Is the wind in that door still')),
    dict(source='WL.138', note="Cf. the game of chess in Middleton's Women beware Women.", kind='reference',
         targets=both(find('WomenBeware.2.2.', r"to chess or draughts"), find('WomenBeware.2.2.', r'here.s our business'))),
    # III. The Fire Sermon
    dict(source='WL.176', note='V. Spenser, Prothalamion.', kind='quote', targets=find('Proth.', r'runne softly')),
    dict(source='WL.192', note='Cf. The Tempest, I. ii.', kind='allusion', targets=refs('Tempest.1.2.389', 'Tempest.1.2.390')),
    dict(source='WL.196', note='Cf. Marvell, To His Coy Mistress.', kind='allusion',
         targets=find('OBEV.357.', r'at my back I always hear', after=1)),
    dict(source='WL.197', note="Cf. Day, Parliament of Bees: 'When of the sudden, listening, you shall hear, / A noise of horns and hunting, which shall bring / Actaeon to Diana in the spring, / Where all shall see her naked skin . . .'",
         kind='allusion', targets=find('ParliamentBees.', r'noise of Hornes', after=1)),
    dict(source='WL.202', note='V. Verlaine, Parsifal.', kind='quote', targets=find('Amour.', r'voix d.enfants chantant')),
    dict(source='WL.218', note='Tiresias ... The whole passage from Ovid is of great anthropological interest (Met. iii. 320-338, quoted).',
         kind='reference', targets=find('Met.3.', r'Tiresiae')),
    dict(source='WL.221', note="This may not appear as exact as Sappho's lines ...", kind='allusion',
         targets=refs('Sappho.W95')),
    dict(source='WL.253', note='V. Goldsmith, the song in The Vicar of Wakefield.', kind='allusion',
         targets=find('Vicar.', r'^When lovely woman stoops to folly')),
    dict(source='WL.257', note='V. The Tempest, as above.', kind='quote', targets=refs('Tempest.1.2.391')),
    dict(source='WL.266', note='The Song of the (three) Thames-daughters begins here ... V. Götterdämmerung, III. i: the Rhine-daughters.',
         kind='reference', targets=find('Gotterdammerung.3.', r'^The sun$', after=1)),
    dict(source='WL.279', note='V. Froude, Elizabeth, Vol. I, ch. iv, letter of De Quadra to Philip of Spain.',
         kind='quote', targets=find('Froude.', r'talk nonsense')),
    dict(source='WL.293', note='Cf. Purgatorio, v. 133.', kind='allusion', targets=refs('Purg.5.133', 'Purg.5.134')),
    dict(source='WL.307', note="V. St. Augustine's Confessions: 'to Carthage then I came, where a cauldron of unholy loves sang all about mine ears.'",
         kind='quote', targets=refs('Conf.3.1')),
    dict(source='WL.308', note="The complete text of the Buddha's Fire Sermon ... will be found translated in ... Warren's Buddhism in Translation.",
         kind='reference', targets=find('SN35.28.', r'ādittaṁ')),
    dict(source='WL.309', note="From St. Augustine's Confessions again.", kind='quote', targets=find('Conf.10.', r'evellis, Domine')),
    # V. What the Thunder Said
    dict(source='WL.360', note='In the first part of Part V three themes are employed: the journey to Emmaus, ...',
         kind='allusion', targets=refs('KJV.Luke.24.15', 'KJV.Luke.24.16')),
    dict(source='WL.366', note='366-76. Cf. Hermann Hesse, Blick ins Chaos.', kind='reference',
         targets=find('Hesse.', r'Schon ist halb Europa')),
    dict(source='WL.401', note="'Datta, dayadhvam, damyata' ... Brihadaranyaka-Upanishad, 5, 1.", kind='quote',
         targets=refs('BU.5.2.1', 'BU.5.2.2', 'BU.5.2.3')),
    dict(source='WL.407', note='Cf. Webster, The White Devil, v. vi.', kind='allusion',
         targets=find('WhiteDevil.5.6.', r'Ere the worm pierce', after=1)),
    dict(source='WL.411', note='Cf. Inferno, xxxiii. 46.', kind='quote', targets=refs('Inf.33.46', 'Inf.33.47')),
    dict(source='WL.427', note='V. Purgatorio, xxvi. 148.', kind='quote',
         targets=refs('Purg.26.145', 'Purg.26.146', 'Purg.26.147', 'Purg.26.148')),
    dict(source='WL.428', note='V. Pervigilium Veneris.', kind='quote', targets=find('PervVen.', r'chelidon')),
    dict(source='WL.429', note='V. Gerard de Nerval, Sonnet El Desdichado.', kind='quote',
         targets=find('Chimeres.1.', r"prince d.Aquitaine")),
    dict(source='WL.431', note="V. Kyd's Spanish Tragedy.", kind='quote',
         targets=find('SpanishTragedy.4.', r"Why then I'll fit you")),
]
