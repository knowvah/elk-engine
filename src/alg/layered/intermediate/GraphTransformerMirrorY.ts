// SPDX-License-Identifier: EPL-2.0
// Section of `GraphTransformer`: the "Mirror Vertically" group (Java lines 390-578).
import type { KVector } from '../../../core/math/KVector.js';
import type { Spacing } from '../../../core/math/Spacing.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { LShape } from '../graph/LShape.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { reverseIndex } from './GraphTransformerSupport.js';

/**
 * Mirror the y coordinates of the given graph (Java overload `mirrorY(List<LNode>, LGraph)`).
 *
 * @param nodes the nodes of the graph to transpose
 * @param graph the graph the nodes are part of
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:399
 */
export function mirrorYNodes(nodes: readonly LNode[], graph: LGraph): void {
  // See mirrorX for an explanation of how the offset is calculated
  let offset = 0;
  if (graph.getSize().y === 0) {
    for (const node of nodes) {
      offset = Math.max(offset, node.getPosition().y + node.getSize().y + node.getMargin().getBottom());
    }
  } else {
    offset = graph.getSize().y - graph.getOffset().y;
  }
  offset -= graph.getOffset().y;

  // mirror all nodes, ports, edges, and labels
  for (const node of nodes) {
    mirrorYNode(node, offset);
  }
}

/** The body of the node loop of {@link mirrorYNodes}. */
function mirrorYNode(node: LNode, offset: number): void {
  mirrorYVector(node.getPosition(), offset - node.getSize().y);
  mirrorYSpacing(node.getPadding());
  mirrorNodeLabelPlacementY(node);

  // mirror position
  if (node.getAllProperties().containsKey(LayeredOptions.POSITION)) {
    mirrorYVector(node.getProperty(LayeredOptions.POSITION), offset - node.getSize().y);
  }

  // mirror the alignment
  switch (node.getProperty(LayeredOptions.ALIGNMENT)) {
    case Alignment.TOP:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.BOTTOM);
      break;
    case Alignment.BOTTOM:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.TOP);
      break;
  }

  const nodeSize = node.getSize();
  for (const port of node.getPorts()) {
    mirrorYPort(port, nodeSize, offset);
  }

  // External port dummy?
  if (node.getType() === NodeType.EXTERNAL_PORT) {
    mirrorExternalPortSideY(node);
    mirrorInLayerConstraintY(node);
  }

  // Mirror node labels
  for (const label of node.getLabels()) {
    mirrorNodeLabelPlacementY(label);
    mirrorYVector(label.getPosition(), nodeSize.y - label.getSize().y);
  }
}

/** The body of the port loop of {@link mirrorYNodes}. */
function mirrorYPort(port: LPort, nodeSize: KVector, offset: number): void {
  mirrorYVector(port.getPosition(), nodeSize.y - port.getSize().y);
  mirrorYVector(port.getAnchor(), port.getSize().y);
  mirrorPortSideY(port);
  reverseIndex(port);

  for (const edge of port.getOutgoingEdges()) {
    // Mirror bend points
    for (const bendPoint of edge.getBendPoints()) {
      mirrorYVector(bendPoint, offset);
    }

    // Mirror junction points
    const junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
    if (junctionPoints !== null) {
      for (const jp of junctionPoints) {
        mirrorYVector(jp, offset);
      }
    }

    // Mirror edge label positions
    for (const label of edge.getLabels()) {
      mirrorYVector(label.getPosition(), offset - label.getSize().y);
    }
  }

  // Mirror port label positions
  for (const label of port.getLabels()) {
    mirrorYVector(label.getPosition(), port.getSize().y - label.getSize().y);
  }
}

/**
 * Mirror the y coordinate of the given vector and add an offset (Java overload `mirrorY(KVector, double)`).
 *
 * @param v a vector
 * @param offset offset for the x coordinate
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:487
 */
export function mirrorYVector(v: KVector, offset: number): void {
  v.y = offset - v.y;
}

/**
 * Mirrors the given spacing in Y direction (Java overload `mirrorY(Spacing)`).
 *
 * @param spacing the spacing to mirror.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:496
 */
export function mirrorYSpacing(spacing: Spacing): void {
  const oldTop = spacing.getTop();
  const oldBottom = spacing.getBottom();

  spacing.setTop(oldBottom);
  spacing.setBottom(oldTop);
}

/**
 * Vertically mirrors the node label placement options, if any are set.
 *
 * @param shape the node or label whose placement should be mirrored.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:509
 */
function mirrorNodeLabelPlacementY(shape: LShape): void {
  if (!shape.hasProperty(LayeredOptions.NODE_LABELS_PLACEMENT)) {
    return;
  }

  const oldPlacement = shape.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT);
  if (oldPlacement.contains(NodeLabelPlacement.V_TOP)) {
    oldPlacement.remove(NodeLabelPlacement.V_TOP);
    oldPlacement.add(NodeLabelPlacement.V_BOTTOM);
  } else if (oldPlacement.contains(NodeLabelPlacement.V_BOTTOM)) {
    oldPlacement.remove(NodeLabelPlacement.V_BOTTOM);
    oldPlacement.add(NodeLabelPlacement.V_TOP);
  }
}

/**
 * Mirror the side of the given port. Undefined port sides are left untouched.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:529
 */
function mirrorPortSideY(port: LPort): void {
  port.setSide(getMirroredPortSideY(port.getSide()));
}

/**
 * Mirror the side of the external port represented by the given external port dummy.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:538
 */
function mirrorExternalPortSideY(node: LNode): void {
  node.setProperty(
    InternalProperties.EXT_PORT_SIDE,
    getMirroredPortSideY(node.getProperty(InternalProperties.EXT_PORT_SIDE)),
  );
}

/**
 * Returns the port side that is vertically mirrored from the given side.
 *
 * @param side the side whose vertical opposite to return.
 * @return vertical opposite of the given side.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:549
 */
export function getMirroredPortSideY(side: PortSide): PortSide {
  switch (side) {
    case PortSide.NORTH:
      return PortSide.SOUTH;

    case PortSide.SOUTH:
      return PortSide.NORTH;

    default:
      return side;
  }
}

/**
 * Vertically mirrors the in-layer constraint set on a node. This is only meant for handling external
 * port dummy nodes.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:568
 */
function mirrorInLayerConstraintY(node: LNode): void {
  switch (node.getProperty(InternalProperties.IN_LAYER_CONSTRAINT)) {
    case InLayerConstraint.TOP:
      node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.BOTTOM);
      break;

    case InLayerConstraint.BOTTOM:
      node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.TOP);
      break;
  }
}
