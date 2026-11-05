// SPDX-License-Identifier: EPL-2.0
// Section of `GraphTransformer`: the "Transpose" group (Java lines 580-865, `reverseIndex` is in
// `GraphTransformerSupport`).
import { KVector } from '../../../core/math/KVector.js';
import type { Spacing } from '../../../core/math/Spacing.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { LShape } from '../graph/LShape.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { reverseIndex } from './GraphTransformerSupport.js';

/**
 * Transpose the x and y coordinates of the given graph (Java overload `transpose(List<LNode>)`).
 *
 * @param nodes the nodes of the graph to transpose
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:589
 */
export function transposeNodes(nodes: readonly LNode[]): void {
  // Transpose nodes
  for (const node of nodes) {
    transposeNode(node);
  }
}

/** The body of the node loop of {@link transposeNodes}. */
function transposeNode(node: LNode): void {
  transposeVector(node.getPosition());
  transposeVector(node.getSize());
  transposeSpacing(node.getPadding());
  transposeNodeLabelPlacement(node);
  transposeProperties(node);

  // Transpose ports
  for (const port of node.getPorts()) {
    transposePort(port);
  }

  // External port dummy?
  if (node.getType() === NodeType.EXTERNAL_PORT) {
    transposeExternalPortSide(node);
    transposeLayerConstraint(node);
  }

  // Transpose node labels
  for (const label of node.getLabels()) {
    transposeNodeLabelPlacement(label);
    transposeVector(label.getSize());
    transposeVector(label.getPosition());
  }
}

/** The body of the port loop of {@link transposeNodes}. */
function transposePort(port: LPort): void {
  transposeVector(port.getPosition());
  transposeVector(port.getAnchor());
  transposeVector(port.getSize());
  transposePortSideOfPort(port);
  reverseIndex(port);

  // Transpose edges
  for (const edge of port.getOutgoingEdges()) {
    // Transpose bend points
    for (const bendPoint of edge.getBendPoints()) {
      transposeVector(bendPoint);
    }

    // Transpose junction points
    const junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
    if (junctionPoints !== null) {
      for (const jp of junctionPoints) {
        transposeVector(jp);
      }
    }

    // Transpose edge labels
    for (const label of edge.getLabels()) {
      transposeVector(label.getPosition());
      transposeVector(label.getSize());
    }
  }

  // Transpose port labels
  for (const label of port.getLabels()) {
    transposeVector(label.getPosition());
    transposeVector(label.getSize());
  }
}

/**
 * Transpose the x and y coordinate of the given vector (Java overload `transpose(KVector)`).
 *
 * @param v a vector
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:655
 */
export function transposeVector(v: KVector): void {
  const temp = v.x;
  v.x = v.y;
  v.y = temp;
}

/**
 * Transposes the given spacing (Java overload `transpose(Spacing)`).
 *
 * @param spacing the spacing to transpose, I guess...
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:666
 */
export function transposeSpacing(spacing: Spacing): void {
  const oldTop = spacing.getTop();
  const oldBottom = spacing.getBottom();
  const oldLeft = spacing.getLeft();
  const oldRight = spacing.getRight();

  spacing.setTop(oldLeft);
  spacing.setBottom(oldRight);
  spacing.setLeft(oldTop);
  spacing.setRight(oldBottom);
}

/**
 * Transposes the node label placement options, if any are set.
 *
 * @param shape the node or label whose placement should be transposed.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:683
 */
function transposeNodeLabelPlacement(shape: LShape): void {
  if (!shape.hasProperty(LayeredOptions.NODE_LABELS_PLACEMENT)) {
    return;
  }
  // note: do not merge with the previous condition, #getProperty may have a side-effect
  const oldPlacement = shape.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT);
  if (oldPlacement.isEmpty()) {
    return;
  }

  // Build up a new node label placement enumeration
  const newPlacement = EnumSet.noneOf(NodeLabelPlacement);

  // Inside or outside
  if (oldPlacement.contains(NodeLabelPlacement.INSIDE)) {
    newPlacement.add(NodeLabelPlacement.INSIDE);
  } else {
    newPlacement.add(NodeLabelPlacement.OUTSIDE);
  }

  // Horizontal priority
  if (!oldPlacement.contains(NodeLabelPlacement.H_PRIORITY)) {
    newPlacement.add(NodeLabelPlacement.H_PRIORITY);
  }

  transposeLabelAlignment(oldPlacement, newPlacement);

  // Apply new placement
  shape.setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, newPlacement);
}

/**
 * The horizontal and vertical alignment blocks of `transposeNodeLabelPlacement` (`:708-724`), split out for the
 * complexity limits (CCN); the order of the two blocks is the Java's.
 */
function transposeLabelAlignment(
  oldPlacement: EnumSet<NodeLabelPlacement>,
  newPlacement: EnumSet<NodeLabelPlacement>,
): void {
  // Horizontal alignment
  if (oldPlacement.contains(NodeLabelPlacement.H_LEFT)) {
    newPlacement.add(NodeLabelPlacement.V_TOP);
  } else if (oldPlacement.contains(NodeLabelPlacement.H_CENTER)) {
    newPlacement.add(NodeLabelPlacement.V_CENTER);
  } else if (oldPlacement.contains(NodeLabelPlacement.H_RIGHT)) {
    newPlacement.add(NodeLabelPlacement.V_BOTTOM);
  }

  // Vertical alignment
  if (oldPlacement.contains(NodeLabelPlacement.V_TOP)) {
    newPlacement.add(NodeLabelPlacement.H_LEFT);
  } else if (oldPlacement.contains(NodeLabelPlacement.V_CENTER)) {
    newPlacement.add(NodeLabelPlacement.H_CENTER);
  } else if (oldPlacement.contains(NodeLabelPlacement.V_BOTTOM)) {
    newPlacement.add(NodeLabelPlacement.H_RIGHT);
  }
}

/**
 * Transpose the side of the given port. Undefined port sides are left untouched (Java overload
 * `transposePortSide(LPort)`).
 *
 * @param p the port.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:735
 */
function transposePortSideOfPort(p: LPort): void {
  p.setSide(transposePortSide(p.getSide()));
}

/**
 * Returns the transposed side of the given port side (Java overload `transposePortSide(PortSide)`).
 *
 * @param side the side to transpose.
 * @return transposed port side.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:745
 */
export function transposePortSide(side: PortSide): PortSide {
  switch (side) {
    case PortSide.NORTH:
      return PortSide.WEST;

    case PortSide.WEST:
      return PortSide.NORTH;

    case PortSide.SOUTH:
      return PortSide.EAST;

    case PortSide.EAST:
      return PortSide.SOUTH;

    default:
      return PortSide.UNDEFINED;
  }
}

/**
 * Transpose the placement of edge labels in the graph.
 *
 * @param graph the complete graph
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:769
 */
export function transposeEdgeLabelPlacement(graph: LGraph): void {
  const oldSide = graph.getProperty(LayeredOptions.EDGE_LABELS_SIDE_SELECTION);
  if (oldSide !== null) {
    graph.setProperty(LayeredOptions.EDGE_LABELS_SIDE_SELECTION, oldSide.transpose());
  }
}

/**
 * Transpose the side of the external port represented by the given external port dummy.
 *
 * @param node external port dummy node.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:782
 */
function transposeExternalPortSide(node: LNode): void {
  node.setProperty(
    InternalProperties.EXT_PORT_SIDE,
    transposePortSide(node.getProperty(InternalProperties.EXT_PORT_SIDE)),
  );
}

/**
 * The layer constraint and in-layer constraint set on a node. A node with layer constraint
 * `LayerConstraint.FIRST_SEPARATE` will end up with an in-layer constraint `InLayerConstraint.TOP`. This is only meant
 * for external port dummy nodes and only supports the cases that can occur with them.
 *
 * @param node the node whose layer constraint to mirror.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:795
 */
function transposeLayerConstraint(node: LNode): void {
  const layerConstraint = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
  const inLayerConstraint = node.getProperty(InternalProperties.IN_LAYER_CONSTRAINT);

  if (layerConstraint === LayerConstraint.FIRST_SEPARATE) {
    node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.NONE);
    node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.TOP);
  } else if (layerConstraint === LayerConstraint.LAST_SEPARATE) {
    node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.NONE);
    node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.BOTTOM);
  } else if (inLayerConstraint === InLayerConstraint.TOP) {
    node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.FIRST_SEPARATE);
    node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.NONE);
  } else if (inLayerConstraint === InLayerConstraint.BOTTOM) {
    node.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, LayerConstraint.LAST_SEPARATE);
    node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.NONE);
  }
}

/**
 * Checks a node's properties for ones that need to be transposed. Currently, the following properties are transposed:
 * `NODE_SIZE_MINIMUM`, `ALIGNMENT` and `POSITION`.
 *
 * @param node the node whose properties are to be transposed.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:825
 */
function transposeProperties(node: LNode): void {
  // Transpose MIN_HEIGHT and MIN_WIDTH
  const minSize = node.getProperty(LayeredOptions.NODE_SIZE_MINIMUM);
  node.setProperty(LayeredOptions.NODE_SIZE_MINIMUM, new KVector(minSize.y, minSize.x));

  // Transpose ALIGNMENT
  switch (node.getProperty(LayeredOptions.ALIGNMENT)) {
    case Alignment.LEFT:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.TOP);
      break;
    case Alignment.RIGHT:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.BOTTOM);
      break;
    case Alignment.TOP:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.LEFT);
      break;
    case Alignment.BOTTOM:
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.RIGHT);
      break;
  }

  // POSITION
  if (node.getAllProperties().containsKey(LayeredOptions.POSITION)) {
    const pos = node.getProperty(LayeredOptions.POSITION);
    const tmp = pos.x;
    pos.x = pos.y;
    pos.y = tmp;
  }
}
