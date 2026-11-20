// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.core.test Issue489Test: the box layouter must not leave extra space between a padding and
 * a child that is smaller than the minimum size of its parent. The `@RunWith(LayoutTestRunner)` annotations become
 * `defineLayoutTest`.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/issues/Issue489Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../test/helpers/layout-test-runner.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { BoxLayouterOptions } from '../options/BoxLayouterOptions.js';
import type { ElkNode } from '../../graph/ElkNode.js';

const MODELS = [
  'tickets/core/489_paddingAndMinSize_Small.elkt',
  'tickets/core/489_paddingAndMinSize_Large.elkt',
] as const;
const PADDING = 5;
const TOLERANCE = 0.1;

function configurePadding(graph: ElkNode): void {
  // Set the padding of the nodes on the top level
  for (const node of graph.getChildren()) {
    node.setProperty(BoxLayouterOptions.PADDING, new ElkPadding(PADDING));
  }
}

defineLayoutTest({
  name: 'Issue489Test',
  algorithm: BoxLayouterOptions.ALGORITHM_ID,
  graphs: MODELS.map((path) => ({ path })),
  configurators: { configurePadding },
  defaultConfiguration: true,
  afterLayout: {
    testProperChildPlacement: (graph) => {
      // The Java loop body is vacuous on an empty list; pin that the graph has top-level nodes.
      expect(graph.getChildren().size()).toBeGreaterThan(0);
      for (const node of graph.getChildren()) {
        // We expect only one child to be in the test graph!
        expect(node.getChildren().size()).toBe(1);

        const child = node.getChildren().get(0);

        expect(Math.abs(child.getX() - PADDING)).toBeLessThanOrEqual(TOLERANCE);
        expect(Math.abs(child.getY() - PADDING)).toBeLessThanOrEqual(TOLERANCE);

        expect(Math.abs(child.getWidth() - (node.getWidth() - 2 * PADDING))).toBeLessThanOrEqual(TOLERANCE);
        expect(Math.abs(child.getHeight() - (node.getHeight() - 2 * PADDING))).toBeLessThanOrEqual(TOLERANCE);
      }
    },
  },
});
