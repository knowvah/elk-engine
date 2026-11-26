// SPDX-License-Identifier: EPL-2.0
// Tests of the mrtree row loader: the file's header contract (rowCounts 122 / 54 / 12), the recorded step order, hex doubles, the
// transition pairing and the rejections, each with a row that must be refused.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import {
  PROCESSOR_STEPS,
  STEP_APPLY,
  STEP_IMPORT,
  STEP_PACK,
  STEP_SPLIT,
  decodeHex,
  decodeHexPair,
  encodeHex,
  encodeHexPair,
  familyOf,
  isFullRow,
  isStopsRow,
  isThrowsRow,
  loadFullRows,
  loadMrTreeRows,
  loadStopsRows,
  loadThrowsRows,
  mrTreeRefPath,
  parseMrTreeFile,
  rowCountsDifference,
  rowsWithStep,
  stopsOfStep,
  transitionsOf,
  transitionsOfStep,
} from './mrtree-replay-rows.js';

const FULL = 122;
const STOPS = 54;
const THROWS = 12;
const RECORDED_PROCESSORS = 15;
const COMPONENTS_FOREST = 4;

const scratch = mkdtempSync(path.join(tmpdir(), 'mrtree-rows-'));
const writeScratch = (name: string, body: unknown): string => {
  const file = path.join(scratch, name);
  writeFileSync(file, JSON.stringify(body));
  return file;
};
const stopsRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'stops/x/y',
  group: 'stops',
  input: { id: 'root' },
  expected: { stops: [] },
  ...overrides,
});
const file = (rows: unknown[], counts = { full: 0, stops: rows.length, throws: 0 }): unknown => ({
  rowCounts: counts,
  rows,
});

describe('the recorded ref', () => {
  it('holds 122 full, 54 stops and 12 throws rows, as the header says', () => {
    expect(loadMrTreeRows()).toHaveLength(FULL + STOPS + THROWS);
    expect(loadFullRows()).toHaveLength(FULL);
    expect(loadStopsRows()).toHaveLength(STOPS);
    expect(loadThrowsRows()).toHaveLength(THROWS);
    expect(rowCountsDifference({ full: FULL, stops: STOPS, throws: THROWS }, loadMrTreeRows())).toBeNull();
  });

  it('filters by group and the guards agree with the group', () => {
    expect(loadMrTreeRows('stops').every(isStopsRow)).toBe(true);
    expect(loadMrTreeRows('full').every(isFullRow)).toBe(true);
    expect(loadMrTreeRows('throws').every(isThrowsRow)).toBe(true);
    expect(familyOf(loadStopsRows()[0]!)).toBe('default');
  });

  it('records, for a row that completed, import, split, the 15 steps per component, pack and applyLayout', () => {
    const row = loadStopsRows().find((r) => r.id === 'stops/default/forest');
    const steps = row!.expected.stops.map((s) => `${s.step}:${String(s.comp)}`);
    const expected = [`${STEP_IMPORT}:-1`, `${STEP_SPLIT}:-1`];
    for (let comp = 0; comp < COMPONENTS_FOREST; comp++) {
      expected.push(...PROCESSOR_STEPS.map((step) => `${step}:${String(comp)}`));
    }
    expected.push(`${STEP_PACK}:-1`, `${STEP_APPLY}:-1`);
    expect(steps).toEqual(expected);
    expect(PROCESSOR_STEPS).toHaveLength(RECORDED_PROCESSORS);
  });

  it('ends a row at the throwing step: no stop for it, throwsAt and throws recorded (FanProcessor, StringIndexOutOfBounds)', () => {
    const row = loadStopsRows().find((r) => r.expected.throwsAt === 'FanProcessor');
    expect(row?.expected.stops.map((s) => s.step)).toEqual([STEP_IMPORT, STEP_SPLIT, 'DFSTreeifyer', 'RootProcessor']);
    expect(row?.expected.throws?.frame).toBe('FanProcessor.java:128');
    expect(row?.expected.throws?.class).toBe('java.lang.StringIndexOutOfBoundsException');
  });

  it('lists the rows that recorded a step and its stops per component', () => {
    const rows = loadStopsRows();
    expect(rowsWithStep(STEP_IMPORT)).toHaveLength(STOPS);
    expect(rowsWithStep('FanProcessor').length).toBeLessThan(STOPS);
    const forest = rows.find((r) => r.id === 'stops/default/forest')!;
    expect(stopsOfStep(forest, 'EdgeRouter').map((s) => s.comp)).toEqual([0, 1, 2, 3]);
  });
});

describe('transitions', () => {
  const forest = loadStopsRows().find((r) => r.id === 'stops/default/forest')!;
  const transitions = transitionsOf(forest);
  const stopped = (step: string, comp: number): number =>
    transitions.findIndex((t) => t.step === step && t.comp === comp);

  it('has no before state for the import and the split starts from the imported graph', () => {
    expect(transitions[0]?.before).toBeNull();
    expect(transitions[1]?.before).toBe(forest.expected.stops[0]?.graphs);
  });

  it('starts the first processor of every component from that component graph of the split', () => {
    const split = forest.expected.stops[1]!;
    for (let comp = 0; comp < COMPONENTS_FOREST; comp++) {
      expect(transitions[stopped('DFSTreeifyer', comp)]?.before).toEqual([split.graphs[comp]]);
    }
  });

  it('starts a later processor from the previous stop of the same component', () => {
    const before = transitions[stopped('NodeOrderer', 2)]?.before;
    const previous = forest.expected.stops.find((s) => s.step === 'LevelProcessor' && s.comp === 2);
    expect(before).toBe(previous?.graphs);
  });

  it('starts pack from every component EdgeRouter graph and applyLayout from the packed graph', () => {
    const pack = transitions[stopped(STEP_PACK, -1)]!;
    expect(pack.before).toHaveLength(COMPONENTS_FOREST);
    const lastOfComp3 = forest.expected.stops.find((s) => s.step === 'EdgeRouter' && s.comp === 3);
    expect(pack.before?.[3]).toBe(lastOfComp3?.graphs[0]);
    expect(transitions[stopped(STEP_APPLY, -1)]?.before).toBe(pack.stop.graphs);
  });

  it('collects one step across rows with the row id', () => {
    const all = transitionsOfStep('NodePlacer');
    expect(all.length).toBeGreaterThan(STOPS - 4);
    expect(all.every((t) => t.transition.step === 'NodePlacer' && t.rowId.startsWith('stops/'))).toBe(true);
  });
});

describe('hex doubles', () => {
  it('decodes raw IEEE bits', () => {
    expect(decodeHex('4034000000000000')).toBe(20);
    expect(decodeHex('c034000000000000')).toBe(-20);
    expect(Object.is(decodeHex('8000000000000000'), -0)).toBe(true);
    expect(decodeHex('7ff0000000000000')).toBe(Infinity);
    expect(decodeHexPair(['3ff0000000000000', '4000000000000000'])).toEqual([1, 2]);
  });

  it('encodes back to the same 16 digits', () => {
    for (const hex of ['4034000000000000', '8000000000000000', '3ff199999999999a', '0000000000000000']) {
      expect(encodeHex(decodeHex(hex))).toBe(hex);
    }
  });

  it.each(['4034', '4034000000000000f', '403400000000000G', '4034000000000000'.toUpperCase().replace('4', 'A')])(
    'rejects %s as not 16 lowercase hex digits',
    (bad) => {
      expect(() => decodeHex(bad)).toThrow('not a 16-digit lowercase hex double');
    },
  );
});

describe('rejections', () => {
  it('names a malformed row by index', () => {
    const f = writeScratch('malformed.json', file([{ id: 3 }]));
    expect(() => parseMrTreeFile(f)).toThrow('mrtree row 0 is malformed');
  });

  it('rejects an unknown group by id', () => {
    const f = writeScratch('group.json', file([stopsRow({ group: 'sites' })]));
    expect(() => parseMrTreeFile(f)).toThrow('mrtree row stops/x/y: unknown group "sites"');
  });

  it('rejects a stops row without expected.stops, throwsAt without throws, and a stop without graphs', () => {
    const noStops = writeScratch('nostops.json', file([stopsRow({ expected: {} })]));
    expect(() => parseMrTreeFile(noStops)).toThrow('a stops row needs expected.stops');
    const half = writeScratch('half.json', file([stopsRow({ expected: { stops: [], throwsAt: 'X' } })]));
    expect(() => parseMrTreeFile(half)).toThrow('throwsAt and throws come together');
    const bare = writeScratch('bare.json', file([stopsRow({ expected: { stops: [{ step: 'a', comp: 0 }] } })]));
    expect(() => parseMrTreeFile(bare)).toThrow('a stop needs step, comp and graphs');
  });

  it('rejects a graph dump without nodes', () => {
    const stop = { step: 'a', comp: 0, graphs: [{ props: {}, edges: [] }] };
    const f = writeScratch('graph.json', file([stopsRow({ expected: { stops: [stop] } })]));
    expect(() => parseMrTreeFile(f)).toThrow('a graph dump needs props, nodes and edges');
  });

  it('rejects a throws row without throws and a full row without graph', () => {
    const t = writeScratch(
      'throws.json',
      file([stopsRow({ group: 'throws', expected: {} })], { full: 0, stops: 0, throws: 1 }),
    );
    expect(() => parseMrTreeFile(t)).toThrow('a throws row needs expected.throws');
    const f = writeScratch(
      'full.json',
      file([stopsRow({ group: 'full', expected: {} })], { full: 1, stops: 0, throws: 0 }),
    );
    expect(() => parseMrTreeFile(f)).toThrow('a full row needs expected.graph');
  });

  it('rejects duplicate ids and a rowCounts header that disagrees with the rows', () => {
    const dup = writeScratch('dup.json', file([stopsRow(), stopsRow()], { full: 0, stops: 2, throws: 0 }));
    expect(() => parseMrTreeFile(dup)).toThrow('duplicate row ids');
    const counts = writeScratch('counts.json', file([stopsRow()], { full: 0, stops: 2, throws: 0 }));
    expect(() => parseMrTreeFile(counts)).toThrow('rowCounts.stops is 2, the file holds 1 rows');
  });

  it('rejects a file without rows and accepts a well-formed one', () => {
    expect(() => parseMrTreeFile(writeScratch('norows.json', {}))).toThrow('no "rows" array');
    const ok = parseMrTreeFile(writeScratch('ok.json', file([stopsRow()])));
    expect(ok.map((r) => r.id)).toEqual(['stops/x/y']);
  });

  it('points at the landed ref', () => {
    expect(mrTreeRefPath().endsWith(path.join('test', 'golden', 'refs', 'java', 'mrtree.json'))).toBe(true);
  });
});

describe('NaN sign (issue #72)', () => {
  it('encodes both NaN signs as the one canonical NaN', () => {
    expect(encodeHex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(encodeHex(NaN)).toBe(CANONICAL_NAN_HEX);
    expect(encodeHexPair(NEGATIVE_NAN, -0)).toEqual([CANONICAL_NAN_HEX, '8000000000000000']);
  });
});
