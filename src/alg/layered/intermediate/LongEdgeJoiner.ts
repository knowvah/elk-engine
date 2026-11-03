// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** `iterator().next()` of a Java `Iterable<LPort>`: the first port; Java throws `NoSuchElementException` when empty. */
function firstPort(ports: Iterable<LPort>): LPort {
  const next = ports[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}

/**
 * Removes dummy nodes due to edge splitting (dummy nodes that have the node type `NodeType.LONG_EDGE`). If an edge is
 * split into a chain of edges _e1, e2, ..., ek_, the first edge _e1_ is retained, while the other edges _e2, ..., ek_
 * are discarded. This fact should be respected by all processors that create dummy nodes: they should always put the
 * original edge as first edge in the chain of edges, so the original edge is restored.
 *
 * The actual implementation that joins long edges is provided by this class as a public utility method to be used by
 * other processors.
 *
 * Preconditions: a layered graph, nodes are placed, edges are routed. Postconditions: there are no dummy nodes of type
 * `LONG_EDGE` in the graph's layers; the dummy nodes' `layer` fields have **not** been set to `null` though. Slots:
 * after phase 5. Same-slot dependencies: `HierarchicalPortOrthogonalEdgeRouter`.
 *
 * The per-edge body of `joinAt` and its junction-point tail are `joinEdge` and `joinJunctionPoints` (split out for the
 * complexity limits, mission 7e T5).
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LongEdgeJoiner.java
 */
export class LongEdgeJoiner implements ILayoutProcessor<LGraph> {
  /** @see LongEdgeJoiner.java:67 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Edge joining', 1);

    const addUnnecessaryBendpoints = layeredGraph.getProperty(LayeredOptions.UNNECESSARY_BENDPOINTS);

    // Iterate through the layers
    for (const layer of layeredGraph) {
      // Get a list iterator for the layer's nodes (since we might be
      // removing dummy nodes from it)
      const nodeIterator = new ArrayListIterator<LNode>(layer.getNodes());

      while (nodeIterator.hasNext()) {
        const node = nodeIterator.next();

        // Check if it's a dummy edge we're looking for
        if (node.getType() === NodeType.LONG_EDGE) {
          LongEdgeJoiner.joinAt(node, addUnnecessaryBendpoints);

          // Remove the node
          nodeIterator.remove();
        }
      }
    }

    monitor.done();
  }

  /**
   * Joins the edges connected to the given dummy node. The dummy node is then ready to be removed from the graph.
   *
   * @param longEdgeDummy the dummy node whose incident edges to join.
   * @param addUnnecessaryBendpoints `true` if a bend point should be added to the edges at the position of the dummy
   *   node.
   * @see LongEdgeJoiner.java:104
   */
  static joinAt(longEdgeDummy: LNode, addUnnecessaryBendpoints: boolean): void {
    // Get the input and output port (of which we assume to have only one, on the western side and
    // on the eastern side, respectively); the incoming edges are retained, and the outgoing edges
    // are discarded
    const inputPortEdges = firstPort(longEdgeDummy.getPorts(PortSide.WEST)).getIncomingEdges();
    const outputPortEdges = firstPort(longEdgeDummy.getPorts(PortSide.EAST)).getOutgoingEdges();
    let edgeCount = inputPortEdges.length;

    // If we are to add unnecessary bend points, we need to know where. We take the position of the
    // first port we find. (It doesn't really matter which port we're using, so we opt to keep it
    // surprisingly simple.)
    const unnecessaryBendpoint = longEdgeDummy.getPorts()[0]!.getAbsoluteAnchor();

    // The following code assumes that edges with the same indices in the two lists originate from
    // the same long edge, which is true for the current implementation of LongEdgeSplitter and
    // HyperedgeDummyMerger
    while (edgeCount-- > 0) {
      // Get the two edges
      const survivingEdge = inputPortEdges[0]!;
      const droppedEdge = outputPortEdges[0]!;

      LongEdgeJoiner.joinEdge(survivingEdge, droppedEdge, unnecessaryBendpoint, addUnnecessaryBendpoints);
    }
  }

  /**
   * The body of the `joinAt` loop (split out for the complexity limits).
   *
   * @see LongEdgeJoiner.java:121-173
   */
  private static joinEdge(
    survivingEdge: LEdge,
    droppedEdge: LEdge,
    unnecessaryBendpoint: KVector,
    addUnnecessaryBendpoints: boolean,
  ): void {
    // The surviving edge's target needs to be set to the old target of the dropped edge.
    // However, this doesn't replace the dropped edge with the surviving edge in the list of
    // incoming edges of the (new) target port, but instead appends the surviving edge. That in
    // turn messes with the implicit assumption that edges with the same index on input and
    // output ports of long edge dummies belong to each other. Thus, we need to ensure that the
    // surviving edge is at the correct index in the list of incoming edges. Hence the
    // complicated code below. (KIPRA-1670)
    const targetIncomingEdges = droppedEdge.getTarget()!.getIncomingEdges();
    const droppedEdgeListIndex = targetIncomingEdges.indexOf(droppedEdge);
    survivingEdge.setTargetAndInsertAtIndex(droppedEdge.getTarget(), droppedEdgeListIndex);

    // Remove the dropped edge from the graph
    droppedEdge.setSource(null);
    droppedEdge.setTarget(null);

    // Join their bend points and add possibly an unnecessary one
    const survivingBendPoints = survivingEdge.getBendPoints();

    if (addUnnecessaryBendpoints) {
      survivingBendPoints.add(new KVector(unnecessaryBendpoint));
    }

    for (const bendPoint of droppedEdge.getBendPoints()) {
      survivingBendPoints.add(new KVector(bendPoint));
    }

    // Join their labels
    const survivingLabels = survivingEdge.getLabels();
    for (const label of droppedEdge.getLabels()) {
      survivingLabels.push(label);
    }

    LongEdgeJoiner.joinJunctionPoints(survivingEdge, droppedEdge);
  }

  /**
   * Joins the junction points of the dropped edge into the surviving edge. An unset property reads as a stored clone of
   * the (empty) default chain, as in the Java (`MapPropertyHolder.getProperty`), so the `null` branches run only for
   * an explicitly nulled property.
   *
   * @see LongEdgeJoiner.java:158-172
   */
  private static joinJunctionPoints(survivingEdge: LEdge, droppedEdge: LEdge): void {
    let survivingJunctionPoints = survivingEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    const droppedJunctionsPoints = droppedEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    if (droppedJunctionsPoints !== null) {
      if (survivingJunctionPoints === null) {
        survivingJunctionPoints = new KVectorChain();
        survivingEdge.setProperty(LayeredOptions.JUNCTION_POINTS, survivingJunctionPoints);
      }
      for (const jp of droppedJunctionsPoints) {
        survivingJunctionPoints.add(new KVector(jp));
      }
    }
  }
}
