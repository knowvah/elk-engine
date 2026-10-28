// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import type { Direction } from '../../../../core/options/Direction.js';
import { HierarchyHandling } from '../../../../core/options/HierarchyHandling.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LayeredSpacings } from '../../options/LayeredSpacings.js';
import type { LGraph } from '../LGraph.js';
import type { LNode } from '../LNode.js';
import { transformEdge, checkEdgeValidity } from './ElkGraphImporterEdges.js';
import {
  calculateMinimumGraphSize,
  ensureDefinedPortSide,
  shouldCalculateMinimumGraphSize,
} from './ElkGraphImporterEntryPoints.js';
import { createLGraph } from './ElkGraphImporterGraphs.js';
import { lookupNode, type NodeAndPortMap } from './ElkGraphImporterMap.js';
import { hasInsideSelfLoops, needsModelOrder, needsModelOrderBasedOnParent } from './ElkGraphImporterModelOrder.js';
import { transformNode } from './ElkGraphImporterNodes.js';

/** The running model order of the node phase of `importHierarchicalGraph` (its `index` and `cbGroupModelOrders`). */
interface NodeModelOrder {
  index: number;
  /** AD-10: Java's HashSet<Integer> (value-hashed) is only ever asked for its size. */
  readonly cbGroupModelOrders: Set<number>;
}

/** The facts the edge phase of `importHierarchicalGraph` shares; `index` is the running edge model order. */
interface EdgePhase {
  readonly map: NodeAndPortMap;
  readonly elkgraph: ElkNode;
  readonly lgraph: LGraph;
  index: number;
}

/** Whether the node is laid out by ELK Layered (it has no algorithm configured or the configured one is layered). */
function usesElkLayered(elknode: ElkNode): boolean {
  return (
    !elknode.hasProperty(CoreOptions.ALGORITHM) ||
    LayeredOptions.ALGORITHM_ID.endsWith(elknode.getProperty(CoreOptions.ALGORITHM))
  );
}

/** Whether the node has `INCLUDE_CHILDREN` hierarchy handling. */
function hasHierarchyHandling(elknode: ElkNode): boolean {
  return elknode.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN;
}

/**
 * Creates the nested LGraph of a node, if it needs one: that is the case if it has children or inside self-loops,
 * and if it does not have another layout algorithm configured.
 */
function createNestedGraph(elknode: ElkNode, parentGraphDirection: Direction): LGraph | null {
  // Check if there has to be an LGraph for this node (which is the case if it has children or inside
  // self-loops, and if it does not have another layout algorithm configured)
  const hasChildren = !elknode.getChildren().isEmpty();
  const hasInsideSelfLoopsOfNode = hasInsideSelfLoops(elknode);
  const hasHierarchyHandlingEnabled = hasHierarchyHandling(elknode);

  if (!(usesElkLayered(elknode) && hasHierarchyHandlingEnabled && (hasChildren || hasInsideSelfLoopsOfNode))) {
    return null;
  }
  const nestedGraph = createLGraph(elknode);
  nestedGraph.setProperty(LayeredOptions.DIRECTION, parentGraphDirection);

  // Apply a spacing configuration, for details see comment in `importGraph`
  if (nestedGraph.hasProperty(LayeredOptions.SPACING_BASE_VALUE)) {
    LayeredSpacings.withBaseValue(nestedGraph.getProperty(LayeredOptions.SPACING_BASE_VALUE)).apply(nestedGraph);
  }

  // We need to make sure that we make the graph large enough for any ports, node labels, etc.
  // if the size constraints are not empty
  if (shouldCalculateMinimumGraphSize(elknode)) {
    for (const elkport of elknode.getPorts()) {
      ensureDefinedPortSide(nestedGraph, elkport);
    }
    calculateMinimumGraphSize(elknode, nestedGraph);
  }
  return nestedGraph;
}

/** The model order part of the node queue loop: assigns the next index and records the cycle breaking group. */
function assignNodeModelOrder(elknode: ElkNode, order: NodeModelOrder): void {
  if (needsModelOrder(elknode)) {
    // Assign a model order to the nodes as they are read
    elknode.setProperty(InternalProperties.MODEL_ORDER, order.index++);
    if (elknode.hasProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID)) {
      order.cbGroupModelOrders.add(
        elknode.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID),
      );
    }
  }
}

/** One iteration of the node queue loop of `importHierarchicalGraph`. */
function importHierarchicalNode(
  map: NodeAndPortMap,
  elknode: ElkNode,
  lgraph: LGraph,
  queue: ElkNode[],
  order: NodeModelOrder,
): void {
  const parentGraphDirection = lgraph.getProperty(LayeredOptions.DIRECTION);

  assignNodeModelOrder(elknode, order);

  // Check if the current node is to be laid out in the first place
  const isNodeToBeLaidOut = !elknode.getProperty(LayeredOptions.NO_LAYOUT);
  if (isNodeToBeLaidOut) {
    const nestedGraph = createNestedGraph(elknode, parentGraphDirection);

    // Transform da node!!!
    let parentLGraph = lgraph;
    const parentLNode = lookupNode(map, elknode.getParent());
    if (parentLNode !== null) {
      parentLGraph = parentLNode.getNestedGraph() as LGraph;
    }
    const lnode = transformNode(map, elknode, parentLGraph);

    // Setup hierarchical relationships
    if (nestedGraph !== null) {
      lnode.setNestedGraph(nestedGraph);
      nestedGraph.setParentNode(lnode);

      queue.push(...elknode.getChildren());
    }
  }
}

/** The graph an edge is placed in: the end point's insides for inside self loops and hierarchical edges. */
function findEdgeParent(elkedge: ElkEdge, elkGraphNode: ElkNode, sourceNode: ElkNode, targetNode: ElkNode): ElkNode {
  // Check if this edge is an inside self-loop
  const isInsideSelfLoop =
    elkedge.isSelfloop() &&
    sourceNode.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE) &&
    elkedge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);

  // Find the graph the edge will be placed in. Basically, if the edge is an inside
  // self loop or connects one of its end points to a descendant, the edge will be
  // placed in the graph that represents that end point's insides. Otherwise, it will
  // be placed in the current graph.
  let parentElkGraph = elkGraphNode;

  if (isInsideSelfLoop || ElkGraphUtil.isDescendant(targetNode, sourceNode)) {
    parentElkGraph = sourceNode;
  } else if (ElkGraphUtil.isDescendant(sourceNode, targetNode)) {
    parentElkGraph = targetNode;
  }
  return parentElkGraph;
}

/** One iteration of the contained-edges loop of `importHierarchicalGraph`; returns when the edge is excluded. */
function importHierarchicalEdge(phase: EdgePhase, elkGraphNode: ElkNode, elkedge: ElkEdge): void {
  // We don't support hyperedges
  checkEdgeValidity(elkedge);

  if (needsModelOrderBasedOnParent(phase.elkgraph)) {
    // Assign a model order to the edges as they are read
    elkedge.setProperty(InternalProperties.MODEL_ORDER, phase.index++);
  }

  const sourceNode = ElkGraphUtil.connectableShapeToNode(elkedge.getSources().get(0)) as ElkNode;
  const targetNode = ElkGraphUtil.connectableShapeToNode(elkedge.getTargets().get(0)) as ElkNode;

  // Don't bother if either the edge or at least one of its end points are excluded from layout
  if (
    elkedge.getProperty(LayeredOptions.NO_LAYOUT) ||
    sourceNode.getProperty(LayeredOptions.NO_LAYOUT) ||
    targetNode.getProperty(LayeredOptions.NO_LAYOUT)
  ) {
    return;
  }

  const parentElkGraph = findEdgeParent(elkedge, elkGraphNode, sourceNode, targetNode);

  let parentLGraph = phase.lgraph;
  const parentLNode = lookupNode(phase.map, parentElkGraph);
  if (parentLNode !== null) {
    parentLGraph = parentLNode.getNestedGraph() as LGraph;
  }

  // Transform the edge, finally...
  const ledge = transformEdge(phase.map, elkedge, parentElkGraph, parentLGraph);

  // Find the graph the edge's coordinates will have to be made relative to during export. This will only
  // do something if the edge containment inside ELK Layered differs from the edge containment in the
  // ELK graph
  ledge.setProperty(
    InternalProperties.COORDINATE_SYSTEM_ORIGIN,
    findCoordinateSystemOrigin(phase.map, elkedge, phase.elkgraph, phase.lgraph),
  );
}

/** The queue phase of `importHierarchicalGraph` that transforms the edges of all hierarchy levels. */
function importHierarchicalEdges(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph, queue: ElkNode[]): void {
  // Model order index for edges.
  const phase: EdgePhase = { map, elkgraph, lgraph, index: 0 };
  // Transform the edges
  queue.push(elkgraph);
  while (queue.length > 0) {
    const elkGraphNode = queue.shift() as ElkNode;

    for (const elkedge of elkGraphNode.getContainedEdges()) {
      importHierarchicalEdge(phase, elkGraphNode, elkedge);
    }

    // We may need to look at edges contained in the current graph node's children as well.
    // this is true unless either the current graph node does not have hierarchy handling
    // enabled, or a child has another layout algorithm configured
    if (hasHierarchyHandling(elkGraphNode)) {
      for (const elkChildGraphNode of elkGraphNode.getChildren()) {
        const partOfSameLayoutRun = hasHierarchyHandling(elkChildGraphNode);

        if (usesElkLayered(elkChildGraphNode) && partOfSameLayoutRun) {
          queue.push(elkChildGraphNode);
        }
      }
    }
  }
}

/**
 * Imports the graph hierarchy rooted at the given graph.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elkgraph graph to import.
 * @param lgraph graph to add the direct children of the current hierarchy level to.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function importHierarchicalGraph(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph): void {
  // Java's LinkedList queue: an array used first-in first-out
  const elkGraphQueue: ElkNode[] = [];

  // Model order index for nodes
  const order: NodeModelOrder = { index: 0, cbGroupModelOrders: new Set<number>() };
  // Transform the node's children
  elkGraphQueue.push(...elkgraph.getChildren());
  while (elkGraphQueue.length > 0) {
    const elknode = elkGraphQueue.shift() as ElkNode;
    importHierarchicalNode(map, elknode, lgraph, elkGraphQueue, order);
  }
  // Save the maximum node model order.
  // This is relevant to create graph partitions based on model order and constraints.
  lgraph.setProperty(InternalProperties.MAX_MODEL_ORDER_NODES, order.index);
  // Save the number of model order groups.
  lgraph.setProperty(InternalProperties.CB_NUM_MODEL_ORDER_GROUPS, order.cbGroupModelOrders.size);

  importHierarchicalEdges(map, elkgraph, lgraph, elkGraphQueue);
}

/**
 * Finds the LGraph the edge's coordinates should be relative to when the layout results are applied back. This
 * is only relevant if this differs from the graph the coordinates are relative to inside ELK Layered. In fact,
 * this method only returns something for edges that connect nodes that are not in an anscestor-descendant
 * relationship.
 */
function findCoordinateSystemOrigin(
  map: NodeAndPortMap,
  elkedge: ElkEdge,
  topLevelElkGraph: ElkNode,
  topLevelLGraph: LGraph,
): LGraph | null {
  const source = ElkGraphUtil.connectableShapeToNode(elkedge.getSources().get(0)) as ElkNode;
  const target = ElkGraphUtil.connectableShapeToNode(elkedge.getTargets().get(0)) as ElkNode;

  // We're going to rule out one case after the other. If the source and the target are siblings, we're good
  // (this also includes self-loops)
  if (source.getParent() === target.getParent()) {
    return null;
  }

  // If the target is a descendant of the source, ELK Layered uses the source's top left corner as the origin
  // of the coordinate system, which matches how ELK graph should be constructed
  if (ElkGraphUtil.isDescendant(target, source)) {
    return null;
  }

  // If the source is a descendant of the target, ELK Layered uses the source's parent graph as the origin of
  // the coordinate system, while ELK will expect the first common ancestor (the target) to be the origin.
  //
  // If source and target have no relationship to each other, ELK Layered again uses the source's parent graph
  // as the origin of the coordinate system, while ELK will expect the first common ancestor to be the origin
  const origin = elkedge.getContainingNode();

  // The origin must always be an ancestor of both, source and parent
  // (Java: two asserts; no devAssert helper exists, the JVM runs without -ea)

  // Find the associated LGraph
  if (origin === topLevelElkGraph) {
    return topLevelLGraph;
  }
  const lnode: LNode | null = lookupNode(map, origin);
  if (lnode !== null) {
    // Find the graph that represents the node's insides
    const lgraph = lnode.getNestedGraph();
    if (lgraph !== null) {
      return lgraph;
    }
  }

  return null;
}
