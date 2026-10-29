// SPDX-License-Identifier: EPL-2.0
// Port of BasicCycleBreakerTest (testIsAcyclic and its dfs), run over the replayed graphs of every `models/*` row of
// test/golden/refs/java/layered-phases.json whose prefix ends in a P1_CYCLE_BREAKING phase (mission 7b, T8).
//
// B8: the Java `dfs` recurses once per node. `dfs` below is an explicit-stack loop that visits in the same order;
// `dfsRecursive` is the verbatim Java twin, and both must agree on every row (and on a chain deeper than the stack).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p1cycles/BasicCycleBreakerTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { buildTarjanGraph, chainSpec } from '../../../../test/helpers/tarjan-graphs.js';
import { runPrefix, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const CYCLE_PHASE_PREFIX = 'P1_CYCLE_BREAKING/';
const DEEP_CHAIN_LENGTH = 5000;
const CYCLE_DETECTED = 'Cycle detected!';
const SHOULD_NEVER_HAPPEN = 'Should never happen';

const rows = loadRows(ROWS_FILE).filter(
  (row) => row.group === 'models' && row.prefix !== null && row.prefix.at(-1)!.startsWith(CYCLE_PHASE_PREFIX),
);

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

const DFS_UNVISITED = 0;

/** The test class: `nextDFSNumber` is an instance field in the Java, one fresh instance per graph. */
class AcyclicityTest {
  private nextDFSNumber = 1;

  testIsAcyclic(lGraph: LGraph, dfs: (node: LNode) => void): void {
    // Find all nodes that don't have incoming edges
    const sources = lGraph
      .getLayerlessNodes()
      .filter((node) => node.getIncomingEdges()[Symbol.iterator]().next().done === true);

    // Reset all node IDs
    lGraph.getLayerlessNodes().forEach((node) => {
      node.id = DFS_UNVISITED;
    });

    // Start a DFS at each source
    for (const source of sources) {
      if (source.id !== DFS_UNVISITED) {
        throw new Error(SHOULD_NEVER_HAPPEN);
      }

      dfs(source);
    }
  }

  /** Explicit-stack form of {@link dfsRecursive}: one frame per Java activation, holding its edge iterator. */
  dfs = (root: LNode): void => {
    const frames: { node: LNode; edges: Iterator<LEdge> }[] = [];
    const enter = (node: LNode): void => {
      if (node.id !== DFS_UNVISITED) {
        return;
      }
      node.id = this.nextDFSNumber++;
      this.putOnCurrentStack(node);
      frames.push({ node, edges: node.getOutgoingEdges()[Symbol.iterator]() });
    };

    enter(root);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        this.removeFromCurrentStack(frame.node);
        frames.pop();
        continue;
      }
      const target = next.value.getTarget()!.getNode()!;

      if (target.id === DFS_UNVISITED) {
        enter(target);
      } else if (this.isOnCurrentStack(target)) {
        throw new Error(CYCLE_DETECTED);
      }
    }
  };

  /** Verbatim transcription of `dfs` (BasicCycleBreakerTest.java:165-185), `fail` being a throw. */
  dfsRecursive = (node: LNode): void => {
    if (node.id !== DFS_UNVISITED) {
      return;
    }

    node.id = this.nextDFSNumber++;
    this.putOnCurrentStack(node);

    for (const lEdge of node.getOutgoingEdges()) {
      const target = lEdge.getTarget()!.getNode()!;

      if (target.id === DFS_UNVISITED) {
        this.dfsRecursive(target);
      } else if (this.isOnCurrentStack(target)) {
        throw new Error(CYCLE_DETECTED);
      }
    }

    this.removeFromCurrentStack(node);
  };

  private isOnCurrentStack(node: LNode): boolean {
    return node.id < 0;
  }

  private putOnCurrentStack(node: LNode): void {
    node.id = -1 * Math.abs(node.id);
  }

  private removeFromCurrentStack(node: LNode): void {
    node.id = Math.abs(node.id);
  }
}

/** The DFS numbers every layerless node ends with, in layerless order. */
function visitOrder(graph: LGraph, useTwin: boolean): number[] {
  const test = new AcyclicityTest();
  test.testIsAcyclic(graph, useTwin ? test.dfsRecursive : test.dfs);
  return graph.getLayerlessNodes().map((node) => node.id);
}

describe('BasicCycleBreakerTest.testIsAcyclic on the replayed models rows', () => {
  it('covers the 148 models rows ending in a cycle breaker', () => {
    expect(rows).toHaveLength(148);
  });

  it.each(rows.map((row) => [row.id, row] as const))(
    '%s: acyclic, explicit-stack dfs agrees with the Java twin',
    (_id, row) => {
      const graph = runPrefix(row, factories);
      const port = visitOrder(graph, false);
      const twin = visitOrder(graph, true);
      expect(port).toEqual(twin);
    },
  );
});

describe('BasicCycleBreakerTest dfs (B8)', () => {
  it('detects the cycle of a closed chain like the twin', () => {
    const closed = (useTwin: boolean): string => {
      // a closed chain has no source, so start the dfs at node 0 directly
      const { graph, nodes } = buildTarjanGraph(chainSpec(4, true));
      graph.getLayerlessNodes().forEach((node) => {
        node.id = DFS_UNVISITED;
      });
      const test = new AcyclicityTest();
      try {
        (useTwin ? test.dfsRecursive : test.dfs)(nodes[0]!);
      } catch (e) {
        return (e as Error).message;
      }
      return 'no failure';
    };
    expect(closed(false)).toBe(CYCLE_DETECTED);
    expect(closed(true)).toBe(CYCLE_DETECTED);
  });

  it(`${String(DEEP_CHAIN_LENGTH)}-node chain: no stack overflow in the port, numbers equal the twin`, () => {
    const port = visitOrder(buildTarjanGraph(chainSpec(DEEP_CHAIN_LENGTH, false)).graph, false);
    expect(port).toEqual(Array.from({ length: DEEP_CHAIN_LENGTH }, (_, i) => i + 1));
    let twin: number[] | null = null;
    try {
      twin = visitOrder(buildTarjanGraph(chainSpec(DEEP_CHAIN_LENGTH, false)).graph, true);
    } catch (e) {
      // the recursive twin itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(port).toEqual(twin);
    }
  });
});
