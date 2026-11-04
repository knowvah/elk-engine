// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the NubSpline branches that only the T13 `calls/NubSpline/{extremePoints,construction}/*` rows
// reach (mission 7e, T14b, unreached.md S17-S18 and the J owners of NubSpline.test.ts). Each case replays one row
// through `runCall` and asserts the field the branch decides (the extreme point, the padded control points, the point on
// an unclamped curve), with literals copied from the row (L4, R14): NubSpline.test.ts replays the whole summaries.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isCallRow,
  loadRoutingRows,
  type CallResult,
  type NubsSummary,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../../core/math/KVector.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { NubSpline } from './NubSpline.js';
import { Rectangle } from './Rectangle.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;
const X = 0;
const Y = 1;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubSpline row runs the phase ${phase}/${strategy}`);
  },
};

const CALLERS: CallerTable = {
  'NubSpline.toBezier': (spline: NubSpline) => {
    spline.toBezier();
    return spline;
  },
  'NubSpline.getPointOnCurve': (spline: NubSpline, t: number, modify?: boolean) => spline.getPointOnCurve(t, modify),
  'NubSpline.getFirstVerticalPoint': NubSpline.getFirstVerticalPoint,
  'NubSpline.getLastVerticalPoint': NubSpline.getLastVerticalPoint,
  'NubSpline.getFirstHorizontalPoint': NubSpline.getFirstHorizontalPoint,
  'NubSpline.getLastHorizontalPoint': NubSpline.getLastHorizontalPoint,
  'NubSpline.generateNiceCurve': NubSpline.generateNiceCurve,
};

const CONSTRUCTORS = {
  // the row order is (top, right, bottom, left); the Java constructor takes (left, top, right, bottom)
  rectangle: (top: number, right: number, bottom: number, left: number) => new Rectangle(left, top, right, bottom),
  nubs: (clamped: boolean, dim: number, points: KVector[]) => new NubSpline(clamped, dim, points),
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadRoutingRows(STEPS_FILE).filter(isCallRow);

/** Replays the `calls/NubSpline/<id>` row and returns its summarised result. */
function replayed(id: string): CallResult {
  const row = rows.find((candidate) => candidate.id === `calls/NubSpline/${id}`);
  if (row === undefined) {
    throw new Error(`no row calls/NubSpline/${id}`);
  }
  return runCall(row, factories, CALLERS, { constructors: CONSTRUCTORS });
}

function pointOf(id: string): [number, number] {
  const result = replayed(id);
  if (result.type !== 'vector' || result.value === null) {
    throw new Error(`calls/NubSpline/${id} did not return a vector`);
  }
  return [decodeHex(result.value[X]), decodeHex(result.value[Y])];
}

function splineOf(id: string): NubsSummary {
  const result = replayed(id);
  if (result.type !== 'nubs' || result.value === null) {
    throw new Error(`calls/NubSpline/${id} did not return a spline`);
  }
  return result.value;
}

function expectPoint(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, COORDINATE_DIGITS));
}

interface ExtremeCase {
  readonly id: string;
  readonly java: string;
  readonly decides: string;
  readonly point: readonly [number, number];
}

/** The 18 `extremePoints` rows that call a finder, with the branch of the zero finder each one takes. */
const EXTREME_CASES: readonly ExtremeCase[] = [
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p3-r10; NubSpline.java:825-827
  {
    id: 'getFirstVerticalPoint-p3-r10',
    java: 'NubSpline.java:825-827',
    decides: 'a zero of the x polygon at the second control point (equal consecutive points)',
    point: [0.0, 0.0],
  },
  // oracle: calls/NubSpline/extremePoints/getLastVerticalPoint-p3-r10; NubSpline.java:825-827
  {
    id: 'getLastVerticalPoint-p3-r10',
    java: 'NubSpline.java:825-827',
    decides: 'a zero of the x polygon at the second control point (equal consecutive points)',
    point: [60.0, 40.0],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstHorizontalPoint-p3-r10; NubSpline.java:769-771
  {
    id: 'getFirstHorizontalPoint-p3-r10',
    java: 'NubSpline.java:769-771',
    decides: 'a zero of the y polygon at the second control point (equal consecutive points)',
    point: [11.435767480754636, 9.498185092889086],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p1-r10; NubSpline.java:830-835
  {
    id: 'getFirstVerticalPoint-p1-r10',
    java: 'NubSpline.java:830-835',
    decides: 'a sign change of the x polygon between two control points',
    point: [50.64915907669921, 19.79275087469103],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p2-r10; NubSpline.java:830-835
  {
    id: 'getFirstVerticalPoint-p2-r10',
    java: 'NubSpline.java:830-835',
    decides: 'a sign change of the x polygon between two control points',
    point: [30.718125413941134, 50.36514620109761],
  },
  // oracle: calls/NubSpline/extremePoints/getLastVerticalPoint-p1-r10; NubSpline.java:830-835
  {
    id: 'getLastVerticalPoint-p1-r10',
    java: 'NubSpline.java:830-835',
    decides: 'a sign change of the x polygon between two control points',
    point: [50.18337541252949, 24.424297403694986],
  },
  // oracle: calls/NubSpline/extremePoints/getLastVerticalPoint-p2-r10; NubSpline.java:830-835
  {
    id: 'getLastVerticalPoint-p2-r10',
    java: 'NubSpline.java:830-835',
    decides: 'a sign change of the x polygon between two control points',
    point: [30.71812541394113, 50.36514620109757],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstHorizontalPoint-p1-r10; NubSpline.java:774-779
  {
    id: 'getFirstHorizontalPoint-p1-r10',
    java: 'NubSpline.java:774-779',
    decides: 'a sign change of the y polygon between two control points',
    point: [50.563603597404665, 19.600069184676684],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstHorizontalPoint-p2-r10; NubSpline.java:774-779
  {
    id: 'getFirstHorizontalPoint-p2-r10',
    java: 'NubSpline.java:774-779',
    decides: 'a sign change of the y polygon between two control points',
    point: [30.829801613291938, 50.44334418005219],
  },
  // oracle: calls/NubSpline/extremePoints/getLastHorizontalPoint-p1-r10; NubSpline.java:774-779
  {
    id: 'getLastHorizontalPoint-p1-r10',
    java: 'NubSpline.java:774-779',
    decides: 'a sign change of the y polygon between two control points',
    point: [50.56360359740465, 19.600069184676684],
  },
  // oracle: calls/NubSpline/extremePoints/getLastHorizontalPoint-p2-r10; NubSpline.java:774-779
  {
    id: 'getLastHorizontalPoint-p2-r10',
    java: 'NubSpline.java:774-779',
    decides: 'a sign change of the y polygon between two control points',
    point: [30.82980161329195, 50.44334418005219],
  },
  // oracle: calls/NubSpline/extremePoints/getLastHorizontalPoint-p3-r10; NubSpline.java:774-779
  {
    id: 'getLastHorizontalPoint-p3-r10',
    java: 'NubSpline.java:774-779',
    decides: 'a sign change of the y polygon between two control points',
    point: [19.152707889778036, 8.262703327915874],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p4-r10; NubSpline.java:838
  {
    id: 'getFirstVerticalPoint-p4-r10',
    java: 'NubSpline.java:838',
    decides: 'no zero of the x polygon: the finder returns 0.0, the curve start',
    point: [0.0, 0.0],
  },
  // oracle: calls/NubSpline/extremePoints/getLastHorizontalPoint-p4-r10; NubSpline.java:782
  {
    id: 'getLastHorizontalPoint-p4-r10',
    java: 'NubSpline.java:782',
    decides: 'no zero of the y polygon: the finder returns 0.0, the curve end',
    point: [60.0, 90.0],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p1-r0; NubSpline.java:580-587
  {
    id: 'getFirstVerticalPoint-p1-r0',
    java: 'NubSpline.java:580-587',
    decides: 'maxRecursion 0: the loop never runs and the point at knot 0.0 is returned',
    point: [0.0, 80.0],
  },
  // oracle: calls/NubSpline/extremePoints/getLastVerticalPoint-p3-r0; NubSpline.java:607-615
  {
    id: 'getLastVerticalPoint-p3-r0',
    java: 'NubSpline.java:607-615',
    decides: 'maxRecursion 0: the loop never runs and the point at the last knot is returned',
    point: [60.0, 40.0],
  },
  // oracle: calls/NubSpline/extremePoints/getFirstVerticalPoint-p1-r1; NubSpline.java:580-587
  {
    id: 'getFirstVerticalPoint-p1-r1',
    java: 'NubSpline.java:580-587',
    decides: 'maxRecursion 1: one refinement of the x zero',
    point: [45.53126422394174, 24.539855484751925],
  },
  // oracle: calls/NubSpline/extremePoints/getLastHorizontalPoint-p2-r1; NubSpline.java:660-668
  {
    id: 'getLastHorizontalPoint-p2-r1',
    java: 'NubSpline.java:660-668',
    decides: 'maxRecursion 1: one refinement of the y zero',
    point: [38.706190259444696, 45.531264223941726],
  },
];

describe('NubSpline extreme points (T14b, S17)', () => {
  it.each(EXTREME_CASES.map((c) => [c.id, c.decides, c] as const))('%s: %s', (id, _decides, c) => {
    // the row and the Java line of each entry are the comment above it
    expectPoint(pointOf(`extremePoints/${id}`), c.point);
  });

  it('modify=true inserts into the spline itself and returns the control point at the knot', () => {
    // oracle: calls/NubSpline/extremePoints/getPointOnCurve-p1-modify; NubSpline.java:717-719
    expectPoint(pointOf('extremePoints/getPointOnCurve-p1-modify'), [50.3125, 22.187499999999996]);
  });
});

interface PaddedCase {
  readonly id: string;
  readonly controlPoints: readonly (readonly [number, number])[];
  readonly knotVector: readonly number[];
  readonly outerBox: readonly number[];
}

const PADDED_CASES: readonly PaddedCase[] = [
  // oracle: calls/NubSpline/construction/padded-1pt; NubSpline.java:109-111 (the padding loop repeats the first point)
  {
    id: 'padded-1pt',
    controlPoints: [
      [10.0, 5.0],
      [10.0, 5.0],
      [10.0, 5.0],
      [10.0, 5.0],
    ],
    knotVector: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
    outerBox: [5.0, 10.0, 5.0, 10.0],
  },
  // oracle: calls/NubSpline/construction/padded-2pt; NubSpline.java:109-111 (the padding loop repeats the first point)
  {
    id: 'padded-2pt',
    controlPoints: [
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [10.0, 5.0],
    ],
    knotVector: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
    outerBox: [0.0, 10.0, 5.0, 0.0],
  },
  // oracle: calls/NubSpline/construction/padded-3pt; NubSpline.java:109-111 (the padding loop repeats the first point)
  {
    id: 'padded-3pt',
    controlPoints: [
      [0.0, 0.0],
      [0.0, 0.0],
      [10.0, 5.0],
      [20.0, 0.0],
    ],
    knotVector: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
    outerBox: [0.0, 20.0, 5.0, 0.0],
  },
];

const NICE_POINTS: readonly (readonly [number, number])[] = [
  [537.5, 2635.0],
  [537.5, 2635.0],
  [537.5, 2635.0],
  [-37.5, -20.0],
  [-25.0, -30.0],
  [-25.0, -35.0],
  [-31.0, -52.5],
  [-15.0, -60.0],
  [-15.0, -62.5],
  [-20.0, -69.0],
  [-10.0, -77.5],
  [0.0, -69.0],
  [-5.0, -62.5],
  [-5.0, -60.0],
  [11.0, -52.5],
  [5.0, -35.0],
  [5.0, -30.0],
  [17.5, -20.0],
  [2.5, 35.0],
  [2.5, 35.0],
  [2.5, 35.0],
];
const NICE_KNOTS: readonly number[] = [
  0.0, 0.0, 0.0, 0.05555555555555555, 0.1111111111111111, 0.16666666666666666, 0.2222222222222222, 0.2777777777777778,
  0.3333333333333333, 0.3888888888888889, 0.4444444444444444, 0.5, 0.5555555555555556, 0.6111111111111112,
  0.6666666666666666, 0.7222222222222222, 0.7777777777777778, 0.8333333333333334, 0.8888888888888888,
  0.9444444444444444, 1.0, 1.0, 1.0,
];
const NICE_BOX: readonly number[] = [-77.5, 537.5, 2635.0, -37.5];

describe('NubSpline construction (T14b, S18)', () => {
  it.each(PADDED_CASES.map((c) => [c.id, c] as const))('%s pads the list to dim + 1 points', (id, c) => {
    const spline = splineOf(`construction/${id}`);
    expect(spline.dim).toBe(3);
    expect(spline.controlPoints).toHaveLength(c.controlPoints.length);
    spline.controlPoints.forEach((point, index) => {
      expectPoint([decodeHex(point[X]), decodeHex(point[Y])], c.controlPoints[index]!);
    });
    expectPoint(spline.knotVector.map(decodeHex), c.knotVector);
    expectPoint(spline.outerBox.map(decodeHex), c.outerBox);
  });

  it('inserts a knot into an unclamped spline', () => {
    // oracle: calls/NubSpline/construction/getPointOnCurve-unclamped; NubSpline.java:478-486 (insertKnot, isClamped false)
    expectPoint(pointOf('construction/getPointOnCurve-unclamped'), [24.999999999999996, 11.874999999999998]);
  });

  it('generates the nice curve: 21 control points, the first and last three equal, outer box from the points', () => {
    // oracle: calls/NubSpline/construction/niceCurve; NubSpline.java:951-984 (generateNiceCurve, mirrorOnX, addMirrored)
    const curve = splineOf('construction/niceCurve');
    const points = curve.controlPoints.map(([x, y]) => [decodeHex(x), decodeHex(y)] as const);
    expect(points).toHaveLength(21);
    points.forEach((point, index) => expectPoint(point, NICE_POINTS[index]!));
    expectPoint(curve.knotVector.map(decodeHex), NICE_KNOTS);
    expectPoint(curve.outerBox.map(decodeHex), NICE_BOX);
    expect([points[0], points[1]]).toEqual([points[1], points[2]]);
  });
});

/** The `nubs` argument of a row's call step: clamped flag, dimension and control points. */
function rowSpline(id: string): NubSpline {
  const row = rows.find((candidate) => candidate.id === `calls/NubSpline/${id}`)!;
  const [, , nubs] = row.steps[row.steps.length - 1] as [string, string, [string, boolean, number, [string, string][]]];
  const [, clamped, dim, hexPoints] = nubs;
  return new NubSpline(
    clamped,
    dim,
    hexPoints.map(([x, y]) => new KVector(decodeHex(x), decodeHex(y))),
  );
}

describe('NubSpline.toBezier on a Bezier spline (T14b, J)', () => {
  it('leaves control points and knots unchanged: every inner knot already has multiplicity dim', () => {
    // J: NubSpline.java:881 (`occurrence < dimNUBS` is false for every inner knot); the second call is the twin of the first
    const spline = rowSpline('toBezier-chain-0');
    spline.toBezier();
    const snapshot = {
      controlPoints: Array.from(spline.getControlPoints(), (v) => [v.x, v.y]),
      knotVector: Array.from(spline.getKnotVector()),
    };
    expect(snapshot.knotVector.length).toBeGreaterThan(spline.getDim() * 2);
    spline.toBezier();
    expect(Array.from(spline.getControlPoints(), (v) => [v.x, v.y])).toEqual(snapshot.controlPoints);
    expect(Array.from(spline.getKnotVector())).toEqual(snapshot.knotVector);
  });
});
