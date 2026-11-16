// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Point } from './Point.js';
import { RectilinearConvexHull } from './RectilinearConvexHull.js';

/**
 * Ports of `RectlinearConvexHullTest.java`'s two `@Test` methods. The Swing visualization (`main`, `visualize`,
 * `toPolygon`, Java lines 148 onward) is not ported: it opens a JFrame for manual inspection.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/compaction/recthull/RectlinearConvexHullTest.java
 */

/** `Assert.assertEquals(expected, actual)` on lists: element-wise `equals` (`Point.equals` ignores quadrant). */
function expectListEquals(actual: readonly Point[], expected: readonly Point[]): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((p, i) => {
    expect(p.equals(expected[i]), `point ${i}: ${String(p)} vs ${String(expected[i])}`).toBe(true);
  });
}

/** The Java `containsInAnyOrder`: `fail()` when a needle is missing from the haystack, else `true`. */
function containsInAnyOrder(needles: readonly ElkRectangle[], haystack: readonly ElkRectangle[]): boolean {
  for (const needle of needles) {
    let found = false;
    for (const hay of haystack) {
      if (needle.equals(hay)) {
        found = true;
        break;
      }
    }

    if (!found) {
      expect.fail(`needle ${String(needle)} not found`);
    }
  }

  return true;
}

describe('RectlinearConvexHullTest', () => {
  /**
   * Test the following point set. For each corner of the cross a point to the point set added.
   * The hull is expected to consist of exactly 3 points per staircase, thus 12 points over all.
   */
  it('testCross', () => {
    const points = [
      new Point(0, 1),
      new Point(1, 1),
      new Point(1, 0),
      new Point(2, 0),
      new Point(2, 1),
      new Point(3, 1),
      new Point(3, 2),
      new Point(2, 2),
      new Point(2, 3),
      new Point(1, 3),
      new Point(1, 2),
      new Point(0, 2),
    ];

    const rch = RectilinearConvexHull.of(points);

    // test that the hull consists of the specified points in the exact order
    expectListEquals(rch.getHull(), points);

    const expectedRects = [new ElkRectangle(0, 1, 1, 1), new ElkRectangle(1, 0, 1, 3), new ElkRectangle(2, 1, 1, 1)];
    const actualRects = rch.splitIntoRectangles();

    // we don't care about order here
    expect(containsInAnyOrder(expectedRects, actualRects)).toBe(true);
  });

  it('testLittleRobot', () => {
    const points = [
      new Point(0, 2),
      new Point(1, 2),
      new Point(1, 1),
      new Point(2, 1),
      new Point(2, 0),
      new Point(2, 0),
      new Point(2, 1),
      new Point(3, 1),
      new Point(3, 2),
      new Point(4, 2),
      new Point(4, 2),
      new Point(3, 2),
      new Point(3, 3),
      new Point(2, 3),
      new Point(2, 4),
      new Point(2, 4),
      new Point(2, 3),
      new Point(1, 3),
      new Point(1, 2),
      new Point(0, 2),
    ];

    // test hull
    const rch = RectilinearConvexHull.of(points);
    expectListEquals(rch.getHull(), points);

    // and rects
    const actualRects = rch.splitIntoRectangles();
    const expectedRects = [
      new ElkRectangle(0, 2, 1, 0),
      new ElkRectangle(1, 1, 1, 2),
      new ElkRectangle(2, 0, 0, 4),
      new ElkRectangle(2, 1, 1, 2),
      new ElkRectangle(3, 2, 1, 0),
    ];
    expect(containsInAnyOrder(expectedRects, actualRects)).toBe(true);
  });
});
