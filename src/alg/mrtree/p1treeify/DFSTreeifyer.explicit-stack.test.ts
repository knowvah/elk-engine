// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `dfs` of `DFSTreeifyer` (mission tree-recursion-depth, #67, D3/D4) against a verbatim
// transcription of the recursive Java (`DFSTreeifyer.java:140-159`), compared through `process` on seeded directed
// graphs: the `visited` marks after every top-level call, the order of the eliminated edges and every node's remaining
// edge lists; plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import type { LinkedList } from '../../../java/util/LinkedList.js';
import { TEdge } from '../graph/TEdge.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { DFSTreeifyer } from './DFSTreeifyer.js';
import { addEdge, specOf } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and method of `DFSTreeifyer` under proof (test-only access). */
interface Internals {
  visited: Int32Array | null;
  eliminated: LinkedList<TEdge> | null;
  dfs(tNode: TNode): void;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const REVERSE_PROBABILITY = 0.3;
const EXTRA_EDGE_PROBABILITY = 0.25;

/** Verbatim transcription of the recursive Java `dfs` (DFSTreeifyer.java:140). */
function twinDfs(self: Internals, tNode: TNode): void {
  // dfs starts on a node and marks that node as visited
  self.visited![tNode.id] = 1;

  // go to all child nodes of start node
  for (const tEdge of tNode.getOutgoingEdges()) {
    const target = tEdge.getTarget()!;
    // if a child has been visited
    if (self.visited![target.id] === 1) {
      // put that edge to the list that contains the edges to remove
      self.eliminated!.add(tEdge);
    } else if (self.visited![target.id] === 2) {
      // if a previous root can be visited from another node unmark the root property
      self.visited![target.id] = 1;
    } else {
      // recurse
      twinDfs(self, target);
    }
  }
}

/**
 * A directed graph of a spec: some tree edges reversed (several roots), extra edges (cycles, self loops, multi-edges).
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

const edgeName = (edge: TEdge, graph: TGraph): string =>
  `${String(graph.getEdges().indexOf(edge))}:${edge.getSource()!.getLabel()!}->${edge.getTarget()!.getLabel()!}`;

/** Runs `process` with the port or, given `useTwin`, with the twin in place of `dfs`; records every effect. */
function run(graph: TGraph, useTwin: boolean): unknown {
  const original = (DFSTreeifyer.prototype as unknown as Internals).dfs;
  const visits: number[][] = [];
  let active = false;
  vi.spyOn(DFSTreeifyer.prototype as unknown as Internals, 'dfs').mockImplementation(function (
    this: Internals,
    tNode: TNode,
  ) {
    // a recursive port re-enters through the spy: nested activations run the original and record nothing
    if (active) {
      original.call(this, tNode);
      return;
    }
    active = true;
    if (useTwin) {
      twinDfs(this, tNode);
    } else {
      original.call(this, tNode);
    }
    active = false;
    visits.push([...this.visited!]);
  });
  try {
    new DFSTreeifyer().process(graph, new NullElkProgressMonitor());
  } finally {
    vi.restoreAllMocks();
  }
  return {
    visits,
    eliminated: [...graph.getProperty(InternalProperties.REMOVABLE_EDGES)].map((e) => edgeName(e, graph)),
    nodes: [...graph.getNodes()].map((node) => [
      node.id,
      [...node.getOutgoingEdges()].map((e) => edgeName(e, graph)),
      [...node.getIncomingEdges()].map((e) => edgeName(e, graph)),
    ]),
  };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** A directed path of `length` nodes whose last node points back to the first (one eliminated edge). */
function deepCycle(length: number): TGraph {
  const graph = new TGraph();
  const nodes = Array.from({ length }, (_, i) => {
    const node = new TNode(i, graph, `n${String(i)}`);
    graph.getNodes().add(node);
    return node;
  });
  for (let i = 1; i < length; i++) {
    addEdge(graph, nodes[i - 1]!, nodes[i]!);
  }
  addEdge(graph, nodes[length - 1]!, nodes[0]!);
  return graph;
}

describe('DFSTreeifyer.dfs explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(buildGraph(specOf(seed), seed), true);
    expect(run(buildGraph(specOf(seed), seed), false)).toEqual(expected);
  });

  it('the seeded graphs eliminate edges and revisit former roots', () => {
    const outcomes = SEEDS.map((seed) => run(buildGraph(specOf(seed), seed), false) as { visits: number[][] });
    expect(outcomes.filter((o) => o.visits.length > 1).length).toBeGreaterThanOrEqual(20);
    const eliminating = SEEDS.filter((seed) => {
      const graph = buildGraph(specOf(seed), seed);
      run(graph, false);
      return graph.getProperty(InternalProperties.REMOVABLE_EDGES).size() > 0;
    });
    expect(eliminating.length).toBeGreaterThanOrEqual(20);
  });

  it(
    `a ${String(DEEP_DEPTH)}-node cycle completes like the twin`,
    () => {
      const port = run(deepCycle(DEEP_DEPTH), false) as { eliminated: string[] };
      expect(port.eliminated).toEqual([`${String(DEEP_DEPTH - 1)}:n${String(DEEP_DEPTH - 1)}->n0`]);
      let twin: unknown = null;
      try {
        twin = run(deepCycle(DEEP_DEPTH), true);
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

  // No endless case: `dfs` marks its node 1 before the loop and recurses only into nodes marked 0, so each node opens
  // at most one activation and the Java recursion is bounded by the node count. The port still checks the depth
  // (StackDepth.checkStackDepth).
});
