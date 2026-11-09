// Recall against a gold set: known links between two texts. A fixture directory holds
// source.jsonl and target.jsonl (units) and gold.jsonl ({"source", "target"} per line).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { link, DEFAULTS, type LinkOptions } from './link.js'
import { loadUnits } from './units.js'
import { checkInt } from './util.js'

export interface EvalOptions extends LinkOptions {
  neighbours?: number // also count a target this many units away (a footnote citing the next verse)
}

const KS = [1, 3, 5, 10]

export async function evaluate(dir: string, opts: EvalOptions = {}) {
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
  const rows: { source: string; target: string; fused: number; final: number }[] = []
  for await (const r of link(units, target, opts)) {
    const finalRank = new Map(r.ranked.map((c, k) => [c.index, k + 1]))
    for (const g of usable.filter((x) => x.source === r.source.ref)) {
      const t = tIndex.get(g.target)!
      const hits = [...Array(2 * near + 1).keys()].map((d) => t + d - near).filter((j) => j >= 0 && j < target.length)
      rows.push({
        source: g.source,
        target: g.target,
        fused: Math.min(...hits.map((j) => r.fusedRank[j])),
        // Final rank is the rank among what ligatura can output: the pool. Outside it, never found.
        final: Math.min(...hits.map((j) => finalRank.get(j) ?? Infinity)),
      })
    }
  }
  const recall = (key: 'fused' | 'final', k: number) => rows.filter((x) => x[key] <= k).length
  return {
    gold: gold.length,
    scored: rows.length,
    missingTargets: missing.map((g) => g.target),
    missingSources: missingSrc.map((g) => g.source),
    fused: Object.fromEntries(KS.map((k) => [k, recall('fused', k)])),
    final: Object.fromEntries(KS.map((k) => [k, recall('final', k)])),
    rows,
    method: { embed: opts.embed ?? DEFAULTS.embed, rerank: opts.rerank ?? DEFAULTS.rerank, pool: opts.pool ?? DEFAULTS.pool, neighbours: near },
  }
}

export function formatEval(e: Awaited<ReturnType<typeof evaluate>>): string {
  const head = `| Stage | ${KS.map((k) => `R@${k}`).join(' | ')} |`
  const line = (name: string, r: Record<string, number>) => `| ${name} | ${KS.map((k) => r[k]).join(' | ')} |`
  const misses = e.rows.filter((r) => r.final > 10).sort((a, b) => a.final - b.final || a.fused - b.fused)
  return [
    `Gold links: ${e.scored} scored of ${e.gold}${e.missingTargets.length ? `; ${e.missingTargets.length} point at targets not in target.jsonl` : ''}${e.missingSources.length ? `; ${e.missingSources.length} name sources not in source.jsonl (${e.missingSources.join(', ')})` : ''}. Neighbours counted: ${e.method.neighbours}.`,
    `Embed ${e.method.embed}, rerank ${e.method.rerank} on the top ${e.method.pool}.`,
    '',
    head,
    `|---|${KS.map(() => '---|').join('')}`,
    line('Retrieval (embedding + overlap)', e.fused),
    ...(e.method.rerank === 'none' ? [] : [line('Reranked', e.final)]),
    '',
    `Retrieval ranks the whole target; output covers the top ${e.method.pool} (--pool), so a link past it counts as not found.`,
    ...(misses.length ? [`Outside the top 10: ${misses.map((m) => `${m.source} → ${m.target} (${Number.isFinite(m.final) ? m.final : `retrieval rank ${m.fused}, outside the pool`})`).join('; ')}`] : []),
  ].join('\n')
}
