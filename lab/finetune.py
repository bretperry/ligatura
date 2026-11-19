# Fine-tune bge-m3 on English <-> Latin / Greek / Sanskrit parallel text (lab/corpora.py splits).
#
#   uv run --with sentence-transformers --with torch --with datasets --with accelerate --with peft \
#     python3 -I lab/finetune.py train --out DIR --la 5000 --grc 5000 --sa 10000 [--epochs 1]
#   ... lab/finetune.py merge --model DIR/best --out MERGED   # fold LoRA into the base weights
#   ... lab/finetune.py test --model DIR           # yardstick metric in PyTorch (fp32)
#
# Train uses only the train split; checkpoint choice uses only dev. Test and pool are read by
# `test` alone. English is the anchor, the original the positive; MultipleNegativesRankingLoss
# (in-batch negatives, cached so batches can be large). Each batch holds one language, so the
# negatives are same-script and hard.
import argparse, json, random, sys, time
from pathlib import Path

LAB = Path(sys.argv[0]).resolve().parent
DATA = LAB / 'data'
BASE = 'BAAI/bge-m3'
SEED = 20261109


def load(lang):
    by = {}
    for line in open(DATA / 'corpora' / f'{lang}.jsonl'):
        r = json.loads(line)
        by[r['id']] = r
    ids = json.load(open(DATA / 'splits' / f'{lang}.json'))['ids']
    return by, ids


def train(a):
    import torch
    from datasets import Dataset
    from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, SentenceTransformerTrainingArguments
    from sentence_transformers.evaluation import InformationRetrievalEvaluator, SequentialEvaluator
    from sentence_transformers.losses import CachedMultipleNegativesRankingLoss
    from sentence_transformers.training_args import BatchSamplers, MultiDatasetBatchSamplers
    from transformers import TrainerCallback

    # MPS SDPA has no attention dropout; turn it off (hidden dropout stays)
    model = SentenceTransformer(a.base, device='mps' if torch.backends.mps.is_available() else 'cpu',
                                config_kwargs={'attention_probs_dropout_prob': 0.0})
    model.max_seq_length = a.max_len
    # Freeze the 250k x 1024 word embeddings: saves ~3 GB of optimizer state and keeps
    # vocabulary of languages we don't train on where it was.
    model[0].auto_model.embeddings.word_embeddings.weight.requires_grad_(False)
    if a.lora:
        # LoRA on every linear layer: a full fine-tune's optimizer state swaps on a 24 GB Mac.
        from peft import LoraConfig, TaskType
        model.add_adapter(LoraConfig(r=a.lora, lora_alpha=2 * a.lora, lora_dropout=0.05, task_type=TaskType.FEATURE_EXTRACTION,
                                     target_modules=['query', 'key', 'value', 'dense'],
                                     # adapt only the top layers: no backward pass through the rest (MPS is slow)
                                     layers_to_transform=list(range(24 - a.top, 24)) if a.top else None))
    n_train = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print('trainable params', n_train, flush=True)

    rng = random.Random(SEED)
    train_sets, evals = {}, []
    for lang in ('la', 'grc', 'sa'):
        by, ids = load(lang)
        tr = list(ids['train'])
        held = set(ids['test']) | set(ids['pool'])
        assert not held & set(tr) and not held & set(ids['dev'])
        rng.shuffle(tr)
        n = getattr(a, lang)
        # n above the train size means repeat (oversample) the shuffled list
        pick = (tr * (n // len(tr) + 1))[:n]
        train_sets[lang] = Dataset.from_dict({'anchor': [by[i]['en'] for i in pick], 'positive': [by[i]['orig'] for i in pick]})
        dev = ids['dev'][:a.dev_n]
        evals.append(InformationRetrievalEvaluator(
            queries={i: by[i]['en'] for i in dev}, corpus={i: by[i]['orig'] for i in dev},
            relevant_docs={i: {i} for i in dev}, name=f'dev-{lang}', mrr_at_k=[10], ndcg_at_k=[10],
            accuracy_at_k=[1, 10], precision_recall_at_k=[10], map_at_k=[10], batch_size=32, show_progress_bar=False))
        print(lang, 'train', len(pick), 'unique', len(set(pick)), 'dev', len(dev), flush=True)
    keys = [f'dev-{l}_cosine_mrr@10' for l in ('la', 'grc', 'sa')]
    # Choose checkpoints on mean dev MRR, Sanskrit counted twice (it is the target).
    ev = SequentialEvaluator(evals, main_score_function=lambda s: (s[0] + s[1] + 2 * s[2]) / 4)

    out = Path(a.out)
    best = {'score': -1}

    class SaveBest(TrainerCallback):
        def on_evaluate(self, args, state, control, metrics=None, **kw):
            m = {k.removeprefix('eval_'): v for k, v in (metrics or {}).items()}
            if not all(k in m for k in keys):
                return
            sc = (m[keys[0]] + m[keys[1]] + 2 * m[keys[2]]) / 4
            line = {'step': state.global_step, 'score': round(sc, 4), **{k.split('_')[0]: round(m[k], 4) for k in keys}}
            print('DEV', json.dumps(line), flush=True)
            with open(out / 'dev.log', 'a') as f:
                f.write(json.dumps(line) + '\n')
            if sc > best['score']:
                best.update(score=sc, step=state.global_step)
                model.save(str(out / 'best'))
                (out / 'best' / 'dev.json').write_text(json.dumps(line))

    out.mkdir(parents=True, exist_ok=True)
    from sentence_transformers.losses import MultipleNegativesRankingLoss
    loss = CachedMultipleNegativesRankingLoss(model, mini_batch_size=a.mini_batch) if a.mini_batch else MultipleNegativesRankingLoss(model)
    args = SentenceTransformerTrainingArguments(
        output_dir=str(out / 'trainer'), num_train_epochs=a.epochs, per_device_train_batch_size=a.batch,
        learning_rate=a.lr, warmup_steps=0.1, weight_decay=0.01, lr_scheduler_type='linear',
        batch_sampler=BatchSamplers.NO_DUPLICATES, multi_dataset_batch_sampler=MultiDatasetBatchSamplers.PROPORTIONAL,
        eval_strategy='steps', eval_steps=a.eval_steps, save_strategy='steps', save_steps=50,
        save_total_limit=2, save_only_model=False, logging_steps=20, seed=SEED,
        report_to='none', dataloader_drop_last=True, max_steps=a.max_steps,
        bf16=a.bf16, gradient_checkpointing=a.grad_ckpt, gradient_checkpointing_kwargs={'use_reentrant': False})
    trainer = SentenceTransformerTrainer(model=model, args=args, train_dataset=train_sets, loss=loss, evaluator=ev,
                                         callbacks=[SaveBest()])
    # baseline on dev, before any update
    ckpts = sorted((out / 'trainer').glob('checkpoint-*'), key=lambda c: int(c.name.split('-')[1]))
    if ckpts:  # resume after a crash or restart; dev.log and best/ carry over
        prev = [json.loads(l) for l in open(out / 'dev.log')] if (out / 'dev.log').exists() else []
        if prev:
            b = max(prev, key=lambda x: x['score'])
            best.update(score=b['score'], step=b['step'])
        print('RESUME', ckpts[-1], 'best so far', best, flush=True)
    elif not a.no_baseline:
        m0 = ev(model)
        SaveBest().on_evaluate(args, trainer.state, None, metrics=m0)
    t0 = time.time()
    trainer.train(resume_from_checkpoint=str(ckpts[-1]) if ckpts else None)
    m = ev(model)
    SaveBest().on_evaluate(args, trainer.state, None, metrics=m)
    print('TRAIN_SECONDS', round(time.time() - t0), 'BEST', best, flush=True)


def merge(a):
    # Fold a saved LoRA adapter into the base weights; write a plain SentenceTransformer dir.
    import torch
    from peft import PeftModel
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(a.base, device='cpu')
    model[0].auto_model = PeftModel.from_pretrained(model[0].auto_model, a.model).merge_and_unload()
    model.save(a.out)
    print('merged', a.model, '->', a.out)


def test(a):
    import numpy as np, torch
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(a.model, device='mps' if torch.backends.mps.is_available() else 'cpu')
    model.max_seq_length = 8192 if a.full_len else a.max_len
    res = {}
    for lang in a.langs.split(','):
        by, ids = load(lang)
        test, hay = [by[i] for i in ids['test']], [by[i] for i in ids['test'] + ids['pool']]
        Q = model.encode([r['en'] for r in test], batch_size=32, normalize_embeddings=True, convert_to_numpy=True)
        D = model.encode([r['orig'] for r in hay], batch_size=32, normalize_embeddings=True, convert_to_numpy=True)
        S = Q @ D.T
        ranks = 1 + (S > S[np.arange(len(test)), np.arange(len(test))][:, None]).sum(1)
        res[lang] = dict(mrr=round(float((1 / ranks).mean()), 3), r1=round(float((ranks == 1).mean()), 3), r10=round(float((ranks <= 10).mean()), 3))
        print(a.model, lang, res[lang], flush=True)
    return res


def english(a):
    # English<->English sanity check, on text never trained on.
    # 1. CPDV -> Douay-Rheims: the same verse in two English translations. Vulgate verses from the
    #    Latin test+pool split only (their DRC side is never a training anchor). 500 CPDV queries
    #    against every DRC verse in that set.
    # 2. Kempis -> Gospels (fixtures/kempis-gospels): footnoted quotations, rank of the gold verse
    #    among 3,766, a neighbouring verse counts (as `ligatura eval --neighbours 1`).
    import csv, numpy as np, torch
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(a.model, device=a.device or ('mps' if torch.backends.mps.is_available() else 'cpu'))
    model.max_seq_length = a.max_len
    enc = lambda xs: model.encode(xs, batch_size=32, normalize_embeddings=True, convert_to_numpy=True)
    def stats(ranks):
        r = np.array(ranks)
        return dict(n=len(r), mrr=round(float((1 / r).mean()), 3), r1=round(float((r == 1).mean()), 3), r10=round(float((r <= 10).mean()), 3))
    by, ids = load('la')
    held = [i for i in ids['test'] + ids['pool'] if i.startswith('vul:')]
    rows = {f"vul:{x['book']}.{x['chapter']}.{x['verse']}": x for x in csv.DictReader(open(DATA / 'raw/jam963_parallel-catholic-bible-versions/parallel_bible_data.csv'))}
    held = [i for i in held if rows.get(i, {}).get('cpdv')]
    q = random.Random(SEED).sample(held, 500)
    Q, D = enc([rows[i]['cpdv'] for i in q]), enc([rows[i]['drc'] for i in held])
    S = Q @ D.T
    gold = np.array([held.index(i) for i in q])
    ranks = 1 + (S > S[np.arange(len(q)), gold][:, None]).sum(1)
    out = {'cpdv->drc': stats(ranks), 'haystack': len(held)}
    fx = LAB.parent / 'fixtures/kempis-gospels'
    rd = lambda f: [json.loads(l) for l in open(fx / f)]
    src = {r['ref']: r['text'] for r in rd('source.jsonl')}
    tgt = rd('target.jsonl')
    pos = {r['ref']: k for k, r in enumerate(tgt)}
    gold = [g for g in rd('gold.jsonl') if g['target'] in pos]
    T = enc([r['text'] for r in tgt])
    srcs = sorted({g['source'] for g in gold})
    Qk = dict(zip(srcs, enc([src[s] for s in srcs])))
    kr = []
    for g in gold:
        sc = T @ Qk[g['source']]
        k = pos[g['target']]
        best = max(sc[max(0, k - 1):k + 2])  # neighbour tolerance
        kr.append(1 + int((sc > best).sum()))
    out['kempis->gospels'] = stats(kr)
    print('ENGLISH', a.model, json.dumps(out), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['train', 'test', 'merge', 'english'])
    p.add_argument('--base', default=BASE)
    p.add_argument('--out')
    p.add_argument('--model', default=BASE)
    p.add_argument('--la', type=int, default=5000)
    p.add_argument('--grc', type=int, default=5000)
    p.add_argument('--sa', type=int, default=10000)
    p.add_argument('--epochs', type=float, default=1)
    p.add_argument('--max-steps', type=int, default=-1)
    p.add_argument('--batch', type=int, default=64)
    p.add_argument('--mini-batch', type=int, default=16)
    p.add_argument('--lr', type=float, default=1e-4)
    p.add_argument('--lora', type=int, default=32, help='LoRA rank; 0 = full fine-tune')
    p.add_argument('--max-len', type=int, default=192)
    p.add_argument('--full-len', action='store_true')
    p.add_argument('--top', type=int, default=0, help='LoRA on the top N of 24 layers only; 0 = all')
    p.add_argument('--bf16', action='store_true')
    p.add_argument('--grad-ckpt', action='store_true')
    p.add_argument('--no-baseline', action='store_true')
    p.add_argument('--device')
    p.add_argument('--eval-steps', type=int, default=100)
    p.add_argument('--dev-n', type=int, default=1000)
    p.add_argument('--langs', default='la,grc,sa')
    a = p.parse_args()
    {'train': train, 'test': test, 'merge': merge, 'english': english}[a.mode](a)
