// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../src/core/options/PortSide.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';

/**
 * Creates various test graphs with (and without) self loops. The Java class is final with a private constructor, so this
 * one only holds static members.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopTestGraphCreator.java
 */
export class SelfLoopTestGraphCreator {
  private constructor() {}

  // Creation

  /** Creates a graph with two nodes connected by an edge. */
  static basicGraphWithoutSelfLoops(): LGraph {
    const lGraph = new LGraph();

    const n1 = SelfLoopTestGraphCreator.node(lGraph);
    SelfLoopTestGraphCreator.ports(n1, 0, 1, 0, 0);

    const n2 = SelfLoopTestGraphCreator.node(lGraph);
    SelfLoopTestGraphCreator.ports(n2, 0, 0, 0, 1);

    SelfLoopTestGraphCreator.edge(n1.getPorts()[0]!, n2.getPorts()[0]!);

    return lGraph;
  }

  /** Creates a graph with two nodes. The first is a regular node, the second contains self loops. */
  static basicGraphWithSelfLoops(): LGraph {
    const lGraph = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops();

    // Add more stuff to the second node
    const lNode = lGraph.getLayerlessNodes()[1]!;
    SelfLoopTestGraphCreator.ports(lNode, 2, 2, 2, 1);

    // There are always pairs of ports. Connect each pair
    for (let i = 1; i < lNode.getPorts().length; i += 2) {
      SelfLoopTestGraphCreator.edge(lNode.getPorts()[i - 1]!, lNode.getPorts()[i]!);
    }

    return lGraph;
  }

  // Utilities

  static node(lGraph: LGraph): LNode {
    const lNode = new LNode(lGraph);
    lGraph.getLayerlessNodes().push(lNode);
    return lNode;
  }

  static edge(source: LPort, target: LPort): LEdge {
    const lEdge = new LEdge();
    lEdge.setSource(source);
    lEdge.setTarget(target);
    return lEdge;
  }

  static ports(lNode: LNode, north: number, east: number, south: number, west: number): void {
    const sides: readonly [number, PortSide][] = [
      [north, PortSide.NORTH],
      [east, PortSide.EAST],
      [south, PortSide.SOUTH],
      [west, PortSide.WEST],
    ];
    for (const [count, side] of sides) {
      for (let i = 0; i < count; i++) {
        const lPort = new LPort();
        lPort.setNode(lNode);
        lPort.setSide(side);
      }
    }
  }
}
