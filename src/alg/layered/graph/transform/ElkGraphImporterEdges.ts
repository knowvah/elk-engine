// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { EdgeLabelPlacement } from '../../../../core/options/EdgeLabelPlacement.js';
import { UnsupportedGraphException } from '../../../../core/UnsupportedGraphException.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkConnectableShape } from '../../../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../../../graph/ElkEdgeSection.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { isElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import * as Strings from '../../../../guava/Strings.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { PortType } from '../../options/PortType.js';
import { LEdge } from '../LEdge.js';
import type { LGraph } from '../LGraph.js';
import type { LGraphElement } from '../LGraphElement.js';
import { LGraphUtil } from '../LGraphUtil.js';
import { LNode } from '../LNode.js';
import { LPort } from '../LPort.js';
import { transformLabel } from './ElkGraphImporterLabels.js';
import { lookup, type NodeAndPortMap } from './ElkGraphImporterMap.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Edge Transformation

/** The facts about one edge that `transformEdge`'s steps share (the Java locals of that name). */
interface EdgeTransformation {
  readonly elkedge: ElkEdge;
  readonly elkparent: ElkNode;
  readonly lgraph: LGraph;
  readonly elkSourceNode: ElkNode;
  readonly elkTargetNode: ElkNode;
  readonly edgeSection: ElkEdgeSection | null;
}

/** One end of the edge as found in the node map: its LNode (if any) and LPort (if any). */
interface EdgeEnd {
  lnode: LNode | null;
  lport: LPort | null;
}

/**
 * Finds the transformed node and port of one edge end. If the ElkPort is a regular port, it will map to an LPort;
 * if it's an external port, it will map to an LNode.
 */
function findEnd(map: NodeAndPortMap, shape: ElkConnectableShape, node: ElkNode): EdgeEnd {
  const end: EdgeEnd = { lnode: lookup(map, node) as LNode | null, lport: null };

  // Find the transformed port, if any
  if (isElkPort(shape)) {
    const elem: LGraphElement | null = lookup(map, shape);
    if (elem instanceof LPort) {
      end.lport = elem;
    } else if (elem instanceof LNode) {
      end.lnode = elem;
      end.lport = elem.getPorts()[0] as LPort;
    }
  }
  return end;
}

/** Creates the missing source port of the edge. */
function createSourcePort(t: EdgeTransformation, sourceLNode: LNode): LPort {
  let portType = PortType.OUTPUT;
  let sourcePoint: KVector | null = null;

  if (t.edgeSection !== null && sourceLNode.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
    sourcePoint = new KVector(t.edgeSection.getStartX(), t.edgeSection.getStartY());

    // The coordinates need to be relative to us
    ElkUtil.toAbsolute(sourcePoint, t.elkedge.getContainingNode());
    ElkUtil.toRelative(sourcePoint, t.elkparent);

    // If the edge is hierarchical (in which case it can only be that the target is a descendant of the
    // source), we may need to adjust the coordinates
    if (ElkGraphUtil.isDescendant(t.elkTargetNode, t.elkSourceNode)) {
      // External source port: put it on the west side
      portType = PortType.INPUT;
      sourcePoint.add(sourceLNode.getPosition());
    }
  }
  return LGraphUtil.createPort(sourceLNode, sourcePoint, portType, t.lgraph);
}

/** Creates the missing target port of the edge. */
function createTargetPort(t: EdgeTransformation, targetLNode: LNode): LPort {
  const portType = PortType.INPUT;
  let targetPoint: KVector | null = null;

  if (t.edgeSection !== null && targetLNode.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
    targetPoint = new KVector(t.edgeSection.getEndX(), t.edgeSection.getEndY());

    // Adjust the coordinates
    // MIGRATE Not sure yet if this really does what we want it to do
    ElkUtil.toAbsolute(targetPoint, t.elkedge.getContainingNode());
    ElkUtil.toRelative(targetPoint, t.elkparent);
  }

  return LGraphUtil.createPort(targetLNode, targetPoint, portType, targetLNode.getGraph() as LGraph);
}

/** Transforms the edge's labels, setting the graph properties of their placement. */
function transformEdgeLabels(t: EdgeTransformation, ledge: LEdge, graphProperties: EnumSet<GraphProperties>): void {
  for (const elklabel of t.elkedge.getLabels()) {
    if (!elklabel.getProperty(LayeredOptions.NO_LAYOUT) && !Strings.isNullOrEmpty(elklabel.getText())) {
      const llabel = transformLabel(elklabel);
      ledge.getLabels().push(llabel);

      // Depending on the label placement, we want to set graph properties and make sure the
      // edge label placement is actually properly defined
      switch (llabel.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT)) {
        case EdgeLabelPlacement.HEAD:
        case EdgeLabelPlacement.TAIL:
          graphProperties.add(GraphProperties.END_LABELS);
          break;

        case EdgeLabelPlacement.CENTER:
          graphProperties.add(GraphProperties.CENTER_LABELS);
          llabel.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.CENTER);
      }
    }
  }
}

/** Copies the original bend points of the edge in case they are required. */
function copyOriginalBendPoints(t: EdgeTransformation, ledge: LEdge): void {
  const crossMinStrat = t.lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY);
  const nodePlaceStrat = t.lgraph.getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY);
  const bendPointsRequired =
    crossMinStrat === CrossingMinimizationStrategy.INTERACTIVE || nodePlaceStrat === NodePlacementStrategy.INTERACTIVE;

  if (t.edgeSection !== null && !t.edgeSection.getBendPoints().isEmpty() && bendPointsRequired) {
    const originalBendpoints = ElkUtil.createVectorChain(t.edgeSection);
    const importedBendpoints = new KVectorChain();

    // MIGRATE We may have to do some coordinate conversion here
    for (const point of originalBendpoints) {
      importedBendpoints.add(new KVector(point));
    }
    ledge.setProperty(InternalProperties.ORIGINAL_BENDPOINTS, importedBendpoints);
  }
}

/**
 * Transforms the given edge if it's not a hyperedge. If it is a hyperedge, throws an exception.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elkedge the edge to transform
 * @param elkparent the node in the original graph which currently gets transformed into `lgraph`
 * @param lgraph the layered graph
 * @return the transformed edge, or `null` if it cannot be transformed
 * @throws UnsupportedGraphException if the edge is a hyperedge.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function transformEdge(map: NodeAndPortMap, elkedge: ElkEdge, elkparent: ElkNode, lgraph: LGraph): LEdge {
  checkEdgeValidity(elkedge);

  // Get a few basic information about the edge
  const elkSourceShape = elkedge.getSources().get(0);
  const elkTargetShape = elkedge.getTargets().get(0);
  const elkSourceNode = ElkGraphUtil.connectableShapeToNode(elkSourceShape) as ElkNode;
  const elkTargetNode = ElkGraphUtil.connectableShapeToNode(elkTargetShape) as ElkNode;

  const edgeSection = elkedge.getSections().isEmpty() ? null : elkedge.getSections().get(0);
  const t: EdgeTransformation = { elkedge, elkparent, lgraph, elkSourceNode, elkTargetNode, edgeSection };

  // Find the transformed source and target nodes and ports
  const source = findEnd(map, elkSourceShape, elkSourceNode);
  const target = findEnd(map, elkTargetShape, elkTargetNode);

  // If either the source or the target of the edge wasn't properly transformed for whatever
  // reason, we back out
  if (source.lnode === null || target.lnode === null) {
    throw new UnsupportedGraphException(
      `The source or the target of edge ${String(elkedge)} could not be found. ` +
        'This usually happens when an edge connects a node laid out by ELK Layered to a node in ' +
        'another level of hierarchy laid out by either another instance of ELK Layered or another ' +
        'layout algorithm alltogether. The former can be solved by setting the hierarchyHandling ' +
        'option to INCLUDE_CHILDREN.',
    );
  }

  return completeEdge(t, source.lnode, target.lnode, source.lport, target.lport);
}

/** Sets the HYPEREDGES graph property if either port has more than one incoming or outgoing edge. */
function markHyperedge(sourceLPort: LPort, targetLPort: LPort, graphProperties: EnumSet<GraphProperties>): void {
  if (
    sourceLPort.getIncomingEdges().length > 1 ||
    sourceLPort.getOutgoingEdges().length > 1 ||
    targetLPort.getIncomingEdges().length > 1 ||
    targetLPort.getOutgoingEdges().length > 1
  ) {
    graphProperties.add(GraphProperties.HYPEREDGES);
  }
}

/** The part of `transformEdge` after the endpoints were found: creates the `LEdge`. */
function completeEdge(
  t: EdgeTransformation,
  sourceLNode: LNode,
  targetLNode: LNode,
  foundSourceLPort: LPort | null,
  foundTargetLPort: LPort | null,
): LEdge {
  // Create a layered edge
  const ledge = new LEdge();
  ledge.copyProperties(t.elkedge);
  ledge.setProperty(InternalProperties.ORIGIN, t.elkedge);

  // Clear junction points, since they are recomputed from scratch
  ledge.setProperty(LayeredOptions.JUNCTION_POINTS, null);

  // If we have a self-loop, set the appropriate graph property
  const graphProperties = t.lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES);
  if (sourceLNode === targetLNode) {
    graphProperties.add(GraphProperties.SELF_LOOPS);
  }

  // Create source and target ports if they do not exist yet
  const sourceLPort = foundSourceLPort ?? createSourcePort(t, sourceLNode);
  const targetLPort = foundTargetLPort ?? createTargetPort(t, targetLNode);

  // Finally set the source and target of the edge
  ledge.setSource(sourceLPort);
  ledge.setTarget(targetLPort);

  // If the ports have multiple incoming or outgoing edges, the HYPEREDGE property needs to be set
  markHyperedge(sourceLPort, targetLPort, graphProperties);

  // Transform the edge's labels
  transformEdgeLabels(t, ledge, graphProperties);

  // Copy the original bend points of the edge in case they are required
  copyOriginalBendPoints(t, ledge);

  return ledge;
}

/**
 * Checks if the given edge has exactly one source and one parent.
 *
 * @param edge the edge to check.
 * @throws UnsupportedGraphException if the edge does not meet the criteria.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function checkEdgeValidity(edge: ElkEdge): void {
  if (edge.getSources().isEmpty()) {
    throw new UnsupportedGraphException('Edges must have a source.');
  } else if (edge.getTargets().isEmpty()) {
    throw new UnsupportedGraphException('Edges must have a target.');
  } else if (edge.isHyperedge()) {
    throw new UnsupportedGraphException('Hyperedges are not supported.');
  }
}
