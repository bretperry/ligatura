#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { LOCAL_EMBEDDERS } from './embed.js'
import { evaluate, formatEval } from './eval.js'
import { link, toLinks, DEFAULTS } from './link.js'
import { loadUnits, type Split } from './units.js'
import { setQuiet } from './util.js'

const HELP = `ligatura: find where one text quotes, paraphrases or alludes to another.

Usage
  ligatura link <source> <target> [options] > links.jsonl
  ligatura eval <fixture-dir> [options]

Inputs are JSONL ({"ref", "text"} per line) or plain text, split into sentences.
Every link is a suggestion for a person to confirm.

Options
  --embed <model>     ${Object.keys(LOCAL_EMBEDDERS).join(', ')} (in process; default ${DEFAULTS.embed}),
                      or openai:<base-url>#<model> for any OpenAI-compatible server
  --rerank <model>    none (default), qwen3-reranker-0.6b (in process), api:<url>#<model> for a
                      /v1/rerank server, or chat:<base-url>#<model> for a chat model as judge
  --pool <n>          candidates the reranker reads per unit (default ${DEFAULTS.pool})
  --top <n>           links kept per source unit (default 3)
  --min-score <x>     keep only links scoring at least x (see "score" in the README)
  --task <text>       the instruction the reranker reads
  --split <mode>      for plain text: sentence (default), paragraph or line
  --min-words <n>     for plain text: drop units shorter than n words (default 1, keep all)
  --neighbours <n>    eval: also count a target n units away from the gold one (default 0)
  --json              eval: print JSON
  --quiet             no progress on stderr

Defaults run locally and need no account. Models download on first use and are cached.
API keys for remote servers: LIGATURA_EMBED_API_KEY and LIGATURA_RERANK_API_KEY, or
LIGATURA_API_KEY when only one server needs a key. Keys go only over https, or to localhost.
LIGATURA_NO_CACHE=1 turns off the vector cache.`

let parsed: ReturnType<typeof parseOpts>
try {
  parsed = parseOpts()
} catch (err) {
  console.error(`ligatura: ${(err as Error).message}`)
  process.exit(2)
}
const { values, positionals } = parsed

function parseOpts() {
  return parseArgs({
  allowPositionals: true,
  options: {
    embed: { type: 'string' }, rerank: { type: 'string' }, pool: { type: 'string' }, top: { type: 'string' },
    'min-score': { type: 'string' }, task: { type: 'string' }, split: { type: 'string' }, neighbours: { type: 'string' }, 'min-words': { type: 'string' },
    json: { type: 'boolean' }, quiet: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
  },
  })
}

function fail(msg: string): never {
  console.error(`ligatura: ${msg}`)
  process.exit(2)
}
// --name n: a whole number at least min.
const int = (name: string, min: number) => {
  const s = values[name as keyof typeof values] as string | undefined
  if (s === undefined) return undefined
  const n = Number(s)
  if (s.trim() === '' || !Number.isInteger(n) || n < min) fail(`--${name} must be a whole number of at least ${min}, got "${s}"`)
  return n
}
const real = (name: string) => {
  const s = values[name as keyof typeof values] as string | undefined
  if (s === undefined) return undefined
  const n = Number(s)
  if (s.trim() === '' || !Number.isFinite(n)) fail(`--${name} must be a number, got "${s}"`)
  return n
}
const SPLITS = ['auto', 'sentence', 'paragraph', 'line']
const [cmd, ...args] = positionals
setQuiet(!!values.quiet)
const opts = { embed: values.embed, rerank: values.rerank, pool: int('pool', 1), task: values.task }

if (values.version) {
  console.log((JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version)
} else if (values.help || !cmd) {
  console.log(HELP)
} else if (cmd === 'link' && args.length === 2) {
  const split = (values.split ?? 'auto') as Split
  if (!SPLITS.includes(split)) fail(`--split must be one of ${SPLITS.join(', ')}, got "${split}"`)
  const minWords = int('min-words', 1) ?? 1
  const top = int('top', 0) ?? 3
  const minScore = real('min-score')
  try {
    const source = loadUnits(args[0], split, minWords)
    const target = loadUnits(args[1], split, minWords)
    for await (const r of link(source, target, opts)) {
      for (const l of toLinks(r, target, { ...opts, top, minScore })) process.stdout.write(`${JSON.stringify(l)}\n`)
    }
  } catch (err) {
    fail((err as Error).message)
  }
} else if (cmd === 'eval' && args.length === 1) {
  const neighbours = int('neighbours', 0)
  const e = await evaluate(args[0], { ...opts, neighbours }).catch((err: Error) => fail(err.message))
  console.log(values.json ? JSON.stringify(e, null, 1) : formatEval(e))
} else {
  console.error(HELP)
  process.exit(2)
}
