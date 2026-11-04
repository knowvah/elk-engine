// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { AssertionFailure, checkEdgeRouteIsOrthogonal, isHorizontal, TOLERANCE } from './edge-route-orthogonal.js';

const EDGE = { toString: (): string => 'e_test' };

function chainOf(...points: readonly (readonly [number, number])[]): KVectorChain {
  const chain = new KVectorChain();
  points.forEach(([x, y]) => chain.add(new KVector(x, y)));
  return chain;
}

describe('isHorizontal', () => {
  it('is true below the tolerance and false at or above it', () => {
    expect(isHorizontal(new KVector(0, 1), new KVector(9, 1 + TOLERANCE / 2))).toBe(true);
    expect(isHorizontal(new KVector(0, 1), new KVector(9, 1 + TOLERANCE))).toBe(false);
    expect(isHorizontal(new KVector(0, 1), new KVector(0, 5))).toBe(false);
  });
});

describe('checkEdgeRouteIsOrthogonal', () => {
  it('accepts a two-point horizontal and a two-point vertical route', () => {
    expect(() => {
      checkEdgeRouteIsOrthogonal(EDGE, chainOf([0, 0], [5, 0]));
      checkEdgeRouteIsOrthogonal(EDGE, chainOf([0, 0], [0, 5]));
    }).not.toThrow();
  });

  it('accepts an alternating route within the tolerance', () => {
    const route = chainOf([0, 0], [5, TOLERANCE / 2], [5 + TOLERANCE / 2, 7], [9, 7]);
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, route)).not.toThrow();
  });

  it('fails a route with fewer than two points with the Java message', () => {
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, chainOf([1, 1]))).toThrow('e_test: Route with less than 2 points');
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, chainOf())).toThrow('e_test: Route with less than 2 points');
  });

  it('fails a diagonal segment with the assertEquals message', () => {
    const route = chainOf([0, 0], [5, 0], [6, 3]);
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, route)).toThrow(
      'e_test: horizontal = false prev = (5.0,0.0) curr = (6.0,3.0) expected:<5.0> but was:<6.0>',
    );
  });

  it('fails when the segments do not alternate', () => {
    const route = chainOf([0, 0], [5, 0], [9, 0]);
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, route)).toThrow(
      'e_test: horizontal = false prev = (5.0,0.0) curr = (9.0,0.0) expected:<5.0> but was:<9.0>',
    );
  });

  it('fails a horizontal segment that drifts beyond the tolerance', () => {
    const route = chainOf([0, 0], [5, 0], [5, 4], [8, 4 + 2 * TOLERANCE]);
    expect(() => checkEdgeRouteIsOrthogonal(EDGE, route)).toThrow(AssertionFailure);
  });
});
