// SPDX-License-Identifier: EPL-2.0
// Branches of `AreaApproximation` the recorded rows do not reach (replay-alone coverage): the tie arms of `checkSpecialCases`
// (AreaApproximation.java:192-235), the null result of `findBestCandidate` (:157) and its two dereferences (:98, :143), the `switch`
// default arms (:139, :301). The geometry is the smallest that makes the Java rule pick each arm; the expected values are which of the
// two drawings the rule returns.
import { describe, expect, it } from 'vitest';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { OptimizationGoal } from '../options/OptimizationGoal.js';
import { DrawingData } from '../util/DrawingData.js';
import { DrawingDataDescriptor as D } from '../util/DrawingDataDescriptor.js';
import { AreaApproximation } from './AreaApproximation.js';

/** The private members the tests reach (TypeScript `private` is erased at run time, as Java reflection reaches them). */
interface Internals {
  checkSpecialCases(a: DrawingData, b: DrawingData, lastPlaced: ElkNode, toPlace: ElkNode): DrawingData;
  findBestCandidate(
    opts: readonly [DrawingData, DrawingData, DrawingData, DrawingData],
    toPlace: ElkNode,
    lastPlaced: ElkNode,
    padding: ElkPadding,
  ): DrawingData | null;
  calcValuesForOpt(option: D, context: unknown): DrawingData;
}

const internals = (approximation: AreaApproximation): Internals => approximation as unknown as Internals;

function box(parent: ElkNode, x: number, y: number, width: number, height: number): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setLocation(x, y);
  node.setDimensions(width, height);
  return node;
}

const drawing = (option: D, x = 0, y = 0): DrawingData => new DrawingData(1, 10, 10, option, x, y);

describe('AreaApproximation.checkSpecialCases', () => {
  const approximation = internals(new AreaApproximation(1, OptimizationGoal.AREA_DRIVEN, false));
  const root = ElkGraphUtil.createGraph();
  const lastPlaced = box(root, 0, 0, 10, 10);
  const toPlace = box(root, 0, 0, 10, 10);
  const pick = (a: DrawingData, b: DrawingData): DrawingData =>
    approximation.checkSpecialCases(a, b, lastPlaced, toPlace);

  it('two "below" options take the whole-drawing one, whichever comes first (java:192-195)', () => {
    const wdb = drawing(D.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW);
    const lpb = drawing(D.CANDIDATE_POSITION_LAST_PLACED_BELOW);
    expect(pick(wdb, lpb)).toBe(wdb);
    expect(pick(lpb, wdb)).toBe(wdb);
  });

  it('two "right" options take the whole-drawing one, whichever comes first (java:199-202)', () => {
    const wdr = drawing(D.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT);
    const lpr = drawing(D.CANDIDATE_POSITION_LAST_PLACED_RIGHT);
    expect(pick(wdr, lpr)).toBe(wdr);
    expect(pick(lpr, wdr)).toBe(wdr);
  });

  it('last-placed right and below take the one with less area, a tie goes to right (java:207-230)', () => {
    // lastPlaced and toPlace are 10 x 10 at the origin: right at (20, 0) spans 30 x 10, below at (0, y) spans 10 x (y + 10).
    const lprTie = drawing(D.CANDIDATE_POSITION_LAST_PLACED_RIGHT, 20, 0);
    const lpbTie = drawing(D.CANDIDATE_POSITION_LAST_PLACED_BELOW, 0, 20);
    expect(pick(lprTie, lpbTie)).toBe(lprTie);
    expect(pick(lpbTie, lprTie)).toBe(lprTie);
    const lpbSmaller = drawing(D.CANDIDATE_POSITION_LAST_PLACED_BELOW, 0, 15);
    expect(pick(lprTie, lpbSmaller)).toBe(lpbSmaller);
    expect(pick(lpbSmaller, lprTie)).toBe(lpbSmaller);
  });

  it('options that match no rule return the first drawing (java:235)', () => {
    const wdr = drawing(D.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT);
    const lpb = drawing(D.CANDIDATE_POSITION_LAST_PLACED_BELOW);
    expect(pick(wdr, lpb)).toBe(wdr);
  });
});

describe('AreaApproximation.findBestCandidate and calcValuesForOpt', () => {
  const root = ElkGraphUtil.createGraph();
  const padding = new ElkPadding(0);

  it('four candidates equal in every measure remain, and no best option is found (java:157)', () => {
    const approximation = internals(new AreaApproximation(1, OptimizationGoal.AREA_DRIVEN, false));
    const same = (): DrawingData => drawing(D.CANDIDATE_POSITION_LAST_PLACED_RIGHT);
    const nodes = [box(root, 0, 0, 1, 1), box(root, 0, 0, 1, 1)] as const;
    expect(approximation.findBestCandidate([same(), same(), same(), same()], nodes[0], nodes[1], padding)).toBeNull();
  });

  it('a null best option is dereferenced: approxBoundingBox throws a TypeError (java:98)', () => {
    const graph = ElkGraphUtil.createGraph();
    box(graph, 0, 0, Number.NaN, Number.NaN);
    box(graph, 0, 0, Number.NaN, Number.NaN);
    const approximation = new AreaApproximation(1, OptimizationGoal.AREA_DRIVEN, false);
    expect(() => approximation.approxBoundingBox(graph.getChildren(), 5, padding)).toThrow(TypeError);
  });

  it('a goal without a case leaves the filters null, which the loop dereferences (java:143)', () => {
    const graph = ElkGraphUtil.createGraph();
    box(graph, 0, 0, 10, 10);
    box(graph, 0, 0, 10, 10);
    const approximation = new AreaApproximation(
      1,
      { name: () => 'NO_SUCH_GOAL' } as unknown as OptimizationGoal,
      false,
    );
    expect(() => approximation.approxBoundingBox(graph.getChildren(), 5, padding)).toThrow(TypeError);
  });

  it('a placement option without a case throws IllegalArgumentException (java:301)', () => {
    const approximation = internals(new AreaApproximation(1, OptimizationGoal.AREA_DRIVEN, false));
    const thrown = (): DrawingData => approximation.calcValuesForOpt(D.WHOLE_DRAWING, {});
    expect(thrown).toThrow(IllegalArgumentException);
    expect(thrown).toThrow('IllegalPlacementOption.');
  });
});
