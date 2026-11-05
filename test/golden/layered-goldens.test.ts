// SPDX-License-Identifier: EPL-2.0
// Exit check of the layered-pipeline mission (AD-4, F4): the TS layout of each golden of test/corpus/manifest.json equals
// its unflagged oracle ref `test/golden/refs/elk/<id>.json`. The pipeline mirrors `tools/oracle/harness/CaseRunner.java`
// (read ELK JSON, overlay, recursive engine, `exportLikeOracle`). It reads refs and never writes them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../helpers/layered-framework-replay.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { applyOverlay } from '../helpers/graph-overlay.js';
import { loadManifest, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'inputs', 'pipeline');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk');
const GOLDEN_COUNT = 4;

function layout(entry: GoldenEntry): unknown {
  const graph = ElkGraphJson.forGraph(readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8')).toElk();
  applyOverlay(graph, entry.retarget ?? null, entry.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return JSON.parse(exportLikeOracle(graph)) as unknown;
}

const golden = loadManifest().golden;

describe('layered goldens (AD-4)', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('covers the four manifest goldens', () => {
    expect(golden).toHaveLength(GOLDEN_COUNT);
  });

  it.each(golden.map((entry) => [entry.id, entry] as const))('%s equals the oracle ref', (id, entry) => {
    const ref: unknown = JSON.parse(readFileSync(path.join(REFS_DIR, `${id}.json`), 'utf8'));
    const result = compareLayout(ref, layout(entry));
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });
});
