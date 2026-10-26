// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';
import type { NetworkSimplexState } from './NetworkSimplexState.js';

/** Small value smaller than zero. Used to check whether cut values are smaller than zero (double imprecision). */
const FUZZY_ST_ZERO = -1e-10;

/**
 * Whether `node` is in the head component of the tree when `edge` is removed.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function isInHead(state: NetworkSimplexState, node: NNode, edge: NEdge): boolean {
  const source = edge.getSource() as NNode;
  const target = edge.getTarget() as NNode;
  const { poID, lowestPoID } = state;
  const poNode = poID[node.internalId] as number;
  const poSource = poID[source.internalId] as number;
  const poTarget = poID[target.internalId] as number;

  if (
    (lowestPoID[source.internalId] as number) <= poNode &&
    poNode <= poSource &&
    (lowestPoID[target.internalId] as number) <= poNode &&
    poNode <= poTarget
  ) {
    // node is in a descending path in the DFS-Tree
    if (poSource < poTarget) {
      // root is in the head component
      return false;
    }
    return true;
  }
  if (poSource < poTarget) {
    // root is in the head component
    return true;
  }
  return false;
}

/** Java's `Collection.remove(Object)` on an `ArrayList`: removes the first occurrence, if any. */
function removeFirstOccurrence(list: NEdge[], edge: NEdge): void {
  const index = list.indexOf(edge);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * The part of `cutvalues` that determines which tree edges are incident on each node; returns the nodes with exactly
 * one incident tree edge.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
function collectLeafs(state: NetworkSimplexState): NNode[] {
  // determine incident tree edges for each node
  const leafs: NNode[] = [];
  let treeEdgeCount: number;
  for (const node of state.graph.nodes) {
    treeEdgeCount = 0;
    node.unknownCutvalues.length = 0;
    for (const edge of node.getConnectedEdges()) {
      if (edge.treeEdge) {
        node.unknownCutvalues.push(edge);
        treeEdgeCount++;
      }
    }
    if (treeEdgeCount === 1) {
      leafs.push(node);
    }
  }
  return leafs;
}

/**
 * The inner loop of `cutvalues`: the contribution of the other edge `edge` incident on `node` to the cut value of
 * `toDetermine`.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
function cutvalueContribution(state: NetworkSimplexState, node: NNode, toDetermine: NEdge, edge: NEdge): void {
  const source = toDetermine.getSource() as NNode;
  const target = toDetermine.getTarget() as NNode;
  const { cutvalue } = state;
  if (edge.treeEdge) {
    // edge is tree edge
    if (source === edge.getSource() || target === edge.getTarget()) {
      // edge has not the same direction as toDetermine
      cutvalue[toDetermine.internalId] =
        (cutvalue[toDetermine.internalId] as number) - ((cutvalue[edge.internalId] as number) - edge.weight);
    } else {
      cutvalue[toDetermine.internalId] =
        (cutvalue[toDetermine.internalId] as number) + ((cutvalue[edge.internalId] as number) - edge.weight);
    }
  } else if (node === source) {
    // edge is non-tree edge
    if (edge.getSource() === node) {
      cutvalue[toDetermine.internalId] = (cutvalue[toDetermine.internalId] as number) + edge.weight;
    } else {
      cutvalue[toDetermine.internalId] = (cutvalue[toDetermine.internalId] as number) - edge.weight;
    }
  } else if (edge.getSource() === node) {
    cutvalue[toDetermine.internalId] = (cutvalue[toDetermine.internalId] as number) - edge.weight;
  } else {
    cutvalue[toDetermine.internalId] = (cutvalue[toDetermine.internalId] as number) + edge.weight;
  }
}

/**
 * Determines the cut values of all tree edges, starting at the leafs of the tree.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function cutvalues(state: NetworkSimplexState): void {
  const leafs = collectLeafs(state);

  // determine cut values
  let toDetermine: NEdge;
  for (let node of leafs) {
    while (node.unknownCutvalues.length === 1) {
      // one tree edge with undetermined cut value is incident
      toDetermine = node.unknownCutvalues[0] as NEdge;
      state.cutvalue[toDetermine.internalId] = toDetermine.weight;
      const source = toDetermine.getSource() as NNode;
      const target = toDetermine.getTarget() as NNode;
      for (const edge of node.getConnectedEdges()) {
        if (edge !== toDetermine) {
          cutvalueContribution(state, node, toDetermine, edge);
        }
      }

      // remove edge from 'unknownCutvalues'
      removeFirstOccurrence(source.unknownCutvalues, toDetermine);
      removeFirstOccurrence(target.unknownCutvalues, toDetermine);

      // proceed with next node
      if (source === node) {
        node = toDetermine.getTarget() as NNode;
      } else {
        node = toDetermine.getSource() as NNode;
      }
    }
  }
}

/**
 * Finds a tree edge with a negative cut value, or `null` if the layering is optimal.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function leaveEdge(state: NetworkSimplexState): NEdge | null {
  for (const edge of state.treeEdges) {
    if (edge.treeEdge && (state.cutvalue[edge.internalId] as number) < FUZZY_ST_ZERO) {
      return edge;
    }
  }
  return null;
}

/**
 * Finds the non-tree edge with minimal slack that reconnects the two components after `leave` is removed.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function enterEdge(state: NetworkSimplexState, leave: NEdge): NEdge | null {
  if (!leave.treeEdge) {
    throw new IllegalArgumentException('The input edge is not a tree edge.');
  }

  let replace: NEdge | null = null;
  let repSlack = JavaInteger.MAX_VALUE;
  let slack: number;
  let source: NNode;
  let target: NNode;
  for (const edge of state.edges) {
    source = edge.getSource() as NNode;
    target = edge.getTarget() as NNode;
    if (isInHead(state, source, leave) && !isInHead(state, target, leave)) {
      // edge is to consider
      slack = Int32.sub(Int32.sub(target.layer, source.layer), edge.delta);
      if (slack < repSlack) {
        repSlack = slack;
        replace = edge;
      }
    }
  }
  return replace;
}
