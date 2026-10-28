// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../core/options/SizeOptions.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkLabel } from '../../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { NodeFlexibility } from '../../options/NodeFlexibility.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { LabelDummySwitcher } from '../../intermediate/LabelDummySwitcher.js';
import type { LEdge } from '../LEdge.js';
import type { LGraph } from '../LGraph.js';
import { LGraphUtil } from '../LGraphUtil.js';
import type { LNode } from '../LNode.js';
import type { LPadding } from '../LPadding.js';
import {
  collectDescendingEdges,
  collectLeavingEdges,
  representsExternalPort,
  representsNode,
  ZERO_OFFSET,
} from './ElkGraphLayoutTransferrerUtility.js';

/**
 * The "Utility Methods for debugging" section of `ElkGraphLayoutTransferrer`: the same steps as `applyLayout`, but
 * building a fresh ElkGraph without mutating the original. The Java overloads are suffixed `NonMutating`
 * (`applyLayoutNonMutating(lgraph, parentElkNode)` stays the private two-argument overload; the public one-argument
 * form lives on the facade).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */

/**
 * Collects all nodes from the given LGraph that represent a node in the original ELK graph.
 *
 * @param lgraph The LGraph to collect nodes from.
 * @return A list of all nodes that represent a node in the original ELK graph.
 */
function collectNodes(lgraph: LGraph): LNode[] {
  const nodes: LNode[] = [];
  for (const layer of lgraph.getLayers()) {
    for (const lNode of layer.getNodes()) {
      if (representsNode(lNode)) {
        nodes.push(lNode);
      } else if (representsExternalPort(lNode)) {
        // External ports are not nodes, so we do not add them
      } else {
        // This is a node that does not represent a node, e.g. a dummy node
        // or a node that is not yet placed.
        continue;
      }
    }
  }
  for (const lNode of lgraph.getLayerlessNodes()) {
    if (representsNode(lNode)) {
      nodes.push(lNode);
    } else if (representsExternalPort(lNode)) {
      // External ports are not nodes, so we do not add them
    } else {
      // This is a node that does not represent a node, e.g. a dummy node
      // or a node that is not yet placed.
      continue;
    }
  }
  return nodes;
}

/** Applies the port steps of the static `applyNodeLayout`: one new port (and labels) per LPort. */
function applyPortLayoutNonMutating(lnode: LNode, elknode: ElkNode): void {
  for (const lport of lnode.getPorts()) {
    // Create a new port
    const elkport = ElkGraphUtil.createPort(elknode);
    elkport.setLocation(lport.getPosition().x, lport.getPosition().y);
    elkport.setProperty(LayeredOptions.PORT_SIDE, lport.getSide());

    // Set port label positions, if they were not fixed
    if (!PortLabelPlacement.isFixed(lnode.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT))) {
      for (const llabel of lport.getLabels()) {
        // Create a new label
        const elklabel = ElkGraphUtil.createLabel(elkport);
        elklabel.setWidth(llabel.getSize().x);
        elklabel.setHeight(llabel.getSize().y);
        elklabel.setLocation(llabel.getPosition().x, llabel.getPosition().y);
      }
    }
  }
}

/**
 * Applies layout information computed for the given node.
 * (Java: the static overload `applyNodeLayout(lnode, elknode, offset)`.)
 *
 * @param lnode the node that has the layout information.
 * @param elknode the ElkNode to apply the layout information to.
 * @param offset offset to add to coordinates.
 */
function applyNodeLayoutNonMutating(lnode: LNode, elknode: ElkNode, offset: KVector): void {
  // Apply the nodeID and layerId that were set on the LGraph on the ElkGraph
  const nodeID = lnode.getProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID);
  const layerID = lnode.getProperty(LayeredOptions.LAYERING_LAYER_ID);
  elknode.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID, nodeID);
  elknode.setProperty(LayeredOptions.LAYERING_LAYER_ID, layerID);

  // Set the node position
  elknode.setX(lnode.getPosition().x + offset.x);
  elknode.setY(lnode.getPosition().y + offset.y);

  // Set the node size, if necessary
  if (
    !elknode.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS).isEmpty() ||
    lnode.getNestedGraph() !== null ||
    ((lnode.getGraph() as LGraph).getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY) ===
      NodePlacementStrategy.NETWORK_SIMPLEX &&
      NodeFlexibility.getNodeFlexibility(lnode).isFlexibleSizeWhereSpacePermits())
  ) {
    elknode.setWidth(lnode.getSize().x);
    elknode.setHeight(lnode.getSize().y);
  }

  // Set port positions
  applyPortLayoutNonMutating(lnode, elknode);

  // Set node label positions, if they were not fixed
  // (that is at least one of the node or the label has a node label placement set)
  const nodeHasLabelPlacement = !lnode.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT).isEmpty();

  for (const llabel of lnode.getLabels()) {
    if (nodeHasLabelPlacement || !llabel.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT).isEmpty()) {
      // Create a new label
      const elklabel: ElkLabel = ElkGraphUtil.createLabel(elknode);
      elklabel.setDimensions(llabel.getSize().x, llabel.getSize().y);
      elklabel.setLocation(llabel.getPosition().x, llabel.getPosition().y);
    }
  }
}

/** The routing-dependent source point of `applyEdgeLayout`'s static overload. */
function sourcePointNonMutating(ledge: LEdge, offset: KVector): KVector {
  if (LGraphUtil.isDescendant(ledge.getTarget()!.getNode()!, ledge.getSource()!.getNode()!)) {
    // The external port's anchor position, relative to the node's top left corner
    const sourcePort = ledge.getSource()!;
    const sourcePoint = KVector.sum(sourcePort.getPosition(), sourcePort.getAnchor());

    // The source point will later have the passed offset added to it, which it doesn't actually
    // need, so we subtract it now (notice that the external port's position was already relative
    // to its node's top left corner, while adding the offset now would mean that it was relative
    // to the top left corner + its insets area)
    // Java quirk kept: the difference is computed into a new vector that is discarded, so `sourcePoint` keeps
    // the offset.
    KVector.diff(sourcePoint, offset);
    return sourcePoint;
  }
  return ledge.getSource()!.getAbsoluteAnchor().clone();
}

/** The label and junction point steps of the static `applyEdgeLayout`. */
function applyEdgeDetailsNonMutating(ledge: LEdge, elkedge: ElkEdge, edgeOffset: KVector): void {
  // Apply layout to labels
  for (const llabel of ledge.getLabels()) {
    // Create a new label
    const elklabel = ElkGraphUtil.createLabel(elkedge);
    elklabel.setWidth(llabel.getSize().x);
    elklabel.setHeight(llabel.getSize().y);
    elklabel.setLocation(llabel.getPosition().x + edgeOffset.x, llabel.getPosition().y + edgeOffset.y);

    elklabel.setProperty(LabelDummySwitcher.INCLUDE_LABEL, llabel.getProperty(LabelDummySwitcher.INCLUDE_LABEL));
  }

  // Copy junction points
  // Java quirk kept: `.clone()` is invoked before the null check, so a missing junction point chain throws a
  // NullPointerException (here a TypeError) instead of reaching the `else` branch.
  let junctionPoints = (ledge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain).clone();
  if (junctionPoints !== null) {
    junctionPoints = junctionPoints.offsetNonMutating(edgeOffset);
    elkedge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
  } else {
    elkedge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
  }
}

/**
 * Applies layout information computed for the given edge.
 * (Java: the static overload `applyEdgeLayout(ledge, elkedge, routing, offset, additionalPadding)`.)
 */
function applyEdgeLayoutNonMutating(
  ledge: LEdge,
  elkedge: ElkEdge | null,
  routing: EdgeRouting,
  offset: KVector,
  _additionalPadding: LPadding,
): void {
  // Only the orthogonal edge routing algorithm supports self-loops. Thus, leave self-loops
  // untouched if another routing algorithm is selected.
  if (elkedge === null) {
    return;
  }

  let bendPoints = ledge.getBendPoints().clone();

  // The standard offset may need to be modified if the edge needs to end up in a coordinate system of
  // a graph in a higher hierarchy level
  let edgeOffset = new KVector(offset);
  edgeOffset = KVector.sum(edgeOffset, calculateHierarchicalOffsetNonMutating(ledge));

  // Adapt the offset value and add the source port position to the vector chain
  bendPoints.addFirst(sourcePointNonMutating(ledge, offset));

  // Add the target port position to the vector chain, including additional offset
  const targetPoint = ledge.getTarget()!.getAbsoluteAnchor().clone();
  if (ledge.getProperty(InternalProperties.TARGET_OFFSET) !== null) {
    targetPoint.add(ledge.getProperty(InternalProperties.TARGET_OFFSET));
  }
  bendPoints.addLast(targetPoint);

  // Translate the bend points by the offset and apply the bend points
  // Do not mutate the bend points, but create a new one instead
  bendPoints = bendPoints.offsetNonMutating(edgeOffset);

  // Give the edge a proper edge section to store routing information
  // Source and target do not matter here.
  const elkedgeSection = ElkGraphUtil.firstEdgeSection(elkedge, true, true);
  ElkUtil.applyVectorChain(bendPoints, elkedgeSection);

  applyEdgeDetailsNonMutating(ledge, elkedge, edgeOffset);

  // Mark the edge with information about its routing
  if (routing === EdgeRouting.SPLINES) {
    // SPLINES means that bend points shall be interpreted as control points for splines
    elkedge.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.SPLINES);
  } else {
    // null means that bend points shall be interpreted as bend points
    elkedge.setProperty(LayeredOptions.EDGE_ROUTING, null);
  }
}

/**
 * If the coordinates of an edge must be relative to a different node than they are in the algorithm, this
 * method returns the correct offset to translate from the algorithm's coordinate system to the necessary
 * target coordinate system.
 */
function calculateHierarchicalOffsetNonMutating(ledge: LEdge): KVector {
  const targetCoordinateSystem = ledge.getProperty(InternalProperties.COORDINATE_SYSTEM_ORIGIN);
  if (targetCoordinateSystem !== null) {
    let result = new KVector();

    // Edges this method is called on are always in the coordinate system of their source
    let currentGraph = ledge.getSource()!.getNode()!.getGraph() as LGraph;

    while (currentGraph !== targetCoordinateSystem) {
      // The current graph should always have an upper level if we have not reached the target graph yet;
      const representingNode = currentGraph.getParentNode() as LNode;
      currentGraph = representingNode.getGraph() as LGraph;

      // Do not mutate the result, but create a new one instead
      result = KVector.sum(
        result,
        representingNode.getPosition(),
        currentGraph.getOffset(),
        new KVector(currentGraph.getPadding().left, currentGraph.getPadding().top),
      );
    }

    return result;
  }

  // No coordinate system conversion is required
  return ZERO_OFFSET;
}

/**
 * Applies layout information computed for the given graph without mutating the original graph.
 * (Java: the static overload `applyParentNodeLayout(lgraph, elknode)`.)
 */
function applyParentNodeLayoutNonMutating(lgraph: LGraph, elknode: ElkNode): void {
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

/** Copies the computed padding onto `parentElkNode` if `COMPUTE_PADDING` is requested. */
function applyComputedPaddingNonMutating(parentElkNode: ElkNode, lPadding: LPadding): void {
  const sizeOptions = parentElkNode.getProperty(LayeredOptions.NODE_SIZE_OPTIONS);
  if (sizeOptions.contains(SizeOptions.COMPUTE_PADDING)) {
    const padding = parentElkNode.getProperty(LayeredOptions.PADDING);
    padding.setBottom(lPadding.bottom);
    padding.setTop(lPadding.top);
    padding.setLeft(lPadding.left);
    padding.setRight(lPadding.right);
  }
}

/** The node loop of the recursive `applyLayoutNonMutating`. */
function applyNodesNonMutating(lgraph: LGraph, parentElkNode: ElkNode, offset: KVector, edgeList: LEdge[]): void {
  const parentLNode = lgraph.getParentNode();
  for (const lnode of collectNodes(lgraph)) {
    let elkNode: ElkNode | null = null;
    if (representsNode(lnode)) {
      // Create a new node
      elkNode = ElkGraphUtil.createNode(parentElkNode);
      applyNodeLayoutNonMutating(lnode, elkNode, offset);
    } else if (representsExternalPort(lnode) && parentLNode === null) {
      // We have an external port here on the top-most hierarchy level of the current (possibly
      // hierarchical) layout run; set its position
      // Create a new port
      const elkport: ElkPort = ElkGraphUtil.createPort(parentElkNode);
      const portPosition = LGraphUtil.getExternalPortPosition(lgraph, lnode, elkport.getWidth(), elkport.getHeight());
      elkport.setLocation(portPosition.x, portPosition.y);
    }

    // Collect edges, except if they go into a nested subgraph (those edges need to be
    // processed during one of the recursive calls so that any additional offsets are applied
    // correctly)
    collectLeavingEdges(lnode, edgeList);

    // Transform child nodes.
    const nestedGraph = lnode.getNestedGraph();
    if (nestedGraph !== null) {
      applyLayoutNonMutating(nestedGraph, elkNode as ElkNode);
      parentElkNode.getChildren().add(elkNode as ElkNode);
    }
  }
}

/**
 * Recursive method used to create an ElkGraph from an LGraph to log via the progress monitor. This is done by
 * executing the same steps as in `applyLayout`, but without mutating.
 *
 * @param lgraph The LGraph
 * @param parentElkNode The ElkNode that represents this graph in the original ElkGraph.
 * @return The ElkNode to log.
 */
export function applyLayoutNonMutating(lgraph: LGraph, parentElkNode: ElkNode): ElkNode {
  // The LNode that represents this graph in the upper hierarchy level, if any
  const parentLNode = lgraph.getParentNode();

  // Get the offset to be added to all coordinates
  const offset = new KVector(lgraph.getOffset().clone());

  // Adjust offset (and with it the positions) by the requested padding
  const lPadding = lgraph.getPadding().clone();
  offset.x += lPadding.left;
  offset.y += lPadding.top;

  // Set node padding, if it was computed during layout
  applyComputedPaddingNonMutating(parentElkNode, lPadding);

  // Along the way, we collect the list of edges to be processed later
  const edgeList: LEdge[] = [];

  // Process the nodes
  applyNodesNonMutating(lgraph, parentElkNode, offset, edgeList);

  // Collect edges that go from the current graph's representing LNode down into its descendants
  if (parentLNode !== null) {
    collectDescendingEdges(parentLNode, edgeList);
  }

  // Iterate through all edges
  const routing = parentElkNode.getProperty(LayeredOptions.EDGE_ROUTING);
  for (const ledge of edgeList) {
    // Create a new edge.
    // This edge will not be connected to any source or target, as it is only used for logging.
    const elkedge = ElkGraphUtil.createEdge(parentElkNode);
    applyEdgeLayoutNonMutating(ledge, elkedge, routing, offset, lPadding);
  }

  // Setup the parent node
  applyParentNodeLayoutNonMutating(lgraph, parentElkNode);
  return parentElkNode;
}
