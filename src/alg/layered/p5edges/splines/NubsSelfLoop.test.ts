// SPDX-License-Identifier: EPL-2.0
// Proof of NubsSelfLoop (mission 7e, T7). L4 (R14): the five static factories replay every `calls/NubsSelfLoop/*` row of
// layered-routing-steps.json through `runCall` (no caller exists at this commit, R12); the constructors, the label
// position and the dimension are structural cases checked against twins (the same spline built through `NubSpline`).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { compareCall } from '../../../../../test/helpers/layered-routing-replay-compare.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import { isCallRow, loadRoutingRows, type CallRow } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { NubSpline } from './NubSpline.js';
import { NubsSelfLoop } from './NubsSelfLoop.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROW_PREFIX = 'calls/NubsSelfLoop/';
/** Four sides times two node sizes per factory (T1's tally); T13 added two UNDEFINED-side corner rows. */
const ROWS_PER_FACTORY = 8;
const EXTRA_ROWS: Readonly<Record<string, number>> = { createCornerSelfLoop: 2 };
const FACTORIES = [
  'createSideSelfLoop',
  'createCornerSelfLoop',
  'createAcrossSelfLoop',
  'createThreeSideSelfLoop',
  'createFourSideSelfLoop',
] as const;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubsSelfLoop row runs the phase ${phase}/${strategy}`);
  },
};

const CALLERS: CallerTable = Object.fromEntries(
  FACTORIES.map((name) => [`NubsSelfLoop.${name}`, NubsSelfLoop[name] as CallerTable[string]]),
);

function callRows(): CallRow[] {
  return loadRoutingRows(STEPS_FILE)
    .filter(isCallRow)
    .filter((row) => row.id.startsWith(ROW_PREFIX));
}

/** A control-point list of the minimum length for dimension 3 (four vectors), the 'chain' shape of the NubSpline rows. */
const points = (): KVector[] => [new KVector(0, 0), new KVector(1, 2), new KVector(3, 3), new KVector(5, 0)];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('NubsSelfLoop calls rows', () => {
  const rows = callRows();

  it.each(FACTORIES)('finds the recorded rows of %s', (factory) => {
    expect(rows.filter((row) => row.id.startsWith(`${ROW_PREFIX}${factory}-`)).length).toBe(
      ROWS_PER_FACTORY + (EXTRA_ROWS[factory] ?? 0),
    );
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s matches the oracle', (_id, row) => {
    expect(compareCall(runCall(row, factories, CALLERS), row.expected.result)).toEqual([]);
  });
});

describe('NubsSelfLoop construction', () => {
  it('builds the same spline as NubSpline for the dimension-and-list constructor (always clamped)', () => {
    const loop = new NubsSelfLoop(NubSpline.DIM, points());
    const twin = new NubSpline(true, NubSpline.DIM, points());
    expect(loop.getKnotVector()).toEqual(twin.getKnotVector());
    expect(String(loop.getControlPoints())).toBe(String(twin.getControlPoints()));
    expect(loop.getDim()).toBe(NubSpline.DIM);
  });

  it('builds the same spline as NubSpline for the vector-list overload with a KVectorChain', () => {
    const loop = new NubsSelfLoop(NubSpline.DIM, new KVectorChain(...points()));
    const twin = new NubSpline(true, NubSpline.DIM, new KVectorChain(...points()));
    expect(String(loop.getControlPoints())).toBe(String(twin.getControlPoints()));
  });

  it('builds the same spline from the varargs overload as from the list overload', () => {
    const vectors = points();
    const varargs = new NubsSelfLoop(NubSpline.DIM, ...vectors);
    const list = new NubsSelfLoop(NubSpline.DIM, points());
    expect(String(varargs.getControlPoints())).toBe(String(list.getControlPoints()));
    expect(varargs.getKnotVector()).toEqual(list.getKnotVector());
  });

  it('honours the clamped flag of the three-argument constructor', () => {
    const unclamped = new NubsSelfLoop(false, NubSpline.DIM, points());
    const twin = new NubSpline(false, NubSpline.DIM, points());
    const clamped = new NubsSelfLoop(true, NubSpline.DIM, points());
    expect(unclamped.getKnotVector()).toEqual(twin.getKnotVector());
    expect(unclamped.getKnotVector()).not.toEqual(clamped.getKnotVector());
  });
});

describe('NubsSelfLoop first label position', () => {
  it('starts at the origin, as the Java field initializer new KVector()', () => {
    const position = new NubsSelfLoop(NubSpline.DIM, points()).getFirstLabelPosition();
    expect([position.x, position.y]).toEqual([new KVector().x, new KVector().y]);
  });

  it('stores the very vector it is given and returns it modifiable', () => {
    const loop = new NubsSelfLoop(NubSpline.DIM, points());
    const position = new KVector(7, 9);
    loop.setFirstLabelPosition(position);
    expect(loop.getFirstLabelPosition()).toBe(position);
    loop.getFirstLabelPosition().add(1, 1);
    expect(position).toEqual(new KVector(7, 9).add(1, 1));
  });

  it('shares the label position with its copy and copies the spline', () => {
    const loop = new NubsSelfLoop(NubSpline.DIM, points());
    loop.setFirstLabelPosition(new KVector(3, 4));
    const copy = new NubsSelfLoop(loop);
    expect(copy.getFirstLabelPosition()).toBe(loop.getFirstLabelPosition());
    expect(copy.getKnotVector()).toEqual(loop.getKnotVector());
    expect(copy.getControlPoint(1)).toBe(loop.getControlPoint(1));
  });
});
