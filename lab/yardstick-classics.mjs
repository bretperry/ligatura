// Yardstick for the fine-tuned bge-m3 (lab/finetune.py), loaded from ~/.cache/ligatura/onnx/bge-m3-classics.
//   node lab/yardstick-classics.mjs <label> <q8|fp32> [--langs la,grc,sa]
// <label> names the cache and result file, so different checkpoints don't share cached vectors.
import { appendFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { MODELS, localEncoder, yardstick } from './yardstick.mjs'

const [label, dtype] = process.argv.slice(2)
const li = process.argv.indexOf('--langs')
const langs = li > 0 ? process.argv[li + 1].split(',') : ['la', 'grc', 'sa']
const name = `${label}-${dtype}`
MODELS[name] = { id: 'bge-m3-classics', local: join(homedir(), '.cache/ligatura/onnx/'), pooling: 'cls', dtype }
const enc = localEncoder(name)
const res = { model: name, ...MODELS[name], results: [] }
const LAB = new URL('.', import.meta.url).pathname
for (const lang of langs) {
  const r = await yardstick({ lang, encodeEnglish: (rows) => enc(rows.map((x) => x.en), 'query'), encodeOriginal: [(rows) => enc(rows.map((x) => x.orig), 'doc')] })
  res.results.push({ variant: lang === 'sa' ? 'devanagari' : 'plain', ...r })
  const line = `${name}\t${lang}\t${lang === 'sa' ? 'devanagari' : 'plain'}\tMRR ${r.mrr}\tR@1 ${r.r1}\tR@10 ${r.r10}\t${r.encodeS}s\t${Object.entries(r.bySource).map(([s, x]) => `${s} ${x.mrr}`).join('  ')}`
  console.log(line)
  appendFileSync(join(LAB, 'yardstick-results/run.log'), line + '\n')
  writeFileSync(join(LAB, 'yardstick-results', `${name}.json`), JSON.stringify(res, null, 1))
}
