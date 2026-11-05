// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue447Test: edges connect to port anchors, not to port borders. `@Configurator` sets every port to 10x10
 * with anchor (5, 5); `@DefaultConfiguration` and `@Algorithm` go through the layout test runner.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue447Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { isElkPort } from '../../../graph/ElkPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const PORT_SIZE = 10;
const PORT_ANCHOR = 5;
/** Allowed delta when comparing coordinates. */
const COORDINATE_FUZZYNESS = 0.5;

/** `GraphTestUtils.allNodes`: breadth-first, the list grows while it is walked. */
function allNodes(graph: ElkNode, includeGraph: boolean): ElkNode[] {
  const nodes: ElkNode[] = includeGraph ? [graph] : [...graph.getChildren()];
  for (let i = 0; i < nodes.length; i++) {
    nodes.push(...nodes[i]!.getChildren());
  }
  return nodes;
}

function configurePort(port: ElkPort): void {
  port.setWidth(PORT_SIZE);
  port.setHeight(PORT_SIZE);
  port.setProperty(LayeredOptions.PORT_ANCHOR, new KVector(PORT_ANCHOR, PORT_ANCHOR));
}

/** JUnit 4 `assertEquals(message, expected, actual, delta)`. */
function assertEqualsWithin(message: string, expected: number, actual: number, delta: number): void {
  expect(
    Object.is(expected, actual) || Math.abs(expected - actual) <= delta,
    `${message} expected:<${String(expected)}> but was:<${String(actual)}>`,
  ).toBe(true);
}

function testEdgeEndPoint(containingNode: ElkNode, port: ElkPort, x: number, y: number): void {
  // Port anchor in absolute coordinates
  const portAnchor = new KVector(port.getX() + PORT_ANCHOR, port.getY() + PORT_ANCHOR);
  const absolutePortAnchor = ElkUtil.toAbsolute(portAnchor, port.getParent());

  // Edge end point in absolute coordinates
  const endPoint = new KVector(x, y);
  const absoluteEndPoint = ElkUtil.toAbsolute(endPoint, containingNode);

  // Check if they match
  assertEqualsWithin(
    'X coordinate of edge does not match X coordinate of port anchor',
    absolutePortAnchor.x,
    absoluteEndPoint.x,
    COORDINATE_FUZZYNESS,
  );
  assertEqualsWithin(
    'Y coordinate of edge does not match Y coordinate of port anchor',
    absolutePortAnchor.y,
    absoluteEndPoint.y,
    COORDINATE_FUZZYNESS,
  );
}

function testEdge(edge: ElkEdge): void {
  for (const section of edge.getSections()) {
    // A section may be incident to a port
    const incoming = section.getIncomingShape();
    if (isElkPort(incoming)) {
      testEdgeEndPoint(edge.getContainingNode() as ElkNode, incoming, section.getStartX(), section.getStartY());
    }

    const outgoing = section.getOutgoingShape();
    if (isElkPort(outgoing)) {
      testEdgeEndPoint(edge.getContainingNode() as ElkNode, outgoing, section.getEndX(), section.getEndY());
    }
  }
}

defineLayoutTest({
  name: 'Issue447Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/447_hierarchicalPortAnchors.elkt' }],
  configurators: {
    configurePortSizesAndAnchors: (graph: ElkNode): void => {
      for (const node of allNodes(graph, false)) {
        for (const port of node.getPorts()) {
          configurePort(port);
        }
      }
    },
  },
  afterLayout: {
    // Check that all edges connect to the port anchors, not to the edges.
    testEdgesConnectToAnchors: (graph: ElkNode): void => {
      for (const node of allNodes(graph, true)) {
        for (const edge of node.getContainedEdges()) {
          testEdge(edge);
        }
      }
    },
  },
});
