// SPDX-License-Identifier: EPL-2.0
// Mission 7h (H4, T10): the TS layout of each of the 27 goldens of test/golden/layered.json equals its ref
// `test/golden/refs/elk-layered/<id>.json` at AD-4: the 24 of 7h (4 models x 4 directions and 2 hierarchy modes) and
// the 3 generated tree inputs that #68 moved here from the trees set (the oracle recorded them with layered, the
// default, because the inputs set no algorithm). The pipeline mirrors `tools/oracle/harness/CaseRunner.java` as
// `layered-goldens.test.ts` does. It reads refs and never writes them.
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
/** Manifest paths under this prefix are repo files of `test/corpus/`, vendored byte for byte under INPUTS_DIR (#68). */
const GENERATED_PREFIX = 'generated/';
const GENERATED_SOURCE_DIR = path.join(ROOT, 'test', 'corpus');
const GENERATED_ALGORITHMS = ['mrtree', 'radial', 'vertiflex'] as const;
const LAYERED_ALGORITHM = 'org.eclipse.elk.layered';
const DEFAULT_VARIANT = 'default';
const RESOLVED_ALGORITHM_OPTION = 'resolvedAlgorithm';

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
const generated = entries.filter((e) => e.path.startsWith(GENERATED_PREFIX));
/** The 24 model x variant entries of 7h. */
const grid = entries.filter((e) => !e.path.startsWith(GENERATED_PREFIX));

describe('layered hierarchy goldens (AD-4)', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('has 24 entries with known variants and unique ids', () => {
    const known = loadVariantNames();
    expect(grid).toHaveLength(ENTRY_COUNT);
    expect(entries.filter((e) => !known.includes(e.variant))).toEqual([]);
    expect(new Set(grid.map((e) => e.id)).size).toBe(ENTRY_COUNT);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it('covers every model x variant cell once', () => {
    const models = [...new Set(grid.map((e) => e.path))].sort();
    expect(models).toEqual(
      [...new Set(loadManifest().golden.map((g) => g.path))].sort(),
    );
    expect(models).toHaveLength(MODEL_COUNT);
    for (const model of models) {
      const variants = grid.filter((e) => e.path === model).map((e) => e.variant);
      expect([...variants].sort()).toEqual([...VARIANTS].sort());
    }
  });

  it('holds the three generated tree inputs as layered goldens (#68)', () => {
    expect(generated.map((e) => [e.id, e.path, e.algorithm, e.variant, e.retarget])).toEqual(
      GENERATED_ALGORITHMS.map((alg) => [
        `generated-${alg}-tree-small--default`,
        `generated/${alg}-tree-small.json`,
        LAYERED_ALGORITHM,
        DEFAULT_VARIANT,
        undefined,
      ]),
    );
    expect(entries).toHaveLength(ENTRY_COUNT + GENERATED_ALGORITHMS.length);
    for (const entry of generated) {
      const vendored = readFileSync(path.join(INPUTS_DIR, entry.path), 'utf8');
      expect(vendored).toBe(readFileSync(path.join(GENERATED_SOURCE_DIR, entry.path), 'utf8'));
      const ref = readJson(path.join(REFS_DIR, `${entry.id}.json`)) as { layoutOptions?: Record<string, unknown> };
      expect(ref.layoutOptions?.[RESOLVED_ALGORITHM_OPTION]).toBe(`Layout Algorithm: ${LAYERED_ALGORITHM}`);
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
