// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import { type ElkNode, isElkNode } from '../../../../graph/ElkNode.js';
import { type ElkPort, isElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import { BlindTextGenerator } from './BlindTextGenerator.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import type { RandVal } from './RandVal.js';
import { createPort } from './RandomGraphGeneratorElements.js';
import { nonNull, RandomGraphGenerator } from './RandomGraphGenerator.js';

/**
 * An interface for expressing conditions for creating an edge between two nodes (the private Java
 * interface `EdgeCondition`).
 *
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export interface EdgeCondition {
  /**
   * Returns whether the condition is met for an edge from the first to the second node.
   *
   * @param node1 the first node
   * @param node2 the second node
   * @returns true if the condition for the edge is met; false else
   */
  evaluate(node1: ElkNode, node2: ElkNode): boolean;
}

/** The nodes and ports `connect` resolves its two end points to (the four locals of the Java method). */
interface ConnectEnds {
  readonly sourceNode: ElkNode | null;
  readonly targetNode: ElkNode | null;
  readonly sourcePort: ElkPort | null;
  readonly targetPort: ElkPort | null;
}

/** The first part of Java `connect`: resolves the nodes and ports behind the two shapes, in Java order. */
function resolveEnds(source: ElkConnectableShape, target: ElkConnectableShape): ConnectEnds {
  let sourceNode: ElkNode | null = null;
  let targetNode: ElkNode | null = null;
  let sourcePort: ElkPort | null = null;
  let targetPort: ElkPort | null = null;

  if (isElkNode(source)) {
    sourceNode = source;
  }
  if (isElkPort(source)) {
    sourcePort = source;
    sourceNode = sourcePort.getParent();
  }
  if (isElkPort(target)) {
    targetPort = target;
    targetNode = targetPort.getParent();
  }
  if (isElkNode(target)) {
    targetNode = target;
  }
  return { sourceNode, targetNode, sourcePort, targetPort };
}

/** The `if (get(ENABLE_PORTS))` branch of Java `connect`. */
function connectViaPorts(
  gen: RandomGraphGenerator,
  edge: ElkEdge,
  source: ElkConnectableShape,
  target: ElkConnectableShape,
  ends: ConnectEnds,
): void {
  const { sourceNode, targetNode } = ends;
  let { sourcePort, targetPort } = ends;
  if (isElkNode(source)) {
    sourcePort = retrievePort(gen, nonNull(sourceNode), true);
  }

  if (!RandomGraphGenerator.isHypernode(nonNull(sourceNode))) {
    // remove node
    if (edge.getSources().contains(nonNull(sourceNode))) {
      edge.getSources().remove(nonNull(sourceNode));
    }
    edge.getSources().add(nonNull(sourcePort));
    // edge.setSourcePort(sourcePort);
  }

  if (!RandomGraphGenerator.isHypernode(nonNull(targetNode))) {
    if (targetPort === null) {
      targetPort = retrievePort(gen, nonNull(targetNode), false);
    }
    if (edge.getTargets().contains(nonNull(targetNode))) {
      edge.getTargets().remove(nonNull(targetNode));
    }
    edge.getTargets().remove(target);
    edge.getTargets().add(targetPort);
    // edge.setTargetPort(targetPort);
  }
}

/**
 * Connects two nodes with an edge.
 *
 * @param gen the generator
 * @param source the source node
 * @param target the target node
 * @returns the edge
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connect(gen: RandomGraphGenerator, source: ElkConnectableShape, target: ElkConnectableShape): ElkEdge {
  const ends = resolveEnds(source, target);

  const edge = ElkGraphUtil.createEdge(null);

  if (gen.get(GeneratorOptions.ENABLE_PORTS)) {
    connectViaPorts(gen, edge, source, target, ends);
  } else {
    edge.getSources().add(nonNull(ends.sourceNode));
    edge.getTargets().add(nonNull(ends.targetNode));
  }

  if (gen.get(GeneratorOptions.EDGE_LABELS)) {
    addEdgeLabel(edge);
  }

  ElkGraphUtil.updateContainment(edge);
  return edge;
}

/**
 * Creates a label with random text and adds it to the edge.
 *
 * @param edge the edge to add the label to.
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function addEdgeLabel(edge: ElkEdge): void {
  const label = ElkGraphUtil.createLabelWithText(BlindTextGenerator.generate(), edge);
  edge.getLabels().add(label);
}

/**
 * Collects the ports of the node that only have edges in the direction of the new edge (the
 * candidate loop of Java `retrievePort`).
 */
function findReuseCandidates(node: ElkNode, source: boolean): ElkPort[] {
  const reuseCandidates: ElkPort[] = [];

  for (const port of node.getPorts()) {
    // Two flags indicating whether the port already has edges pointing in the right
    // or wrong direction connected to it
    // TODO -apo- not exactly the same, but makes more sense...
    const connectedToDesiredEdges =
      (!port.getIncomingEdges().isEmpty() && !source) || (!port.getOutgoingEdges().isEmpty() && source);

    const connectedToBadEdges =
      (!port.getIncomingEdges().isEmpty() && source) || (!port.getOutgoingEdges().isEmpty() && !source);
    // If there are only edges pointing in the same direction as the new edge connected
    // to
    // the port, it qualifies as a candidate for reuse
    if (connectedToDesiredEdges && !connectedToBadEdges) {
      reuseCandidates.push(port);
    }
  }
  return reuseCandidates;
}

/**
 * Retrieves a port for a new edge to connect to the given node through. This can either be a
 * newly created port, or an existing one. Which one it is depends on the chance of ports to be
 * reused.
 *
 * An outgoing edge will only ever try to reuse ports that only have outgoing edges connected to
 * them. The same is true for incoming edges and ports with only incoming edges.
 *
 * @param gen the generator
 * @param node the node to add the port to.
 * @param source `true` if the port will be used as a source port, `false` if it will be used as a
 *     target port.
 * @returns the new or existing port.
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function retrievePort(gen: RandomGraphGenerator, node: ElkNode, source: boolean): ElkPort {
  // We might want to reuse an existing port
  const reusePortsChance = gen.get(GeneratorOptions.USE_EXISTING_PORTS_CHANCE).floatVal(gen.random);
  if (reusePortsChance > 0.0 && gen.random.nextFloat() < reusePortsChance) {
    // Collect candidate ports for reuse
    const reuseCandidates = findReuseCandidates(node, source);

    // If there are candidates for reuse, choose one at random
    if (reuseCandidates.length > 0) {
      return nonNull(reuseCandidates[gen.randomInt(0, reuseCandidates.length - 1)] ?? null);
    }
  }

  // We were unable to reuse an existing port, so create a new one and return that
  return createPort(gen, node, source);
}

/**
 * Connects two nodes with an edge if the given condition is evaluated to true.
 *
 * @param gen the generator
 * @param source the source node
 * @param target the target node
 * @param condition the condition
 * @returns whether the nodes have been connected
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connectConditional(
  gen: RandomGraphGenerator,
  source: ElkNode,
  target: ElkNode,
  condition: EdgeCondition,
): boolean {
  if (condition.evaluate(source, target)) {
    connect(gen, source, target);
    return true;
  }
  return false;
}

/**
 * Connects a source node a number of times to randomly selected nodes of a given list if the
 * condition evaluates to true for the selected node. (Java overload
 * `connectRandomlyAndConditional(ElkNode, List, int, EdgeCondition)`, told apart from the list
 * overload by arity: translation rule 6.5.)
 *
 * @param gen the generator
 * @param source the source node
 * @param targets the target nodes
 * @param number the number of times the node has to be connected to random nodes
 * @param condition the condition
 * @returns the number of edges which could be inserted
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connectRandomlyAndConditional(
  gen: RandomGraphGenerator,
  source: ElkNode,
  targets: readonly ElkNode[],
  number: number,
  condition: EdgeCondition,
): number;
/**
 * Connects every node in a list of nodes with random nodes of the same list for the specified
 * number of times.
 *
 * @param gen the generator
 * @param nodes the list of nodes
 * @param outgoingEdges the number of outgoing edges for every node
 * @param condition the condition
 * @returns the number of edges which could be inserted
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connectRandomlyAndConditional(
  gen: RandomGraphGenerator,
  nodes: readonly ElkNode[],
  outgoingEdges: readonly number[],
  condition: EdgeCondition,
): number;
export function connectRandomlyAndConditional(
  gen: RandomGraphGenerator,
  first: ElkNode | readonly ElkNode[],
  second: readonly ElkNode[] | readonly number[],
  third: number | EdgeCondition,
  fourth?: EdgeCondition,
): number {
  if (Array.isArray(first)) {
    return connectListRandomly(gen, first, second as readonly number[], third as EdgeCondition);
  }
  return connectNodeRandomly(gen, first as ElkNode, second as readonly ElkNode[], third as number, fourth!);
}

/** Java `connectRandomlyAndConditional(ElkNode, List, int, EdgeCondition)`. */
function connectNodeRandomly(
  gen: RandomGraphGenerator,
  source: ElkNode,
  targets: readonly ElkNode[],
  number: number,
  condition: EdgeCondition,
): number {
  const targetBuffer: ElkNode[] = [...targets];
  let edges = 0;
  let bufferEnd = targetBuffer.length - 1;
  // try connecting the source to up to 'number' nodes randomly
  while (edges < number && bufferEnd >= 0) {
    const i = gen.randomInt(0, bufferEnd);
    const target = nonNull(targetBuffer[i] ?? null);
    if (connectConditional(gen, source, target, condition)) {
      edges++;
    } else {
      // the current node does not fulfill the condition so replace it with an element
      // from the end of the buffer
      targetBuffer[i] = nonNull(targetBuffer[bufferEnd] ?? null);
      bufferEnd--;
    }
  }
  return edges;
}

/** Java `connectRandomlyAndConditional(List, int[], EdgeCondition)`. */
function connectListRandomly(
  gen: RandomGraphGenerator,
  nodes: readonly ElkNode[],
  outgoingEdges: readonly number[],
  condition: EdgeCondition,
): number {
  // connect every node to the specified number of other nodes
  let edges = 0;
  for (let i = 0; i < nodes.length; i++) {
    const source = nonNull(nodes[i] ?? null);
    edges += connectNodeRandomly(gen, source, nodes, nonNull(outgoingEdges[i] ?? null), condition);
  }
  return edges;
}

/**
 * Determines the number of outgoing edges for every node, drawing from a random value. (Java
 * overload `determineOutgoingEdges(List, RandVal)`, told apart from the count overload by the
 * argument's runtime type: translation rule 6.5.)
 *
 * @param gen the generator
 * @param nodes the list of nodes
 * @param val the random value of outgoing edges per node
 * @returns the number of outgoing edges for every node
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function determineOutgoingEdges(gen: RandomGraphGenerator, nodes: readonly ElkNode[], val: RandVal): number[];
/**
 * Randomly calculates a number of outgoing edges for every node in a list until a given number
 * of edges have been inserted.
 *
 * @param gen the generator
 * @param nodes the list of nodes
 * @param m the number of edges
 * @returns the number of outgoing edges for every node
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function determineOutgoingEdges(gen: RandomGraphGenerator, nodes: readonly ElkNode[], m: number): number[];
export function determineOutgoingEdges(
  gen: RandomGraphGenerator,
  nodes: readonly ElkNode[],
  valOrM: RandVal | number,
): number[] {
  if (typeof valOrM === 'number') {
    return determineOutgoingEdgesCount(gen, nodes, valOrM);
  }
  return determineOutgoingEdgesVal(gen, nodes, valOrM);
}

/** Java `determineOutgoingEdges(List, RandVal)`. */
function determineOutgoingEdgesVal(gen: RandomGraphGenerator, nodes: readonly ElkNode[], val: RandVal): number[] {
  // determine the number of outgoing edges for every node
  const n = nodes.length;
  const numberOfEdges: number[] = new Array<number>(n).fill(0);
  for (let i = 0; i < n; ++i) {
    const c = val.intVal(gen.random);
    numberOfEdges[i] = c;
  }
  return numberOfEdges;
}

/** Java `determineOutgoingEdges(List, int)`. */
function determineOutgoingEdgesCount(gen: RandomGraphGenerator, nodes: readonly ElkNode[], m: number): number[] {
  // determine the number of outgoing edges for every node
  const outgoingEdges: number[] = new Array<number>(nodes.length).fill(0);
  for (let c = 0; c < m; ++c) {
    const i = gen.randomInt(0, nodes.length - 1);
    outgoingEdges[i] = nonNull(outgoingEdges[i] ?? null) + 1;
  }
  return outgoingEdges;
}

/**
 * Remove all nodes from the graph that have no incoming or outgoing connections and have no
 * child nodes.
 *
 * @param parent the parent node of the graph
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function removeIsolatedNodes(parent: ElkNode): void {
  const nodeIter = parent.getChildren().listIterator();
  while (nodeIter.hasNext()) {
    const node = nodeIter.next();
    removeIsolatedNodes(node);
    if (node.getIncomingEdges().isEmpty() && node.getOutgoingEdges().isEmpty() && node.getChildren().isEmpty()) {
      nodeIter.remove();
    }
  }
}

/**
 * Returns whether a node can be reached from another node. PRECONDITION: the graph containing
 * the nodes has to be acyclic! If that condition is not met the method is likely to loop
 * infinitely!
 *
 * @param start the start node
 * @param end the end node
 * @returns whether the end node can be reached from the start node
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function findNodeWithDFS(start: ElkNode, end: ElkNode): boolean {
  const nodes = new LinkedList<ElkNode>();
  nodes.add(start);
  do {
    // `poll()` is `removeFirst()` on the non-empty queue (the do-while guard)
    const node = nodes.removeFirst();
    if (node === end) {
      return true;
    }
    for (const edge of node.getOutgoingEdges()) {
      for (const target of edge.getTargets()) {
        if (isElkNode(target)) {
          nodes.add(target);
        } else if (isElkPort(target)) {
          const port = target;
          nodes.add(nonNull(port.getParent()));
        }
      }
    }
  } while (!nodes.isEmpty());
  return false;
}

/**
 * Returns whether two nodes are connected.
 *
 * @param node1 the first node
 * @param node2 the second node
 * @returns whether the two nodes are connected
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function connected(node1: ElkNode, node2: ElkNode): boolean {
  for (const edge of node1.getOutgoingEdges()) {
    if (edge.getTargets().contains(node2)) {
      return true;
    }
  }
  for (const edge of node2.getOutgoingEdges()) {
    if (edge.getTargets().contains(node1)) {
      return true;
    }
  }
  return false;
}
