// SPDX-License-Identifier: EPL-2.0
// Mission text-sizing-seam (T3, TX6a): for every model of the oracle ref test/golden/refs/java/label-sizing.json, the TS test
// framework sizes every label as the patched oracle does in fixed mode (same keys, same sizes, same `preset`) and lays the model
// out to the ref's layout at AD-4. The ref is frozen: this test reads it and never writes it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registerTreeAlgorithms } from '../../tools/corpus/ts-layout-pipeline.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { repoRoot } from '../corpus/corpus.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { labelRows } from '../helpers/label-sizing-rows.js';
import { FIXED_ADVANCE_TEXT_MEASURER } from '../helpers/layout-test-text-measurer.js';
import { compareLayout, formatDiffs } from './compare-json.js';

interface RefRow {
  readonly key: string;
  readonly text: string | null;
  readonly size: readonly [number, number];
  readonly preset: boolean;
}

interface RefModel {
  readonly path: string;
  readonly labels: readonly RefRow[];
  readonly layout?: unknown;
  readonly throws?: string;
}

const ROOT = repoRoot();
const REF = JSON.parse(readFileSync(path.join(ROOT, 'test', 'golden', 'refs', 'java', 'label-sizing.json'), 'utf8')) as {
  readonly measurer: string;
  readonly models: readonly RefModel[];
};
const EXPECTED_MODELS = 119;
const CLASS_NAME_END = ':';

function loadGraph(model: RefModel): ReturnType<typeof ElkGraphText.load>['root'] {
  const loaded = ElkGraphText.load(readFileSync(path.join(ROOT, model.path), 'utf8'));
  if (loaded.root === null || loaded.errors.length > 0) {
    throw new Error(`elkt load failed for ${model.path}: ${loaded.errors[0]?.message ?? 'no root'}`);
  }
  return loaded.root;
}

function layOut(model: RefModel): unknown {
  const graph = loadGraph(model)!;
  labelRows(graph, FIXED_ADVANCE_TEXT_MEASURER);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return JSON.parse(exportLikeOracle(graph)) as unknown;
}

describe('label sizing and layout against the oracle (fixed measurer)', () => {
  registerTreeAlgorithms();

  it('the ref is in fixed mode and has the 119 models, each once', () => {
    expect(REF.measurer).toBe('fixed');
    expect(REF.models).toHaveLength(EXPECTED_MODELS);
    expect(new Set(REF.models.map((m) => m.path)).size).toBe(EXPECTED_MODELS);
  });

  it.each(REF.models.map((model) => [model.path, model] as const))('%s: labels', (_path, model) => {
    const rows = labelRows(loadGraph(model)!, FIXED_ADVANCE_TEXT_MEASURER);
    expect(rows.map((r) => r.key)).toEqual(model.labels.map((r) => r.key));
    expect(rows.map((r) => ({ ...r, size: [...r.size] }))).toEqual(
      model.labels.map((r) => ({ key: r.key, text: r.text, size: [...r.size], preset: r.preset })),
    );
  });

  it.each(REF.models.map((model) => [model.path, model] as const))('%s: layout', (_path, model) => {
    if (model.throws !== undefined) {
      expect(() => layOut(model)).toThrow(model.throws.split(CLASS_NAME_END)[0]);
      return;
    }
    const result = compareLayout(model.layout, layOut(model));
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });
});
