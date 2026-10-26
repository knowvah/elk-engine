// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';
import { cutvalues, isInHead } from './NetworkSimplexCutValues.js';
import type { NetworkSimplexState } from './NetworkSimplexState.js';
import { layeringTopologicalNumbering, minimalSlack, postorderTraversal, tightTreeDFS } from './NetworkSimplexTree.js';

/**
 * Determines an initial feasible spanning tree and its cut values.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function feasibleTree(state: NetworkSimplexState): void {
  // determine initial layering
  layeringTopologicalNumbering(state, state.sources);

  if (state.edges.length > 0) {
    state.edgeVisited.fill(false);
    while (tightTreeDFS(state, state.graph.nodes[0] as NNode) < state.graph.nodes.length) {
      // some nodes are still not part of the tree
      const e = minimalSlack(state) as NEdge;
      let slack = Int32.sub(Int32.sub((e.getTarget() as NNode).layer, (e.getSource() as NNode).layer), e.delta);
      if ((e.getTarget() as NNode).treeNode) {
        slack = -slack;
      }

      // update tree
      for (const node of state.graph.nodes) {
        if (node.treeNode) {
          node.layer = Int32.add(node.layer, slack);
        }
      }
      state.edgeVisited.fill(false);
    }
    // update tree-related attributes
    state.edgeVisited.fill(false);
    postorderTraversal(state, state.graph.nodes[0] as NNode);
    cutvalues(state);
  }
}

/**
 * Exchanges the tree edge `leave` with the non-tree edge `enter` and updates the layering and tree-based values.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function exchange(state: NetworkSimplexState, leave: NEdge, enter: NEdge): void {
  if (!leave.treeEdge) {
    throw new IllegalArgumentException('Given leave edge is no tree edge.');
  }
  if (enter.treeEdge) {
    throw new IllegalArgumentException('Given enter edge is a tree edge already.');
  }

  // update tree
  leave.treeEdge = false;
  state.treeEdges.delete(leave);
  enter.treeEdge = true;
  state.treeEdges.add(enter);
  let delta = Int32.sub(Int32.sub((enter.getTarget() as NNode).layer, (enter.getSource() as NNode).layer), enter.delta);
  if (!isInHead(state, enter.getTarget() as NNode, leave)) {
    delta = -delta;
  }
  for (const node of state.graph.nodes) {
    if (!isInHead(state, node, leave)) {
      node.layer = Int32.add(node.layer, delta);
    }
  }

  // TODO it should be possible to do this incrementally right?
  // update tree-based values
  state.postOrder = 1;
  state.edgeVisited.fill(false);
  postorderTraversal(state, state.graph.nodes[0] as NNode);
  cutvalues(state);
}
