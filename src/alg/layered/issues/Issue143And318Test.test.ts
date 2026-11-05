// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue143And318Test: horizontal edge segments that overlap horizontally must not come closer than two units.
 * `@GraphResourceProvider` (the two tickets), `@Algorithm` and `@DefaultConfiguration` go through the layout test
 * runner; the one `@Test` is `testForCloseEdgeProximities`.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue143And318Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** The closest that two horizontal edge segments may come to each other. */
const PROXIMITY_THRESHOLD = 2.0;
const TOLERANCE = 0.01;

/** `java.awt.geom.Line2D.Double` as far as the test reads it. */
interface HorizontalSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

function gatherHorizontalEdgeSegments(graph: ElkNode): HorizontalSegment[] {
  const horizontalSegments: HorizontalSegment[] = [];

  for (const edge of graph.getContainedEdges()) {
    for (const edgeSection of edge.getSections()) {
      const bendPoints = ElkUtil.createVectorChain(edgeSection);

      let prevPoint: KVector | null = null;
      let currPoint: KVector | null = null;

      for (const bendPoint of bendPoints) {
        // Advance to new point
        prevPoint = currPoint;
        currPoint = bendPoint;

        // Check if the current segment is horizontal
        if (prevPoint !== null && Math.abs(prevPoint.y - currPoint.y) < TOLERANCE) {
          // Be sure to always go from smaller x values to larger x values
          if (prevPoint.x < currPoint.x) {
            horizontalSegments.push({ x1: prevPoint.x, y1: prevPoint.y, x2: currPoint.x, y2: currPoint.y });
          } else {
            horizontalSegments.push({ x1: currPoint.x, y1: currPoint.y, x2: prevPoint.x, y2: prevPoint.y });
          }
        }
      }
    }
  }

  return horizontalSegments;
}

function intersectHorizontally(seg1: HorizontalSegment, seg2: HorizontalSegment): boolean {
  return seg1.x1 < seg2.x2 && seg2.x1 < seg1.x2;
}

/** JUnit 4 `assertNotEquals(unexpected, actual, delta)`: fails when the values are equal or within `delta`. */
function assertNotEqualsWithin(unexpected: number, actual: number, delta: number): void {
  const equal = Object.is(unexpected, actual) || unexpected === actual || Math.abs(unexpected - actual) <= delta;
  expect(equal, `Values should be different. Actual: ${String(actual)}`).toBe(false);
}

defineLayoutTest({
  name: 'Issue143And318Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [
    { path: 'tickets/layered/143_smallVerticalEdgeSegmentSpacing.elkt' },
    { path: 'tickets/layered/318_overlappingHorizontalEdgeSegments.elkt' },
  ],
  afterLayout: {
    testForCloseEdgeProximities: (graph: ElkNode): void => {
      const horizontalSegments = gatherHorizontalEdgeSegments(graph);

      // Pairwise comparison of all segments
      for (let segIndex1 = 0; segIndex1 < horizontalSegments.length; segIndex1++) {
        const seg1 = horizontalSegments[segIndex1]!;

        for (let segIndex2 = segIndex1 + 1; segIndex2 < horizontalSegments.length; segIndex2++) {
          const seg2 = horizontalSegments[segIndex2]!;

          if (intersectHorizontally(seg1, seg2)) {
            assertNotEqualsWithin(seg1.y1, seg2.y1, PROXIMITY_THRESHOLD);
          }
        }
      }
    },
  },
});
