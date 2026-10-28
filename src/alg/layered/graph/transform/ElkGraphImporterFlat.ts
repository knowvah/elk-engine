// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { LGraph } from '../LGraph.js';
import { transformEdge } from './ElkGraphImporterEdges.js';
import type { NodeAndPortMap } from './ElkGraphImporterMap.js';
import { needsModelOrder, needsModelOrderBasedOnParent } from './ElkGraphImporterModelOrder.js';
import { transformNode } from './ElkGraphImporterNodes.js';

/**
 * Imports the direct children of the given graph and returns the number of nodes that got a model order.
 * First loop of Java's `importFlatGraph`.
 */
function importFlatNodes(
  map: NodeAndPortMap,
  elkgraph: ElkNode,
  lgraph: LGraph,
  cbGroupModelOrders: Set<number>,
): number {
  // Transform the node's children, unless we're told not to
  let index = 0;
  for (const child of elkgraph.getChildren()) {
    if (!child.getProperty(LayeredOptions.NO_LAYOUT)) {
      if (needsModelOrder(child)) {
        child.setProperty(InternalProperties.MODEL_ORDER, index);
        index++;
        if (child.hasProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID)) {
          cbGroupModelOrders.add(
            child.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID),
          );
        }
      }
      transformNode(map, child, lgraph);
    }
  }
  return index;
}

/**
 * Whether a contained edge stays in the current level of hierarchy and is to be laid out (and is not an inside
 * self loop, which is collected separately).
 */
function isTransformableContainedEdge(elkedge: ElkEdge, elkgraph: ElkNode): boolean {
  const source = ElkGraphUtil.getSourceNode(elkedge) as ElkNode;
  const target = ElkGraphUtil.getTargetNode(elkedge) as ElkNode;

  // Is inside self loop processing enabled for this node?
  const enableInsideSelfLoops = source.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE);

  // Find out basic information about the edge
  const isToBeLaidOut = !elkedge.getProperty(LayeredOptions.NO_LAYOUT);
  const isInsideSelfLoop =
    enableInsideSelfLoops && elkedge.isSelfloop() && elkedge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
  const connectsSiblings = source.getParent() === elkgraph && source.getParent() === target.getParent();
  const connectsToGraph =
    (source.getParent() === elkgraph && target === elkgraph) !==
    (target.getParent() === elkgraph && source === elkgraph);

  // Only transform the edge if we are to layout the edge and if it stays in the current
  // level of hierarchy (which implies that here we don't transform inside self loops)
  return isToBeLaidOut && !isInsideSelfLoop && (connectsToGraph || connectsSiblings);
}

/** The edge loop of Java's `importFlatGraph`: iterates the contained edges to preserve the 'input order'. */
function importFlatEdges(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph): void {
  let index = 0;
  for (const elkedge of elkgraph.getContainedEdges()) {
    if (needsModelOrderBasedOnParent(elkgraph)) {
      elkedge.setProperty(InternalProperties.MODEL_ORDER, index);
      index++;
    }
    if (isTransformableContainedEdge(elkedge, elkgraph)) {
      transformEdge(map, elkedge, elkgraph, lgraph);
    }
  }
}

/** The last loop of Java's `importFlatGraph`: collects the inside self loops of `elkgraph`. */
function importInsideSelfLoops(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph): void {
  const parent = elkgraph.getParent();
  if (parent !== null) {
    for (const elkedge of parent.getContainedEdges()) {
      const source = ElkGraphUtil.getSourceNode(elkedge) as ElkNode;
      if (source === elkgraph && elkedge.isSelfloop()) {
        const isInsideSelfLoop =
          source.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE) &&
          elkedge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
        if (isInsideSelfLoop) {
          transformEdge(map, elkedge, elkgraph, lgraph);
        }
      }
    }
  }
}

/**
 * Imports the direct children of the given graph.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elkgraph graph to import.
 * @param lgraph graph to add the imported elements to.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function importFlatGraph(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph): void {
  // AD-10: Java's HashSet<Integer> (value-hashed) is only ever asked for its size.
  const cbGroupModelOrders = new Set<number>();
  const index = importFlatNodes(map, elkgraph, lgraph, cbGroupModelOrders);
  // Save the maximum node model order.
  // This is relevant to create graph partitions based on model order and constraints.
  lgraph.setProperty(InternalProperties.MAX_MODEL_ORDER_NODES, index);
  // Save the number of model order groups.
  lgraph.setProperty(InternalProperties.CB_NUM_MODEL_ORDER_GROUPS, cbGroupModelOrders.size);

  // iterate the list of contained edges to preserve the 'input order' of the edges
  // (this is not part of the previous loop since all children must have already been transformed)
  importFlatEdges(map, elkgraph, lgraph);

  // now collect inside self loops of 'elkgraph'
  importInsideSelfLoops(map, elkgraph, lgraph);
}
