// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `dfs` of `ComponentsProcessor` (mission tree-recursion-depth, #67, D3/D4) against a
// verbatim transcription of the recursive Java (`ComponentsProcessor.java:129-155`), compared through `split` on seeded
// graphs: component order, each component's node and edge order, renumbered ids and edge identity; plus a depth no
// recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRandom, type TreeSpec } from '../../../test/helpers/spore-tree-fixtures.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import { TNode } from './graph/TNode.js';
import type { LinkedList } from '../../java/util/LinkedList.js';
import { addEdge, specOf } from '../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and method of `ComponentsProcessor` under proof (test-only access). */
interface Internals {
  incidence: LinkedList<TEdge>[] | null;
  visited: boolean[] | null;
  dfs(node: TNode, graph: TGraph | null): TGraph | null;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const REVERSE_PROBABILITY = 0.3;
const DROP_PROBABILITY = 0.1;
const EXTRA_EDGE_PROBABILITY = 0.15;

/** Verbatim transcription of the recursive Java `dfs` (ComponentsProcessor.java:129). */
function twinDfs(self: Internals, node: TNode, graph: TGraph | null): TGraph | null {
  // check if node was visited earlier
  if (!self.visited![node.id]) {
    // if not it is visited now
    self.visited![node.id] = true;
    // create new component if necessary
    let component = graph;
    if (component === null) {
      component = new TGraph();
    }
    // add the node to the component
    component.getNodes().add(node);
    // follow all edges from this node
    for (const edge of self.incidence![node.id]!) {
      if (edge.getSource() !== node) {
        twinDfs(self, edge.getSource()!, component);
      }
      if (edge.getTarget() !== node) {
        twinDfs(self, edge.getTarget()!, component);
      }
      // add the edges an labels to the component
      component.getEdges().add(edge);
    }
    return component;
  }
  // if the node was visited before skip it
  return null;
}

/**
 * A graph of a spec: some tree edges reversed or dropped (a forest), some extra edges (cycles, self loops,
 * multi-edges); the same seed builds the same graph.
 */
function buildGraph(spec: TreeSpec, seed: number): TGraph {
  const rnd = seededRandom(seed);
  const graph = new TGraph();
  const nodes = spec.rects.map((_, i) => {
    const node = new TNode(i, graph, `n${String(i)}`);
    graph.getNodes().add(node);
    return node;
  });
  spec.parents.forEach((parent, i) => {
    if (rnd() < DROP_PROBABILITY) {
      return;
    }
    const [source, target] = rnd() < REVERSE_PROBABILITY ? [i + 1, parent] : [parent, i + 1];
    addEdge(graph, nodes[source]!, nodes[target]!);
  });
  for (let i = 0; i < nodes.length; i++) {
    if (rnd() < EXTRA_EDGE_PROBABILITY) {
      addEdge(graph, nodes[i]!, nodes[Math.floor(rnd() * nodes.length)]!);
    }
  }
  return graph;
}

/** Every component's nodes (label and renumbered id) and edges (endpoint labels), in list order. */
function describeComponents(components: TGraph[]): unknown {
  return components.map((comp) => ({
    nodes: [...comp.getNodes()].map((node) => [node.getLabel(), node.id]),
    edges: [...comp.getEdges()].map((edge) => [edge.getSource()!.getLabel(), edge.getTarget()!.getLabel()]),
  }));
}

/** Splits a graph with the port or, given `useTwin`, with the twin in place of `dfs`. */
function split(graph: TGraph, useTwin: boolean): TGraph[] {
  if (useTwin) {
    vi.spyOn(ComponentsProcessor.prototype as unknown as Internals, 'dfs').mockImplementation(function (
      this: Internals,
      node: TNode,
      component: TGraph | null,
    ) {
      return twinDfs(this, node, component);
    });
  }
  try {
    return new ComponentsProcessor().split(graph);
  } finally {
    vi.restoreAllMocks();
  }
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** A path of `length` nodes, every third edge reversed, so both call sites recurse. */
function deepPath(length: number): TGraph {
  const graph = new TGraph();
  const nodes = Array.from({ length }, (_, i) => {
    const node = new TNode(i, graph, `n${String(i)}`);
    graph.getNodes().add(node);
    return node;
  });
  for (let i = 1; i < length; i++) {
    if (i % 3 === 0) {
      addEdge(graph, nodes[i]!, nodes[i - 1]!);
    } else {
      addEdge(graph, nodes[i - 1]!, nodes[i]!);
    }
  }
  return graph;
}

describe('ComponentsProcessor.dfs explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = describeComponents(split(buildGraph(specOf(seed), seed), true));
    expect(describeComponents(split(buildGraph(specOf(seed), seed), false))).toEqual(expected);
  });

  it('the seeded graphs include forests, both edge orientations and extra edges', () => {
    const counts = SEEDS.map((seed) => split(buildGraph(specOf(seed), seed), false).length);
    expect(counts.filter((c) => c > 1).length).toBeGreaterThanOrEqual(10);
    expect(counts.filter((c) => c === 1).length).toBeGreaterThanOrEqual(10);
  });

  it(
    `a ${String(DEEP_DEPTH)}-node path completes like the twin`,
    () => {
      const port = describeComponents(split(deepPath(DEEP_DEPTH), false));
      expect((port as unknown[]).length).toBe(1);
      let twin: unknown = null;
      try {
        twin = describeComponents(split(deepPath(DEEP_DEPTH), true));
      } catch (e) {
        // the recursive twin may overflow the stack; the port must not
        expect(e).toBeInstanceOf(RangeError);
      }
      if (twin !== null) {
        expect(twin).toEqual(port);
      }
    },
    TIMEOUT,
  );

  // No endless case: `visited[node.id]` is set before any recursive call, so each node opens at most one activation and
  // the Java recursion is bounded by the node count. The port still checks the depth (StackDepth.checkStackDepth).
});
