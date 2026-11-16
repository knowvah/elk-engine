// SPDX-License-Identifier: EPL-2.0
// Mission 7h (H4, T10): the TS layout of each of the 24 goldens of test/golden/layered.json (4 models x 4 directions
// and 2 hierarchy modes) equals its ref `test/golden/refs/elk-layered/<id>.json` at AD-4. The pipeline mirrors
// `tools/oracle/harness/CaseRunner.java` as `layered-goldens.test.ts` does. It reads refs and never writes them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../helpers/layered-framework-replay.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { applyOverlay } from '../helpers/graph-overlay.js';
import { isGoldenEntry, loadManifest, loadVariantNames, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { compareLayout, formatDiffs } from './compare-json.js';

const ROOT = repoRoot();
const GOLDEN_DIR = path.join(ROOT, 'test', 'golden');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'inputs', 'pipeline');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-layered');
const MANIFEST_FILE = path.join(GOLDEN_DIR, 'layered.json');
const META_FILE = path.join(REFS_DIR, '_meta.json');
const ELK_COMMIT_FILE = path.join(ROOT, 'tools', 'oracle', 'ELK_COMMIT');
const JVM_FLAGS = '-XX:hashCode=2';
const VARIANTS = [
  'direction-right',
  'direction-left',
  'direction-down',
  'direction-up',
  'hierarchy-include',
  'hierarchy-separate',
] as const;
const MODEL_COUNT = 4;
const ENTRY_COUNT = MODEL_COUNT * VARIANTS.length;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function loadEntries(): readonly GoldenEntry[] {
  const parsed = readJson(MANIFEST_FILE) as { golden?: unknown };
  const list = parsed.golden;
  if (!Array.isArray(list) || !list.every(isGoldenEntry)) {
    throw new Error(`Invalid layered manifest: ${MANIFEST_FILE}`);
  }
  return list;
}

function layout(entry: GoldenEntry): unknown {
  const graph = ElkGraphJson.forGraph(readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8')).toElk();
  applyOverlay(graph, entry.retarget ?? null, entry.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return JSON.parse(exportLikeOracle(graph)) as unknown;
}

const entries = loadEntries();

describe('layered hierarchy goldens (AD-4)', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('has 24 entries with known variants and unique ids', () => {
    const known = loadVariantNames();
    expect(entries).toHaveLength(ENTRY_COUNT);
    expect(entries.filter((e) => !known.includes(e.variant))).toEqual([]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(ENTRY_COUNT);
  });

  it('covers every model x variant cell once', () => {
    const models = [...new Set(entries.map((e) => e.path))].sort();
    expect(models).toEqual(
      [...new Set(loadManifest().golden.map((g) => g.path))].sort(),
    );
    expect(models).toHaveLength(MODEL_COUNT);
    for (const model of models) {
      const variants = entries.filter((e) => e.path === model).map((e) => e.variant);
      expect([...variants].sort()).toEqual([...VARIANTS].sort());
    }
  });

  it('_meta.json names the jvm flag and the pinned commit', () => {
    const meta = readJson(META_FILE) as Record<string, unknown>;
    expect(meta['jvmFlags']).toBe(JVM_FLAGS);
    expect(meta['elkCommit']).toBe(readFileSync(ELK_COMMIT_FILE, 'utf8').trim());
  });

  it.each(entries.map((entry) => [entry.id, entry] as const))('%s equals the oracle ref', (id, entry) => {
    const ref = readJson(path.join(REFS_DIR, `${id}.json`));
    const result = compareLayout(ref, layout(entry));
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });
});
