// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `dfs` of the force `ComponentsProcessor` (mission component-dfs-depth, #70, D3/D4/D7)
// against a verbatim transcription of the recursive Java (`ComponentsProcessor.java:130-157`), compared through `split`
// on seeded graphs: component order, each component's node, edge and label order and identity, the renumbered ids and
// the copied properties; plus a depth no recursion survives and the depth limit of `checkStackDepth`.
import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../../test/helpers/spore-tree-fixtures.js';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../java/lang/StackDepth.js';
import type { LinkedList } from '../../java/util/LinkedList.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { FEdge } from './graph/FEdge.js';
import { FGraph } from './graph/FGraph.js';
import { FLabel } from './graph/FLabel.js';
import { FNode } from './graph/FNode.js';
import { ForceOptions } from './options/ForceOptions.js';

/** The signature of the private `dfs` under proof. */
type Dfs = (
  node: FNode,
  last: FNode | null,
  graph: FGraph | null,
  visited: boolean[],
  incidence: LinkedList<FEdge>[],
) => FGraph | null;

/** The private method of `ComponentsProcessor` under proof (test-only access). */
interface Internals {
  dfs: Dfs;
}

const GRAPHS = 60;
const DEEP_DEPTH = 20_000;
const TIMEOUT = 60_000;
const MAX_NODES = 30;
const SHAPES = ['path', 'cycle', 'tree', 'forest', 'random'] as const;
type Shape = (typeof SHAPES)[number];
const DROP_PROBABILITY = 0.3;
const RANDOM_EDGE_FACTOR = 1.5;
const PARALLEL_PROBABILITY = 0.2;
const SELF_LOOP_PROBABILITY = 0.08;
const MAX_LABELS = 3;
const SPACING = 37.5;
const PRIORITY = 3;

/** Verbatim transcription of the recursive Java `dfs` (ComponentsProcessor.java:130-157). */
const twinDfs: Dfs = (node, last, graph, visited, incidence) => {
  if (!visited[node.id]) {
    visited[node.id] = true;
    let component = graph;
    if (component === null) {
      component = new FGraph();
    }
    component.getNodes().push(node);
    for (const edge of incidence[node.id]!) {
      if (edge.getTarget() === last || edge.getSource() === last) {
        // Do not handle again the edge we just arrived from
        continue;
      }
      if (edge.getSource() !== node) {
        twinDfs(edge.getSource()!, node, component, visited, incidence);
      }
      if (edge.getTarget() !== node) {
        twinDfs(edge.getTarget()!, node, component, visited, incidence);
      }
      component.getEdges().push(edge);
      component.getLabels().push(...edge.getLabels());
    }
    return component;
  }
  return null;
};

/** Adds an edge `source -> target` with `labels` labels. */
function addEdge(graph: FGraph, source: FNode, target: FNode, labels: number): FEdge {
  const edge = new FEdge();
  edge.setSource(source);
  edge.setTarget(target);
  for (let i = 0; i < labels; i++) {
    new FLabel(edge, `${source.getLabel()!}-${target.getLabel()!}#${String(i)}`);
  }
  graph.getEdges().push(edge);
  return edge;
}

/** The base endpoint pairs of a shape over `n` nodes. */
function basePairs(shape: Shape, n: number, rnd: () => number): [number, number][] {
  const pairs: [number, number][] = [];
  if (shape === 'random') {
    for (let k = 0; k < Math.floor(n * RANDOM_EDGE_FACTOR); k++) {
      pairs.push([Math.floor(rnd() * n), Math.floor(rnd() * n)]);
    }
    return pairs;
  }
  for (let i = 1; i < n; i++) {
    const parent = shape === 'tree' || shape === 'forest' ? Math.floor(rnd() * i) : i - 1;
    if (shape !== 'forest' || rnd() >= DROP_PROBABILITY) {
      pairs.push([parent, i]);
    }
  }
  if (shape === 'cycle' && n > 2) {
    pairs.push([n - 1, 0]);
  }
  return pairs;
}

/** Shuffles in place with the seeded generator (Fisher-Yates), so incidence orders vary. */
function shuffle<T>(items: T[], rnd: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/**
 * The seeded graph `seed`: a base shape (cycling through {@link SHAPES}) with random orientations, parallel edges in
 * either direction (an edge back to the parent among them), self-loops and 0-2 labels per edge, in shuffled order; the
 * same seed builds the same graph.
 */
function buildGraph(seed: number): FGraph {
  const rnd = seededRandom(seed);
  const shape = SHAPES[seed % SHAPES.length]!;
  const n = 1 + Math.floor(rnd() * MAX_NODES);
  const graph = new FGraph();
  graph.setProperty(ForceOptions.SPACING_NODE_NODE, SPACING);
  graph.setProperty(ForceOptions.PRIORITY, PRIORITY);
  const nodes = Array.from({ length: n }, (_, i) => {
    const node = new FNode(`n${String(i)}`);
    node.id = i;
    return node;
  });
  graph.getNodes().push(...nodes);
  const pairs: [number, number][] = [];
  for (const [a, b] of basePairs(shape, n, rnd)) {
    pairs.push(rnd() < 0.5 ? [a, b] : [b, a]);
    if (rnd() < PARALLEL_PROBABILITY) {
      pairs.push(rnd() < 0.5 ? [a, b] : [b, a]);
    }
  }
  for (let i = 0; i < n; i++) {
    if (rnd() < SELF_LOOP_PROBABILITY) {
      pairs.push([i, i]);
    }
  }
  for (const [s, t] of shuffle(pairs, rnd)) {
    addEdge(graph, nodes[s]!, nodes[t]!, Math.floor(rnd() * MAX_LABELS));
  }
  return graph;
}

/** A path of `length` nodes, every third edge reversed, so both call sites recurse. */
function deepPath(length: number): FGraph {
  const graph = new FGraph();
  const nodes = Array.from({ length }, (_, i) => {
    const node = new FNode(`n${String(i)}`);
    node.id = i;
    return node;
  });
  graph.getNodes().push(...nodes);
  for (let i = 1; i < length; i++) {
    if (i % 3 === 0) {
      addEdge(graph, nodes[i]!, nodes[i - 1]!, 0);
    } else {
      addEdge(graph, nodes[i - 1]!, nodes[i]!, 0);
    }
  }
  return graph;
}

/**
 * Every component, by identity against the input graph: node (input index, renumbered id), edge (input index), label
 * (edge input index, index on the edge), and the copied properties.
 */
function describeComponents(graph: FGraph, components: FGraph[]): unknown {
  const nodeIndex = new Map(graph.getNodes().map((node, i) => [node, i]));
  const edgeIndex = new Map(graph.getEdges().map((edge, i) => [edge, i]));
  const labelIndex = (label: FLabel): [number, number] => [
    edgeIndex.get(label.getEdge())!,
    label.getEdge().getLabels().indexOf(label),
  ];
  return components.map((comp) => ({
    nodes: comp.getNodes().map((node) => [nodeIndex.get(node), node.id]),
    edges: comp.getEdges().map((edge) => edgeIndex.get(edge)),
    labels: comp.getLabels().map(labelIndex),
    properties: [
      comp.getAllProperties().size(),
      comp.getProperty(ForceOptions.SPACING_NODE_NODE),
      comp.getProperty(ForceOptions.PRIORITY),
    ],
  }));
}

/** Installs the twin in place of `dfs` on `processor`, counting its outermost calls (those from `split`). */
function installTwin(processor: ComponentsProcessor): { calls: number } {
  const counter = { calls: 0 };
  (processor as unknown as Internals).dfs = (node, last, graph, visited, incidence) => {
    counter.calls++;
    return twinDfs(node, last, graph, visited, incidence);
  };
  return counter;
}

/** Splits the graph of `build` with the port or, given `useTwin`, with the twin, described by identity. */
function splitWith(build: () => FGraph, useTwin: boolean): unknown {
  const graph = build();
  const processor = new ComponentsProcessor();
  if (useTwin) {
    installTwin(processor);
  }
  return describeComponents(graph, processor.split(graph));
}

/** The incidence features of a graph: self-loops, an unordered pair with edges in both directions, label counts. */
function features(graph: FGraph): { selfLoops: boolean; bothWays: boolean; labelCounts: Set<number> } {
  const pairs = new Set(graph.getEdges().map((e) => `${String(e.getSource()!.id)}>${String(e.getTarget()!.id)}`));
  return {
    selfLoops: graph.getEdges().some((e) => e.getSource() === e.getTarget()),
    bothWays: graph
      .getEdges()
      .some(
        (e) =>
          e.getSource() !== e.getTarget() && pairs.has(`${String(e.getTarget()!.id)}>${String(e.getSource()!.id)}`),
      ),
    labelCounts: new Set(graph.getEdges().map((e) => e.getLabels().length)),
  };
}

const SEEDS = Array.from({ length: GRAPHS }, (_, i) => i + 1);

describe('ComponentsProcessor.dfs explicit stack (AC6, #70)', () => {
  it.each(SEEDS)('seed %i: split equals the recursive twin', (seed) => {
    const expected = splitWith(() => buildGraph(seed), true);
    expect(splitWith(() => buildGraph(seed), false)).toEqual(expected);
  });

  it('the seeded graphs mix shapes, components, isolated nodes, parallel edges, self-loops and labels', () => {
    const graphs = SEEDS.map((seed) => buildGraph(seed));
    const splits = graphs.map((graph) => new ComponentsProcessor().split(graph));
    const all = graphs.map(features);
    expect(splits.filter((comps) => comps.length > 1).length).toBeGreaterThanOrEqual(10);
    expect(splits.filter((comps) => comps.length === 1).length).toBeGreaterThanOrEqual(10);
    expect(splits.filter((comps) => comps.some((c) => c.getNodes().length === 1)).length).toBeGreaterThanOrEqual(5);
    expect(all.filter((f) => f.selfLoops).length).toBeGreaterThanOrEqual(10);
    expect(all.filter((f) => f.bothWays).length).toBeGreaterThanOrEqual(10);
    expect(new Set(all.flatMap((f) => [...f.labelCounts]))).toEqual(new Set([0, 1, 2]));
  });

  it('with SEPARATE_CONNECTED_COMPONENTS false, dfs is not called and the graph comes back whole', () => {
    const connected = new ComponentsProcessor();
    expect(connected.split(buildGraph(1)).length).toBeGreaterThan(0);
    const swapped = installTwin(connected);
    connected.split(buildGraph(1));
    expect(swapped.calls).toBeGreaterThan(0);

    const graph = buildGraph(1);
    graph.setProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS, false);
    const processor = new ComponentsProcessor();
    const counter = installTwin(processor);
    const components = processor.split(graph);
    expect(counter.calls).toBe(0);
    expect(components).toHaveLength(1);
    expect(components[0]).toBe(graph);
  });

  it(
    `a ${String(DEEP_DEPTH)}-node path completes like the twin`,
    () => {
      const graph = deepPath(DEEP_DEPTH);
      const components = new ComponentsProcessor().split(graph);
      expect(components).toHaveLength(1);
      expect(components[0]!.getNodes()).toHaveLength(DEEP_DEPTH);
      expect(components[0]!.getEdges()).toHaveLength(DEEP_DEPTH - 1);
      // read off the Java: the nodes join in path order on the way down (:139), each edge on the way back up (:151)
      expect(components[0]!.getNodes().every((node, i) => node === graph.getNodes()[i])).toBe(true);
      const edges = graph.getEdges();
      expect(components[0]!.getEdges().every((edge, i) => edge === edges[edges.length - 1 - i])).toBe(true);
      const port = describeComponents(graph, components);
      let twin: unknown = null;
      try {
        twin = splitWith(() => deepPath(DEEP_DEPTH), true);
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

  it(
    `a path of MAX_STACK_DEPTH + 2 nodes throws the Java's StackOverflowError as a RangeError`,
    () => {
      const graph = deepPath(MAX_STACK_DEPTH + 2);
      expect(() => new ComponentsProcessor().split(graph)).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
    },
    TIMEOUT,
  );

  // No endless case: `visited[node.id]` is set before any recursive call, so each node opens at most one activation and
  // the Java recursion is bounded by the node count. The port still checks the depth (StackDepth.checkStackDepth, D7).
});
