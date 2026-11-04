// SPDX-License-Identifier: EPL-2.0
// Proof of NubSpline and its sections (mission 7e, T7). L4 (R14): every behavioural value comes from an oracle row
// (`calls/NubSpline/*` of layered-routing-steps.json, replayed through `runCall`) or is a twin or an invariant between
// two computations of the same spline; no control point is derived by hand.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { compareCall } from '../../../../../test/helpers/layered-routing-replay-compare.js';
import { runCall, type CallerTable } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import { isCallRow, loadRoutingRows, type CallRow } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import { NoSuchElementException } from '../../../../java/util/NoSuchElementException.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { NubSpline } from './NubSpline.js';
import { createUniformKnotVector, getIndexInKnotVector, getMultiplicity, getTFromPolar } from './NubSplineKnots.js';
import { NubSplinePolarCP } from './NubSplinePolarCP.js';
import { Rectangle } from './Rectangle.js';
import { SplinesMath } from './SplinesMath.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROW_PREFIX = 'calls/NubSpline/';
const NO_ROWS = 0;
/** The row counts per method recorded by T1 (the brief's tally). */
const ROW_TALLY: Readonly<Record<string, number>> = {
  generateDerivedNUBS: 4,
  generateInvertedNUBS: 3,
  toBezier: 4,
  getPointOnCurve: 11,
  getFirstVerticalPoint: 6,
  getLastVerticalPoint: 4,
  getFirstHorizontalPoint: 3,
  getLastHorizontalPoint: 5,
};

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    throw new Error(`no calls/NubSpline row runs the phase ${phase}/${strategy}`);
  },
};

/** The Java `void toBezier()` returns its receiver (the harness summarises the receiver after the call). */
const CALLERS: CallerTable = {
  'NubSpline.generateDerivedNUBS': NubSpline.generateDerivedNUBS,
  'NubSpline.generateInvertedNUBS': NubSpline.generateInvertedNUBS,
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

function callRows(): CallRow[] {
  return loadRoutingRows(STEPS_FILE)
    .filter(isCallRow)
    .filter((row) => row.id.startsWith(ROW_PREFIX));
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('NubSpline calls rows', () => {
  const rows = callRows();

  it('finds the recorded rows per method', () => {
    const tally = Object.fromEntries(
      Object.keys(ROW_TALLY).map((method) => [method, rows.filter((row) => row.id.includes(`/${method}-`)).length]),
    );
    expect(tally).toEqual(ROW_TALLY);
    expect(rows.length).toBeGreaterThan(NO_ROWS);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s matches the oracle', (_id, row) => {
    const actual = runCall(row, factories, CALLERS, { constructors: CONSTRUCTORS });
    expect(compareCall(actual, row.expected.result)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Structural cases from the Java. The control points are the inputs of the oracle rows above (never hand-derived); every
// expectation is a twin (another route to the same spline) or an invariant of the construction.

/** The `nubs` argument of a row's call step: its clamped flag, dimension and control points. */
function rowSpline(id: string): { clamped: boolean; dim: number; points: () => KVector[] } {
  const row = callRows().find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  const [, , nubs] = row.steps[row.steps.length - 1] as [string, string, [string, boolean, number, [string, string][]]];
  const [, clamped, dim, pairs] = nubs;
  return { clamped, dim, points: () => pairs.map(([x, y]) => new KVector(decodeHex(x), decodeHex(y))) };
}

const CHAIN_0 = 'calls/NubSpline/toBezier-chain-0';
const CHAIN_1 = 'calls/NubSpline/toBezier-chain-1';
const UNCLAMPED = 'calls/NubSpline/toBezier-unclamped';
const T_INNER = 0.5;
const ACCURACY = 1e-6;
const MAX_RECURSION = 20;
const NO_RECURSION = 0;
/** The Java `EPSILON` of NubSpline. */
const KNOT_EPSILON = 0.000001;

function splineOf(id: string): NubSpline {
  const { clamped, dim, points } = rowSpline(id);
  return new NubSpline(clamped, dim, points());
}

const pairs = (vectors: Iterable<KVector>): number[][] => Array.from(vectors, (v) => [v.x, v.y]);

describe('NubSpline construction', () => {
  it('has the Java default dimension constant', () => {
    expect(NubSpline.DIM).toBe(3);
  });

  it('rejects a dimension below 1 with the Java exception and message', () => {
    const { points } = rowSpline(CHAIN_0);
    expect(() => new NubSpline(true, 0, points())).toThrow(IllegalArgumentException);
    expect(() => new NubSpline(true, -1, points())).toThrow('The dimension must be at least 1!');
  });

  it('throws IndexOutOfBoundsException for an empty control point list, as ArrayList.get(0) does', () => {
    expect(() => new NubSpline(true, 3, [])).toThrow(IndexOutOfBoundsException);
    expect(() => new NubSpline(true, 3, new KVectorChain())).toThrow(IndexOutOfBoundsException);
  });

  it('pads a short list in place with copies of its first vector up to dimension + 1', () => {
    const { points, dim } = rowSpline(CHAIN_0);
    const short = points().slice(0, 2);
    const first = short[0];
    const spline = new NubSpline(true, dim, short);
    expect(short.length).toBe(dim + 1);
    expect(short.slice(0, short.length - 1).every((vector) => vector === first)).toBe(true);
    expect(spline.getControlPointsSize()).toBe(short.length);
  });

  it('pads a KVectorChain in place, too', () => {
    const { points, dim } = rowSpline(CHAIN_0);
    const chain = new KVectorChain(points().slice(0, 1));
    const first = chain.get(0);
    const spline = new NubSpline(true, dim, chain);
    expect(chain.size()).toBe(dim + 1);
    expect(chain.toArray().every((vector) => vector === first)).toBe(true);
    expect(spline.getControlPointsSize()).toBe(chain.size());
  });

  it('builds the same spline from the varargs overload as from the list overload', () => {
    const { clamped, dim, points } = rowSpline(CHAIN_1);
    const varargs = new NubSpline(clamped, dim, ...points());
    const list = new NubSpline(clamped, dim, points());
    expect(pairs(varargs.getControlPoints())).toEqual(pairs(list.getControlPoints()));
    expect(varargs.getKnotVector()).toEqual(list.getKnotVector());
  });

  it('gives a control point k the polar coordinate of the knots k .. k + dim - 1 (the sliding window)', () => {
    const spline = splineOf(CHAIN_1);
    const knots = spline.getKnotVector();
    const dim = spline.getDim();
    spline.state.controlPoints.forEach((controlPoint, k) => {
      expect(controlPoint.getPolarCoordinate()).toEqual(knots.slice(k, k + dim));
    });
  });

  it.each([CHAIN_0, CHAIN_1, UNCLAMPED])('keeps knots = control points + dim - 1 for %s', (id) => {
    const spline = splineOf(id);
    expect(spline.getKnotVector().length).toBe(spline.getControlPointsSize() + spline.getDim() - 1);
  });

  it('builds a clamped knot vector that starts and ends with dim equal knots, an unclamped one without', () => {
    const clamped = splineOf(CHAIN_0);
    const knots = clamped.getKnotVector();
    const dim = clamped.getDim();
    expect(new Set(knots.slice(0, dim)).size).toBe(1);
    expect(new Set(knots.slice(knots.length - dim)).size).toBe(1);
    expect(new Set(splineOf(UNCLAMPED).getKnotVector().slice(0, dim)).size).toBeGreaterThan(1);
  });
});

describe('NubSpline accessors', () => {
  it('returns the control points as a new chain of the very vectors', () => {
    const spline = splineOf(CHAIN_0);
    const chain = spline.getControlPoints();
    expect(chain.size()).toBe(spline.getControlPointsSize());
    expect(chain.get(1)).toBe(spline.getControlPoint(1));
    chain.removeLast();
    expect(spline.getControlPointsSize()).toBe(chain.size() + 1);
  });

  it('returns a copy of the knot vector', () => {
    const spline = splineOf(CHAIN_0);
    const knots = spline.getKnotVector();
    knots.push(NaN);
    expect(spline.getKnotVector()).not.toContain(NaN);
  });

  it('copies the knot vector in the copy constructor and shares the control point objects', () => {
    const spline = splineOf(CHAIN_0);
    const copy = new NubSpline(spline);
    expect(copy.getKnotVector()).toEqual(spline.getKnotVector());
    expect(copy.getDim()).toBe(spline.getDim());
    expect(copy.getControlPoint(0)).toBe(spline.getControlPoint(0));
    copy.getPointOnCurve(T_INNER, true);
    expect(copy.getControlPointsSize()).toBeGreaterThan(spline.getControlPointsSize());
  });

  it('computes the outer box once from the control points and hands out the same box', () => {
    const spline = splineOf(CHAIN_1);
    const box = spline.getOuterBox();
    const twin = new Rectangle(spline.getControlPoints());
    expect([box.getTop(), box.getRight(), box.getBottom(), box.getLeft()]).toEqual([
      twin.getTop(),
      twin.getRight(),
      twin.getBottom(),
      twin.getLeft(),
    ]);
    expect(spline.getOuterBox()).toBe(box);
  });

  it('lets a subclass set the outer box, which the copy constructor shares', () => {
    class Boxed extends NubSpline {
      box(rectangle: Rectangle): void {
        this.setOuterBox(rectangle);
      }
    }
    const { clamped, dim, points } = rowSpline(CHAIN_0);
    const boxed = new Boxed(clamped, dim, points());
    const rectangle = new Rectangle(1, 2, 3, 4);
    boxed.box(rectangle);
    expect(boxed.getOuterBox()).toBe(rectangle);
    expect(new NubSpline(boxed).getOuterBox()).toBe(rectangle);
  });

  it('prints its polar control points as a Java list', () => {
    const spline = splineOf(CHAIN_0);
    expect(spline.toString()).toBe(`[${spline.state.controlPoints.map(String).join(', ')}]`);
  });
});

describe('NubSpline.getPointOnCurve', () => {
  it('leaves the spline alone without modify and inserts the knot with modify, returning the same point', () => {
    const spline = splineOf(CHAIN_1);
    const sizeBefore = spline.getControlPointsSize();
    const unmodified = spline.getPointOnCurve(T_INNER);
    expect(spline.getControlPointsSize()).toBe(sizeBefore);
    const modified = spline.getPointOnCurve(T_INNER, true);
    expect(spline.getControlPointsSize()).toBeGreaterThan(sizeBefore);
    expect([modified.x, modified.y]).toEqual([unmodified.x, unmodified.y]);
  });

  it('inserts the knot dim - multiplicity times and keeps the knots sorted with dim coordinates per point', () => {
    const spline = splineOf(CHAIN_1);
    const knotsBefore = spline.getKnotVector().length;
    const multiplicity = getMultiplicity(spline.state, T_INNER);
    spline.getPointOnCurve(T_INNER, true);
    const knots = spline.getKnotVector();
    expect(knots.length).toBe(knotsBefore + spline.getDim() - multiplicity);
    expect(knots).toEqual([...knots].sort((a, b) => a - b));
    expect(spline.getKnotVector().length).toBe(spline.getControlPointsSize() + spline.getDim() - 1);
    spline.state.controlPoints.forEach((controlPoint) => {
      const polar = controlPoint.getPolarCoordinate();
      expect(polar.length).toBe(spline.getDim());
      expect(polar).toEqual([...polar].sort((a, b) => a - b));
    });
  });

  it('does not insert when a control point already lies at t (multiplicity equals dim)', () => {
    const spline = splineOf(CHAIN_0);
    const size = spline.getControlPointsSize();
    const start = spline.getPointOnCurve(0.0, true);
    expect(spline.getControlPointsSize()).toBe(size);
    expect(start).toBe(spline.getControlPoint(0));
  });

  it('throws NoSuchElementException for a t beyond the knot vector, as the Java iterators do', () => {
    expect(() => splineOf(CHAIN_0).getPointOnCurve(2.0)).toThrow(NoSuchElementException);
  });
});

describe('NubSpline generators', () => {
  it('derives to dimension - 1 with the flags kept and the end knots dropped', () => {
    const spline = splineOf(CHAIN_0);
    const derived = NubSpline.generateDerivedNUBS(spline);
    expect(derived.getDim()).toBe(spline.getDim() - 1);
    expect(derived.getControlPointsSize()).toBe(spline.getControlPointsSize() - 1);
    expect(derived.getKnotVector()).toEqual(spline.getKnotVector().slice(1, -1));
    expect(derived.state.isClamped).toBe(spline.state.isClamped);
    expect(derived.state.isUniform).toBe(spline.state.isUniform);
    expect(derived.state.isBezier).toBe(spline.state.isBezier);
  });

  it('inverts twice back to the original control points and knots', () => {
    const spline = splineOf(CHAIN_1);
    const twice = NubSpline.generateInvertedNUBS(NubSpline.generateInvertedNUBS(spline));
    expect(pairs(twice.getControlPoints())).toEqual(pairs(spline.getControlPoints()));
    spline.getKnotVector().forEach((knot, k) => expect(twice.getKnotVector()[k]).toBeCloseTo(knot, 12));
  });

  it('does not share control point vectors with the inverted spline (the chain reverse copies)', () => {
    const spline = splineOf(CHAIN_0);
    const inverted = NubSpline.generateInvertedNUBS(spline);
    expect(inverted.getControlPoint(0)).not.toBe(spline.getControlPoint(spline.getControlPointsSize() - 1));
  });

  it('throws NoSuchElementException when the knot vector has no start knot (the private constructor)', () => {
    expect(
      () => new NubSpline({ clamped: true, uniform: true, bezier: false, dim: 1, knotVec: [], polarVectors: [] }),
    ).toThrow(NoSuchElementException);
  });
});

describe('NubSpline bezier form', () => {
  const multiplicities = (spline: NubSpline): number[] => {
    const counts = new Map<number, number>();
    spline.getKnotVector().forEach((knot) => counts.set(knot, (counts.get(knot) ?? 0) + 1));
    return [...counts.values()];
  };

  it.each([CHAIN_0, CHAIN_1])('gives every knot of the clamped %s the multiplicity dim', (id) => {
    const spline = splineOf(id);
    spline.toBezier();
    expect(multiplicities(spline).every((count) => count === spline.getDim())).toBe(true);
    expect(spline.state.isBezier).toBe(true);
    expect(spline.state.isClamped).toBe(true);
    expect(spline.getKnotVector().length).toBe(spline.getControlPointsSize() + spline.getDim() - 1);
  });

  it('gives every knot of the unclamped spline but the last one the multiplicity dim, and marks it clamped', () => {
    const spline = splineOf(UNCLAMPED);
    spline.toBezier();
    const counts = multiplicities(spline);
    expect(counts.slice(0, -1).every((count) => count === spline.getDim())).toBe(true);
    expect(spline.state.isBezier).toBe(true);
    expect(spline.state.isClamped).toBe(true);
  });

  it('returns without source and target by default, with them on request', () => {
    const spline = splineOf(CHAIN_1);
    const converted = splineOf(CHAIN_1);
    converted.toBezier();
    const size = converted.getControlPointsSize();
    expect(spline.getBezierCP().size()).toBe(size - 2);
    expect(spline.getBezierCP(true, true).size()).toBe(size);
    expect(spline.getBezierCP(true, false).size()).toBe(size - 1);
    expect(spline.getBezierCP(false, true).size()).toBe(size - 1);
  });

  it('converts on demand to the same control points as an explicit toBezier', () => {
    const explicit = splineOf(CHAIN_1);
    explicit.toBezier();
    const onDemand = splineOf(CHAIN_1).getBezierCP(true, true);
    expect(pairs(onDemand)).toEqual(pairs(explicit.getControlPoints()));
  });
});

describe('NubSpline extrema', () => {
  const SPLINES = [CHAIN_0, CHAIN_1];

  it.each(SPLINES)('finds the last vertical point of %s as the first of the inverted spline', (id) => {
    const spline = splineOf(id);
    const last = NubSpline.getLastVerticalPoint(spline, ACCURACY, MAX_RECURSION);
    const first = NubSpline.getFirstVerticalPoint(NubSpline.generateInvertedNUBS(spline), ACCURACY, MAX_RECURSION);
    expect(last.x).toBeCloseTo(first.x, 9);
    expect(last.y).toBeCloseTo(first.y, 9);
  });

  it.each(SPLINES)('finds the last horizontal point of %s as the first of the inverted spline', (id) => {
    const spline = splineOf(id);
    const last = NubSpline.getLastHorizontalPoint(spline, ACCURACY, MAX_RECURSION);
    const first = NubSpline.getFirstHorizontalPoint(NubSpline.generateInvertedNUBS(spline), ACCURACY, MAX_RECURSION);
    expect(last.x).toBeCloseTo(first.x, 9);
    expect(last.y).toBeCloseTo(first.y, 9);
  });

  it.each(SPLINES)('keeps every extreme point of %s inside the outer box (convex hull)', (id) => {
    const spline = splineOf(id);
    const box = spline.getOuterBox();
    const found = [
      NubSpline.getFirstVerticalPoint(spline, ACCURACY, MAX_RECURSION),
      NubSpline.getLastVerticalPoint(spline, ACCURACY, MAX_RECURSION),
      NubSpline.getFirstHorizontalPoint(spline, ACCURACY, MAX_RECURSION),
      NubSpline.getLastHorizontalPoint(spline, ACCURACY, MAX_RECURSION),
    ];
    found.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(box.getLeft());
      expect(point.x).toBeLessThanOrEqual(box.getRight());
      expect(point.y).toBeGreaterThanOrEqual(box.getTop());
      expect(point.y).toBeLessThanOrEqual(box.getBottom());
    });
  });

  it('returns the start of the spline when no recursion is allowed (knot stays 0.0), and its end for the last points', () => {
    const spline = splineOf(CHAIN_0);
    const start = spline.getPointOnCurve(0.0);
    const end = spline.getPointOnCurve(1.0);
    const starts = [
      NubSpline.getFirstVerticalPoint(spline, ACCURACY, NO_RECURSION),
      NubSpline.getFirstHorizontalPoint(spline, ACCURACY, NO_RECURSION),
    ];
    const ends = [
      NubSpline.getLastVerticalPoint(spline, ACCURACY, NO_RECURSION),
      NubSpline.getLastHorizontalPoint(spline, ACCURACY, NO_RECURSION),
    ];
    starts.forEach((point) => expect([point.x, point.y]).toEqual([start.x, start.y]));
    ends.forEach((point) => expect([point.x, point.y]).toEqual([end.x, end.y]));
  });
});

describe('NubSpline.generateNiceCurve', () => {
  const nice = NubSpline.generateNiceCurve();
  const n = nice.getControlPointsSize();
  const middle = (n - 1) / 2;

  it('builds a spline of the default dimension with an odd number of control points', () => {
    expect(nice.getDim()).toBe(NubSpline.DIM);
    expect(Number.isInteger(middle)).toBe(true);
  });

  it('mirrors the single-use vectors about the middle control point', () => {
    // the first dim entries are one aliased vector (see below); the single-use ones follow up to the middle
    for (let k = NubSpline.DIM; k < middle; k++) {
      const [left, right] = [nice.getControlPoint(k), nice.getControlPoint(n - 1 - k)];
      expect(left.x + right.x).toBeCloseTo(2 * nice.getControlPoint(middle).x, 9);
      expect(left.y).toBeCloseTo(right.y, 9);
    }
  });

  it('repeats its first and last vector dim times', () => {
    expect(pairs([nice.getControlPoint(1), nice.getControlPoint(2)])).toEqual(
      pairs([nice.getControlPoint(0), nice.getControlPoint(0)]),
    );
    expect(pairs([nice.getControlPoint(n - 2), nice.getControlPoint(n - 3)])).toEqual(
      pairs([nice.getControlPoint(n - 1), nice.getControlPoint(n - 1)]),
    );
  });

  it('scales and offsets the first vector once per chain entry, as the Java adds the same KVector three times', () => {
    // twin of niceChain.scale(5.0) / offset(-50.0, -80.0) over three entries that are one object
    const aliased = new KVector(5.5, 23.0);
    for (let entry = 0; entry < NubSpline.DIM; entry++) {
      aliased.scale(5.0);
    }
    for (let entry = 0; entry < NubSpline.DIM; entry++) {
      aliased.add(-50.0, -80.0);
    }
    expect(pairs([nice.getControlPoint(0)])).toEqual(pairs([aliased]));
  });
});

describe('NubSplinePolarCP', () => {
  it('copies the control point and the polar coordinate it is built from', () => {
    const vector = new KVector(1, 2);
    const polar = [0, 0.5, 1];
    const controlPoint = new NubSplinePolarCP(vector, polar);
    vector.add(1, 1);
    polar.push(2);
    expect(controlPoint.getCp()).not.toBe(vector);
    expect(pairs([controlPoint.getCp()])).toEqual([[1, 2]]);
    expect(controlPoint.getPolarCoordinate()).toEqual([0, 0.5, 1]);
  });

  it('copies both fields in the copy constructor and lets the setters replace them', () => {
    const original = new NubSplinePolarCP(new KVector(1, 2), [0, 1]);
    const copy = new NubSplinePolarCP(original);
    expect(copy.getCp()).not.toBe(original.getCp());
    expect(copy.getPolarCoordinate()).not.toBe(original.getPolarCoordinate());
    expect(copy.getCp()).toEqual(original.getCp());
    const replacement = new KVector(9, 9);
    copy.setCp(replacement);
    copy.setPolarCoordinate([5, 6]);
    expect(copy.getCp()).toBe(replacement);
    expect(copy.getPolarCoordinate()).toEqual([5, 6]);
  });

  it('prints the polar coordinate as a Java list followed by the one-decimal vector', () => {
    const controlPoint = new NubSplinePolarCP(new KVector(1, 2), [0, 0.5]);
    expect(controlPoint.toString()).toBe(
      `[${doubleToString(0)}, ${doubleToString(0.5)}] ${SplinesMath.convertKVectorToString(controlPoint.getCp())}`,
    );
  });

  it('combines two neighbours for an inserted knot into a point on their segment', () => {
    const spline = splineOf(CHAIN_1);
    const [first, second] = spline.state.controlPoints.slice(1, 3);
    const knot = (first.getPolarCoordinate()[1] + second.getPolarCoordinate()[1]) / 2;
    const combined = new NubSplinePolarCP(first, second, knot);
    expect(combined.getPolarCoordinate().length).toBe(first.getPolarCoordinate().length);
    expect(combined.getPolarCoordinate()).toContain(knot);
    const factor = (combined.getCp().x - first.getCp().x) / (second.getCp().x - first.getCp().x);
    expect(combined.getCp().y).toBeCloseTo(first.getCp().y + factor * (second.getCp().y - first.getCp().y), 9);
  });

  it('appends the new knot last when it exceeds every knot of the first point', () => {
    const spline = splineOf(CHAIN_1);
    const [first, second] = spline.state.controlPoints.slice(1, 3);
    const beyond = Math.max(...first.getPolarCoordinate()) + 1;
    const combined = new NubSplinePolarCP(first, second, beyond);
    expect(combined.getPolarCoordinate()[combined.getPolarCoordinate().length - 1]).toBe(beyond);
  });
});

describe('NubSplineKnots', () => {
  it('reports a missing knot as the size of the knot vector', () => {
    const spline = splineOf(CHAIN_0);
    expect(getIndexInKnotVector(spline.state, 2.0)).toBe(spline.getKnotVector().length);
    expect(getIndexInKnotVector(spline.state, 0.0)).toBe(0);
  });

  it('counts the knots within epsilon as the multiplicity', () => {
    const spline = splineOf(CHAIN_0);
    const knots = spline.getKnotVector();
    const near = (probe: number): number => knots.filter((knot) => Math.abs(knot - probe) < KNOT_EPSILON).length;
    expect(getMultiplicity(spline.state, 0.0)).toBe(near(0.0));
    expect(getMultiplicity(spline.state, T_INNER)).toBe(near(T_INNER));
    expect(getMultiplicity(spline.state, 2.0)).toBe(near(2.0));
    expect(getMultiplicity(spline.state, 0.0)).toBe(spline.getDim());
  });

  it('averages a polar coordinate to its t', () => {
    const polar = splineOf(CHAIN_1).state.controlPoints[2].getPolarCoordinate();
    expect(getTFromPolar(polar)).toBe(polar.reduce((sum, value) => sum + value, 0) / polar.length);
  });

  it('rejects a knot vector shorter than twice the dimension', () => {
    const state = splineOf(CHAIN_0).state;
    expect(() => createUniformKnotVector({ ...state, knotVector: [] }, true, state.dimNUBS)).toThrow(
      IllegalArgumentException,
    );
  });
});
