// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';
import type { NetworkSimplexState } from './NetworkSimplexState.js';

/**
 * Determines an initial layering by topological numbering, starting from the given root nodes.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function layeringTopologicalNumbering(state: NetworkSimplexState, initialRootNodes: NNode[]): void {
  // initialize the number of incident edges for each node
  const incident = new Int32Array(state.graph.nodes.length);
  for (const node of state.graph.nodes) {
    incident[node.internalId] = Int32.add(incident[node.internalId] as number, node.getIncomingEdges().size());
  }

  const roots = new LinkedList<NNode>(initialRootNodes);
  while (!roots.isEmpty()) {
    const node = roots.removeFirst();

    for (const edge of node.getOutgoingEdges()) {
      const target = edge.getTarget() as NNode;
      target.layer = Math.max(target.layer, Int32.add(node.layer, edge.delta));
      incident[target.internalId] = Int32.sub(incident[target.internalId] as number, 1);
      if (incident[target.internalId] === 0) {
        roots.add(target);
      }
    }
  }
}

/** One activation of Java's recursive `tightTreeDFS`/`postorderTraversal` (user decision 2026-10-26, see below). */
interface Frame {
  readonly node: NNode;
  /** `node.getConnectedEdges()`, fetched at frame entry (Java fetches it when its loop starts). */
  readonly edges: NEdge[];
  /** Index of the next edge to examine. */
  index: number;
  /** The Java local accumulator: `nodeCount` (tightTreeDFS) or `lowest` (postorderTraversal). */
  acc: number;
}

function enterFrame(node: NNode, acc: number): Frame {
  return { node, edges: node.getConnectedEdges(), index: 0, acc };
}

/** Whether `edge` is a non-tree edge that is tight and leads to a node outside the tree. */
function isTightNonTreeEdge(edge: NEdge, opposite: NNode): boolean {
  return (
    !opposite.treeNode && edge.delta === Int32.sub((edge.getTarget() as NNode).layer, (edge.getSource() as NNode).layer)
  );
}

/** The next child of a `tightTreeDFS` frame, with the Java per-edge side effects applied, or `null`. */
function nextTightChild(state: NetworkSimplexState, frame: Frame): NNode | null {
  while (frame.index < frame.edges.length) {
    const edge = frame.edges[frame.index++] as NEdge;
    if (!state.edgeVisited[edge.internalId]) {
      state.edgeVisited[edge.internalId] = true;
      const opposite = edge.getOther(frame.node) as NNode;
      if (edge.treeEdge) {
        // edge is a tree edge already: follow this path
        return opposite;
      } else if (isTightNonTreeEdge(edge, opposite)) {
        // edge is a tight non-tree edge
        edge.treeEdge = true;
        state.treeEdges.add(edge);
        return opposite;
      }
    }
  }
  return null;
}

/**
 * Performs a DFS over the tight tree edges, marking reached nodes as tree nodes; returns the number of nodes reached.
 *
 * Java's `tightTreeDFS` is recursive. User decision 2026-10-26: it is an explicit-stack loop here, because a
 * 4000-deep tight path overflows V8's default stack in the interpreter. Behaviour and side-effect order are Java's.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function tightTreeDFS(state: NetworkSimplexState, node: NNode): number {
  node.treeNode = true;
  const stack: Frame[] = [enterFrame(node, 1)];
  for (;;) {
    const frame = stack[stack.length - 1] as Frame;
    const child = nextTightChild(state, frame);
    if (child !== null) {
      child.treeNode = true;
      stack.push(enterFrame(child, 1));
    } else {
      stack.pop();
      const parent = stack[stack.length - 1];
      if (parent === undefined) {
        return frame.acc;
      }
      parent.acc += frame.acc;
    }
  }
}

/**
 * Finds a non-tree edge incident on the tree with minimal slack.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function minimalSlack(state: NetworkSimplexState): NEdge | null {
  let minSlack = JavaInteger.MAX_VALUE;
  let minSlackEdge: NEdge | null = null;
  let curSlack: number;
  for (const edge of state.edges) {
    if ((edge.getSource() as NNode).treeNode !== (edge.getTarget() as NNode).treeNode) {
      // edge is non-tree edge and incident on the tree
      curSlack = Int32.sub(Int32.sub((edge.getTarget() as NNode).layer, (edge.getSource() as NNode).layer), edge.delta);
      if (curSlack < minSlack) {
        minSlack = curSlack;
        minSlackEdge = edge;
      }
    }
  }
  return minSlackEdge;
}

/** The next unvisited tree-edge child of a `postorderTraversal` frame, marking the edge visited, or `null`. */
function nextPostorderChild(state: NetworkSimplexState, frame: Frame): NNode | null {
  while (frame.index < frame.edges.length) {
    const edge = frame.edges[frame.index++] as NEdge;
    if (edge.treeEdge && !state.edgeVisited[edge.internalId]) {
      state.edgeVisited[edge.internalId] = true;
      return edge.getOther(frame.node) as NNode;
    }
  }
  return null;
}

/**
 * Assigns postorder numbers to the tree nodes; returns the lowest postorder ID below `node`.
 *
 * Java's `postorderTraversal` is recursive. User decision 2026-10-26: it is an explicit-stack loop here, because a
 * 4000-deep tree path overflows V8's default stack in the interpreter. Behaviour and side-effect order are Java's.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function postorderTraversal(state: NetworkSimplexState, node: NNode): number {
  const stack: Frame[] = [enterFrame(node, JavaInteger.MAX_VALUE)];
  for (;;) {
    const frame = stack[stack.length - 1] as Frame;
    const child = nextPostorderChild(state, frame);
    if (child !== null) {
      stack.push(enterFrame(child, JavaInteger.MAX_VALUE));
    } else {
      stack.pop();
      state.poID[frame.node.internalId] = state.postOrder;
      const result = Math.min(frame.acc, state.postOrder++);
      state.lowestPoID[frame.node.internalId] = result;
      const parent = stack[stack.length - 1];
      if (parent === undefined) {
        return result;
      }
      parent.acc = Math.min(parent.acc, result);
    }
  }
}
