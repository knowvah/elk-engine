// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.common.test NextToPortLabelPlacementTest: nodes configured with
 * `PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE` have their port labels placed next to their ports, if possible
 * (`@DefaultConfiguration(edges = false, nodes = false, ports = true)`). One `@Test` over the two vendored
 * `tests/core/label_placement/port_labels/next_to_port_if_possible_{inside,outside}.elkt`, so 2 oracle runs.
 * Scope: complete (2 cases).
 *
 * Labels are sized from the recorded JVM metrics, as the Java framework does (FX8, `layout-test-labels.ts`).
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/nodespacing/NextToPortLabelPlacementTest.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../../layered/options/LayeredOptions.js';

function shouldLabelBePlacedNextToPort(port: ElkPort, insideLabelPlacement: boolean): boolean {
  // Shortcut: if there is no incident edge, we can place the label next to the port
  if (port.getIncomingEdges().isEmpty() && port.getOutgoingEdges().isEmpty()) {
    return true;
  }

  // Iterate over all edges and check whether there are (i) edges that connect to the parent node's insides, and
  // (ii) edges that connect to somewhere else
  let edgesToInsides = false;
  let edgesToSomewhereElse = false;

  for (const outEdge of port.getOutgoingEdges()) {
    const insideEdge = ElkGraphUtil.isDescendant(
      ElkGraphUtil.connectableShapeToNode(outEdge.getTargets().get(0))!,
      port.getParent()!,
    );

    edgesToInsides ||= insideEdge;
    edgesToSomewhereElse ||= !insideEdge;
  }

  for (const inEdge of port.getIncomingEdges()) {
    const insideEdge = ElkGraphUtil.isDescendant(
      ElkGraphUtil.connectableShapeToNode(inEdge.getSources().get(0))!,
      port.getParent()!,
    );

    edgesToInsides ||= insideEdge;
    edgesToSomewhereElse ||= !insideEdge;
  }

  return (insideLabelPlacement && !edgesToInsides) || (!insideLabelPlacement && !edgesToSomewhereElse);
}

function testPortLabel(port: ElkPort, insideLabelPlacement: boolean): void {
  /* This code has a few assumptions:
   *   1. We're dealing with horizontal layouts.
   *   2. We're dealing with eastern and western ports.
   *   3. There's exactly one label per port.
   */
  const label = port.getLabels().get(0);

  if (shouldLabelBePlacedNextToPort(port, insideLabelPlacement)) {
    expect(label.getY() + label.getHeight() >= 0 && label.getY() <= port.getHeight()).toBe(true);
  } else {
    // The label is to be placed above or below its port
    expect(label.getY() + label.getHeight() <= 0 || label.getY() >= port.getHeight()).toBe(true);
  }
}

defineLayoutTest({
  name: 'NextToPortLabelPlacementTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: { edges: false, nodes: false, ports: true },
  graphs: [
    { path: 'tests/core/label_placement/port_labels/next_to_port_if_possible_inside.elkt' },
    { path: 'tests/core/label_placement/port_labels/next_to_port_if_possible_outside.elkt' },
  ],
  afterLayout: {
    testNextToPortLabels: (graph: ElkNode): void => {
      const nodeQueue: ElkNode[] = [...graph.getChildren()];
      while (nodeQueue.length > 0) {
        const currentNode = nodeQueue.shift()!;
        nodeQueue.push(...currentNode.getChildren());

        const insideLabelPlacement = currentNode
          .getProperty(CoreOptions.PORT_LABELS_PLACEMENT)
          .contains(PortLabelPlacement.INSIDE);
        for (const port of currentNode.getPorts()) {
          testPortLabel(port, insideLabelPlacement);
        }
      }
    },
  },
});
