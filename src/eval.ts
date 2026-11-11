// Recall against a gold set: known links between two texts. A fixture directory holds
// source.jsonl and target.jsonl (units) and gold.jsonl ({"source", "target"} per line), and
// optionally fixture.json ({"sourceLang", "targetLang"}) naming the languages when not English.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { link, resolve, DEFAULTS, type LinkOptions } from './link.js'
import { loadUnits } from './units.js'
import { checkInt, ranks } from './util.js'

export interface EvalOptions extends LinkOptions {
  neighbours?: number // also count a target this many units away (a footnote citing the next verse)
}

const KS = [1, 3, 5, 10]

// Languages from fixture.json, unless the options name them.
function withFixtureLangs(dir: string, opts: EvalOptions): EvalOptions {
  const file = join(dir, 'fixture.json')
  if (!existsSync(file) || opts.lang || opts.sourceLang || opts.targetLang) return opts
  const f = JSON.parse(readFileSync(file, 'utf8')) as { sourceLang?: unknown; targetLang?: unknown }
  const str = (x: unknown) => (typeof x === 'string' ? x : undefined)
  return { ...opts, sourceLang: str(f.sourceLang), targetLang: str(f.targetLang) }
}

export async function evaluate(dir: string, options: EvalOptions = {}) {
  const opts = withFixtureLangs(dir, options)
  const run = resolve(opts)
  const source = loadUnits(join(dir, 'source.jsonl'))
  const target = loadUnits(join(dir, 'target.jsonl'))
  const tIndex = new Map(target.map((u, i) => [u.ref, i]))
  const sRefs = new Set(source.map((u) => u.ref))
  const gold = readFileSync(join(dir, 'gold.jsonl'), 'utf8').split('\n').flatMap((l, i) => {
    if (!l.trim()) return []
    const g = JSON.parse(l) as { source?: unknown; target?: unknown }
    if (typeof g.source !== 'string' || typeof g.target !== 'string') throw new Error(`${join(dir, 'gold.jsonl')}:${i + 1}: each line needs "source" and "target" refs`)
    return [{ source: g.source, target: g.target }]
  })
  // A gold link must name a source and a target that exist; the rest are reported, not scored.
  const missing = gold.filter((g) => !tIndex.has(g.target))
  const missingSrc = gold.filter((g) => !sRefs.has(g.source))
  const usable = gold.filter((g) => tIndex.has(g.target) && sRefs.has(g.source))
  const wanted = new Set(usable.map((g) => g.source))
  const units = source.filter((u) => wanted.has(u.ref))
  const near = checkInt('neighbours', opts.neighbours, 0) ?? 0
  const rows: { source: string; target: string; dense: number; lexical: number; chars: number; fused: number; final: number }[] = []
  for await (const r of link(units, target, opts)) {
    const finalRank = new Map(r.ranked.map((c, k) => [c.index, k + 1]))
    const denseRank = ranks(r.dense)
    // A target sharing no word with the source isn't found by overlap, however few targets score.
    const lexRank = r.lexical ? ranks(r.lexical) : undefined
    const lexAt = (j: number) => (lexRank && r.lexical![j] > 0 ? lexRank[j] : Infinity)
    const chrRank = r.chars ? ranks(r.chars) : undefined
    const chrAt = (j: number) => (chrRank && r.chars![j] > 0 ? chrRank[j] : Infinity)
    for (const g of usable.filter((x) => x.source === r.source.ref)) {
      const t = tIndex.get(g.target)!
      const hits = [...Array(2 * near + 1).keys()].map((d) => t + d - near).filter((j) => j >= 0 && j < target.length)
      rows.push({
        source: g.source,
        target: g.target,
        dense: Math.min(...hits.map((j) => denseRank[j])),
        lexical: Math.min(...hits.map(lexAt)),
        chars: Math.min(...hits.map(chrAt)),
        fused: Math.min(...hits.map((j) => r.fusedRank[j])),
        // Final rank is the rank among what ligatura can output: the pool. Outside it, never found.
        final: Math.min(...hits.map((j) => finalRank.get(j) ?? Infinity)),
      })
    }
  }
  const recall = (key: 'dense' | 'lexical' | 'chars' | 'fused' | 'final', k: number) => rows.filter((x) => x[key] <= k).length
  const at = (key: 'dense' | 'lexical' | 'chars' | 'fused' | 'final') => Object.fromEntries(KS.map((k) => [k, recall(key, k)]))
  return {
    gold: gold.length,
    scored: rows.length,
    missingTargets: missing.map((g) => g.target),
    missingSources: missingSrc.map((g) => g.source),
    dense: at('dense'),
    lexical: run.lexical ? at('lexical') : undefined,
    chars: run.lexical && run.target.charGrams ? at('chars') : undefined,
    fused: at('fused'),
    final: at('final'),
    rows,
    method: { embed: run.embed, lang: `${run.source.code}>${run.target.code}`, rerank: opts.rerank ?? DEFAULTS.rerank, pool: opts.pool ?? DEFAULTS.pool, neighbours: near },
  }
}

export function formatEval(e: Awaited<ReturnType<typeof evaluate>>): string {
  const head = `| Stage | ${KS.map((k) => `R@${k}`).join(' | ')} |`
  const line = (name: string, r: Record<string, number>) => `| ${name} | ${KS.map((k) => r[k]).join(' | ')} |`
  const misses = e.rows.filter((r) => r.final > 10).sort((a, b) => a.final - b.final || a.fused - b.fused)
  return [
    `Gold links: ${e.scored} scored of ${e.gold}${e.missingTargets.length ? `; ${e.missingTargets.length} point at targets not in target.jsonl` : ''}${e.missingSources.length ? `; ${e.missingSources.length} name sources not in source.jsonl (${e.missingSources.join(', ')})` : ''}. Neighbours counted: ${e.method.neighbours}.`,
    `Languages ${e.method.lang}. Embed ${e.method.embed}, rerank ${e.method.rerank} on the top ${e.method.pool}.`,
    '',
    head,
    `|---|${KS.map(() => '---|').join('')}`,
    line('Embedding only', e.dense),
    ...(e.lexical ? [line('Overlap only', e.lexical), ...(e.chars ? [line('Character overlap only', e.chars)] : []), line(e.chars ? 'Retrieval (embedding + both overlaps)' : 'Retrieval (embedding + overlap)', e.fused)] : [line('Retrieval (embedding; no overlap across languages)', e.fused)]),
    ...(e.method.rerank === 'none' ? [] : [line('Reranked', e.final)]),
    '',
    `Retrieval ranks the whole target; output covers the top ${e.method.pool} (--pool), so a link past it counts as not found.`,
    ...(misses.length ? [`Outside the top 10: ${misses.map((m) => `${m.source} → ${m.target} (${Number.isFinite(m.final) ? m.final : `retrieval rank ${m.fused}, outside the pool`})`).join('; ')}`] : []),
  ].join('\n')
}
