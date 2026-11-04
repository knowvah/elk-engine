// SPDX-License-Identifier: EPL-2.0
// Proof of SplinesMath (mission 7e, T6): every `calls/SplinesMath/*` row of layered-routing-steps.json replayed through
// `runCall` with the static methods as callers. The `isBetween` overloads are `isBetweenInt` and `isBetweenDouble`
// (docs/translation-rules.md 6.5), so the int and double rows run against one caller each. The string conversions are
// prose only (R6) and have no row: they are checked against an independent ICU HALF_EVEN formatter (a twin).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { compareCall } from '../../../../../test/helpers/layered-routing-replay-compare.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import { isCallRow, loadRoutingRows, type CallRow } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../../core/math/KVector.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { SplinesMath } from './SplinesMath.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROW_PREFIX = 'calls/SplinesMath/';
const INT_ROW_PREFIX = `${ROW_PREFIX}isBetween-int-`;
const DOUBLE_ROW_PREFIX = `${ROW_PREFIX}isBetween-double-`;
const NO_ROWS = 0;

/** The prefix processors of the rows (`INNERMOST_NODE_MARGIN_CALCULATOR`) go through the real enum. */
const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/SplinesMath row runs the phase ${phase}/${strategy}`);
  },
};

const CALLERS: CallerTable = {
  'SplinesMath.intersect': SplinesMath.intersect as CallerTable[string],
  'SplinesMath.innerAngle': SplinesMath.innerAngle as CallerTable[string],
  'SplinesMath.lengthToOrthogonal': SplinesMath.lengthToOrthogonal,
  'SplinesMath.portSideToDirection': SplinesMath.portSideToDirection,
  'SplinesMath.distPortToNodeEdge': SplinesMath.distPortToNodeEdge,
  'SplinesMath.getMarginOnPortSide': SplinesMath.getMarginOnPortSide,
};

const isBetweenCallers = (caller: CallerTable[string]): CallerTable => ({ 'SplinesMath.isBetween': caller });

function callRows(): CallRow[] {
  return loadRoutingRows(STEPS_FILE)
    .filter(isCallRow)
    .filter((row) => row.id.startsWith(ROW_PREFIX));
}

function callersOf(row: CallRow): CallerTable {
  if (row.id.startsWith(INT_ROW_PREFIX)) {
    return isBetweenCallers(SplinesMath.isBetweenInt);
  }
  return row.id.startsWith(DOUBLE_ROW_PREFIX) ? isBetweenCallers(SplinesMath.isBetweenDouble) : CALLERS;
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('SplinesMath calls rows', () => {
  const rows = callRows();

  it('finds the recorded rows', () => {
    expect(rows.length).toBeGreaterThan(NO_ROWS);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s matches the oracle', (_id, row) => {
    expect(compareCall(runCall(row, factories, callersOf(row)), row.expected.result)).toEqual([]);
  });
});

/** ICU's one-decimal HALF_EVEN, the twin of the hand-written formatter (exact ties only: ICU rounds the shortest decimal). */
/** `roundingMode` (ES2023 Intl.NumberFormat v3) is not in this TypeScript's lib typings. */
const TWIN_OPTIONS: Intl.NumberFormatOptions & { roundingMode: 'halfEven' } = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  roundingMode: 'halfEven',
  useGrouping: false,
};
const TWIN = new Intl.NumberFormat('en-US', TWIN_OPTIONS);
const FORMAT_SAMPLES = [0, 3, 3.14159, -7.5, 2.25, 2.75, 0.25, 1.25, -1.25, -0.04, 12345.678, -0.75, 1e15];

describe('SplinesMath.convertKVectorToString', () => {
  it.each(FORMAT_SAMPLES)('formats %s like the one-decimal HALF_EVEN twin', (value) => {
    expect(SplinesMath.convertKVectorToString(new KVector(value, -value))).toBe(
      `(${TWIN.format(value)},${TWIN.format(-value)})`,
    );
  });

  it('prints a missing vector and a missing or empty list as (null)', () => {
    expect(SplinesMath.convertKVectorToString(null)).toBe('(null)');
    expect(SplinesMath.convertKVectorToString([])).toBe('(null)');
    expect(SplinesMath.convertKVectorToString()).toBe('(null)');
  });

  it('joins the varargs and the iterable form with ", " and the single form with none', () => {
    const [a, b] = [new KVector(1, 2), new KVector(3, 4)] as const;
    const single = SplinesMath.convertKVectorToString(a);
    const both = `${single}, ${SplinesMath.convertKVectorToString(b)}`;
    expect(SplinesMath.convertKVectorToString(a, b)).toBe(both);
    expect(SplinesMath.convertKVectorToString(new Set([a, b]))).toBe(both);
    expect(SplinesMath.convertKVectorToString([a])).toBe(single);
  });

  it('keeps the sign of negative zero and spells the non-finite values', () => {
    expect(SplinesMath.convertKVectorToString(new KVector(-0, Number.NaN))).toBe(
      `(${TWIN.format(-0)},${TWIN.format(Number.NaN)})`,
    );
    expect(SplinesMath.convertKVectorToString(new KVector(Infinity, -Infinity))).toBe(
      `(${TWIN.format(Infinity)},${TWIN.format(-Infinity)})`,
    );
  });

  it('prints a value past 1e21 in full, without an exponent', () => {
    expect(SplinesMath.convertKVectorToString(new KVector(Number.MAX_VALUE, 0))).toBe(
      `(${BigInt(Number.MAX_VALUE).toString()}.0,0.0)`,
    );
  });
});

describe('SplinesMath constants', () => {
  it('derives the angle constants from PI as the Java does', () => {
    expect(SplinesMath.HALF_PI).toBe(Math.PI / 2);
    expect(SplinesMath.QUATER_PI).toBe(Math.PI / 4);
    expect(SplinesMath.THREE_HALF_PI).toBe(SplinesMath.HALF_PI * 3);
    expect(SplinesMath.TWO_PI).toBe(2.0 * Math.PI);
    expect(SplinesMath.THREE).toBe(3);
  });
});
