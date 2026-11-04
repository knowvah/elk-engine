// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Section of `PolylineEdgeRouter` (mission 7e, T5): the helpers of the Java class that touch no instance state
 * (`processInLayerEdge`, `calculateWestInLayerEdgeYDiff`, `isInLayerDummy`) and two pieces split out of `process` and
 * `processNode` for the complexity limits (`includeNextLayerWestYDiff`, `alignNorthSouthDummy`). The facade imports
 * this section; the section never imports the facade.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/PolylineEdgeRouter.java
 */
export class PolylineEdgeRouterInLayer {
  /**
   * In-layer edges get an extra bend point in addition to the usual source and target bend points. The additional bend
   * point is inserted halfway between the edge's upper and lower end, a little way from the layer's boundary.
   *
   * @param edge the in-layer edge to route.
   * @param layerXPos the layer's x position.
   * @param edgeSpacing the spacing to respect for the in-layer edge bend points.
   * @see PolylineEdgeRouter.java:392
   */
  static processInLayerEdge(edge: LEdge, layerXPos: number, edgeSpacing: number): void {
    const sourcePort = edge.getSource()!;
    const targetPort = edge.getTarget()!;

    const sourceAnchorY = sourcePort.getAbsoluteAnchor().y;
    const midY = (sourceAnchorY + targetPort.getAbsoluteAnchor().y) / 2.0;

    /* This method is called if an outgoing in-layer edge is found before any other edges of the
     * offending node are routed. Thus, if the edge's list of bend points is not empty, any bend
     * point must be at the target port. It follows that our extra bend point can safely be
     * inserted at the start of the bend point list.
     */

    let bendPoint: KVector;
    if (sourcePort.getSide() === PortSide.EAST) {
      bendPoint = new KVector(layerXPos + sourcePort.getNode()!.getLayer()!.getSize().x + edgeSpacing, midY);
    } else {
      bendPoint = new KVector(layerXPos - edgeSpacing, midY);
    }

    edge.getBendPoints().addAt(0, bendPoint);
  }

  // //////////////////////////////////////////////////////////////////////////////////////////////////
  // Utility Methods

  /**
   * Calculates the maximum vertical span of any in-layer edge connecting west-side ports of nodes in the given layer.
   * The loops are plain `for` loops (R8: not a recursion).
   *
   * @param layer the layer to iterate over.
   * @return maximum vertical span of west-side in-layer edges.
   * @see PolylineEdgeRouter.java:429
   */
  static calculateWestInLayerEdgeYDiff(layer: Layer): number {
    let maxYDiff = 0.0;

    for (const node of layer.getNodes()) {
      for (const outgoingEdge of node.getOutgoingEdges()) {
        if (
          layer === outgoingEdge.getTarget()!.getNode()!.getLayer() &&
          outgoingEdge.getSource()!.getSide() === PortSide.WEST
        ) {
          const sourcePos = outgoingEdge.getSource()!.getAbsoluteAnchor().y;
          const targetPos = outgoingEdge.getTarget()!.getAbsoluteAnchor().y;
          maxYDiff = Math.max(maxYDiff, Math.abs(targetPos - sourcePos));
        }
      }
    }

    return maxYDiff;
  }

  /**
   * At this point a node is considered to be an in-layer dummy if it is of type `NodeType.LONG_EDGE` and has an
   * incident edge that is an in-layer edge.
   *
   * @see PolylineEdgeRouter.java:496
   */
  static isInLayerDummy(node: LNode): boolean {
    if (node.getType() === NodeType.LONG_EDGE) {
      for (const e of node.getConnectedEdges()) {
        if (e.isInLayerEdge()) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * The look-ahead of `process` (split out for the complexity limits): the span of west-side in-layer edges of the next
   * layer, if there is one, joined into the maximal vertical span; the iterator is left where it was.
   *
   * @see PolylineEdgeRouter.java:304-310
   */
  static includeNextLayerWestYDiff(layerIter: ArrayListIterator<Layer>, maxVertDiff: number): number {
    if (!layerIter.hasNext()) {
      return maxVertDiff;
    }
    const yDiff = PolylineEdgeRouterInLayer.calculateWestInLayerEdgeYDiff(layerIter.next());
    layerIter.previous();
    return Math.max(maxVertDiff, yDiff);
  }

  /**
   * The north/south branch of the port loop body (split out for the complexity limits): moves the anchor, and the
   * dummy node, to the x coordinate of the port the dummy was created for.
   *
   * @see PolylineEdgeRouter.java:331-345
   */
  static alignNorthSouthDummy(node: LNode, port: LPort, absolutePortAnchor: KVector): void {
    // North/south ports require special handling (also see #515):
    // The dummy node that represents the north/south port will have been placed at:
    //  - the very left x-coordinate of the currently processed layer for incoming edges
    //  - the very right x-coordinate for outgoing edges
    // However, the actual x-coordinate of the port itself is very likely to have a different x-coordinate.
    // The code below introduces bendpoints that prevent edge/node overlaps based on a condition that
    // checks that a node's position is "far enough away" from the left-most x-coordinate of the layer.
    // Consequently, we have to use the north/south port's x-coordinate instead of the dummy node's one.
    const correspondingPort = port.getProperty(InternalProperties.ORIGIN) as LPort;
    absolutePortAnchor.x = correspondingPort.getAbsoluteAnchor().x;
    // While it makes sense either way, it is important to move the dummy node to the correct location
    // as well. Otherwise the #addBendPoint(...) method won't add the computed bendpoint as it
    // thinks it's superfluous.
    node.getPosition().x = absolutePortAnchor.x;
  }
}
