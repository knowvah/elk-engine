// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { connect } from './RandomGraphGeneratorConnect.js';
import { createNode } from './RandomGraphGeneratorElements.js';
import { HierarchyEdge } from './HierarchyEdge.js';
import { RandomGraphGenerator, nonNull } from './RandomGraphGenerator.js';

/** The scalar arguments of Java `generateANTEGraph` (six Java parameters; grouped to respect the 5-parameter limit). */
export interface AnteGraphArgs {
  /** the number of nodes */
  readonly n: number;
  /** the number of edges */
  readonly m: number;
  /** whether the graph is to be planar */
  readonly planar: boolean;
  /** whether the graph has a single source */
  readonly singleSource: boolean;
  /** the current hierarchy level */
  readonly hierarchyLevel: number;
}

/**
 * Compares hierarchy edges by the id attribute.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
function compareId(edge1: HierarchyEdge, edge2: HierarchyEdge): number {
  return edge1.getId() < edge2.getId() ? -1 : edge1.getId() > edge2.getId() ? 1 : 0;
}

/**
 * A helper class for comparing hierarchy edges by the head attribute.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
class HeadComparator {
  compare(edge1: HierarchyEdge, edge2: HierarchyEdge): number {
    return edge1.getHead() < edge2.getHead() ? -1 : edge1.getHead() > edge2.getHead() ? 1 : compareId(edge1, edge2);
  }
}

/**
 * A helper class for comparing hierarchy edges by the tail attribute.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
class TailComparator {
  compare(edge1: HierarchyEdge, edge2: HierarchyEdge): number {
    return edge1.getTail() < edge2.getTail() ? -1 : edge1.getTail() > edge2.getTail() ? 1 : compareId(edge1, edge2);
  }
}

/**
 * Java `Collections.sort(list, comparator)`: Java copies the list into an array, merge-sorts it (stable) and
 * writes it back; `Array.prototype.sort` is stable as well.
 */
function sortList(list: LinkedList<HierarchyEdge>, comparator: HeadComparator | TailComparator): void {
  const sorted = list.toArray().sort((a, b) => comparator.compare(a, b));
  list.clear();
  list.addAll(sorted);
}

/** The int array element at `index` (an `Int32Array` read cannot be out of range in the callers). */
function at(array: Int32Array, index: number): number {
  return array[index] as number;
}

/** The local variables of Java `generateANTEGraph` shared by the extracted steps. */
interface AnteState {
  readonly nnr: ElkNode[];
  readonly vrt: Int32Array;
  readonly fst: Int32Array;
  readonly startEdges: LinkedList<HierarchyEdge>;
  leftN: Int32Array;
  rightN: Int32Array;
  edgeIn: LinkedList<HierarchyEdge>[];
  edgeOut: LinkedList<HierarchyEdge>[];
  numberOfLayers: number;
  totNumber: number;
  idc: number;
  x1: number;
  x2: number;
}

/** Creates the nodes and distributes them to layers (`float r` draws, one per node). */
function createLayers(gen: RandomGraphGenerator, parent: ElkNode, args: AnteGraphArgs, state: AnteState): void {
  const { n, singleSource } = args;
  // create the nodes
  for (let i = 0; i < n; ++i) {
    createNode(gen, parent);
  }
  let realCount = 0;
  state.fst[0] = 0;
  for (const node of parent.getChildren()) {
    state.nnr[state.totNumber] = node;
    state.vrt[state.totNumber++] = 0;
    realCount++;
    const r = gen.random.nextFloat();
    // `r * r * n < 1` in float arithmetic
    if ((state.totNumber === 1 && singleSource) || realCount === n || Math.fround(Math.fround(r * r) * n) < 1) {
      state.fst[++state.numberOfLayers] = state.totNumber;
    }
  }
}

/** The planar neighbor determination of one layer `l`. */
function determinePlanarNeighbors(gen: RandomGraphGenerator, state: AnteState, l: number): void {
  const { fst, leftN, rightN } = state;
  let n1 = at(fst, l - 1);
  let n2 = at(fst, l);
  leftN[n2] = n1;
  while (n1 < at(fst, l) && n2 < at(fst, l + 1)) {
    const r = gen.random.nextFloat();
    if (
      n1 !== at(fst, l) - 1 &&
      (n2 === at(fst, l + 1) - 1 ||
        r < Math.fround(Math.fround(at(fst, l) - at(fst, l - 1)) / Math.fround(at(fst, l + 1) - at(fst, l - 1))))
    ) {
      n1++;
    } else {
      rightN[n2] = n1;
      if (++n2 < at(fst, l + 1)) {
        leftN[n2] = n1;
      }
    }
  }
}

/** Determines the allowed neighbors of every node. */
function determineAllowedNeighbors(gen: RandomGraphGenerator, state: AnteState, planar: boolean): void {
  state.leftN = new Int32Array(state.totNumber);
  state.rightN = new Int32Array(state.totNumber);
  for (let l = 1; l < state.numberOfLayers; l++) {
    if (planar) {
      determinePlanarNeighbors(gen, state, l);
    } else {
      for (let n2 = at(state.fst, l); n2 < at(state.fst, l + 1); n2++) {
        state.leftN[n2] = at(state.fst, l - 1);
        state.rightN[n2] = at(state.fst, l) - 1;
      }
    }
  }
}

/** The `while (vrt[next] != 0)` chain of virtual nodes; returns the edge to register as a start edge. */
function followVirtualNodes(gen: RandomGraphGenerator, state: AnteState, n2: number, first: number): HierarchyEdge {
  let next = first;
  let act = n2;
  let nextEdge = new HierarchyEdge(next, act, state.idc++);
  while (at(state.vrt, next) !== 0) {
    act = next;
    next = gen.randomInt(at(state.leftN, act), at(state.rightN, act));
    (state.edgeOut[act] as LinkedList<HierarchyEdge>).add(nextEdge);
    nextEdge = new HierarchyEdge(next, act, state.idc++);
    (state.edgeIn[act] as LinkedList<HierarchyEdge>).add(nextEdge);
  }
  return nextEdge;
}

/** The inner `for (n1 = leftN[n2]; ...)` loop of the edge insertion for node `n2`. */
function insertEdgesOfNode(gen: RandomGraphGenerator, state: AnteState, singleSource: boolean, n2: number): void {
  let connected = !singleSource;
  for (let n1 = at(state.leftN, n2); n1 <= at(state.rightN, n2) || !connected; n1++) {
    const r = gen.random.nextFloat();
    if (r < Math.fround(state.x1 / state.x2) || n1 > at(state.rightN, n2)) {
      const next = n1 <= at(state.rightN, n2) ? n1 : gen.randomInt(at(state.leftN, n2), at(state.rightN, n2));
      state.startEdges.add(followVirtualNodes(gen, state, n2, next));
      connected = true;
      state.x1 = Math.fround(state.x1 - 1);
    }
    if (n1 <= at(state.rightN, n2)) {
      state.x2 = Math.fround(state.x2 - 1);
    }
  }
}

/** Inserts the edges (`float x1 = m`, `float x2` the sum of the neighbor ranges). */
function insertEdges(gen: RandomGraphGenerator, state: AnteState, args: AnteGraphArgs): void {
  state.edgeIn = [];
  state.edgeOut = [];
  for (let i = 0; i < state.totNumber; ++i) {
    state.edgeIn[i] = new LinkedList<HierarchyEdge>();
    state.edgeOut[i] = new LinkedList<HierarchyEdge>();
  }
  if (state.numberOfLayers !== 0) {
    state.x1 = args.m;
    state.x2 = 0;
    for (let n2 = at(state.fst, 1); n2 < state.totNumber; n2++) {
      if (at(state.vrt, n2) === 0) {
        state.x2 = Math.fround(state.x2 + (at(state.rightN, n2) - at(state.leftN, n2) + 1));
      }
    }
    for (let n2 = at(state.fst, 1); n2 < state.totNumber; n2++) {
      if (at(state.vrt, n2) === 0) {
        insertEdgesOfNode(gen, state, args.singleSource, n2);
      }
    }
  }
}

/** Sorts (planar), chains and connects the registered edges. */
function connectChains(gen: RandomGraphGenerator, state: AnteState, planar: boolean): void {
  if (planar) {
    for (let act = 0; act < state.totNumber; act++) {
      sortList(state.edgeIn[act] as LinkedList<HierarchyEdge>, new TailComparator());
      sortList(state.edgeOut[act] as LinkedList<HierarchyEdge>, new HeadComparator());
    }
  }
  for (let act = 0; act < state.totNumber; act++) {
    const hedges = state.edgeIn[act] as LinkedList<HierarchyEdge>;
    for (const hedge of hedges) {
      const nextEdge = hedge;
      nextEdge.setNext((state.edgeOut[act] as LinkedList<HierarchyEdge>).removeAt(0));
    }
  }
  for (const hedge of state.startEdges) {
    const actEdge = hedge;
    let nextEdge = actEdge;
    while (at(state.vrt, nextEdge.getHead()) !== 0) {
      nextEdge = nonNull(nextEdge.getNext());
    }
    connect(gen, state.nnr[actEdge.getTail()] as ElkNode, state.nnr[nextEdge.getHead()] as ElkNode);
  }
}

/** The recursive hierarchy creation at the end of Java `generateANTEGraph`. */
function createHierarchy(gen: RandomGraphGenerator, parent: ElkNode, args: AnteGraphArgs): void {
  const { n, m, planar, singleSource, hierarchyLevel } = args;
  const hierarchyChance = gen.get(GeneratorOptions.HIERARCHY_CHANCE);
  if (hierarchyChance > 0.0 && hierarchyLevel < gen.maxHierarchyLevel) {
    for (const node of parent.getChildren()) {
      if (!RandomGraphGenerator.isHypernode(node) && gen.random.nextFloat() < hierarchyChance) {
        // determine the number of nodes in the compound node
        const hierarchyNodesFactor = gen.get(GeneratorOptions.HIERARCHY_NODES_FACTOR);
        const cn = gen.randomInt(1, d2i(Math.fround(hierarchyNodesFactor * n)));
        // preserve density for number of edges: `(float) m / (n * n)`, then `(int) density * cn * cn`
        const density = Math.fround(Math.fround(m) / Math.fround(Int32.mul(n, n)));
        const cm = Int32.mul(Int32.mul(d2i(density), cn), cn);
        generateANTEGraph(gen, node, { n: cn, m: cm, planar, singleSource, hierarchyLevel: hierarchyLevel + 1 });
      }
    }
  }
}

/**
 * Generates an acyclic graph without transitive edges (ANTE); the Java method is split into the steps
 * above only to respect the complexity limits, in the Java statement order.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param args the scalar arguments
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateANTEGraph(gen: RandomGraphGenerator, parent: ElkNode, args: AnteGraphArgs): void {
  const { n, planar } = args;
  const state: AnteState = {
    nnr: [],
    vrt: new Int32Array(3 * n),
    fst: new Int32Array(n + 1),
    startEdges: new LinkedList<HierarchyEdge>(),
    leftN: new Int32Array(0),
    rightN: new Int32Array(0),
    edgeIn: [],
    edgeOut: [],
    numberOfLayers: 0,
    totNumber: 0,
    idc: 0,
    x1: 0,
    x2: 0,
  };
  createLayers(gen, parent, args, state);
  // determine allowed neighbors
  determineAllowedNeighbors(gen, state, planar);
  // insert edges
  insertEdges(gen, state, args);
  connectChains(gen, state, planar);
  // recursively create hierarchy if applicable
  createHierarchy(gen, parent, args);
}
