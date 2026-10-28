// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { addNode, addPort, connect } from './lgraph-builders.js';

/** A graph shape for the Tarjan tests: node count, directed edges by node index, and the edges to be reversed. */
export interface TarjanSpec {
  readonly nodeCount: number;
  readonly edges: readonly (readonly [number, number])[];
  readonly reversed: readonly number[];
}

/** A built LGraph; `node.id` holds the node's index in the spec. */
export interface BuiltTarjanGraph {
  readonly graph: LGraph;
  readonly nodes: LNode[];
  readonly edges: LEdge[];
  readonly reversed: LEdge[];
}

/** Everything `Tarjan` can affect, keyed by node index so that two builds of one spec are comparable. */
export interface TarjanEffects {
  readonly tarjanIds: number[];
  readonly lowlinks: number[];
  readonly onStack: boolean[];
  readonly stack: number[];
  readonly components: number[][];
  readonly nodeToSCCID: [number, number][];
}

/** Deterministic PRNG (mulberry32) so generated specs are reproducible. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random graph: `edgeCount` random edges (self loops and parallel edges allowed); each reversed with `reverseRate`. */
export function randomSpec(seed: number, nodeCount: number, edgeCount: number, reverseRate: number): TarjanSpec {
  const random = seededRandom(seed);
  const edges: [number, number][] = [];
  const reversed: number[] = [];
  for (let i = 0; i < edgeCount; i++) {
    edges.push([Math.floor(random() * nodeCount), Math.floor(random() * nodeCount)]);
    if (random() < reverseRate) {
      reversed.push(i);
    }
  }
  return { nodeCount, edges, reversed };
}

/** A path 0 -> 1 -> ... -> n-1, optionally closed into a cycle by the edge n-1 -> 0. */
export function chainSpec(nodeCount: number, closed: boolean): TarjanSpec {
  const edges: [number, number][] = [];
  for (let i = 0; i + 1 < nodeCount; i++) {
    edges.push([i, i + 1]);
  }
  if (closed) {
    edges.push([nodeCount - 1, 0]);
  }
  return { nodeCount, edges, reversed: [] };
}

/** Builds the LGraph of a spec; each edge gets fresh ports so port order follows edge order. */
export function buildTarjanGraph(spec: TarjanSpec): BuiltTarjanGraph {
  const graph = new LGraph();
  const nodes = Array.from({ length: spec.nodeCount }, (_, i) => {
    const node = addNode(graph);
    node.id = i;
    return node;
  });
  const edges = spec.edges.map(([s, t]) => connect(addPort(nodes[s]!), addPort(nodes[t]!)));
  return { graph, nodes, edges, reversed: spec.reversed.map((i) => edges[i]!) };
}

/** Reads every effect of a run off the built graph, the node stack and the output collections. */
export function readEffects(
  built: BuiltTarjanGraph,
  stack: readonly LNode[],
  components: readonly ReadonlySet<LNode>[],
  nodeToSCCID: ReadonlyMap<LNode, number>,
): TarjanEffects {
  const ids = (nodes: Iterable<LNode>): number[] => [...nodes].map((n) => n.id);
  return {
    tarjanIds: built.nodes.map((n) => n.getProperty(InternalProperties.TARJAN_ID)),
    lowlinks: built.nodes.map((n) => n.getProperty(InternalProperties.TARJAN_LOWLINK)),
    onStack: built.nodes.map((n) => n.getProperty(InternalProperties.TARJAN_ON_STACK)),
    stack: ids(stack),
    components: components.map((c) => ids(c)),
    nodeToSCCID: [...nodeToSCCID].map(([n, id]) => [n.id, id]),
  };
}
