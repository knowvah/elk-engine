// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Point } from './Point.js';
import { RectilinearConvexHull } from './RectilinearConvexHull.js';

describe('RectilinearConvexHull edge cases', () => {
  it('rejects splitting a hull of fewer than two points', () => {
    const rch = RectilinearConvexHull.of([new Point(1, 1)]);
    expect(() => rch.splitIntoRectangles()).toThrow('at least two points');
  });
});
