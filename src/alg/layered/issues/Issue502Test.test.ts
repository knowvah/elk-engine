// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue502Test: compound nodes are large enough for their children and edge bend points.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue502Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

function testLargeEnoughNode(node: ElkNode): void {
  const requiredSize = new ElkRectangle();

  for (const child of node.getChildren()) {
    const childRect = new ElkRectangle(child.getX(), child.getY(), child.getWidth(), child.getHeight());
    requiredSize.union(childRect);
  }

  for (const edge of node.getContainedEdges()) {
    for (const section of edge.getSections()) {
      for (const bendPoint of section.getBendPoints()) {
        requiredSize.width = Math.max(requiredSize.width, bendPoint.getX());
        requiredSize.height = Math.max(requiredSize.height, bendPoint.getY());
      }
    }
  }

  expect(
    node.getWidth() >= requiredSize.width && node.getHeight() >= requiredSize.height,
    `Node not large enough for content. Size required: (${String(requiredSize.width)}, ${String(requiredSize.height)}). Actual size: (${String(node.getWidth())}, ${String(node.getHeight())})`,
  ).toBe(true);
}

defineLayoutTest({
  name: 'Issue502Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/502_collapsingCompoundNode.elkt' }],
  afterLayout: {
    testLargeEnoughNodes: (graph: ElkNode): void => {
      for (const node of graph.getChildren()) {
        testLargeEnoughNode(node);
      }
    },
  },
});
