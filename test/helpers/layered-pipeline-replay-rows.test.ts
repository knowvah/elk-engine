// SPDX-License-Identifier: EPL-2.0
// Structural tests of the pipeline row loader: what it accepts, and which rejection names which row.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';
import {
  FULL_GROUP,
  PIPELINE_ROW_GROUPS,
  isComponentsRow,
  isFullRow,
  isStopRow,
  loadPipelineRows,
  registerPipelineEnums,
} from './layered-pipeline-replay-rows.js';
import { ENUM_TYPES } from './layered-site-replay-registry.js';

const ROUTING_REF = path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-routing.json');
const INPUT = { elk: { id: 'root' } };
const GEOMETRY = { nodes: {}, edges: {} };

const fullRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'full/synthetic/model/default',
  group: FULL_GROUP,
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: null,
  expected: { layout: { id: 'root' }, plans: { root: ['DIRECTION_PREPROCESSOR'] } },
  ...overrides,
});

const stopRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'models/synthetic',
  group: 'models',
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: ['DIRECTION_PREPROCESSOR'],
  expected: { geometry: GEOMETRY },
  ...overrides,
});

function load(rows: unknown[]): ReturnType<typeof loadPipelineRows> {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'pipeline-rows-')), 'rows.json');
  writeFileSync(file, JSON.stringify({ rows }));
  return loadPipelineRows(file);
}

describe('loadPipelineRows', () => {
  it('accepts full and stop rows and narrows them by group', () => {
    const rows = load([fullRow(), stopRow()]);
    expect(rows.map((row) => row.id)).toEqual(['full/synthetic/model/default', 'models/synthetic']);
    expect(rows.map(isFullRow)).toEqual([true, false]);
    expect(rows.map(isStopRow)).toEqual([false, true]);
  });

  it('accepts a terminal componentsSplit row and tells it from a geometry row', () => {
    const split = stopRow({ id: 'scenarios/split', prefix: null, steps: [], expected: { components: [] } });
    const rows = load([split, stopRow()]);
    expect(rows.map(isComponentsRow)).toEqual([true, false]);
  });

  it('accepts the landed 7e routing rows as stop rows, in file order', () => {
    const ids = (JSON.parse(readFileSync(ROUTING_REF, 'utf8')) as { rows: { id: string; group: string }[] }).rows
      .filter((row) => row.group !== 'calls')
      .map((row) => row.id);
    expect(loadPipelineRows(ROUTING_REF).map((row) => row.id)).toEqual(ids);
  });

  it('lists the four groups of the ref', () => {
    expect([...PIPELINE_ROW_GROUPS]).toEqual(['full', 'models', 'scenarios', 'sites']);
  });

  it.each([
    ['expected.layout', { expected: { plans: {} } }],
    ['expected.layout', { expected: { layout: null, plans: {} } }],
    ['expected.plans', { expected: { layout: {} } }],
    ['expected.plans', { expected: { layout: {}, plans: { root: [1] } } }],
    ['target, steps and prefix null', { prefix: ['X'] }],
  ])('rejects a full row naming it and %s', (what, overrides) => {
    expect(() => load([fullRow(overrides)])).toThrow(new RegExp(`row full/synthetic/model/default: .*${what}`));
  });

  it('rejects a stop row with both or neither of steps and prefix, naming it', () => {
    expect(() => load([stopRow({ steps: [] })])).toThrow('row models/synthetic: exactly one of steps and prefix');
    expect(() => load([stopRow({ prefix: null })])).toThrow('row models/synthetic: exactly one of steps and prefix');
  });

  it('rejects a stop row without a geometry, naming it', () => {
    expect(() => load([stopRow({ expected: {} })])).toThrow('row models/synthetic: expected.geometry');
  });

  it('rejects an unknown group naming the row and a malformed row by index', () => {
    expect(() => load([stopRow({ group: 'calls' })])).toThrow('row models/synthetic: unknown group "calls"');
    expect(() => load([stopRow(), 7])).toThrow('layered-pipeline row 1 is malformed');
  });

  it('rejects a file without rows', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'pipeline-rows-')), 'rows.json');
    writeFileSync(file, '{}');
    expect(() => loadPipelineRows(file)).toThrow(`${file}: no "rows" array`);
  });
});

describe('registerPipelineEnums', () => {
  it('registers EdgeRouting once and is idempotent', () => {
    registerPipelineEnums();
    const registered = (ENUM_TYPES as Record<string, unknown>).EdgeRouting;
    registerPipelineEnums();
    expect(registered).toBeDefined();
    expect((ENUM_TYPES as Record<string, unknown>).EdgeRouting).toBe(registered);
  });
});
