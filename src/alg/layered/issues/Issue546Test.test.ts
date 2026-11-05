// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue546Test: each edge starts within a half unit of its source port.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue546Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import { Rectangle2D } from '../../../java/awt/geom/Rectangle2D.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const TOLERANCE = 0.5;

/** `Rectangle2D.contains(x, y)`: the half-open insideness test of the Javadoc. */
function contains(rect: Rectangle2D.Double, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

defineLayoutTest({
  name: 'Issue546Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/546_borderGaps.elkt' }],
  afterLayout: {
    testEdgeStartsAtPort: (graph: ElkNode): void => {
      // We'll look at all edges
      const nodeQueue: ElkNode[] = [graph];

      while (nodeQueue.length > 0) {
        const currNode = nodeQueue.shift()!;
        nodeQueue.push(...currNode.getChildren());

        // The following code assumes that each edge has a single source and edge section, and that each
        // edge is connected to ports
        for (const edge of currNode.getContainedEdges()) {
          // Retrieve absolute port rectangle, slightly enlarged
          const srcPort = ElkGraphUtil.connectableShapeToPort(edge.getSources().get(0))!;
          const srcPortPos = ElkUtil.absolutePosition(srcPort)!;
          const srcPortRect = new Rectangle2D.Double(
            srcPortPos.x - TOLERANCE,
            srcPortPos.y - TOLERANCE,
            srcPort.getWidth() + 2 * TOLERANCE,
            srcPort.getHeight() + 2 * TOLERANCE,
          );

          // Retrieve absolut edge source position
          const section = edge.getSections().get(0);
          const srcPoint = new KVector(section.getStartX(), section.getStartY());
          ElkUtil.toAbsolute(srcPoint, currNode);

          // Ensure that the source point is roughly on the port anchor
          expect(
            contains(srcPortRect, srcPoint.x, srcPoint.y),
            `Source point ${srcPoint.toString()} is not close enough to port ${JSON.stringify(srcPortRect)}`,
          ).toBe(true);
        }
      }
    },
  },
});
