// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { d2i, l2i, roundFloat, roundToLong } from '../../../../java/lang/JavaMath.js';
import { boundi } from '../../../math/ElkMath.js';
import { Pair } from '../../../util/Pair.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { connect, connectConditional } from './RandomGraphGeneratorConnect.js';
import { createClique, createNode } from './RandomGraphGeneratorElements.js';
import { moveSource, moveTarget, split } from './RandomGraphGeneratorRewire.js';
import { RandomGraphGenerator, nonNull } from './RandomGraphGenerator.js';

/** The scalar arguments of Java `generateTree` (five Java parameters; grouped to respect the 5-parameter limit). */
export interface TreeArgs {
  /** the number of nodes */
  readonly n: number;
  /** the maximal degree */
  readonly maxDeg: number;
  /** the maximal width */
  readonly maxWidth: number;
  /** the current hierarchy level */
  readonly hierarchyLevel: number;
}

/** The scalar arguments of Java `generateTriconnectedGraph` (five Java parameters; grouped likewise). */
export interface TriconnectedArgs {
  /** the number of nodes */
  readonly n: number;
  /** the first probability (a Java `float`) */
  readonly p1: number;
  /** the second probability (a Java `float`) */
  readonly p2: number;
  /** the current hierarchy level */
  readonly hierarchyLevel: number;
}

/**
 * The hierarchy block shared (with identical Java text) by `generateBipartite`, `generateTree`,
 * `generateBiconnectedGraph` and `generateTriconnectedGraph`: for every node a compound node may be
 * created, its node count `cn = randomInt(1, (int) (hierarchyNodesFactor * n))` being handed to `recurse`.
 */
function createCompoundNodes(
  gen: RandomGraphGenerator,
  nodes: readonly ElkNode[],
  n: number,
  hierarchyLevel: number,
  recurse: (node: ElkNode, cn: number) => void,
): void {
  const hierarchyChance = gen.get(GeneratorOptions.HIERARCHY_CHANCE);
  if (hierarchyChance > 0.0 && hierarchyLevel < gen.maxHierarchyLevel) {
    for (const node of nodes) {
      if (!RandomGraphGenerator.isHypernode(node) && gen.random.nextFloat() < hierarchyChance) {
        // determine the number of nodes in the compound node
        const hierarchyNodesFactor = gen.get(GeneratorOptions.HIERARCHY_NODES_FACTOR);
        const cn = gen.randomInt(1, d2i(Math.fround(hierarchyNodesFactor * n)));
        recurse(node, cn);
      }
    }
  }
}

/** The nodes of a Java `ElkNode[]` filled by `n` calls to `createNode`. */
function createNodes(gen: RandomGraphGenerator, parent: ElkNode, count: number): ElkNode[] {
  const nodes: ElkNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push(createNode(gen, parent));
  }
  return nodes;
}

/** The edge loop of Java `generateBipartite`. */
function connectBipartite(
  gen: RandomGraphGenerator,
  nodes1: readonly ElkNode[],
  nodes2: readonly ElkNode[],
  m: number,
): void {
  const n1 = nodes1.length;
  const n2 = nodes2.length;
  const n = n1 + n2;
  const allowCycles = gen.get(GeneratorOptions.CYCLES);
  for (let j = 0; j < m; j++) {
    const source = allowCycles ? gen.random.nextInt(n) : gen.random.nextInt(n1);
    if (source < n1) {
      const target = gen.random.nextInt(n2);
      connectConditional(gen, nodes1[source] as ElkNode, nodes2[target] as ElkNode, gen.basicCondition);
    } else {
      const target = gen.random.nextInt(n1);
      connectConditional(gen, nodes2[source - n1] as ElkNode, nodes1[target] as ElkNode, gen.basicCondition);
    }
  }
}

/**
 * Generates a random bipartite graph.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @param m the number of edges
 * @param hierarchyLevel the current hierarchy level
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateBipartite(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  m: number,
  hierarchyLevel: number,
): void {
  const n2 = boundi(l2i(roundToLong(n * gen.get(GeneratorOptions.PARTITION_FRAC).val(gen.random))), 1, n - 1);
  const n1 = n - n2;
  const nodes1 = createNodes(gen, parent, n1);
  const nodes2 = createNodes(gen, parent, n2);
  connectBipartite(gen, nodes1, nodes2, m);

  // recursively create hierarchy if applicable
  createCompoundNodes(gen, parent.getChildren().toArray(), n, hierarchyLevel, (node, cn) => {
    // Java `Math.round((float) cn / n * m)`: float division, then float product
    const cm = roundFloat(Math.fround(Math.fround(cn / n) * m));
    generateBipartite(gen, node, cn, cm, hierarchyLevel + 1);
  });
}

/** The mutable arrays and counters of Java `generateTree`. */
interface TreeState {
  max: number;
  nodeIdCounter: number;
  readonly possible: (Pair<ElkNode, number> | undefined)[];
  readonly width: Int32Array;
  readonly level: Int32Array;
}

/**
 * One iteration of the Java `generateTree` loop; returns false where Java `continue`s without
 * incrementing `i`.
 */
function appendToTree(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  state: TreeState,
  maxDeg: number,
  maxWidth: number,
): boolean {
  // get the node to append to
  const x = gen.randomInt(0, state.max);
  const nodeInfo = nonNull(state.possible[x] ?? null);
  const node = nonNull(nodeInfo.getFirst());
  const nodeId = nonNull(nodeInfo.getSecond());
  // check for the width constraint
  if (maxWidth !== 0 && state.width[(state.level[nodeId] as number) + 1] === maxWidth) {
    state.possible[x] = state.possible[state.max--];
    return false;
  }
  // check for the out-degree constraint
  if (maxDeg !== 0 && node.getOutgoingEdges().size() + 1 === maxDeg) {
    state.possible[x] = state.possible[state.max--];
  }
  // append a new node
  const newNode = createNode(gen, parent);
  const newNodeId = state.nodeIdCounter++;
  state.possible[++state.max] = new Pair<ElkNode, number>(newNode, newNodeId);
  connect(gen, node, newNode);
  state.level[newNodeId] = (state.level[nodeId] as number) + 1;
  const newLevel = state.level[newNodeId] as number;
  state.width[newLevel] = (state.width[newLevel] as number) + 1;
  return true;
}

/**
 * Generates a random tree. The implementation is based upon the one used in the OGDF library.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param args the number of nodes, maximum degree, maximum width and hierarchy level
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateTree(gen: RandomGraphGenerator, parent: ElkNode, args: TreeArgs): void {
  const { n, maxDeg, maxWidth, hierarchyLevel } = args;
  const state: TreeState = {
    max: 0,
    nodeIdCounter: 0,
    possible: new Array<Pair<ElkNode, number> | undefined>(n),
    width: new Int32Array(n + 1),
    level: new Int32Array(n),
  };
  // create the root node
  const rootNode = createNode(gen, parent);
  const rootId = state.nodeIdCounter++;
  state.possible[0] = new Pair<ElkNode, number>(rootNode, rootId);
  state.level[rootId] = 0;
  // create the tree
  for (let i = 1; i < n;) {
    if (appendToTree(gen, parent, state, maxDeg, maxWidth)) {
      ++i;
    }
  }

  // recursively create hierarchy if applicable
  createCompoundNodes(gen, parent.getChildren().toArray(), n, hierarchyLevel, (node, cn) => {
    generateTree(gen, node, { n: cn, maxDeg, maxWidth, hierarchyLevel: hierarchyLevel + 1 });
  });
}

/** The mutable arrays and counters of Java `generateBiconnectedGraph`. */
interface BiconnectedState {
  readonly nodes: ElkNode[];
  readonly edges: ElkEdge[];
  nNodes: number;
  nEdges: number;
  kse: number;
  kae: number;
}

/** One iteration of the Java `generateBiconnectedGraph` generation loop. */
function biconnectedStep(gen: RandomGraphGenerator, state: BiconnectedState): void {
  const p = gen.randomInt(1, state.kse + state.kae);
  if (p <= state.kse) {
    // split edge
    const edge = state.edges[gen.randomInt(0, state.nEdges - 1)] as ElkEdge;
    const splitInfo = split(gen, edge);
    state.nodes[state.nNodes++] = nonNull(splitInfo.getFirst());
    state.edges[state.nEdges++] = nonNull(splitInfo.getSecond());
    --state.kse;
  } else {
    // add edge
    const i = gen.randomInt(0, state.nNodes - 1);
    const j = (i + gen.randomInt(1, state.nNodes - 1)) % state.nNodes;
    state.edges[state.nEdges++] = connect(gen, state.nodes[i] as ElkNode, state.nodes[j] as ElkNode);
    --state.kae;
  }
}

/**
 * Generates a biconnected graph. The implementation is based upon the one used in the OGDF library.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @param m the number of edges
 * @param hierarchyLevel the current hierarchy level
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateBiconnectedGraph(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  m: number,
  hierarchyLevel: number,
): void {
  const realN = Math.max(3, n);
  const realM = Math.max(m, realN);
  // start with a triangle
  const nodes: ElkNode[] = [];
  const edges: ElkEdge[] = [];
  nodes[0] = createNode(gen, parent);
  nodes[1] = createNode(gen, parent);
  nodes[2] = createNode(gen, parent);
  edges[0] = connect(gen, nodes[0], nodes[1]);
  edges[1] = connect(gen, nodes[1], nodes[2]);
  edges[2] = connect(gen, nodes[2], nodes[0]);
  // the number of split-edge operations (kse) and add-edge operations (kae)
  const state: BiconnectedState = { nodes, edges, nNodes: 3, nEdges: 3, kse: realN - 3, kae: realM - realN };
  // generate the graph
  while (state.kse + state.kae > 0) {
    biconnectedStep(gen, state);
  }
  // recursively create hierarchy if applicable
  createCompoundNodes(gen, nodes, n, hierarchyLevel, (node, cn) => {
    // preserve density for number of edges: `(float) m / (n * n)`, then `(int) density * cn * cn`
    const density = Math.fround(Math.fround(m) / Math.fround(Int32.mul(n, n)));
    const cm = Int32.mul(Int32.mul(d2i(density), cn), cn);
    generateBiconnectedGraph(gen, node, cn, cm, hierarchyLevel + 1);
  });
}

/** The scratch arrays and probabilities of Java `generateTriconnectedGraph`. */
interface TriconnectedScratch {
  readonly nodes: ElkNode[];
  readonly neighbors: ElkEdge[];
  /** 0 = not marked, 1 = marked left, 2 = marked right, 3 = marked both */
  readonly marks: Int32Array;
  readonly p1: number;
  readonly p2: number;
}

/** Marks two distinct neighbors with the given bit (1 = left, 2 = right). */
function markTwoNeighbors(gen: RandomGraphGenerator, marks: Int32Array, d: number, bit: number): void {
  for (let j = 2; j > 0;) {
    const r = gen.randomInt(0, d - 1);
    if (((marks[r] as number) & bit) === 0) {
      marks[r] = (marks[r] as number) | bit;
      --j;
    }
  }
}

/** The switch deciding to which node a neighbor is connected; `p1 + p2` is a Java `float` sum. */
function decideMark(mark: number, x: number, p1: number, p2: number): number {
  const p12 = Math.fround(p1 + p2);
  switch (mark) {
    case 0:
      if (x < p1) {
        return 1;
      } else if (x < p12) {
        return 2;
      }
      return 3;
    case 1:
    case 2:
      if (x >= p12) {
        return 3;
      }
      return mark;
    default:
      return mark;
  }
}

/** Moves the edge or creates a new one if necessary. */
function applyMark(gen: RandomGraphGenerator, mark: number, edge: ElkEdge, node: ElkNode, newNode: ElkNode): void {
  switch (mark) {
    case 2:
      if (edge.getSources().contains(node)) {
        moveSource(gen, edge, node, newNode);
      } else {
        moveTarget(gen, edge, node, newNode);
      }
      break;
    case 3:
      if (edge.getSources().contains(node)) {
        connect(gen, newNode, edge.getTargets().get(0));
      } else {
        connect(gen, newNode, edge.getSources().get(0));
      }
      break;
    default:
      break;
  }
}

/** The body of the Java node-split loop `for (; i < n; ++i)` of `generateTriconnectedGraph`. */
function splitNode(gen: RandomGraphGenerator, parent: ElkNode, scratch: TriconnectedScratch, i: number): void {
  const { nodes, neighbors, marks, p1, p2 } = scratch;
  const node = nodes[gen.randomInt(0, i - 1)] as ElkNode;
  // create a new node to split 'node' in two
  const newNode = createNode(gen, parent);
  nodes[i] = newNode;
  // build array of all neighbors
  const d = node.getOutgoingEdges().size() + node.getIncomingEdges().size();
  let j = 0;
  for (const edge of node.getOutgoingEdges()) {
    neighbors[j++] = edge;
  }
  for (const edge of node.getIncomingEdges()) {
    neighbors[j++] = edge;
  }
  // mark two distinct neighbors for left, then for right
  markTwoNeighbors(gen, marks, d, 1);
  markTwoNeighbors(gen, marks, d, 2);
  // perform the node-split
  for (j = 0; j < d; ++j) {
    let mark = marks[j] as number;
    marks[j] = 0;
    // decide to with which node each neighbor is connected
    const x = gen.random.nextDouble();
    mark = decideMark(mark, x, p1, p2);
    // move edge or create new one if necessary
    applyMark(gen, mark, neighbors[j] as ElkEdge, node, newNode);
  }
  connect(gen, node, newNode);
}

/**
 * Generates a triconnected graph. The implementation is based upon the one used in the OGDF library.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param args the number of nodes, the two probabilities (Java `float`s) and the hierarchy level
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateTriconnectedGraph(gen: RandomGraphGenerator, parent: ElkNode, args: TriconnectedArgs): void {
  const { n, p1, p2, hierarchyLevel } = args;
  // start with a clique of size 4
  const cliqueNodes = createClique(gen, parent, 4);
  // array of all nodes
  const nodes: ElkNode[] = [];
  let i = 0;
  for (const node of cliqueNodes) {
    nodes[i++] = node;
  }
  const scratch: TriconnectedScratch = { nodes, neighbors: [], marks: new Int32Array(n), p1, p2 };
  // generate the graph
  for (; i < n; ++i) {
    splitNode(gen, parent, scratch, i);
  }
  // recursively create hierarchy if applicable
  createCompoundNodes(gen, parent.getChildren().toArray(), n, hierarchyLevel, (node, cn) => {
    generateTriconnectedGraph(gen, node, { n: cn, p1, p2, hierarchyLevel: hierarchyLevel + 1 });
  });
}
