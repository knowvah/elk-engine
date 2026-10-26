// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { Pair } from '../../../core/util/Pair.js';
import type { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';
import type { NetworkSimplexState } from './NetworkSimplexState.js';

/**
 * Recursively removes subtrees. In other words, removes leafs from the graph until no more leafs are present.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function removeSubtrees(state: NetworkSimplexState): void {
  state.subtreeNodesStack = [];

  // find initial leafs
  const leafs = new LinkedList<NNode>();
  for (const node of state.graph.nodes) {
    if (node.getConnectedEdges().length === 1) {
      leafs.add(node);
    }
  }

  // remove them from the graph like there's no tomorrow
  while (!leafs.isEmpty()) {
    const node = leafs.removeFirst();
    // was the edge already removed?
    if (node.getConnectedEdges().length === 0) {
      continue;
    }
    const edge = node.getConnectedEdges()[0] as NEdge;
    const isOutEdge = node.getOutgoingEdges().size() > 0;

    const other = edge.getOther(node) as NNode;
    if (isOutEdge) {
      other.getIncomingEdges().remove(edge);
    } else {
      other.getOutgoingEdges().remove(edge);
    }

    if (other.getConnectedEdges().length === 1) {
      leafs.add(other);
    }

    const leafy = Pair.of(node, edge);
    // Deque.push adds at the head; popping from the tail of the array is the same LIFO order.
    state.subtreeNodesStack.push(leafy);
    // remove the node from the graph's nodes
    state.graph.nodes.splice(state.graph.nodes.indexOf(node), 1);
  }
}

/**
 * Re-attaches the subtrees removed by {@link removeSubtrees}, assigning them the layer of the node they hang from.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function reattachSubtrees(state: NetworkSimplexState): void {
  while (state.subtreeNodesStack.length > 0) {
    const leafy = state.subtreeNodesStack.pop() as Pair<NNode, NEdge>;
    const node = leafy.getFirst() as NNode;
    const edge = leafy.getSecond() as NEdge;

    const placed = edge.getOther(node) as NNode;

    if (edge.target === node) {
      placed.getOutgoingEdges().add(edge);
      node.layer = Int32.add(placed.layer, edge.delta);
    } else {
      placed.getIncomingEdges().add(edge);
      node.layer = Int32.sub(placed.layer, edge.delta);
    }

    state.graph.nodes.push(node);
  }
}
