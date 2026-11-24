// SPDX-License-Identifier: EPL-2.0
// Proof of the force replay helpers (mission 8b, T6): the loader, the comparator at the AD-4 bar (it must reject what it should, or the
// replays prove nothing), and the rebuild of an FGraph from a dumped state (every recorded state must survive state -> graph -> state).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../../src/alg/force/options/InternalProperties.js';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import {
  classify,
  compareJson,
  dumpState,
  numbersEqual,
  rebuildGraph,
  registerForce,
  TOLERANCE,
} from './force-replay-dump.js';
import {
  componentStatesBeforeRecombine,
  decodeHex,
  FORCE_REFS,
  hexOf,
  loadForceRows,
  NAN_HEX,
  parseForceFile,
  stopOf,
  STEP_IMPORT,
  STEP_SPLIT,
  type State,
} from './force-replay-rows.js';
import { dumpOptionsOf } from './force-replay-run.js';

registerForce();

const ROW_COUNTS = {
  force: { full: 594, stops: 194, throws: 2, log: 20014 },
  stress: { full: 320, stops: 108, throws: 3, log: 0 },
} as const;

describe('force replay rows', () => {
  it.each(FORCE_REFS)('%s.json has the recorded row counts per group', (ref) => {
    for (const group of ['full', 'stops', 'throws', 'log'] as const) {
      expect(loadForceRows(ref, group)).toHaveLength(ROW_COUNTS[ref][group]);
    }
  });

  it('parses a ref file once per path (the same array of rows comes back)', () => {
    expect(loadForceRows('stress', 'stops')[0]).toBe(loadForceRows('stress', 'stops')[0]);
  });

  it('rejects a file whose rowCounts disagree with its rows, a duplicate id and a row of unknown group', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'force-rows-'));
    try {
      const write = (name: string, content: unknown): string => {
        const file = path.join(dir, name);
        writeFileSync(file, JSON.stringify(content));
        return file;
      };
      const row = { id: 'a', group: 'throws', input: {}, expected: { throws: {} } };
      expect(() => parseForceFile('force', write('count.json', { rowCounts: { throws: 2 }, rows: [row] }))).toThrow(
        'rowCounts.throws is 2, the file holds 1 rows',
      );
      expect(() => parseForceFile('force', write('dup.json', { rows: [row, row] }))).toThrow('duplicate row ids');
      expect(() => parseForceFile('force', write('group.json', { rows: [{ ...row, group: 'nope' }] }))).toThrow(
        'unknown group nope',
      );
      expect(() => parseForceFile('force', write('norows.json', {}))).toThrow('no "rows" array');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('hexOf writes NaN as the recorder does and decodeHex reads it back', () => {
    expect(hexOf(Number.NaN)).toBe(NAN_HEX);
    expect(hexOf(NEGATIVE_NAN)).toBe(NAN_HEX);
    expect(NAN_HEX).toBe(CANONICAL_NAN_HEX);
    expect(Number.isNaN(decodeHex(NAN_HEX))).toBe(true);
    expect(hexOf(Number.POSITIVE_INFINITY)).toBe('7ff0000000000000');
    expect(hexOf(1)).toBe('3ff0000000000000');
  });
});

describe('force replay comparator', () => {
  it('numbersEqual: NaN equals NaN only, same-signed infinities are equal, finite values within the tolerance', () => {
    expect(numbersEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(numbersEqual(Number.NaN, 1)).toBe(false);
    expect(numbersEqual(1, Number.NaN)).toBe(false);
    expect(numbersEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
    expect(numbersEqual(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(false);
    expect(numbersEqual(Number.POSITIVE_INFINITY, 1e300)).toBe(false);
    expect(numbersEqual(1, 1 + TOLERANCE / 2)).toBe(true);
    expect(numbersEqual(1, 1 + TOLERANCE * 2)).toBe(false);
  });

  it('finds a hex double that differs by more than the tolerance by its key, and names the path', () => {
    const expected = { nodes: [{ id: 0, pos: [hexOf(1), hexOf(2)] }] };
    const actual = { nodes: [{ id: 0, pos: [hexOf(1), hexOf(2.001)] }] };
    const differences = compareJson(expected, actual);
    expect(differences.map((d) => d.path)).toEqual(['nodes[0].pos[1]']);
    expect(compareJson(expected, { nodes: [{ id: 0, pos: [hexOf(1), hexOf(2 + TOLERANCE / 2)] }] })).toEqual([]);
  });

  it('treats a string that is not under a hex key as exact, even when it looks like a hex double', () => {
    expect(compareJson({ name: hexOf(1) }, { name: hexOf(1 + 1e-9) })).toHaveLength(1);
  });

  it('rejects a different integer, boolean, list length, key list and key order', () => {
    expect(compareJson({ id: 1 }, { id: 2 })).toHaveLength(1);
    expect(compareJson({ separate: true }, { separate: false })).toHaveLength(1);
    expect(compareJson({ nodes: [1, 2] }, { nodes: [1] })).toHaveLength(1);
    expect(compareJson({ a: 1 }, { b: 1 })).toHaveLength(1);
    expect(compareJson({ a: 1, b: 2 }, { b: 2, a: 1 })).toHaveLength(1);
    expect(compareJson({ a: 1 }, [1])).toHaveLength(1);
    expect(compareJson([1], { a: 1 })).toHaveLength(1);
  });

  it('skips the ignored keys and the extra hex keys are decoded', () => {
    expect(compareJson({ randomPeek: 'a', x: 1 }, { randomPeek: 'b', x: 1 }, { ignore: ['randomPeek'] })).toEqual([]);
    const extra = new Set(['k']);
    expect(compareJson({ k: hexOf(3) }, { k: hexOf(3 + 1e-9) }, { extraHexKeys: extra })).toEqual([]);
    expect(compareJson({ k: hexOf(3) }, { k: hexOf(4) }, { extraHexKeys: extra })).toHaveLength(1);
  });

  it('classify: identical, within the tolerance, differs', () => {
    const a = { pos: [hexOf(1), hexOf(2)] };
    expect(classify(a, { pos: [hexOf(1), hexOf(2)] })).toBe('identical');
    expect(classify(a, { pos: [hexOf(1), hexOf(2 + 1e-9)] })).toBe('within');
    expect(classify(a, { pos: [hexOf(1), hexOf(3)] })).toBe('differs');
    expect(classify({ randomPeek: 'a' }, { randomPeek: 'b' }, { ignore: ['randomPeek'] })).toBe('identical');
  });
});

describe('force replay rebuild', () => {
  it.each(FORCE_REFS)(
    'every import, split and pre-recombine state of %s.json survives state -> graph -> state',
    (ref) => {
      const failing: string[] = [];
      for (const row of loadForceRows(ref, 'stops')) {
        const states: State[] = [
          stopOf(row, STEP_IMPORT).state,
          ...stopOf(row, STEP_SPLIT).components,
          ...componentStatesBeforeRecombine(row),
        ];
        for (const state of states) {
          const rebuilt = dumpState(rebuildGraph(state), dumpOptionsOf(row));
          if (compareJson(state, rebuilt, { ignore: ['randomPeek'] }).length > 0) {
            failing.push(row.id);
          }
        }
      }
      expect(failing).toEqual([]);
    },
  );

  it('rejects a state whose edge names a node, a label whose edge, or a bend point that is not in dump order', () => {
    const row = loadForceRows('force', 'stops').find((r) => stopOf(r, STEP_IMPORT).state.edges.length > 0)!;
    const state = stopOf(row, STEP_IMPORT).state;
    const edge = state.edges[0]!;
    expect(() => rebuildGraph({ ...state, edges: [{ ...edge, srcId: 99 }] })).toThrow('is not in the state');
    expect(() =>
      rebuildGraph({
        ...state,
        labels: [
          { name: 'l', text: 't', edge: 'missing', pos: edge.sp, disp: edge.sp, size: edge.sp, inline: false, prio: 1 },
        ],
      }),
    ).toThrow('edge missing is not in the state');
    expect(() =>
      rebuildGraph({
        ...state,
        bends: [{ edge: edge.name, index: 3, pos: edge.sp, disp: edge.sp, size: edge.sp, prio: 1 }],
      }),
    ).toThrow('cannot be rebuilt in dump order');
  });

  it('dumpState refuses a graph that holds a Random unless the caller supplies the fingerprint', () => {
    const row = loadForceRows('force', 'stops')[0]!;
    const graph = rebuildGraph(stopOf(row, STEP_IMPORT).state);
    graph.setProperty(InternalProperties.RANDOM, {} as never);
    expect(() => dumpState(graph)).toThrow('pass DumpOptions.randomPeek');
    expect(dumpState(graph, { randomPeek: () => '0123456789abcdef' }).props.randomPeek).toBe('0123456789abcdef');
  });
});
