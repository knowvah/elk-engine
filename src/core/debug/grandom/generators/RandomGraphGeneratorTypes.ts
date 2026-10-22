// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { d2i, l2i, roundFloat, roundToLong } from '../../../../java/lang/JavaMath.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { GraphType } from './GraphType.js';
import { generateANTEGraph } from './RandomGraphGeneratorAnte.js';
import { connectRandomlyAndConditional, determineOutgoingEdges } from './RandomGraphGeneratorConnect.js';
import { createIndependentSet } from './RandomGraphGeneratorElements.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';
import {
  generateBiconnectedGraph,
  generateBipartite,
  generateTree,
  generateTriconnectedGraph,
} from './RandomGraphGeneratorTypesStructured.js';

/**
 * The shared tail of both `generateAnyGraph` overloads: recursively creates the hierarchy if
 * applicable. `recurse` is the one line that differs between the Java overloads, the recursive call.
 */
function addHierarchy(
  gen: RandomGraphGenerator,
  nodes: ElkNode[],
  hierarchyLevel: number,
  recurse: (node: ElkNode, sizeFactor: number) => ElkNode[],
): void {
  const hierarchyChance = gen.get(GeneratorOptions.HIERARCHY_CHANCE);
  if (hierarchyChance > 0.0 && hierarchyLevel < gen.maxHierarchyLevel) {
    for (const node of [...nodes]) {
      if (!RandomGraphGenerator.isHypernode(node) && gen.random.nextFloat() < hierarchyChance) {
        // determine the number of nodes (and edges) in the compound node
        const sizeFactor = Math.fround(gen.random.nextFloat() * gen.get(GeneratorOptions.HIERARCHY_NODES_FACTOR));
        const childNodes = recurse(node, sizeFactor);
        nodes.push(...childNodes);
      }
    }
  }
}

/** Java `Math.round(sizeFactor * n)` on a `float` product; a zero node count becomes one. */
function compoundNodeCount(sizeFactor: number, n: number): number {
  const cn = roundFloat(Math.fround(sizeFactor * n));
  if (cn === 0) {
    return 1;
  }
  return cn;
}

/**
 * Generates a random graph. (Java overload `generateAnyGraph(ElkNode, int, int, int)`, told apart
 * from the outgoing-edges overload by arity: translation rule 6.5.)
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @param m the number of edges
 * @param hierarchyLevel the current hierarchy level
 * @returns the list of created nodes
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateAnyGraph(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  m: number,
  hierarchyLevel: number,
): ElkNode[];
/**
 * Generates a random graph with a random number of outgoing edges per node.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @param hierarchyLevel the current hierarchy level
 * @returns the list of created nodes
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateAnyGraph(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  hierarchyLevel: number,
): ElkNode[];
export function generateAnyGraph(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  mOrLevel: number,
  hierarchyLevel?: number,
): ElkNode[] {
  if (hierarchyLevel === undefined) {
    return generateAnyGraphOutgoing(gen, parent, n, mOrLevel);
  }
  return generateAnyGraphEdges(gen, parent, n, mOrLevel, hierarchyLevel);
}

/** Java `generateAnyGraph(ElkNode, int, int, int)`. */
function generateAnyGraphEdges(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  m: number,
  hierarchyLevel: number,
): ElkNode[] {
  // create the nodes
  const nodes = createIndependentSet(gen, parent, n);
  // connect the nodes
  if (!gen.get(GeneratorOptions.CROSS_HIERARCHY_EDGES)) {
    // determine the number of outgoing edges for every node
    let createdEdges = 0;
    let iterations = 0;
    do {
      const outgoingEdges = determineOutgoingEdges(gen, nodes, m - createdEdges);
      createdEdges += connectRandomlyAndConditional(gen, nodes, outgoingEdges, gen.basicCondition);
      iterations++;
    } while (createdEdges < m && iterations < RandomGraphGenerator.MAX_ITER);
  }
  // recursively create hierarchy if applicable
  addHierarchy(gen, nodes, hierarchyLevel, (node, sizeFactor) => {
    // determine the number of nodes and edges in the compound node
    const cn = compoundNodeCount(sizeFactor, n);
    const cm = roundFloat(Math.fround(sizeFactor * m));
    return generateAnyGraphEdges(gen, node, cn, cm, hierarchyLevel + 1);
  });
  return nodes;
}

/** Java `generateAnyGraph(ElkNode, int, int)`. */
function generateAnyGraphOutgoing(
  gen: RandomGraphGenerator,
  parent: ElkNode,
  n: number,
  hierarchyLevel: number,
): ElkNode[] {
  // create the nodes
  const nodes = createIndependentSet(gen, parent, n);
  // connect the nodes
  if (!gen.get(GeneratorOptions.CROSS_HIERARCHY_EDGES)) {
    // determine the number of outgoing edges for every node
    const outgoingEdges = determineOutgoingEdges(gen, nodes, gen.get(GeneratorOptions.OUTGOING_EDGES));
    connectRandomlyAndConditional(gen, nodes, outgoingEdges, gen.basicCondition);
  }
  // recursively create hierarchy if applicable
  addHierarchy(gen, nodes, hierarchyLevel, (node, sizeFactor) => {
    // determine the number of nodes in the compound node
    const cn = compoundNodeCount(sizeFactor, n);
    // Java quirk kept: the call `generateAnyGraph(node, cn, hierarchyLevel + 1, maxHierarchyLevel)` has four int
    // arguments and so binds to the (parent, n, m, hierarchyLevel) overload, with m = hierarchyLevel + 1 and
    // hierarchyLevel = maxHierarchyLevel.
    return generateAnyGraphEdges(gen, node, cn, hierarchyLevel + 1, gen.maxHierarchyLevel);
  });
  return nodes;
}

/**
 * The edge count `m` of `makeGraph`: the first switch of the Java method (on the edge
 * determination). `(int) (n * ...)` is `d2i`, `(int) Math.round(...)` is `l2i(roundToLong(...))`.
 */
export function determineEdgeCount(gen: RandomGraphGenerator, n: number): number {
  switch (gen.get(GeneratorOptions.EDGE_DETERMINATION)) {
    case EdgeDetermination.ABSOLUTE: {
      return gen.get(GeneratorOptions.EDGES_ABSOLUTE).intVal(gen.random);
    }

    case EdgeDetermination.RELATIVE: {
      return d2i(n * gen.get(GeneratorOptions.RELATIVE_EDGES).val(gen.random));
    }

    case EdgeDetermination.DENSITY: {
      const d = gen.get(GeneratorOptions.DENSITY).val(gen.random);
      return l2i(roundToLong((d * n * (n - 1)) / 2));
    }

    case EdgeDetermination.OUTGOING: {
      const edgesPerNode = gen.get(GeneratorOptions.OUTGOING_EDGES).val(gen.random);
      return l2i(roundToLong(n * edgesPerNode));
    }

    default:
      throw new IllegalArgumentException('Selected edge determination is not supported.');
  }
}

/** The `TREE` case of Java `makeGraph`. */
function generateTreeCase(gen: RandomGraphGenerator, graph: ElkNode, n: number): void {
  const maxDegree = gen.get(GeneratorOptions.MAX_DEGREE);
  const maxWidth = gen.get(GeneratorOptions.MAX_WIDTH);
  generateTree(gen, graph, { n, maxDeg: maxDegree, maxWidth, hierarchyLevel: 0 });
}

/** The `TRICONNECTED` case of Java `makeGraph`. */
function generateTriconnectedCase(gen: RandomGraphGenerator, graph: ElkNode, n: number): void {
  const p1 = gen.random.nextFloat();
  const p2 = Math.fround(1.0 - p1);
  generateTriconnectedGraph(gen, graph, { n, p1, p2, hierarchyLevel: 0 });
}

/** The `ACYCLIC_NO_TRANSITIVE_EDGES` case of Java `makeGraph`. */
function generateAnteCase(gen: RandomGraphGenerator, graph: ElkNode, n: number, m: number): void {
  const planar = gen.get(GeneratorOptions.PLANAR);
  generateANTEGraph(gen, graph, { n, m, planar, singleSource: false, hierarchyLevel: 0 });
}

/**
 * The second switch of Java `makeGraph`: dispatches on the graph type. (Moved here from
 * `RandomGraphGenerator.ts` to keep that file under the 500-line limit.)
 *
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateByGraphType(gen: RandomGraphGenerator, graph: ElkNode, n: number, m: number): void {
  switch (gen.get(GeneratorOptions.GRAPH_TYPE)) {
    case GraphType.CUSTOM: {
      gen.generateCustomGraph(n, m, graph);
      break;
    }

    case GraphType.BIPARTITE: {
      generateBipartite(gen, graph, n, m, 0);
      break;
    }

    case GraphType.TREE: {
      generateTreeCase(gen, graph, n);
      break;
    }

    case GraphType.BICONNECTED: {
      generateBiconnectedGraph(gen, graph, n, m, 0);
      break;
    }

    case GraphType.TRICONNECTED: {
      generateTriconnectedCase(gen, graph, n);
      break;
    }

    case GraphType.ACYCLIC_NO_TRANSITIVE_EDGES: {
      generateAnteCase(gen, graph, n, m);
      break;
    }

    default:
      throw new IllegalArgumentException('Selected graph generator is not supported.');
  }
}
