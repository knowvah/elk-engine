// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.common.test InsidePortLabelTest: node size computation handles inside port labels
 * properly. The test graph contains a node without a node label, so the default configuration is off for nodes and
 * edges (`@DefaultConfiguration(edges = false, nodes = false, ports = true)`). One `@Test` over
 * `tests/core/node_size/inside_port_labels.elkt` (vendored), so 1 oracle run. Scope: complete (1 case).
 *
 * Labels are sized from the recorded JVM metrics, as the Java framework does (FX8, `layout-test-labels.ts`).
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/nodespacing/InsidePortLabelTest.java
 */
import { expect } from 'vitest';
import { haveOverlaps } from '../../../../test/helpers/graph-test-utils.js';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../../layered/options/LayeredOptions.js';

function assembleLabels(node: ElkNode): ElkLabel[] {
  const labels: ElkLabel[] = [];

  // Add all node labels
  labels.push(...node.getLabels());
  for (const port of node.getPorts()) {
    labels.push(...port.getLabels());
  }

  return labels;
}

defineLayoutTest({
  name: 'InsidePortLabelTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: { edges: false, nodes: false, ports: true },
  graphs: [{ path: 'tests/core/node_size/inside_port_labels.elkt' }],
  afterLayout: {
    // Check for each node that no two labels overlap.
    testNoLabelOverlaps: (graph: ElkNode): void => {
      const overlaps = [...graph.getChildren()]
        .map((node) => assembleLabels(node))
        .some((labels) => haveOverlaps(labels));

      if (overlaps) {
        expect.fail('Overlaps between labels detected!');
      }
    },
  },
});
