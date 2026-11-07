// SPDX-License-Identifier: EPL-2.0
// Structural tests of the labels row selection and the rowCounts check, on a small in-memory ref.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadLabelsRows,
  countRows,
  lastPrefixEntry,
  loadLabelsFile,
  rowCountsDifference,
  rowsByClass,
  rowsByGroup,
  rowsByLastPrefixEntry,
} from './layered-labels-replay-rows.js';
import type { PipelineRow } from './layered-pipeline-replay-rows.js';

const INPUT = { elk: { id: 'root' } };
const GEOMETRY = { nodes: {}, edges: {} };
const full = (id: string): Record<string, unknown> => ({
  id,
  group: 'full',
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: null,
  expected: { layout: { id: 'root' }, plans: { root: [] } },
});
const stop = (id: string, group: string, prefix: string[]): Record<string, unknown> => ({
  id,
  group,
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix,
  expected: { geometry: GEOMETRY },
});

const RAW = [
  full('full/golden/a/default'),
  full('full/goldenish/b/default'),
  stop('models/center/m1', 'models', ['P', 'CENTER']),
  stop('models/center/m2', 'models', ['CENTER', 'P']),
  stop('sites/s1', 'sites', []),
];

function writeRef(rows: unknown[], rowCounts: unknown): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'labels-rows-')), 'labels.json');
  writeFileSync(file, JSON.stringify({ rowCounts, rows }));
  return file;
}

const COUNTS = { full: 2, models: 2, scenarios: 0, sites: 1 };
const rows = (): PipelineRow[] => loadLabelsFile(writeRef(RAW, COUNTS)) as PipelineRow[];

describe('labels row selection', () => {
  it('counts rows per group', () => {
    expect(countRows(rows())).toEqual(COUNTS);
  });

  it('selects by group in file order', () => {
    expect(rowsByGroup('models', rows()).map((r) => r.id)).toEqual(['models/center/m1', 'models/center/m2']);
  });

  it('selects by id prefix on a path boundary, not a bare string prefix', () => {
    expect(rowsByClass('full/golden', rows()).map((r) => r.id)).toEqual(['full/golden/a/default']);
    expect(rowsByClass('models/center/m1', rows()).map((r) => r.id)).toEqual(['models/center/m1']);
  });

  it('selects by the last prefix entry, never by presence in the plan', () => {
    expect(rowsByLastPrefixEntry('CENTER', rows()).map((r) => r.id)).toEqual(['models/center/m1']);
    expect(lastPrefixEntry(rows()[4]!)).toBeNull();
    expect(lastPrefixEntry(rows()[0]!)).toBeNull();
  });
});

describe('rowCounts', () => {
  it('names the first group whose declared count differs', () => {
    expect(rowCountsDifference({ ...COUNTS, models: 3 }, rows())).toBe('rowCounts.models is 3, the file holds 2 rows');
  });

  it('rejects a file whose header disagrees', () => {
    expect(() => loadLabelsFile(writeRef(RAW, { ...COUNTS, full: 1 }))).toThrow(/rowCounts\.full is 1/);
  });

  it('rejects a file without a header', () => {
    expect(rowCountsDifference(undefined, rows())).toBe('rowCounts.full is undefined, the file holds 2 rows');
  });
});

describe('the real ref', () => {
  it('carries the counts of its own rowCounts header', () => {
    expect(countRows(loadLabelsRows())).toEqual({ full: 399, models: 640, scenarios: 224, sites: 42 });
  });

  it('selects real ids by group, class and last prefix entry', () => {
    const all = loadLabelsRows();
    expect(rowsByGroup('full')).toHaveLength(399);
    const unzip = rowsByClass('models/examples-general-direction');
    expect(unzip.length).toBeGreaterThan(0);
    expect(unzip.every((r) => r.id.startsWith('models/examples-general-direction/'))).toBe(true);
    const arm = rowsByLastPrefixEntry('ALTERNATING_LAYER_UNZIPPER');
    expect(arm.length).toBeGreaterThan(0);
    expect(arm.every((r) => lastPrefixEntry(r) === 'ALTERNATING_LAYER_UNZIPPER')).toBe(true);
    expect(all.map((r) => r.id)).toContain('full/labels/examples-general-direction/default');
  });
});
