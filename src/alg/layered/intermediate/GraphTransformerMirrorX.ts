// SPDX-License-Identifier: EPL-2.0
// Section of `GraphTransformer`: the "Mirror Horizontally" group (Java lines 178-388).
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
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { reverseIndex } from './GraphTransformerSupport.js';

/**
 * Mirror the x coordinates of the given graph (Java overload `mirrorX(List<LNode>, LGraph)`).
 *
 * @param nodes the nodes of the graph to transpose
 * @param graph the graph the nodes are part of
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:187
 */
export function mirrorXNodes(nodes: readonly LNode[], graph: LGraph): void {
  /* Assuming that no nodes extend into negative x coordinates, mirroring a node means that the
   * space left to its left border equals the space right to its right border when mirrored. In
   * mathematical terms:
   *     oldPosition.x = graphWidth - newPosition.x - nodeWidth
   * We use the offset variable to store graphWidth, since that's the constant offset against which
   * we calculate the new node positions.
   * This, however, stops to work once nodes are allowed to extend into negative coordinates. Then,
   * we have to subtract from the graphWidth the amount of space the graph extends into negative
   * coordinates. This amount is saved in the graph's graphOffset. Thus, our offset here becomes:
   *     offset = graphWidth - graphOffset.x
   */
  let offset = 0;

  // If the graph already had its size calculated, use that; if not, find its width by iterating
  // over its nodes
  if (graph.getSize().x === 0) {
    for (const node of nodes) {
      offset = Math.max(offset, node.getPosition().x + node.getSize().x + node.getMargin().getRight());
    }
  } else {
    offset = graph.getSize().x - graph.getOffset().x;
  }
  offset -= graph.getOffset().x;

  // mirror all nodes, ports, edges, and labels
  for (const node of nodes) {
    mirrorXNode(node, offset);
  }
}

/** The body of the node loop of {@link mirrorXNodes}. */
function mirrorXNode(node: LNode, offset: number): void {
  mirrorXVector(node.getPosition(), offset - node.getSize().x);
  mirrorXSpacing(node.getPadding());
  mirrorNodeLabelPlacementX(node);

  // mirror position
  if (node.getAllProperties().containsKey(LayeredOptions.POSITION)) {
    mirrorXVector(node.getProperty(LayeredOptions.POSITION), offset - node.getSize().x);
  }

  // mirror the alignment
  switch (node.getProperty(LayeredOptions.ALIGNMENT)) {
    case Alignment.LEFT:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.RIGHT);
      break;
    case Alignment.RIGHT:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.LEFT);
      break;
  }

  const nodeSize = node.getSize();
  for (const port of node.getPorts()) {
    mirrorXPort(port, nodeSize, offset);
  }

  // External port dummy?
  if (node.getType() === NodeType.EXTERNAL_PORT) {
    mirrorExternalPortSideX(node);
    mirrorLayerConstraintX(node);
  }

  // Mirror node labels
  for (const label of node.getLabels()) {
    mirrorNodeLabelPlacementX(label);
    mirrorXVector(label.getPosition(), nodeSize.x - label.getSize().x);
  }
}

/** The body of the port loop of {@link mirrorXNodes}. */
function mirrorXPort(port: LPort, nodeSize: KVector, offset: number): void {
  mirrorXVector(port.getPosition(), nodeSize.x - port.getSize().x);
  mirrorXVector(port.getAnchor(), port.getSize().x);
  mirrorPortSideX(port);
  reverseIndex(port);

  for (const edge of port.getOutgoingEdges()) {
    // Mirror bend points
    for (const bendPoint of edge.getBendPoints()) {
      mirrorXVector(bendPoint, offset);
    }

    // Mirror junction points
    const junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
    if (junctionPoints !== null) {
      for (const jp of junctionPoints) {
        mirrorXVector(jp, offset);
      }
    }

    // Mirror edge label positions
    for (const label of edge.getLabels()) {
      mirrorXVector(label.getPosition(), offset - label.getSize().x);
    }
  }

  // Mirror port label positions
  for (const label of port.getLabels()) {
    mirrorXVector(label.getPosition(), port.getSize().x - label.getSize().x);
  }
}

/**
 * Mirror the x coordinate of the given vector and add an offset (Java overload `mirrorX(KVector, double)`).
 *
 * @param v a vector
 * @param offset offset for the x coordinate
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:288
 */
export function mirrorXVector(v: KVector, offset: number): void {
  v.x = offset - v.x;
}

/**
 * Mirrors the given spacing in X direction (Java overload `mirrorX(Spacing)`).
 *
 * @param spacing the spacing to mirror.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:297
 */
export function mirrorXSpacing(spacing: Spacing): void {
  const oldLeft = spacing.getLeft();
  const oldRight = spacing.getRight();

  spacing.setLeft(oldRight);
  spacing.setRight(oldLeft);
}

/**
 * Horrizontally mirrors the node label placement options, if any are set.
 *
 * @param shape the node or label whose placement should be transposed.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:310
 */
function mirrorNodeLabelPlacementX(shape: LShape): void {
  if (!shape.hasProperty(LayeredOptions.NODE_LABELS_PLACEMENT)) {
    return;
  }

  const oldPlacement = shape.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT);
  if (oldPlacement.contains(NodeLabelPlacement.H_LEFT)) {
    oldPlacement.remove(NodeLabelPlacement.H_LEFT);
    oldPlacement.add(NodeLabelPlacement.H_RIGHT);
  } else if (oldPlacement.contains(NodeLabelPlacement.H_RIGHT)) {
    oldPlacement.remove(NodeLabelPlacement.H_RIGHT);
    oldPlacement.add(NodeLabelPlacement.H_LEFT);
  }
}

/**
 * Mirror the side of the given port. Undefined port sides are left untouched.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:330
 */
function mirrorPortSideX(port: LPort): void {
  port.setSide(getMirroredPortSideX(port.getSide()));
}

/**
 * Mirror the side of the external port represented by the given external port dummy.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:339
 */
function mirrorExternalPortSideX(node: LNode): void {
  node.setProperty(
    InternalProperties.EXT_PORT_SIDE,
    getMirroredPortSideX(node.getProperty(InternalProperties.EXT_PORT_SIDE)),
  );
}

/**
 * Returns the port side that is horizontally mirrored from the given side.
 *
 * @param side the side whose horizontal opposite to return.
 * @return horizontal opposite of the given side.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:350
 */
export function getMirroredPortSideX(side: PortSide): PortSide {
  switch (side) {
    case PortSide.EAST:
      return PortSide.WEST;

    case PortSide.WEST:
      return PortSide.EAST;

    default:
      return side;
  }
}

/**
 * Horizontally mirrors the layer constraint set on a node. This is only meant for handling external
 * port dummy nodes.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:369
 */
function mirrorLayerConstraintX(node: LNode): void {
  switch (node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
    case LayerConstraint.FIRST:
      node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST);
      break;

    case LayerConstraint.FIRST_SEPARATE:
      node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST_SEPARATE);
      break;

    case LayerConstraint.LAST:
      node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST);
      break;

    case LayerConstraint.LAST_SEPARATE:
      node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST_SEPARATE);
      break;
  }
}
