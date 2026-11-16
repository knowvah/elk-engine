// SPDX-License-Identifier: EPL-2.0
// Structural tests of the compound row loader: the skip message, what it accepts, and which rejection names which row.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMPOUND_ROW_GROUPS,
  compoundRefExists,
  compoundRefPath,
  compoundSkipMessage,
  isCompoundFullRow,
  isCompoundModelsRow,
  isCompoundScenarioRow,
  loadCompoundRows,
  loadCompoundRowsIfPresent,
  parseCompoundFile,
  registerCompoundEnums,
} from './layered-compound-replay-rows.js';
import { ENUM_TYPES } from './layered-site-replay-registry.js';

const INPUT = { elk: { id: 'root' } };
const STOP = {
  index: 0,
  levelPath: 'root',
  processor: 'CompoundGraphPreprocessor',
  className: 'CompoundGraphPreprocessor',
};

const fullRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'full/issues/m/default',
  group: 'full',
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: null,
  expected: { layout: { id: 'root' }, plans: { root: ['DIRECTION_PREPROCESSOR'], 'root/a': [] } },
  ...overrides,
});

const modelsRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'models/m/0-root-CompoundGraphPreprocessor/default',
  group: 'models',
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: null,
  expected: { stop: STOP, tree: { graphs: [], crossHierarchyMap: [] } },
  ...overrides,
});

const scenarioRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'scenarios/s/RIGHT',
  group: 'scenarios',
  input: INPUT,
  target: null,
  options: {},
  steps: null,
  prefix: null,
  expected: { layout: {}, plans: {}, stops: 5, tree: { graphs: [], crossHierarchyMap: [] } },
  ...overrides,
});

function write(rows: unknown[], counts: Record<string, number> | undefined): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'compound-rows-')), 'layered-compound.json');
  writeFileSync(file, JSON.stringify({ rowCounts: counts, rows }));
  return file;
}

const COUNTS = { full: 1, models: 1, scenarios: 1, sites: 0 };

describe('compound ref location and skip message', () => {
  it('points at the compound ref under test/golden/refs/java', () => {
    expect(compoundRefPath().endsWith(path.join('test', 'golden', 'refs', 'java', 'layered-compound.json'))).toBe(true);
  });

  it('names T1 in the landed skip-message form', () => {
    expect(compoundSkipMessage('/x/layered-compound.json')).toBe(
      'layered-compound.json is absent: T1 (tools/vectors/LayeredCompoundVectors.java recording) has not landed',
    );
  });

  it('throws the skip message and lists nothing when the file is absent', () => {
    const absent = path.join(tmpdir(), 'compound-rows-absent', 'layered-compound.json');
    expect(compoundRefExists(absent)).toBe(false);
    expect(() => loadCompoundRows(undefined, absent)).toThrow(compoundSkipMessage(absent));
    expect(loadCompoundRowsIfPresent(undefined, absent)).toEqual([]);
  });
});

describe('compound row loader', () => {
  it('loads the four groups in file order and filters by group', () => {
    const file = write([fullRow(), modelsRow(), scenarioRow()], COUNTS);
    const rows = loadCompoundRows(undefined, file);
    expect(rows.map((row) => row.group)).toEqual(['full', 'models', 'scenarios']);
    expect(loadCompoundRows('models', file).map((row) => row.id)).toEqual([
      'models/m/0-root-CompoundGraphPreprocessor/default',
    ]);
    expect(isCompoundFullRow(rows[0]!)).toBe(true);
    expect(isCompoundModelsRow(rows[1]!)).toBe(true);
    expect(isCompoundModelsRow(rows[2]!)).toBe(false);
    expect(isCompoundScenarioRow(rows[2]!)).toBe(true);
  });

  it('lists the four groups of the ref', () => {
    expect([...COMPOUND_ROW_GROUPS]).toEqual(['full', 'models', 'scenarios', 'sites']);
  });

  it.each([
    ['a full row with a prefix', [fullRow({ prefix: [] })], 'row full/issues/m/default: a full row has target, steps'],
    [
      'a full row without plans',
      [fullRow({ expected: { layout: {} } })],
      'row full/issues/m/default: a full row needs expected.plans',
    ],
    [
      'a models row without a stop',
      [modelsRow({ expected: { tree: { graphs: [], crossHierarchyMap: [] } } })],
      'a models row needs expected.stop = { index, levelPath, processor, className }',
    ],
    [
      'a models row with a negative stop index',
      [modelsRow({ expected: { stop: { ...STOP, index: -1 }, tree: { graphs: [], crossHierarchyMap: [] } } })],
      'a models row needs expected.stop',
    ],
    [
      'a models row without a tree',
      [modelsRow({ expected: { stop: STOP } })],
      'a tree needs the whole-tree dump: graphs and crossHierarchyMap',
    ],
    [
      'a models row whose tree lacks the cross-hierarchy map',
      [modelsRow({ expected: { stop: STOP, tree: { graphs: [] } } })],
      'a tree needs the whole-tree dump: graphs and crossHierarchyMap',
    ],
    [
      'a models row without a className',
      [modelsRow({ expected: { stop: { index: 0, levelPath: '', processor: 'X' }, tree: { graphs: [] } } })],
      'a models row needs expected.stop = { index, levelPath, processor, className }',
    ],
    [
      'a scenarios row without a stop count',
      [scenarioRow({ expected: { layout: {}, plans: {}, tree: { graphs: [], crossHierarchyMap: null } } })],
      'a scenarios row needs expected.stops',
    ],
    ['a models row with a target', [modelsRow({ target: 'n1' })], 'a models row has target, steps and prefix null'],
    [
      'an unknown group',
      [scenarioRow(), { ...scenarioRow(), id: 'x/1', group: 'other' }],
      'row x/1: unknown group "other"',
    ],
    ['a row without id', [{ group: 'full' }], 'layered-compound row 0 is malformed'],
  ])('rejects %s', (_name, rows, message) => {
    expect(() => parseCompoundFile(write(rows, undefined))).toThrow(message);
  });

  it('rejects a rowCounts header that disagrees with the rows', () => {
    const file = write([fullRow()], { full: 2, models: 0, scenarios: 0, sites: 0 });
    expect(() => parseCompoundFile(file)).toThrow('rowCounts.full is 2, the file holds 1 rows');
  });

  it('rejects a file without a rows array', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'compound-rows-')), 'layered-compound.json');
    writeFileSync(file, '{}');
    expect(() => parseCompoundFile(file)).toThrow('no "rows" array');
  });
});

describe('compound enum registration', () => {
  it('registers the loops enums and keeps a registered class', () => {
    registerCompoundEnums();
    const before = (ENUM_TYPES as Record<string, unknown>).WrappingStrategy;
    registerCompoundEnums();
    expect(before).toBeDefined();
    expect((ENUM_TYPES as Record<string, unknown>).WrappingStrategy).toBe(before);
    expect((ENUM_TYPES as Record<string, unknown>).HierarchyHandling).toBeDefined();
  });
});
