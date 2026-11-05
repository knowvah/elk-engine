// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test LabelAndNodeSizeProcessorOffsetTest: the port offset is correctly applied
 * to ports of all sides on nodes with all port constraints; with the offset set to zero every port touches the border
 * of its node. The `@GraphProvider` builds one graph with a node per port constraint (FREE, FIXED_SIDE, FIXED_ORDER,
 * FIXED_RATIO, FIXED_POS), four ports each; the Java has one `@TestAfterProcessor` method, so 1 oracle run.
 * Scope: complete, hand-built (1 case).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LabelAndNodeSizeProcessorOffsetTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { compare } from '../../../java/lang/DoubleCompare.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LabelAndNodeSizeProcessor } from './LabelAndNodeSizeProcessor.js';

const NODE_WIDTH = 100;
const PORT_MIDDLE = 50;
const PORT_FAR = 300;
const DELTA = 0.0;

/** JUnit 4 `Assert.assertEquals(message, expected, actual, delta)`: equal under `Double.compare` or within `delta`. */
function assertEquals(message: string, expected: number, actual: number, delta: number): void {
  if (compare(expected, actual) === 0 || Math.abs(expected - actual) <= delta) {
    return;
  }
  throw new Error(`${message} expected:<${doubleToString(expected)}> but was:<${doubleToString(actual)}>`);
}

/** Generates a node for the given graph with one port on each side and with its port constraints set to the given value. */
function generateNode(graph: ElkNode, portConstraints: PortConstraints): void {
  // Create the node
  const node = ElkGraphUtil.createNode(graph);
  node.setProperty(LayeredOptions.PORT_CONSTRAINTS, portConstraints);
  node.setWidth(NODE_WIDTH);

  // Create ports
  const nPort = ElkGraphUtil.createPort(node);
  nPort.setProperty(LayeredOptions.PORT_BORDER_OFFSET, 0.0);
  nPort.setProperty(LayeredOptions.PORT_SIDE, PortSide.NORTH);
  nPort.setX(PORT_MIDDLE);
  nPort.setY(-PORT_FAR);

  const sPort = ElkGraphUtil.createPort(node);
  sPort.setProperty(LayeredOptions.PORT_BORDER_OFFSET, 0.0);
  sPort.setProperty(LayeredOptions.PORT_SIDE, PortSide.SOUTH);
  sPort.setX(PORT_MIDDLE);
  sPort.setY(PORT_FAR);

  const ePort = ElkGraphUtil.createPort(node);
  ePort.setProperty(LayeredOptions.PORT_BORDER_OFFSET, 0.0);
  ePort.setProperty(LayeredOptions.PORT_SIDE, PortSide.EAST);
  ePort.setX(PORT_FAR);
  ePort.setY(PORT_MIDDLE);

  const wPort = ElkGraphUtil.createPort(node);
  wPort.setProperty(LayeredOptions.PORT_BORDER_OFFSET, 0.0);
  wPort.setProperty(LayeredOptions.PORT_SIDE, PortSide.WEST);
  wPort.setX(-PORT_FAR);
  wPort.setY(PORT_MIDDLE);
}

/** Creates a graph containing a node for each port constraints configuration and four ports each. */
function produceGraph(): ElkNode {
  const graph = ElkGraphUtil.createGraph();

  generateNode(graph, PortConstraints.FREE);
  generateNode(graph, PortConstraints.FIXED_SIDE);
  generateNode(graph, PortConstraints.FIXED_ORDER);
  generateNode(graph, PortConstraints.FIXED_RATIO);
  generateNode(graph, PortConstraints.FIXED_POS);

  return graph;
}

/** Generates a meaningful error message in case the given port doesn't touch its parent node's border. */
function generateErrorMessage(port: LPort): string {
  return `Port (${String(port.getSide())}) does not touch border of node with port constraints ${String(
    port.getNode()!.getProperty(LayeredOptions.PORT_CONSTRAINTS),
  )}`;
}

defineLayoutTest({
  name: 'LabelAndNodeSizeProcessorOffsetTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [produceGraph],
  afterProcessor: [
    {
      name: 'testPortPositions',
      cls: LabelAndNodeSizeProcessor,
      // Tests if the ports of the given graph really touch the border of their node.
      check: (lGraph: LGraph): void => {
        for (const layer of lGraph) {
          for (const node of layer) {
            for (const port of node.getPorts()) {
              switch (port.getSide()) {
                case PortSide.NORTH:
                  assertEquals(generateErrorMessage(port), -port.getSize().y, port.getPosition().y, DELTA);
                  break;

                case PortSide.SOUTH:
                  assertEquals(generateErrorMessage(port), node.getSize().y, port.getPosition().y, DELTA);
                  break;

                case PortSide.EAST:
                  assertEquals(generateErrorMessage(port), node.getSize().x, port.getPosition().x, DELTA);
                  break;

                case PortSide.WEST:
                  assertEquals(generateErrorMessage(port), -port.getSize().x, port.getPosition().x, DELTA);
                  break;
              }
            }
          }
        }
      },
    },
  ],
});
