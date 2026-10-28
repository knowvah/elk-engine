// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { isElkNode } from '../../../../graph/ElkNode.js';
import { isElkPort } from '../../../../graph/ElkPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { LEdge } from '../LEdge.js';
import { LGraphUtil } from '../LGraphUtil.js';
import type { LNode } from '../LNode.js';

/**
 * The "Utility Methods" section of `ElkGraphLayoutTransferrer` plus the constant both the mutating and the
 * non-mutating application share.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphLayoutTransferrer.java
 */

/** A zero vector to avoid having to instantiate new empty vectors for each edge. */
export const ZERO_OFFSET: KVector = new KVector();

/** Checks if the given node represents a node in the original ELK graph as well. */
export function representsNode(lnode: LNode): boolean {
  return isElkNode(lnode.getProperty(InternalProperties.ORIGIN));
}

/** Checks if the given node represents an external port in the original ELK graph. */
export function representsExternalPort(lnode: LNode): boolean {
  return isElkPort(lnode.getProperty(InternalProperties.ORIGIN));
}

/** Pushes the edges leaving `lnode` that do not go into one of its descendants. */
export function collectLeavingEdges(lnode: LNode, edgeList: LEdge[]): void {
  for (const port of lnode.getPorts()) {
    port
      .getOutgoingEdges()
      .filter((edge) => !LGraphUtil.isDescendant(edge.getTarget()!.getNode()!, lnode))
      .forEach((edge) => edgeList.push(edge));
  }
}

/** Pushes the edges that go from the current graph's representing LNode down into its descendants. */
export function collectDescendingEdges(parentLNode: LNode, edgeList: LEdge[]): void {
  for (const port of parentLNode.getPorts()) {
    port
      .getOutgoingEdges()
      .filter((edge) => LGraphUtil.isDescendant(edge.getTarget()!.getNode()!, parentLNode))
      .forEach((edge) => edgeList.push(edge));
  }
}
