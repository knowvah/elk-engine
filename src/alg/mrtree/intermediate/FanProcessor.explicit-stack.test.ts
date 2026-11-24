// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit loop of `FanProcessor.calculateFan` (mission tree-recursion-depth, #67, D3/D4) against a
// verbatim transcription of the recursive Java (`FanProcessor.java:85-148`), compared through `process` on seeded trees
// and DAGs: every node's ID, FAN and DESCENDANTS values and property order, both global maps in iteration order and
// exceptions; plus a depth no recursion survives and a child structure that never ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import { STRING } from '../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { FanProcessor } from './FanProcessor.js';
import { addEdge, specOf } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and methods of `FanProcessor` under proof (test-only access). */
interface Internals {
  gloFanMap: JavaHashMap<string, number>;
  gloDescMap: JavaHashMap<string, number>;
  calculateFan(currentLevel: LinkedList<TNode>): void;
  assignIds(currentLevel: LinkedList<TNode>, nextLevel: LinkedList<TNode>, digits: number): string;
  countDescendants(currentLevel: LinkedList<TNode>, id: string, digits: number): JavaHashMap<string, number>;
  mergeLocal(locFanMap: JavaHashMap<string, number>): void;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const EXTRA_EDGE_PROBABILITY = 0.1;
const ROOTLESS_EVERY = 15;

/**
 * Verbatim transcription of the recursive Java `calculateFan` (FanProcessor.java:85). Its three statement groups are
 * the port's helpers (`assignIds`, `countDescendants`, `mergeLocal`, split for the complexity limits before this
 * mission and not changed by it); the recursion is the Java's.
 */
function twinCalculateFan(self: Internals, currentLevel: LinkedList<TNode>): void {
  if (!currentLevel.isEmpty()) {
    const nextLevel = new LinkedList<TNode>();
    const digits = d2i(Math.floor(Math.log10(currentLevel.size())) + 1);
    const id = self.assignIds(currentLevel, nextLevel, digits);
    const locFanMap = self.countDescendants(currentLevel, id, digits);
    self.mergeLocal(locFanMap);
    twinCalculateFan(self, nextLevel);
  }
}

function nodesOf(graph: TGraph, count: number): TNode[] {
  return Array.from({ length: count }, (_, i) => {
    const node = new TNode(i, graph, `n${String(i)}`);
    graph.getNodes().add(node);
    return node;
  });
}

/**
 * A tree of a spec with some extra forward edges (a DAG: nodes with two parents, whose BFS-like levels repeat ids); the
 * root is a random node of the first few, and every `ROOTLESS_EVERY`-th seed has no root (the Java fails on `null`).
 */
function buildGraph(spec: TreeSpec, seed: number): TGraph {
  const rnd = seededRandom(seed);
  const graph = new TGraph();
  const nodes = nodesOf(graph, spec.rects.length);
  spec.parents.forEach((parent, i) => addEdge(graph, nodes[parent]!, nodes[i + 1]!));
  for (let i = 0; i < nodes.length; i++) {
    if (rnd() < EXTRA_EDGE_PROBABILITY) {
      const target = i + 1 + Math.floor(rnd() * (nodes.length - i));
      if (target < nodes.length) {
        addEdge(graph, nodes[i]!, nodes[target]!);
      }
    }
  }
  if (seed % ROOTLESS_EVERY !== 0) {
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
  }
  return graph;
}

/** Runs `process` with the port or, given `useTwin`, with the twin in place of `calculateFan`; records every effect. */
function run(graph: TGraph, useTwin: boolean): unknown {
  if (useTwin) {
    vi.spyOn(FanProcessor.prototype as unknown as Internals, 'calculateFan').mockImplementation(function (
      this: Internals,
      level: LinkedList<TNode>,
    ) {
      twinCalculateFan(this, level);
    });
  }
  const processor = new FanProcessor();
  let error: string | null = null;
  try {
    processor.process(graph, new NullElkProgressMonitor());
  } catch (e) {
    error = `${(e as Error).constructor.name}: ${(e as Error).message}`;
  } finally {
    vi.restoreAllMocks();
  }
  const internals = processor as unknown as Internals;
  return {
    error,
    nodes: [...graph.getNodes()].map((node) => [
      node.getProperty(InternalProperties.ID),
      node.getProperty(InternalProperties.FAN),
      node.getProperty(InternalProperties.DESCENDANTS),
      [...node.getAllProperties()].map(([key]) => key.getId()),
    ]),
    fan: [...internals.gloFanMap],
    desc: [...internals.gloDescMap],
  };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/**
 * Stubs `countDescendants`, which hashes every prefix of the level's ids: on a path its work grows with the square of
 * the depth at every level, far beyond a test's time at 15,000 levels. It is not part of the recursion and runs the
 * same for port and twin; the stub returns an empty map, so `mergeLocal` does nothing.
 */
function stubCountDescendants(): void {
  vi.spyOn(FanProcessor.prototype as unknown as Internals, 'countDescendants').mockImplementation(
    () => new JavaHashMap<string, number>(STRING),
  );
}

/** Runs `calculateFan` (port, or twin) on the root level of a graph; returns every node's ID or the error. */
function runLevels(graph: TGraph, root: TNode, useTwin: boolean): { ids: string[] } | { error: unknown } {
  const self = new FanProcessor() as unknown as Internals;
  const rootLevel = new LinkedList<TNode>();
  rootLevel.add(root);
  try {
    if (useTwin) {
      twinCalculateFan(self, rootLevel);
    } else {
      self.calculateFan(rootLevel);
    }
  } catch (e) {
    return { error: e };
  }
  return { ids: [...graph.getNodes()].map((node) => node.getProperty(InternalProperties.ID)) };
}

describe('FanProcessor.calculateFan explicit loop (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(buildGraph(specOf(seed), seed), true);
    expect(run(buildGraph(specOf(seed), seed), false)).toEqual(expected);
  });

  it('at least 40 seeded graphs lay out; the rootless ones and some DAGs fail as the Java does', () => {
    const outcomes = SEEDS.map((seed) => run(buildGraph(specOf(seed), seed), false) as { error: string | null });
    expect(outcomes.filter((o) => o.error === null).length).toBeGreaterThanOrEqual(40);
    const errors = outcomes.map((o) => o.error).filter((e) => e !== null);
    // FanProcessor.java:128: a node whose id is shorter than the level's last id (a second parent on a shallower level)
    expect(errors.filter((e) => e.startsWith('StringIndexOutOfBoundsException')).length).toBeGreaterThan(0);
    expect(errors.length).toBeGreaterThan(TREES / ROOTLESS_EVERY);
  });

  it(
    `a ${String(DEEP_DEPTH)}-level path completes like the twin`,
    () => {
      stubCountDescendants();
      const path = (): { graph: TGraph; root: TNode } => {
        const graph = new TGraph();
        const nodes = nodesOf(graph, DEEP_DEPTH);
        for (let i = 1; i < DEEP_DEPTH; i++) {
          addEdge(graph, nodes[i - 1]!, nodes[i]!);
        }
        return { graph, root: nodes[0]! };
      };
      const p = path();
      const port = runLevels(p.graph, p.root, false);
      expect(port).toHaveProperty('ids');
      // FanProcessor.java:107-114: every level holds one node, so each id extends its parent's by "0"
      expect((port as { ids: string[] }).ids[DEEP_DEPTH - 1]).toBe('0'.repeat(DEEP_DEPTH));
      const t = path();
      const twin = runLevels(t.graph, t.root, true);
      if ('error' in twin) {
        // the recursive twin may overflow the stack; the port must not
        expect(twin.error).toBeInstanceOf(RangeError);
      } else {
        expect(twin).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it(
    'a node that is its own child never empties the level: RangeError, as the Java StackOverflowError',
    () => {
      stubCountDescendants();
      const loop = (): { graph: TGraph; root: TNode } => {
        const graph = new TGraph();
        const [node] = nodesOf(graph, 1);
        addEdge(graph, node!, node!);
        return { graph, root: node! };
      };
      const l1 = loop();
      const port = runLevels(l1.graph, l1.root, false) as { error: Error };
      expect(port.error).toBeInstanceOf(RangeError);
      expect(port.error.message).toBe('Maximum call stack size exceeded');
      expect(port.error.stack).toContain('FanProcessor');
      const l2 = loop();
      expect((runLevels(l2.graph, l2.root, true) as { error: unknown }).error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});
