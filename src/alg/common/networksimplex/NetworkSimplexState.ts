// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import type { Pair } from '../../../core/util/Pair.js';
import type { NEdge } from './NEdge.js';
import type { NGraph } from './NGraph.js';
import type { NNode } from './NNode.js';

/**
 * The instance fields of Java's `NetworkSimplex`, shared by its section modules (P1): the facade owns one instance
 * and every section function takes it as its first parameter. Java's `null` fields (`cutvalue`, `edgeVisited`, ...
 * before `initialize()` and after `dispose()`) are empty arrays here; no code path observes the difference.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export class NetworkSimplexState {
  /** The number of nodes in each layer of a previous layering, considered by `normalize` and `balance`. */
  previousLayeringNodeCounts: number[] | null = null;
  /** Whether to apply `balance`. */
  balance = false;
  /** A limit on the number of iterations. */
  iterationLimit: number = JavaInteger.MAX_VALUE;

  /** The graph all methods operate on. */
  graph: NGraph;
  /** All edges in the graph. */
  edges: NEdge[] = [];
  /** The edges that are part of the spanning tree (insertion-ordered, AD-10 linked-hash-set site). */
  treeEdges: Set<NEdge> = new Set();
  /** All nodes of the graph that have no incoming edges. */
  sources: NNode[] = [];
  /** Whether a specified edge has been visited during DFS-traversal. */
  edgeVisited: boolean[] = [];
  /** The current postorder traversal number. */
  postOrder = 0;
  /** The postorder traversal ID of each node. */
  poID: number[] = [];
  /** The lowest postorder traversal ID of each node reachable through a node lower in the traversal tree. */
  lowestPoID: number[] = [];
  /** The cut value of every edge. */
  cutvalue: Float64Array = new Float64Array(0);
  /** Nodes that are part of subtrees of the graph, removed prior to the actual execution. */
  subtreeNodesStack: Array<Pair<NNode, NEdge>> = [];

  constructor(graph: NGraph) {
    this.graph = graph;
  }
}
