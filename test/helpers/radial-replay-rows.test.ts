// SPDX-License-Identifier: EPL-2.0
// Structural tests of the radial row loader: what the ref holds, what it accepts and which rejection names which row.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FIXED_SECTIONS,
  fixedSectionsOf,
  isFullRow,
  isStopsRow,
  isThrowsRow,
  loadRadialRows,
  parseRadialFile,
  propOf,
  radialRefPath,
  radialRowById,
  RADIAL_STEPS,
  rowsWithStepPair,
  stepPair,
  stopIndex,
  stopsOf,
} from './radial-replay-rows.js';

const HEX0 = '0000000000000000';
const SHAPE = ['n0', HEX0, HEX0, HEX0, HEX0];
const QUAD = [HEX0, HEX0, HEX0, HEX0];
const firstStop = (step = 'NodeMicroLayout', extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  step,
  nodes: [SHAPE],
  edges: [],
  props: [],
  ports: [],
  labels: [],
  margins: [QUAD],
  padding: [QUAD],
  ...extra,
});
const laterStop = (step: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  step,
  nodes: [SHAPE],
  edges: [],
  props: [],
  ...extra,
});
const row = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'stops/a',
  group: 'stops',
  input: { id: 'root' },
  expected: { stops: [firstStop(), laterStop('RootAndRadius')] },
  ...overrides,
});

function parse(
  rows: readonly unknown[],
  counts: Record<string, number> = { full: 0, stops: rows.length, throws: 0 },
): void {
  const dir = mkdtempSync(path.join(tmpdir(), 'radial-rows-'));
  const file = path.join(dir, 'radial.json');
  writeFileSync(file, JSON.stringify({ rowCounts: counts, rows }));
  parseRadialFile(file);
}

describe('the recorded ref', () => {
  const rows = loadRadialRows();

  it('has the recorded counts and unique ids', () => {
    expect(loadRadialRows('full')).toHaveLength(148);
    expect(loadRadialRows('stops')).toHaveLength(150);
    expect(loadRadialRows('throws')).toHaveLength(11);
    expect(new Set(rows.map((r) => r.id)).size).toBe(309);
    expect(radialRefPath().endsWith(path.join('test', 'golden', 'refs', 'java', 'radial.json'))).toBe(true);
  });

  it('type guards agree with the group', () => {
    expect(rows.filter(isFullRow)).toHaveLength(148);
    expect(rows.filter(isStopsRow)).toHaveLength(150);
    expect(rows.filter(isThrowsRow)).toHaveLength(11);
  });

  it('every stops row starts with the first stop carrying the fixed sections and every step runs in order', () => {
    for (const r of rows.filter(isStopsRow)) {
      const stops = stopsOf(r);
      expect(['NodeMicroLayout', 'RootAndRadius']).toContain(stops[0]?.step); // the micro layout is omitted in some rows
      expect(Object.keys(fixedSectionsOf(stops))).toEqual([...FIXED_SECTIONS]);
      const ranks = stops.map((s) => RADIAL_STEPS.indexOf(s.step as (typeof RADIAL_STEPS)[number]));
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    }
  });

  it('caches per path and finds a row by id', () => {
    expect(loadRadialRows()).toBe(loadRadialRows());
    expect(radialRowById('stops/matrix/wide/rotate-a1').group).toBe('stops');
    expect(() => radialRowById('nope')).toThrow('no radial row nope');
  });

  it('a missing ref names T2', () => {
    expect(() => loadRadialRows(undefined, path.join(tmpdir(), 'radial-absent.json'))).toThrow('T2');
  });
});

describe('stop pairs', () => {
  const stops = stopsOf(
    radialRowById('stops/matrix/wide/rotate-a1') as ReturnType<typeof radialRowById> & { group: 'stops' },
  );

  it('stopIndex finds a step, or -1', () => {
    expect(stopIndex(stops, 'GeneralRotator')).toBe(4);
    expect(stopIndex(stops, 'GeneralCompactor')).toBe(-1);
  });

  it('stepPair is the stop before and the stop of the step', () => {
    const pair = stepPair(stops, 'GeneralRotator');
    expect(pair?.beforeIndex).toBe(3);
    expect(pair?.before.step).toBe('RadiusExtensionOverlapRemoval');
    expect(pair?.after.step).toBe('GeneralRotator');
    expect(stepPair(stops, 'NodeMicroLayout')).toBeNull();
    expect(stepPair(stops, 'EdgeAngleCalculator')).toBeNull();
  });

  it('rowsWithStepPair lists the stops and throws rows that ran the step', () => {
    const rotator = rowsWithStepPair('GeneralRotator');
    expect(rotator.length).toBeGreaterThan(0);
    expect(rotator.every(([, pair]) => pair.after.step === 'GeneralRotator')).toBe(true);
    const router = rowsWithStepPair('StraightLineEdgeRouter');
    expect(new Set(router.map(([r]) => r.group))).toEqual(new Set(['stops', 'throws']));
  });

  it('propOf reads a value of an element, or undefined', () => {
    const last = stops.at(-1);
    expect(propOf(last as NonNullable<typeof last>, 'root', 'root')).toBe('n0');
    expect(propOf(last as NonNullable<typeof last>, 'n1', 'radius')).toBeUndefined();
  });

  it('fixedSectionsOf rejects an empty stop list', () => {
    expect(() => fixedSectionsOf([])).toThrow('no fixed sections');
  });
});

describe('the validation rejects, naming the row', () => {
  it('accepts a minimal well-formed file', () => {
    expect(() => parse([row()])).not.toThrow();
  });

  const cases: readonly (readonly [string, unknown, string])[] = [
    ['a row without an id', { group: 'stops', input: {}, expected: {} }, 'radial row 0 is malformed'],
    ['an unknown group', row({ group: 'weird' }), 'radial row stops/a: unknown group "weird"'],
    ['an unknown step', row({ expected: { stops: [firstStop('Bogus')] } }), 'stop 0 has no known step'],
    [
      'steps out of order',
      row({ expected: { stops: [firstStop('RootAndRadius'), laterStop('NodeMicroLayout')] } }),
      'stop 1 (NodeMicroLayout) is out of step order',
    ],
    [
      'a later stop with fixed sections',
      row({ expected: { stops: [firstStop(), laterStop('RootAndRadius', { ports: [] })] } }),
      'unexpected fixed section ports',
    ],
    [
      'a first stop without margins',
      row({ expected: { stops: [(({ margins, ...rest }) => rest)(firstStop() as Record<string, unknown>)] } }),
      'missing the fixed section margins',
    ],
    [
      'a malformed node',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { nodes: [['n0', 1, 2, 3, 4]] })] } }),
      'nodes must be a list of [id, x, y, width, height] with hex doubles',
    ],
    [
      'a malformed quad',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { margins: [[HEX0]] })] } }),
      'margins must be a list of four hex doubles',
    ],
    [
      'an edge without sections',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { edges: [['e', []]] })] } }),
      'an edge is [id, [section...]] with at least one section',
    ],
    [
      'a malformed section',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { edges: [['e', [[HEX0]]]] })] } }),
      'an edge section is',
    ],
    [
      'an unknown prop name',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { props: [['n0', 'nope', 1]] })] } }),
      'a prop is [elementId, name, value]',
    ],
    [
      'a prop value of the wrong type',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { props: [['n0', 'radius', 1]] })] } }),
      'prop radius has a malformed value 1',
    ],
    [
      'a non-integer order id',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { props: [['n0', 'orderId', 1.5]] })] } }),
      'prop orderId has a malformed value 1.5',
    ],
    [
      'a malformed position',
      row({ expected: { stops: [firstStop('NodeMicroLayout', { props: [['n0', 'position', [HEX0]]] })] } }),
      'prop position has a malformed value',
    ],
    [
      'a throws row without a thrown object',
      row({ group: 'throws', expected: { stops: [] } }),
      'throws must be { class, message, frame, step }',
    ],
    [
      'a full row without fixed sections',
      row({ group: 'full', expected: laterStop('RootAndRadius') }),
      'missing the fixed section ports',
    ],
  ];
  it.each(cases)('%s', (_name, bad, message) => {
    const counts = { full: 0, stops: 0, throws: 0 };
    const group = (bad as { group?: string }).group;
    if (group === 'stops' || group === 'throws' || group === 'full') {
      counts[group] = 1;
    }
    expect(() => parse([bad], counts)).toThrow(message);
  });

  it('rejects duplicate ids and wrong row counts', () => {
    expect(() => parse([row(), row()])).toThrow('duplicate row id stops/a');
    expect(() => parse([row()], { full: 0, stops: 2, throws: 0 })).toThrow(
      'rowCounts.stops is 2, the file holds 1 rows',
    );
  });

  it('rejects a file without rows', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'radial-rows-'));
    const file = path.join(dir, 'radial.json');
    writeFileSync(file, '{}');
    expect(() => parseRadialFile(file)).toThrow('no "rows" array');
  });
});
