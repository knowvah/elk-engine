// SPDX-License-Identifier: EPL-2.0
// Branches of DisCoPolyominoCompactor the rows of disco.json do not reach; each expectation is derived from reading
// DisCoPolyominoCompactor.java (the line is in the test name).
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import { DCElement } from './graph/DCElement.js';
import { DCGraph } from './graph/DCGraph.js';
import { DisCoPolyominoCompactor } from './DisCoPolyominoCompactor.js';

const oneRectangle = (width: number, height: number): DCGraph =>
  new DCGraph([
    [
      new DCElement(
        new KVectorChain(new KVector(0, 0), new KVector(0, height), new KVector(width, height), new KVector(width, 0)),
      ),
    ],
  ]);

describe('DisCoPolyominoCompactor', () => {
  it('computeCellSize returns the numerator when the denominator is zero (java:187)', () => {
    const compactor = new DisCoPolyominoCompactor();
    // upperBound 1 and one component: denominator = 2 * (1 * 1 - 1.0) = 0; numerator = sqrt(0 * prod + sum^2) + sum = 2 * sum
    (compactor as unknown as { upperBound: number }).upperBound = 1.0;
    expect(compactor['computeCellSize'](oneRectangle(10, 20))).toBe(60);
  });

  it('computeCellSize solves the quadratic of the paper for one component (java:165-192)', () => {
    // c = 100, n = 1, W = 10, H = 20: numerator sqrt(4 * 100 * 200 - 4 * 200 + 30 ^ 2) + 30, denominator 2 * 99
    const expected = (Math.sqrt(4 * 100 * 1 * 200 - 4 * 200 + 30 * 30) + 30) / (2 * (100 * 1 - 1));
    expect(new DisCoPolyominoCompactor()['computeCellSize'](oneRectangle(10, 20))).toBe(expected);
  });
});
