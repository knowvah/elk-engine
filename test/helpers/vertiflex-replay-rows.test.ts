// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import {
  accumulate,
  decodeHex,
  encodeHex,
  loadVertiFlexRows,
  previousStep,
  rowCountsDifference,
  stateAfter,
  stepIndex,
  STEP_IMPORT,
  STEP_PREAMBLE,
  STEP_RELATIVE_X_PLACER,
  STEP_Y_PLACER,
  type StopsRow,
} from './vertiflex-replay-rows.js';

const HEX_ONE = '3ff0000000000000';
const HEX_NEGATIVE_ZERO = '8000000000000000';

describe('hex doubles', () => {
  it('round-trips the raw bits, -0.0 included', () => {
    expect(encodeHex(1)).toBe(HEX_ONE);
    expect(decodeHex(HEX_ONE)).toBe(1);
    expect(encodeHex(-0)).toBe(HEX_NEGATIVE_ZERO);
    expect(Object.is(decodeHex(HEX_NEGATIVE_ZERO), -0)).toBe(true);
  });

  it('encodes both NaN signs as the one canonical NaN (issue #72)', () => {
    expect(encodeHex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(encodeHex(NaN)).toBe(CANONICAL_NAN_HEX);
  });
});

describe('vertiflex.json rows', () => {
  const rows = loadVertiFlexRows();

  it('holds the rows of the header: 471 rows, 247 full, 216 stops, 8 throws', () => {
    expect(rows).toHaveLength(471);
    expect(loadVertiFlexRows('full')).toHaveLength(247);
    expect(loadVertiFlexRows('stops')).toHaveLength(216);
    expect(loadVertiFlexRows('throws')).toHaveLength(8);
  });

  it('reports a rowCounts header that disagrees with the rows', () => {
    expect(rowCountsDifference({ full: 247, stops: 216, throws: 8 }, rows)).toBeNull();
    expect(rowCountsDifference({ full: 247, stops: 215, throws: 8 }, rows)).toBe(
      'rowCounts.stops is 215, the file holds 216 rows',
    );
  });

  it('gives every stops row the eight steps of the recorder, Import first', { timeout: 60_000 }, () => {
    for (const row of loadVertiFlexRows('stops')) {
      const steps = row.expected.steps;
      expect(steps).toHaveLength(8);
      expect(steps.slice(0, 5)).toEqual([
        STEP_IMPORT,
        'NodeMicroLayout',
        STEP_PREAMBLE,
        STEP_Y_PLACER,
        STEP_RELATIVE_X_PLACER,
      ]);
      expect(steps[5]).toBe('AbsoluteXPlacer');
      expect(['StraightEdgeRouter', 'BendEdgeRouter']).toContain(steps[6]);
      expect(steps[7]).toBe('SetGraphSize');
    }
  });

  it('names the step before a step and rejects an unknown step', () => {
    const row = loadVertiFlexRows('stops')[0]!;
    expect(previousStep(row, STEP_RELATIVE_X_PLACER)).toBe(STEP_Y_PLACER);
    expect(stepIndex(row, STEP_Y_PLACER)).toBe(3);
    expect(() => previousStep(row, STEP_IMPORT)).toThrow('has no predecessor');
    expect(() => stepIndex(row, 'Nope')).toThrow('has no step Nope');
  });

  it(
    'accumulates the deltas: after the last stop the state equals the full dump of the same input',
    { timeout: 60_000 },
    () => {
      const full = new Map(loadVertiFlexRows('full').map((row) => [row.id.replace(/^full\//, ''), row]));
      let compared = 0;
      for (const row of loadVertiFlexRows('stops')) {
        const twin = full.get(row.id.replace(/^stops\//, ''));
        if (twin === undefined) continue;
        const state = accumulate(row, row.expected.stops.length - 1);
        const { props: _props, ...withoutProps } = state;
        expect(withoutProps).toEqual(twin.expected);
        compared += 1;
      }
      expect(compared).toBe(216);
    },
  );

  it('keeps the Import order of a list and lists props in traversal order (graph, then nodes)', () => {
    const row = loadVertiFlexRows('stops').find((r: StopsRow) => r.id === 'stops/star2/default')!;
    const state = stateAfter(row, STEP_RELATIVE_X_PLACER);
    expect(state.nodes.map((n) => n.id)).toEqual(['n0', 'n1', 'n2']);
    expect(state.props.map((p) => p.id)).toEqual(['root', 'n0', 'n1', 'n2']);
    expect(Object.keys(state.props[1]!.props)).toEqual([
      'LEFT_OUTLINE',
      'RIGHT_OUTLINE',
      'OUTLINE_MAX_DEPTH',
      'MIN_X',
      'MAX_X',
      'MIN_Y',
      'MAX_Y',
      'NODE_MODEL_ORDER',
    ]);
  });
});
