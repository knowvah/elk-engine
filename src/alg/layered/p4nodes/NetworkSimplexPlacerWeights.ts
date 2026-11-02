// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../graph/LEdge.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { EDGE_WEIGHT_BASE } from './NetworkSimplexPlacerConstants.js';

/**
 * The two Java overloads of `getEdgeWeight` (`:796` on an `LEdge`, `:803` on two `NodeType`s) are one name here,
 * dispatched on the first argument (translation rules 6.5): the `LEdge` form computes the priority-scaled weight and
 * calls the `NodeType` form, which is not a recursion.
 *
 * @return for the passed edge, the individual edge weight as specified by Gansner et al. The idea is to use a higher
 *         weight for long edge dummies such that long edges are drawn straight with higher priority. Additionally, we
 *         consider the `PRIORITY` layout option.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function getEdgeWeight(edge: LEdge): number;
export function getEdgeWeight(nodeType1: NodeType, nodeType2: NodeType): number;
export function getEdgeWeight(a: LEdge | NodeType, b?: NodeType): number {
  if (a instanceof NodeType) {
    return getEdgeWeightByNodeTypes(a, b!);
  }
  const priority = Math.max(1, a.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS));
  const edgeTypeWeight = getEdgeWeightByNodeTypes(
    a.getSource()!.getNode()!.getType(),
    a.getTarget()!.getNode()!.getType(),
  );
  return priority * edgeTypeWeight;
}

/** The `getEdgeWeight(NodeType, NodeType)` overload (`:803`). */
function getEdgeWeightByNodeTypes(nodeType1: NodeType, nodeType2: NodeType): number {
  if (nodeType1 === NodeType.NORMAL && nodeType2 === NodeType.NORMAL) {
    return 1 * EDGE_WEIGHT_BASE;
  } else if (nodeType1 === NodeType.NORMAL || nodeType2 === NodeType.NORMAL) {
    return 2 * EDGE_WEIGHT_BASE;
  } else {
    return 8 * EDGE_WEIGHT_BASE;
  }
}

/**
 * @return true if the edge is neither a self loop, nor an in-layer edge.
 */
export function isHandledEdge(edge: LEdge): boolean {
  return !edge.isSelfLoop() && !edge.isInLayerEdge();
}
