// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `dfs` of `ElkGraphComponentsProcessor` (mission component-dfs-depth, #70, D3/D4) against a
// verbatim transcription of the recursive Java (`ElkGraphComponentsProcessor.java:207-219`), reading the same static
// fields and compared through `split` on seeded graphs: component order, each component's node order and identity, and
// the final `visited` list; plus a path deeper than #70's 16,000-node overflow and the depth limit of D7.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRandom } from '../../../../test/helpers/spore-tree-fixtures.js';
import type { ElkConnectableShape } from '../../../graph/ElkConnectableShape.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../../java/lang/StackDepth.js';
import { ElkGraphComponentsProcessor } from './ElkGraphComponentsProcessor.js';

/** The private static state and method of `ElkGraphComponentsProcessor` under proof (test-only access). */
interface Internals {
  visited: ElkNode[];
  incidenceMap: Map<ElkNode, Set<ElkNode>>;
  dfs(start: ElkNode, component: ElkNode[]): void;
}

const internals = ElkGraphComponentsProcessor as unknown as Internals;

const GRAPHS = 80;
const MIN_COMPLETED = 60;
const DEEP_DEPTH = 20_000;
const TIMEOUT = 60_000;
const MIN_SIZE = 5;
const SIZE_RANGE = 36;
const PORT_END_PROBABILITY = 0.3;
const REVERSE_PROBABILITY = 0.4;
const DROP_PROBABILITY = 0.3;
const GRANDCHILD_PROBABILITY = 0.1;
const EXTRA_PROBABILITY = 0.5;
const HYPEREDGE_PERIOD = 8;
const HYPEREDGE_INNER = 0;
const HYPEREDGE_OUTER = 4;

/** Verbatim transcription of the recursive Java `dfs` (ElkGraphComponentsProcessor.java:207-219). */
function twinDfs(start: ElkNode, component: ElkNode[]): void {
  internals.visited.push(start);
  component.push(start);
  const adjacentNodes = internals.incidenceMap.get(start);
  if (adjacentNodes !== undefined) {
    for (const node of adjacentNodes) {
      if (!internals.visited.includes(node)) {
        twinDfs(node, component);
      }
    }
  }
}

/** What `split` produced (copies of the static lists) or the error it threw. */
type Outcome = { readonly components: ElkNode[][]; readonly visited: ElkNode[] } | { readonly error: string };

/** Splits `graph` with the port or, given `useTwin`, with the twin in place of `dfs`. */
function runSplit(graph: ElkNode, useTwin: boolean): Outcome {
  if (useTwin) {
    vi.spyOn(internals, 'dfs').mockImplementation(twinDfs);
  }
  try {
    const components = ElkGraphComponentsProcessor.split(graph).map((component) => [...component]);
    return { components, visited: [...internals.visited] };
  } catch (e) {
    const error = e as Error;
    return { error: `${error.constructor.name}: ${error.message}` };
  } finally {
    vi.restoreAllMocks();
  }
}

/** The outcome by identifier, for readable diffs. */
function describeOutcome(outcome: Outcome): unknown {
  if ('error' in outcome) {
    return outcome;
  }
  const ids = (nodes: readonly ElkNode[]): (string | null)[] => nodes.map((node) => node.getIdentifier());
  return { components: outcome.components.map(ids), visited: ids(outcome.visited) };
}

/** True if both outcomes hold the very same node objects in the same places. */
function sameIdentity(a: Outcome, b: Outcome): boolean {
  if ('error' in a || 'error' in b) {
    return 'error' in a && 'error' in b && a.error === b.error;
  }
  const sameList = (x: readonly ElkNode[], y: readonly ElkNode[]): boolean =>
    x.length === y.length && x.every((node, i) => node === y[i]);
  return (
    sameList(a.visited, b.visited) &&
    a.components.length === b.components.length &&
    a.components.every((component, i) => sameList(component, b.components[i]!))
  );
}

function named(parent: ElkNode, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setIdentifier(id);
  return node;
}

/** The elements of one seeded graph that edges are drawn between. */
interface Parts {
  readonly rnd: () => number;
  readonly graph: ElkNode;
  readonly nodes: ElkNode[];
  readonly childPorts: ElkPort[];
  readonly graphPorts: ElkPort[];
  readonly grandchildren: ElkNode[];
  readonly outside: ElkNode[];
}

function pick<T>(rnd: () => number, items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)]!;
}

/** The node itself or, sometimes, one of its ports: edges then run through ports, as `allIncomingEdges` reads them. */
function endOf(parts: Parts, node: ElkNode): ElkConnectableShape {
  const ports = [...node.getPorts()];
  return ports.length > 0 && parts.rnd() < PORT_END_PROBABILITY ? pick(parts.rnd, ports) : node;
}

/** A simple edge between two shapes, in a random direction. */
function connect(parts: Parts, a: ElkConnectableShape, b: ElkConnectableShape): void {
  if (parts.rnd() < REVERSE_PROBABILITY) {
    ElkGraphUtil.createSimpleEdge(b, a);
  } else {
    ElkGraphUtil.createSimpleEdge(a, b);
  }
}

function connectNodes(parts: Parts, a: ElkNode, b: ElkNode): void {
  connect(parts, endOf(parts, a), endOf(parts, b));
}

const SHAPES = ['path', 'cycle', 'forest', 'random', 'sparse'] as const;
type Shape = (typeof SHAPES)[number];

/** The base shape: a path, a cycle, a forest (several components), a dense random graph or a sparse one. */
function addBaseShape(parts: Parts, shape: Shape): void {
  const { rnd, nodes } = parts;
  const n = nodes.length;
  if (shape === 'path' || shape === 'cycle') {
    for (let i = 1; i < n; i++) {
      connectNodes(parts, nodes[i - 1]!, nodes[i]!);
    }
    if (shape === 'cycle') {
      connectNodes(parts, nodes[n - 1]!, nodes[0]!);
    }
  } else if (shape === 'forest') {
    for (let i = 1; i < n; i++) {
      if (rnd() >= DROP_PROBABILITY) {
        connectNodes(parts, nodes[Math.floor(rnd() * i)]!, nodes[i]!);
      }
    }
  } else {
    const edges = shape === 'random' ? Math.ceil(n * 1.2) : Math.floor(n / 3);
    for (let e = 0; e < edges; e++) {
      connectNodes(parts, pick(rnd, nodes), pick(rnd, nodes));
    }
  }
}

/**
 * The edges `computeIncidences` treats specially (ElkGraphComponentsProcessor.java:73-180), each kind added with
 * probability {@link EXTRA_PROBABILITY}: self-loops, parallel edges, edges between ports of children, edges between a
 * port of the split graph and children (inner neighbours of a port, both directions, several children per port), edges
 * between a child and the split graph itself (no port: no neighbour), and hierarchy-crossing edges to grandchildren and
 * to nodes outside the split graph (dropped), including an outside edge at a port of the split graph.
 */
function addSpecialEdges(parts: Parts): void {
  const { rnd, nodes, childPorts, graphPorts, grandchildren, outside, graph } = parts;
  const kinds: (() => void)[] = [
    () => connectNodes(parts, pick(rnd, nodes), pick(rnd, nodes)),
    () => {
      const node = pick(rnd, nodes);
      connectNodes(parts, node, node);
      connectNodes(parts, node, node);
    },
    () => {
      const [a, b] = [pick(rnd, nodes), pick(rnd, nodes)];
      ElkGraphUtil.createSimpleEdge(a, b);
      ElkGraphUtil.createSimpleEdge(a, b);
    },
    () => childPorts.length > 1 && connect(parts, pick(rnd, childPorts), pick(rnd, childPorts)),
    () => {
      const port = pick(rnd, graphPorts);
      connect(parts, port, endOf(parts, pick(rnd, nodes)));
      connect(parts, port, endOf(parts, pick(rnd, nodes)));
      connect(parts, port, endOf(parts, pick(rnd, nodes)));
    },
    () => connect(parts, graph, pick(rnd, nodes)),
    () => grandchildren.length > 0 && connect(parts, pick(rnd, nodes), pick(rnd, grandchildren)),
    () => connect(parts, endOf(parts, pick(rnd, nodes)), pick(rnd, outside)),
    () => connect(parts, pick(rnd, graphPorts), pick(rnd, outside)),
  ];
  for (const kind of kinds) {
    if (rnd() < EXTRA_PROBABILITY) {
      kind();
    }
  }
}

/**
 * Hyperedges: one with several sources touching children makes `computeIncidences` throw (`getSourceNode` reads simple
 * edges only), and port and twin must throw the same; one among nodes `computeIncidences` never reads is ignored.
 */
function addHyperedges(parts: Parts, seed: number): void {
  const { rnd, nodes, outside } = parts;
  if (seed % HYPEREDGE_PERIOD === HYPEREDGE_INNER) {
    ElkGraphUtil.createHyperedge([pick(rnd, nodes), pick(rnd, nodes)], [pick(rnd, nodes)]);
  } else if (seed % HYPEREDGE_PERIOD === HYPEREDGE_OUTER) {
    ElkGraphUtil.createHyperedge([outside[0]!], [outside[1]!, ...parts.grandchildren]);
  }
}

/** A seeded graph `g` (inside a root with two outside nodes) with ports, grandchildren and every edge kind above. */
function buildGraph(seed: number): ElkNode {
  const rnd = seededRandom(seed);
  const root = ElkGraphUtil.createGraph();
  const graph = named(root, 'g');
  const outside = [named(root, 'o0'), named(root, 'o1')];
  const size = MIN_SIZE + Math.floor(rnd() * SIZE_RANGE);
  const nodes = Array.from({ length: size }, (_, i) => named(graph, `n${String(i)}`));
  const graphPorts = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ElkGraphUtil.createPort(graph));
  const childPorts: ElkPort[] = [];
  for (const node of nodes) {
    const count = Math.floor(rnd() * 3);
    for (let p = 0; p < count; p++) {
      childPorts.push(ElkGraphUtil.createPort(node));
    }
  }
  const grandchildren = nodes
    .filter(() => rnd() < GRANDCHILD_PROBABILITY)
    .map((parent, i) => named(parent, `c${String(i)}`));
  const parts: Parts = { rnd, graph, nodes, childPorts, graphPorts, grandchildren, outside };
  addBaseShape(parts, SHAPES[seed % SHAPES.length]!);
  addSpecialEdges(parts);
  addHyperedges(parts, seed);
  return graph;
}

/** A path `n0 - n1 - ...` of `length` children of `g`, every third edge reversed. */
function deepPath(length: number): { graph: ElkNode; nodes: ElkNode[] } {
  const root = ElkGraphUtil.createGraph();
  const graph = named(root, 'g');
  const nodes = Array.from({ length }, (_, i) => named(graph, `n${String(i)}`));
  for (let i = 1; i < length; i++) {
    if (i % 3 === 0) {
      ElkGraphUtil.createSimpleEdge(nodes[i]!, nodes[i - 1]!);
    } else {
      ElkGraphUtil.createSimpleEdge(nodes[i - 1]!, nodes[i]!);
    }
  }
  return { graph, nodes };
}

const SEEDS = Array.from({ length: GRAPHS }, (_, i) => i + 1);

describe('ElkGraphComponentsProcessor.dfs explicit stack (AC6, #70)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: components, node order, identity and visited equal the recursive twin', (seed) => {
    const graph = buildGraph(seed);
    const twin = runSplit(graph, true);
    const port = runSplit(graph, false);
    expect(describeOutcome(port)).toEqual(describeOutcome(twin));
    expect(sameIdentity(port, twin)).toBe(true);
  });

  it('the seeded graphs mix one and several components, isolated nodes and hyperedge errors', () => {
    const outcomes = SEEDS.map((seed) => runSplit(buildGraph(seed), false));
    const completed = outcomes.filter((o): o is Exclude<Outcome, { error: string }> => !('error' in o));
    expect(completed.length).toBeGreaterThanOrEqual(MIN_COMPLETED);
    expect(completed.filter((o) => o.components.length > 1).length).toBeGreaterThanOrEqual(10);
    expect(completed.filter((o) => o.components.length === 1).length).toBeGreaterThanOrEqual(5);
    expect(completed.filter((o) => o.components.some((c) => c.length === 1)).length).toBeGreaterThanOrEqual(10);
    const errors = outcomes.filter((o) => 'error' in o).map((o) => (o as { error: string }).error);
    expect(errors.length).toBeGreaterThanOrEqual(5);
    expect(new Set(errors)).toEqual(new Set(["IllegalArgumentException: Passed edge is not 'simple'."]));
  });

  it('a neighbour visited deeper in the loop is skipped when the iterator reaches it (java:212-213)', () => {
    // a -> b, b -> c, a -> c: incidences a {b, c}, b {a, c}, c {a, b}. dfs(a) recurses into b, b into c; back in a, c is
    // already visited, so the component is [a, b, c] (a test made when c was first seen would give [a, c, b]).
    const root = ElkGraphUtil.createGraph();
    const graph = named(root, 'g');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => named(graph, id)) as [ElkNode, ElkNode, ElkNode];
    ElkGraphUtil.createSimpleEdge(a, b);
    ElkGraphUtil.createSimpleEdge(b, c);
    ElkGraphUtil.createSimpleEdge(a, c);
    const components = ElkGraphComponentsProcessor.split(graph);
    expect(components).toHaveLength(1);
    expect(components[0]!.map((n) => n.getIdentifier())).toEqual(['a', 'b', 'c']);
  });

  it(
    `a ${String(DEEP_DEPTH)}-node path completes in path order like the twin`,
    () => {
      const { graph, nodes } = deepPath(DEEP_DEPTH);
      const port = runSplit(graph, false);
      expect('error' in port ? port.error : null).toBeNull();
      const components = (port as { components: ElkNode[][] }).components;
      expect(components).toHaveLength(1);
      expect(components[0]!).toHaveLength(DEEP_DEPTH);
      expect(components[0]!.every((node, i) => node === nodes[i])).toBe(true);
      // the recursive twin may overflow the stack (V8's RangeError, as the recursive port did); the port must not
      const twin = runSplit(graph, true);
      if ('error' in twin) {
        expect(twin.error).toBe('RangeError: Maximum call stack size exceeded');
      } else {
        expect(sameIdentity(port, twin)).toBe(true);
      }
    },
    TIMEOUT,
  );

  it(
    `a ${String(MAX_STACK_DEPTH + 2)}-node path throws Java's StackOverflowError as a RangeError (D7)`,
    () => {
      // the path from n0 holds MAX_STACK_DEPTH + 2 suspended activations; the check after the push of frame
      // MAX_STACK_DEPTH + 1 throws, from `split`, with no catch on the way
      const { graph } = deepPath(MAX_STACK_DEPTH + 2);
      expect(() => ElkGraphComponentsProcessor.split(graph)).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
      expect(internals.visited).toHaveLength(MAX_STACK_DEPTH + 1);
    },
    TIMEOUT,
  );

  // No endless case: `visited.push(start)` precedes every recursive call and a call is made only for a node not in
  // `visited`, so each node opens at most one activation and the Java recursion is bounded by the node count. The port
  // still checks the depth (StackDepth.checkStackDepth).
});
