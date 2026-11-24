// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';

/**
 * Class for splitting an {@link ElkNode} into a list of its components using a simple depth-first search.
 *
 * Deviations: the parallel streams of `computeIncidences` and `getInnerNeighborsOfPort` run sequentially in encounter
 * order (the predicates and mappers are pure; AD-10, FD4); `Collectors.partitioningBy` is `partition`,
 * `Collectors.toSet` a `Set`; `computeIncidences`' node loop body is `addIncomingIncidences` and `addOutgoingIncidences`; the static fields are class statics reset in `split` (not module-level `let`, which a
 * fitness test forbids). The `NullPointerException` of `sameHierarchyLevel` for a node without a parent is a
 * `TypeError` raised at the same site.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
 */
export class ElkGraphComponentsProcessor {
  // /////////////////////////////////////////////////////////////////////////////
  // Variables

  /** List of already visited nodes during dfs. */
  private static visited: ElkNode[] = [];
  /** Holds a set of incident nodes to each node of the graph regardless of edge directions. */
  private static incidenceMap: Map<ElkNode, Set<ElkNode>> = new Map<ElkNode, Set<ElkNode>>();
  /** Holds components after splitting. */
  private static components: ElkNode[][] = [];

  // /////////////////////////////////////////////////////////////////////////////
  // Constructor (unused)

  /** This utility class isn't supposed to be instantiated. */
  private constructor() {
    // never instantiated
  }

  // /////////////////////////////////////////////////////////////////////////////
  // public method

  /**
   * Splits the graph into a list of {@link ElkNode ElkNodes}, each representing a connected component.
   *
   * @param graph Graph to split into connected components
   * @returns Connected components as a list
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
   */
  static split(graph: ElkNode): ElkNode[][] {
    ElkGraphComponentsProcessor.visited = [];
    ElkGraphComponentsProcessor.incidenceMap = new Map<ElkNode, Set<ElkNode>>();
    ElkGraphComponentsProcessor.components = [];
    const children = graph.getChildren();
    ElkGraphComponentsProcessor.computeIncidences(children);
    for (const node of children) {
      if (!ElkGraphComponentsProcessor.visited.includes(node)) {
        const component: ElkNode[] = [];
        ElkGraphComponentsProcessor.components.push(component);
        ElkGraphComponentsProcessor.dfs(node, component);
      }
    }

    return ElkGraphComponentsProcessor.components;
  }

  // /////////////////////////////////////////////////////////////////////////////
  // private helper methods

  /**
   * Computes the incidences between each node of the graph.
   *
   * @param nodes graph to split as a collection of {@link ElkNode ElkNodes} without the surrounding parent node
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
   */
  private static computeIncidences(nodes: Iterable<ElkNode>): void {
    const adjacentAndInsideParent = new Map<ElkPort, Set<ElkNode>>();
    for (const node of nodes) {
      const adjacentNodes = new Set<ElkNode>();
      ElkGraphComponentsProcessor.incidenceMap.set(node, adjacentNodes);

      ElkGraphComponentsProcessor.addIncomingIncidences(node, adjacentNodes, adjacentAndInsideParent);
      ElkGraphComponentsProcessor.addOutgoingIncidences(node, adjacentNodes, adjacentAndInsideParent);
    }
  }

  /**
   * The first half of the node loop body of `computeIncidences` (the incoming edges), split for the function-size limit.
   *
   * @param node the node
   * @param adjacentNodes the incidence set of the node
   * @param adjacentAndInsideParent the inner neighbors found so far per port
   */
  private static addIncomingIncidences(
    node: ElkNode,
    adjacentNodes: Set<ElkNode>,
    adjacentAndInsideParent: Map<ElkPort, Set<ElkNode>>,
  ): void {
    const edges = ElkGraphComponentsProcessor.partition(
      ElkGraphUtil.allIncomingEdges(node),
      ElkGraphComponentsProcessor.sameHierarchyLevel,
    );
    ElkGraphComponentsProcessor.addNodesToIncidenceSet(adjacentNodes, edges.matching, (edge) =>
      ElkGraphUtil.getSourceNode(edge),
    );

    // Filter because edges might also go one level down instead of up
    const connectedToParentPort = edges.rest.filter(
      (edge) => ElkGraphUtil.getSourceNode(edge) === ElkGraphUtil.getTargetNode(edge)!.getParent(),
    );

    for (const incomingEdge of connectedToParentPort) {
      ElkGraphComponentsProcessor.addInnerNeighbors(
        ElkGraphUtil.getSourcePort(incomingEdge),
        adjacentAndInsideParent,
        adjacentNodes,
      );
    }
  }

  /**
   * The second half of the node loop body of `computeIncidences` (the outgoing edges), split for the function-size limit.
   *
   * @param node the node
   * @param adjacentNodes the incidence set of the node
   * @param adjacentAndInsideParent the inner neighbors found so far per port
   */
  private static addOutgoingIncidences(
    node: ElkNode,
    adjacentNodes: Set<ElkNode>,
    adjacentAndInsideParent: Map<ElkPort, Set<ElkNode>>,
  ): void {
    const edges = ElkGraphComponentsProcessor.partition(
      ElkGraphUtil.allOutgoingEdges(node),
      ElkGraphComponentsProcessor.sameHierarchyLevel,
    );
    ElkGraphComponentsProcessor.addNodesToIncidenceSet(adjacentNodes, edges.matching, (edge) =>
      ElkGraphUtil.getTargetNode(edge),
    );

    // Filter because edges might also go one level down instead of up
    const connectedToParentPort = edges.rest.filter(
      (edge) => ElkGraphUtil.getTargetNode(edge) === ElkGraphUtil.getSourceNode(edge)!.getParent(),
    );

    for (const outgoingEdge of connectedToParentPort) {
      ElkGraphComponentsProcessor.addInnerNeighbors(
        ElkGraphUtil.getTargetPort(outgoingEdge),
        adjacentAndInsideParent,
        adjacentNodes,
      );
    }
  }

  /**
   * The body of the two `for (ElkEdge ... : connectedToParentPort)` loops of `computeIncidences`, which are identical
   * but for the edge end the port is read from (the Java repeats the block; split out for the function-size limit).
   *
   * @param port the port of the edge end, or `null`
   * @param adjacentAndInsideParent the inner neighbors found so far per port
   * @param adjacentNodes the incidence set to add the neighbors to
   */
  private static addInnerNeighbors(
    port: ElkPort | null,
    adjacentAndInsideParent: Map<ElkPort, Set<ElkNode>>,
    adjacentNodes: Set<ElkNode>,
  ): void {
    if (port !== null) {
      let nodesAtPort = adjacentAndInsideParent.get(port);

      if (nodesAtPort === undefined) {
        nodesAtPort = ElkGraphComponentsProcessor.getInnerNeighborsOfPort(port);
        adjacentAndInsideParent.set(port, nodesAtPort);
      }

      for (const neighbor of nodesAtPort) {
        adjacentNodes.add(neighbor);
      }
    }
  }

  /**
   * The predicate `sameHierarchyLevel` of `computeIncidences`: both ends of the edge have the same parent. Java
   * dereferences `getSourceNode(edge).getParent()` (`.equals`), so a source node without a parent is a
   * `NullPointerException` (`ElkGraphComponentsProcessor.java:108`); the target is read first, as Java evaluates the
   * argument before the call.
   *
   * @param edge the edge to test
   * @returns true if both ends have the same parent
   * @throws TypeError (Java: NullPointerException) when the source node has no parent
   */
  private static sameHierarchyLevel(edge: ElkEdge): boolean {
    const sourceParent = ElkGraphUtil.getSourceNode(edge)!.getParent();
    const targetParent = ElkGraphUtil.getTargetNode(edge)!.getParent();
    if (sourceParent === null) {
      throw new TypeError(
        'Cannot invoke "Object.equals(Object)" because the return value of "org.eclipse.elk.graph.ElkNode.getParent()" is null',
      );
    }
    return sourceParent === targetParent;
  }

  /**
   * `Collectors.partitioningBy`: the edges for which the predicate holds and the others, each in encounter order.
   *
   * @param edges the edges to partition
   * @param predicate the partitioning predicate
   * @returns the two partitions
   */
  private static partition(
    edges: Iterable<ElkEdge>,
    predicate: (edge: ElkEdge) => boolean,
  ): { readonly matching: ElkEdge[]; readonly rest: ElkEdge[] } {
    const matching: ElkEdge[] = [];
    const rest: ElkEdge[] = [];
    for (const edge of edges) {
      (predicate(edge) ? matching : rest).push(edge);
    }
    return { matching, rest };
  }

  /**
   * Gets all edges connected to a port that are coming from or leading to the inside of its parent node.
   *
   * @param port port to be inspected
   * @returns inner edges
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
   */
  private static getInnerNeighborsOfPort(port: ElkPort): Set<ElkNode> {
    const portParent = port.getParent();
    const inwardsPredicate = (edge: ElkEdge): boolean =>
      portParent === ElkGraphUtil.getSourceNode(edge)!.getParent() ||
      portParent === ElkGraphUtil.getTargetNode(edge)!.getParent();
    const nodeMapper = (edge: ElkEdge): ElkNode =>
      portParent === ElkGraphUtil.getSourceNode(edge)
        ? ElkGraphUtil.getTargetNode(edge)!
        : ElkGraphUtil.getSourceNode(edge)!;
    const allEdges: ElkEdge[] = [];
    allEdges.push(...port.getIncomingEdges());
    allEdges.push(...port.getOutgoingEdges());
    return new Set<ElkNode>(allEdges.filter(inwardsPredicate).map(nodeMapper));
  }

  /**
   * Extracts nodes from edges based on a given function `chooseNode` and adds them to a given set of
   * {@link ElkNode ElkNodes}.
   *
   * @param incidentNodes Set to add incident nodes to
   * @param edges edges to test
   * @param chooseNode function determining which of the two nodes of an edge to add to the set
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
   */
  private static addNodesToIncidenceSet(
    incidentNodes: Set<ElkNode>,
    edges: Iterable<ElkEdge>,
    chooseNode: (edge: ElkEdge) => ElkNode | null,
  ): void {
    for (const edge of edges) {
      incidentNodes.add(chooseNode(edge)!);
    }
  }

  /**
   * Naive recursive implementation of depth-first search (dfs).
   *
   * The recursive call of ElkGraphComponentsProcessor.java:214 is a frame push. AC6 (#70): explicit stack, same visit
   * and side-effect order. A frame is one suspended Java activation: the node and the live iterator over its incidence
   * set. `visited` and `component` receive the node at entry, and the `visited.includes` test (Java's linear
   * `List.contains`) runs per neighbour when the iterator reaches it, so a neighbour visited deeper in the loop is
   * skipped, as in the Java. The incidence sets are filled only by `computeIncidences`, which `split` runs to completion
   * before the first `dfs`; `dfs` only reads them, so the live iterators see the sets the Java's do.
   *
   * @param start Node to start with
   * @param component List to add all connected nodes to.
   * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java
   */
  private static dfs(start: ElkNode, component: ElkNode[]): void {
    const stack: DfsFrame[] = [];
    ElkGraphComponentsProcessor.openDfs(start, component, stack);
    while (stack.length > 0) {
      const next = ElkGraphComponentsProcessor.nextDfsCall(stack[stack.length - 1]!);
      if (next === null) {
        stack.pop();
      } else {
        ElkGraphComponentsProcessor.openDfs(next, component, stack);
      }
    }
  }

  /**
   * Entry of one `dfs` activation (ElkGraphComponentsProcessor.java:208-210): the node is marked visited and added to
   * the component, and its frame pushed; a node without an incidence entry gets a frame with no iterator (java:211).
   *
   * @param start the node of the activation
   * @param component the list to add the node to
   * @param stack the explicit stack of suspended activations
   */
  private static openDfs(start: ElkNode, component: ElkNode[], stack: DfsFrame[]): void {
    ElkGraphComponentsProcessor.visited.push(start);
    component.push(start);
    const adjacentNodes = ElkGraphComponentsProcessor.incidenceMap.get(start);
    // the incidence sets are not modified while the DFS runs; the iterator stays live as the Java's does
    stack.push({ node: start, adjacentNodes: adjacentNodes === undefined ? null : adjacentNodes.values() });
    checkStackDepth(stack.length);
  }

  /**
   * Runs a frame's loop (ElkGraphComponentsProcessor.java:212-216) up to its next recursive call and returns the node of
   * that call, or `null` when the loop ends and the activation returns.
   *
   * @param frame the innermost suspended activation
   * @returns the next unvisited neighbour, or `null`
   */
  private static nextDfsCall(frame: DfsFrame): ElkNode | null {
    if (frame.adjacentNodes !== null) {
      for (let next = frame.adjacentNodes.next(); next.done !== true; next = frame.adjacentNodes.next()) {
        if (!ElkGraphComponentsProcessor.visited.includes(next.value)) {
          return next.value;
        }
      }
    }
    return null;
  }
}

/** One suspended `dfs` activation (AC6, #70): its node and the live iterator over its incidence set, if any. */
interface DfsFrame {
  readonly node: ElkNode;
  readonly adjacentNodes: Iterator<ElkNode> | null;
}
