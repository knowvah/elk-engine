// SPDX-License-Identifier: EPL-2.0
import type { KVector as KVectorType } from '../../../../core/math/KVector.js';
import { KVector } from '../../../../core/math/KVector.js';
import type { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import { isElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkLabel } from '../../../../graph/ElkLabel.js';
import { isElkLabel } from '../../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { isElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { isElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { NodeFlexibility } from '../../options/NodeFlexibility.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { LabelDummySwitcher } from '../../intermediate/LabelDummySwitcher.js';
import { LGraphUtil } from '../LGraphUtil.js';
import type { LEdge } from '../LEdge.js';
import type { LGraph } from '../LGraph.js';
import type { LNode } from '../LNode.js';
import type { LPadding } from '../LPadding.js';
import { ZERO_OFFSET } from './ElkGraphLayoutTransferrerUtility.js';

/** Java's `(ElkNode) lnode.getProperty(ORIGIN)`: `null` passes, any other non-node throws. */
export function originAsNode(value: unknown): ElkNode | null {
  return checkCast(value, isElkNode, 'ElkNode');
}

/** Java's `(ElkPort) lnode.getProperty(ORIGIN)`. */
export function originAsPort(value: unknown): ElkPort | null {
  return checkCast(value, isElkPort, 'ElkPort');
}

/** Java's `(ElkLabel) llabel.getProperty(ORIGIN)`. */
export function originAsLabel(value: unknown): ElkLabel | null {
  return checkCast(value, isElkLabel, 'ElkLabel');
}

/** Whether the node size has to be applied (the condition of `applyNodeLayout`'s "Set the node size" step). */
function needsNodeSize(elknode: ElkNode, lnode: LNode): boolean {
  return (
    !elknode.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS).isEmpty() ||
    lnode.getNestedGraph() !== null ||
    ((lnode.getGraph() as LGraph).getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY) ===
      NodePlacementStrategy.NETWORK_SIMPLEX &&
      NodeFlexibility.getNodeFlexibility(lnode).isFlexibleSizeWhereSpacePermits())
  );
}

/** The label steps of `applyNodeLayout`: node labels, then port labels, each only if they were not fixed. */
function applyNodeLabelLayout(lnode: LNode): void {
  // Set node label positions, if they were not fixed
  // (that is at least one of the node or the label has a node label placement set)
  const nodeHasLabelPlacement = !lnode.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT).isEmpty();

  for (const llabel of lnode.getLabels()) {
    if (nodeHasLabelPlacement || !llabel.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT).isEmpty()) {
      const elklabel = originAsLabel(llabel.getProperty(InternalProperties.ORIGIN)) as ElkLabel;
      elklabel.setDimensions(llabel.getSize().x, llabel.getSize().y);
      elklabel.setLocation(llabel.getPosition().x, llabel.getPosition().y);
    }
  }

  // Set port label positions, if they were not fixed
  if (!PortLabelPlacement.isFixed(lnode.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT))) {
    for (const lport of lnode.getPorts()) {
      for (const llabel of lport.getLabels()) {
        const elklabel = originAsLabel(llabel.getProperty(InternalProperties.ORIGIN)) as ElkLabel;
        elklabel.setWidth(llabel.getSize().x);
        elklabel.setHeight(llabel.getSize().y);
        elklabel.setLocation(llabel.getPosition().x, llabel.getPosition().y);
      }
    }
  }
}

/**
 * Applies layout information computed for the given node.
 *
 * @param lnode the node that has the layout information.
 * @param offset offset to add to coordinates.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */
export function applyNodeLayout(lnode: LNode, offset: KVectorType): void {
  const elknode = originAsNode(lnode.getProperty(InternalProperties.ORIGIN)) as ElkNode;

  // Apply the nodeID and layerId that were set on the LGraph on the ElkGraph
  const nodeID = lnode.getProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID);
  const layerID = lnode.getProperty(LayeredOptions.LAYERING_LAYER_ID);
  elknode.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID, nodeID);
  elknode.setProperty(LayeredOptions.LAYERING_LAYER_ID, layerID);

  // Set the node position
  elknode.setX(lnode.getPosition().x + offset.x);
  elknode.setY(lnode.getPosition().y + offset.y);

  // Set the node size, if necessary
  if (needsNodeSize(elknode, lnode)) {
    elknode.setWidth(lnode.getSize().x);
    elknode.setHeight(lnode.getSize().y);
  }

  // Set port positions
  for (const lport of lnode.getPorts()) {
    const origin = lport.getProperty(InternalProperties.ORIGIN);
    if (isElkPort(origin)) {
      origin.setLocation(lport.getPosition().x, lport.getPosition().y);
      origin.setProperty(LayeredOptions.PORT_SIDE, lport.getSide());
    }
  }

  applyNodeLabelLayout(lnode);
}

/** The "Adapt the offset value and add the source port position" step of `applyEdgeLayout`. */
function computeSourcePoint(ledge: LEdge, offset: KVectorType): KVectorType {
  const sourcePort = ledge.getSource()!;
  if (LGraphUtil.isDescendant(ledge.getTarget()!.getNode()!, sourcePort.getNode()!)) {
    // The external port's anchor position, relative to the node's top left corner
    const sourcePoint = KVector.sum(sourcePort.getPosition(), sourcePort.getAnchor());

    // The source point will later have the passed offset added to it, which it doesn't actually
    // need, so we subtract it now (notice that the external port's position was already relative
    // to its node's top left corner, while adding the offset now would mean that it was relative
    // to the top left corner + its insets area)
    sourcePoint.sub(offset);
    return sourcePoint;
  }
  return sourcePort.getAbsoluteAnchor();
}

/**
 * Applies layout information computed for the given edge.
 *
 * @param ledge the edge that has the layout information.
 * @param routing the kind of routing applied to edges.
 * @param offset offset to add to coordinates.
 * @param additionalPadding the additional insets that may have to be taken into account for hierarchical that go
 *                          into the bowels of their source node. These are already included in the offset, but are
 *                          required separately.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */
export function applyEdgeLayout(
  ledge: LEdge,
  routing: EdgeRouting,
  offset: KVectorType,
  _additionalPadding: LPadding,
): void {
  const elkedge = checkCast(ledge.getProperty(InternalProperties.ORIGIN), isElkEdge, 'ElkEdge');

  // Only the orthogonal edge routing algorithm supports self-loops. Thus, leave self-loops
  // untouched if another routing algorithm is selected.
  if (elkedge === null) {
    return;
  }

  const bendPoints = ledge.getBendPoints();

  // The standard offset may need to be modified if the edge needs to end up in a coordinate system of
  // a graph in a higher hierarchy level
  const edgeOffset = new KVector(offset);
  edgeOffset.add(calculateHierarchicalOffset(ledge));

  // Adapt the offset value and add the source port position to the vector chain
  bendPoints.addFirst(computeSourcePoint(ledge, offset));

  // Add the target port position to the vector chain, including additional offset
  const targetPoint = ledge.getTarget()!.getAbsoluteAnchor();
  if (ledge.getProperty(InternalProperties.TARGET_OFFSET) !== null) {
    targetPoint.add(ledge.getProperty(InternalProperties.TARGET_OFFSET));
  }
  bendPoints.addLast(targetPoint);

  // Translate the bend points by the offset and apply the bend points
  bendPoints.offset(edgeOffset);

  applyRoutingResult(elkedge, bendPoints);
  applyEdgeLabelLayout(ledge, edgeOffset);
  copyJunctionPoints(ledge, elkedge, edgeOffset);

  // Mark the edge with information about its routing
  if (routing === EdgeRouting.SPLINES) {
    // SPLINES means that bend points shall be interpreted as control points for splines
    elkedge.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.SPLINES);
  } else {
    // null means that bend points shall be interpreted as bend points
    elkedge.setProperty(LayeredOptions.EDGE_ROUTING, null);
  }
}

/** Gives the edge a proper edge section to store routing information. */
function applyRoutingResult(elkedge: ElkEdge, bendPoints: KVectorChain): void {
  const elkedgeSection = ElkGraphUtil.firstEdgeSection(elkedge, true, true);
  elkedgeSection.setIncomingShape(elkedge.getSources().get(0));
  elkedgeSection.setOutgoingShape(elkedge.getTargets().get(0));
  ElkUtil.applyVectorChain(bendPoints, elkedgeSection);
}

/** Apply layout to labels. */
function applyEdgeLabelLayout(ledge: LEdge, edgeOffset: KVectorType): void {
  for (const llabel of ledge.getLabels()) {
    const elklabel = originAsLabel(llabel.getProperty(InternalProperties.ORIGIN)) as ElkLabel;
    elklabel.setWidth(llabel.getSize().x);
    elklabel.setHeight(llabel.getSize().y);
    elklabel.setLocation(llabel.getPosition().x + edgeOffset.x, llabel.getPosition().y + edgeOffset.y);

    elklabel.setProperty(LabelDummySwitcher.INCLUDE_LABEL, llabel.getProperty(LabelDummySwitcher.INCLUDE_LABEL));
  }
}

/** Copy junction points. */
function copyJunctionPoints(ledge: LEdge, elkedge: ElkEdge, edgeOffset: KVectorType): void {
  const junctionPoints = ledge.getProperty(LayeredOptions.JUNCTION_POINTS);
  if (junctionPoints !== null) {
    junctionPoints.offset(edgeOffset);
    elkedge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
  } else {
    elkedge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
  }
}

/**
 * If the coordinates of an edge must be relative to a different node than they are in the algorithm, this
 * method returns the correct offset to translate from the algorithm's coordinate system to the necessary
 * target coordinate system.
 *
 * @return the offset vector, which may simply be zero (but not `null`). Must not be modified.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */
export function calculateHierarchicalOffset(ledge: LEdge): KVectorType {
  const targetCoordinateSystem = ledge.getProperty(InternalProperties.COORDINATE_SYSTEM_ORIGIN);
  if (targetCoordinateSystem !== null) {
    const result = new KVector();

    // Edges this method is called on are always in the coordinate system of their source
    let currentGraph = ledge.getSource()!.getNode()!.getGraph() as LGraph;

    while (currentGraph !== targetCoordinateSystem) {
      // The current graph should always have an upper level if we have not reached the target graph yet;
      const representingNode = currentGraph.getParentNode() as LNode;
      currentGraph = representingNode.getGraph() as LGraph;

      result
        .add(representingNode.getPosition())
        .add(currentGraph.getOffset())
        .add(currentGraph.getPadding().left, currentGraph.getPadding().top);
    }

    return result;
  }

  // No coordinate system conversion is required
  return ZERO_OFFSET;
}

/**
 * Applies layout information computed for the given graph.
 *
 * @param lgraph the edge that has the layout information.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */
export function applyParentNodeLayout(lgraph: LGraph): void {
  const elknode = originAsNode(lgraph.getProperty(InternalProperties.ORIGIN)) as ElkNode;

  const sizeConstraintsIncludedPortLabels = elknode
    .getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS)
    .contains(SizeConstraint.PORT_LABELS);

  if (lgraph.getParentNode() === null) {
    const graphProps = lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES);
    const actualGraphSize = lgraph.getActualSize();

    if (graphProps.contains(GraphProperties.EXTERNAL_PORTS)) {
      // Ports have positions assigned, the graph's size is final
      elknode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
      ElkUtil.resizeNode(elknode, actualGraphSize.x, actualGraphSize.y, false, true);
    } else if (!elknode.getProperty(LayeredOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      // Ports have not been positioned yet - leave this for next layouter
      ElkUtil.resizeNode(elknode, actualGraphSize.x, actualGraphSize.y, true, true);
    }
  }

  // Set the size constraints. Thing is, if we always set the size constraints to fixed, we might remove a
  // PORT_LABELS constraints that was formerly present. This in turn will cause ports to be placed without
  // consideration for their labels.
  if (sizeConstraintsIncludedPortLabels) {
    elknode.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS));
  } else {
    elknode.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
  }
}
