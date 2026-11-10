// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * This processor does some work to ensure that other phases and processors can handle self-loops correctly. In detail,
 * it handles the following cases: north / south to west (the edge is reversed to maintain a left-to-right data flow),
 * east to north / south (reversed), east to west (reversed; a long-edge dummy node is placed in between), west to east
 * (a long-edge dummy is placed in between), north to south (nothing is done), south to north (reversed to maintain a
 * top-down data flow).
 *
 * The processor thus reduces the number of different cases of self-loops.
 *
 * Precondition: a layered graph. Postcondition: long edge dummies were inserted for special kinds of self loops. Slots:
 * before phase 3. Same-slot dependencies: `InvertedPortProcessor`.
 *
 * No enum member creates this processor (it has no caller at the pinned commit); it is ported whole.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/DummySelfLoopProcessor.java
 */
export class DummySelfLoopProcessor implements ILayoutProcessor<LGraph> {
  /** @see DummySelfLoopProcessor.java:56 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Self-loop processing', 1);

    // Iterate through all nodes
    const createdDummies: LNode[] = Lists.newArrayList<LNode>();

    for (const layer of layeredGraph) {
      createdDummies.length = 0;

      for (const node of layer) {
        for (const port of node.getPorts()) {
          // Go through the port's outgoing edges
          const edges = LGraphUtil.toEdgeArray(port.getOutgoingEdges());

          for (const edge of edges) {
            this.#processEdge(layeredGraph, edge, createdDummies);
          }
        }
      }

      // Add the dummies, if any
      for (const dummy of createdDummies) {
        dummy.setLayer(layer);
      }
    }

    monitor.done();
  }

  /** The body of the innermost loop of `process` (the Java `continue` becomes an early return). */
  #processEdge(layeredGraph: LGraph, edge: LEdge, createdDummies: LNode[]): void {
    // We're only interested in edges whose source and target node are identical
    if (edge.getSource()!.getNode() !== edge.getTarget()!.getNode()) {
      return;
    }

    const sourcePort = edge.getSource()!;
    const targetPort = edge.getTarget()!;
    const sourcePortSide = sourcePort.getSide();
    const targetPortSide = targetPort.getSide();

    /* We have to take care of the following scenarios:
     *  1. North or South -> West: reverse the edge.
     *  2. East -> North or South: reverse the edge.
     *  3. East -> West: reverse the edge, insert dummy.
     *  4. West -> East: insert dummy.
     *  5. North -> South: nothing has to be done.
     *  6. South -> North: reverse the edge.
     */

    // First, let's deal with the cases where edges have to be reversed
    this.#reverseIfNeeded(layeredGraph, edge, sourcePortSide, targetPortSide);

    // Now, let's see if a dummy has to be inserted
    if (sourcePortSide === PortSide.EAST && targetPortSide === PortSide.WEST) {
      // Note that the edge was reversed, so source and target port have switched
      createdDummies.push(this.createDummy(layeredGraph, edge, targetPort, sourcePort));
    } else if (sourcePortSide === PortSide.WEST && targetPortSide === PortSide.EAST) {
      createdDummies.push(this.createDummy(layeredGraph, edge, sourcePort, targetPort));
    }
  }

  /** The reversal chain of `process` (split out to stay within the cyclomatic complexity limit). */
  #reverseIfNeeded(layeredGraph: LGraph, edge: LEdge, sourcePortSide: PortSide, targetPortSide: PortSide): void {
    if ((sourcePortSide === PortSide.NORTH || sourcePortSide === PortSide.SOUTH) && targetPortSide === PortSide.WEST) {
      edge.reverse(layeredGraph, false);
    } else if (sourcePortSide === PortSide.SOUTH && targetPortSide === PortSide.NORTH) {
      edge.reverse(layeredGraph, false);
    } else if (sourcePortSide === PortSide.EAST && targetPortSide !== PortSide.EAST) {
      edge.reverse(layeredGraph, false);
    }
  }

  /**
   * Creates a dummy for the self-loop edge connecting the two given ports. The dummy is not added to the layer yet.
   *
   * @see DummySelfLoopProcessor.java:150
   */
  private createDummy(layeredGraph: LGraph, edge: LEdge, sourcePort: LPort, targetPort: LPort): LNode {
    // Create a dummy node with an input port and an output port
    const dummyNode = new LNode(layeredGraph);
    dummyNode.setType(NodeType.LONG_EDGE);

    dummyNode.setProperty(InternalProperties.ORIGIN, edge);
    dummyNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    dummyNode.setProperty(InternalProperties.LONG_EDGE_SOURCE, sourcePort);
    dummyNode.setProperty(InternalProperties.LONG_EDGE_TARGET, targetPort);

    const dummyInput = new LPort();
    dummyInput.setSide(PortSide.WEST);
    dummyInput.setNode(dummyNode);

    const dummyOutput = new LPort();
    dummyOutput.setSide(PortSide.EAST);
    dummyOutput.setNode(dummyNode);

    edge.setTarget(dummyInput);

    // Create a dummy edge
    const dummyEdge = new LEdge();
    dummyEdge.copyProperties(edge);
    dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
    dummyEdge.setSource(dummyOutput);
    dummyEdge.setTarget(targetPort);

    return dummyNode;
  }
}
