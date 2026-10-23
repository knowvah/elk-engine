// SPDX-License-Identifier: EPL-2.0
// Exit check of the core-engine mission (AD-4): the TS layout of every algorithm golden equals the oracle ref. The
// pipeline mirrors `tools/oracle/harness/CaseRunner.java`: read ELK JSON, overlay (variant, retarget), lay out with the
// recursive engine, export with `omitLayout(false)`, `omitZeroDimension(false)`, `omitZeroPositions(false)`,
// `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { applyOverlay } from '../helpers/graph-overlay.js';
import { isGoldenEntry, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'inputs');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-algorithms');
const MAX_LAYOUT_MS = 1000;

function loadGolden(): GoldenEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(path.join(GOLDEN_DIR, 'algorithms.json'), 'utf8'));
  const entries = (parsed as { golden?: unknown }).golden;
  if (!Array.isArray(entries) || !entries.every(isGoldenEntry)) {
    throw new Error('Invalid algorithms manifest');
  }
  return entries;
}

interface Laid {
  readonly json: unknown;
  readonly ms: number;
}

function layoutGolden(entry: GoldenEntry): Laid {
  const graph = ElkGraphJson.forGraph(readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8')).toElk();
  applyOverlay(graph, entry.retarget ?? null, entry.variant);
  const start = performance.now();
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  const ms = performance.now() - start;
  const text = ElkGraphJson.forGraph(graph)
    .omitLayout(false)
    .omitZeroDimension(false)
    .omitZeroPositions(false)
    .omitUnknownLayoutOptions(true)
    .prettyPrint(true)
    .toJson();
  return { json: JSON.parse(text), ms };
}

const golden = loadGolden();

describe('layout goldens (AD-4)', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
    expect(CoreOptions.ALGORITHM.getId()).toBe('org.eclipse.elk.algorithm');
  });

  it.each(golden.map((g) => [g.id, g] as const))('%s equals the oracle ref', (id, entry) => {
    const ref: unknown = JSON.parse(readFileSync(path.join(REFS_DIR, `${id}.json`), 'utf8'));
    let laid = layoutGolden(entry);
    if (laid.ms > MAX_LAYOUT_MS) {
      const retry = layoutGolden(entry);
      console.warn(JSON.stringify({ level: 'warn', msg: 'slow layout', id, firstMs: laid.ms, retryMs: retry.ms }));
      laid = retry;
    }
    console.info(JSON.stringify({ level: 'info', msg: 'layout time', id, ms: Math.round(laid.ms * 10) / 10 }));
    const result = compareLayout(ref, laid.json);
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
    expect(laid.ms).toBeLessThanOrEqual(MAX_LAYOUT_MS);
  });
});
