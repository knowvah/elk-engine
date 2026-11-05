// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue603Test: a node's labels do not overlap its children. `@Configurator` places the labels of the
 * top-level nodes inside top centre; the graphs are the `603.+\.elkt` tickets (`FileNameFilter`).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue603Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

function doTestNoLabelNodeOverlaps(node: ElkNode): void {
  // Convert labels and nodes to rectangles
  const nodeAndLabelRects: ElkRectangle[] = [
    ...[...node.getLabels()].map((l) => new ElkRectangle(l.getX(), l.getY(), l.getWidth(), l.getHeight())),
    ...[...node.getChildren()].map((n) => new ElkRectangle(n.getX(), n.getY(), n.getWidth(), n.getHeight())),
  ];

  // Check for overlaps
  for (let first = 0; first < nodeAndLabelRects.length; first++) {
    for (let second = first + 1; second < nodeAndLabelRects.length; second++) {
      expect(nodeAndLabelRects[first]!.intersects(nodeAndLabelRects[second]!)).toBe(false);
    }
  }
}

defineLayoutTest({
  name: 'Issue603Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/**', filter: /603.+\.elkt/ }],
  configurators: {
    configureNodeLabelPlacement: (graph: ElkNode): void => {
      for (const node of graph.getChildren()) {
        node.setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.insideTopCenter());
      }
    },
  },
  afterLayout: {
    testNoLabelNodeOverlaps: (graph: ElkNode): void => {
      const nodeQueue: ElkNode[] = [...graph.getChildren()];

      while (nodeQueue.length > 0) {
        const node = nodeQueue.shift()!;

        // We're looking for overlaps between the node's labels and its children
        if (!node.getLabels().isEmpty() && !node.getChildren().isEmpty()) {
          doTestNoLabelNodeOverlaps(node);
        }

        nodeQueue.push(...node.getChildren());
      }
    },
  },
});
