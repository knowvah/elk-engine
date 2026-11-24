// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit loop of `NeighborsProcessor.setNeighbors` (mission tree-recursion-depth, #67, D3/D4) against a
// verbatim transcription of the recursive Java (`NeighborsProcessor.java:80-125`), compared through `process` on seeded
// trees and DAGs: every node's neighbor and sibling properties and their order, and the progress monitor's sub-tasks;
// plus a depth no recursion survives and a child structure that never ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphOf } from '../../../../test/helpers/mrtree-processor-replay.js';
import { seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { NeighborsProcessor } from './NeighborsProcessor.js';
import { specOf, monitorTree } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and method of `NeighborsProcessor` under proof (test-only access). */
interface Internals {
  numberOfNodes: number;
  setNeighbors(currentLevel: Iterable<TNode>, progressMonitor: IElkProgressMonitor): void;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const EXTRA_EDGE_PROBABILITY = 0.15;

const EMPTY_ITERABLE: Iterable<TNode> = {
  [Symbol.iterator]: (): Iterator<TNode> => [][Symbol.iterator](),
};

/** Verbatim transcription of the recursive Java `setNeighbors` (NeighborsProcessor.java:80). */
function twinSetNeighbors(self: Internals, currentLevel: Iterable<TNode>, progressMonitor: IElkProgressMonitor): void {
  /** only do something in filled levels */
  if (!Iterables.isEmpty(currentLevel)) {
    /** create subtask for recursive descent */
    const sT = progressMonitor.subTask(Int32.div(Iterables.size(currentLevel), self.numberOfNodes))!;

    sT.begin('Set neighbors in level', 1);

    /** build empty iterator */
    let nextLevel: Iterable<TNode> = EMPTY_ITERABLE;

    let lN: TNode | null = null;

    for (const cN of currentLevel) {
      /** append the children of the current node to the next level */
      nextLevel = Iterables.concat(nextLevel, cN.getChildren());
      if (lN !== null) {
        lN.setProperty(InternalProperties.RIGHTNEIGHBOR, cN);
        cN.setProperty(InternalProperties.LEFTNEIGHBOR, lN);
        if (cN.getParent() === lN.getParent()) {
          lN.setProperty(InternalProperties.RIGHTSIBLING, cN);
          cN.setProperty(InternalProperties.LEFTSIBLING, lN);
        }
      }

      lN = cN;
    }

    /** add amount of work units to the whole task */
    sT.done();

    /** determine neighbors by bfs and for the whole graph */
    twinSetNeighbors(self, nextLevel, progressMonitor);
  }
}

/** A tree of a spec with extra forward edges (a DAG); node 0 is the root on all but every tenth seed. */
function buildGraph(spec: TreeSpec, seed: number): TGraph {
  const rnd = seededRandom(seed);
  const edges: [number, number][] = spec.parents.map((parent, i) => [parent, i + 1]);
  const n = spec.rects.length;
  for (let i = 0; i < n; i++) {
    if (rnd() < EXTRA_EDGE_PROBABILITY) {
      const target = i + 1 + Math.floor(rnd() * (n - i));
      if (target < n) {
        edges.push([i, target]);
      }
    }
  }
  const { g, nodes } = graphOf(n, edges);
  if (seed % 10 !== 0) {
    nodes[Math.floor(rnd() * Math.min(n, 3))]!.setProperty(InternalProperties.ROOT, true);
  }
  return g;
}

const labelOf = (node: TNode | null): string | null => (node === null ? null : node.getLabel());

/** Runs `process` with the port or, given `useTwin`, with the twin in place of `setNeighbors`; records every effect. */
function run(graph: TGraph, useTwin: boolean): unknown {
  if (useTwin) {
    vi.spyOn(NeighborsProcessor.prototype as unknown as Internals, 'setNeighbors').mockImplementation(function (
      this: Internals,
      currentLevel: Iterable<TNode>,
      progressMonitor: IElkProgressMonitor,
    ) {
      twinSetNeighbors(this, currentLevel, progressMonitor);
    });
  }
  const monitor = new BasicProgressMonitor();
  try {
    new NeighborsProcessor().process(graph, monitor);
  } finally {
    vi.restoreAllMocks();
  }
  return {
    nodes: [...graph.getNodes()].map((node) => [
      labelOf(node.getProperty(InternalProperties.LEFTNEIGHBOR)),
      labelOf(node.getProperty(InternalProperties.RIGHTNEIGHBOR)),
      labelOf(node.getProperty(InternalProperties.LEFTSIBLING)),
      labelOf(node.getProperty(InternalProperties.RIGHTSIBLING)),
      [...node.getAllProperties()].map(([key]) => key.getId()),
    ]),
    monitor: monitorTree(monitor),
  };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** Runs `setNeighbors` (port, or twin) on a node's children; returns every node's left neighbor, or the error. */
function runLevels(graph: TGraph, root: TNode, useTwin: boolean): { left: unknown } | { error: unknown } {
  const self = new NeighborsProcessor() as unknown as Internals;
  self.numberOfNodes = graph.getNodes().size();
  try {
    if (useTwin) {
      twinSetNeighbors(self, root.getChildren(), new NullElkProgressMonitor());
    } else {
      self.setNeighbors(root.getChildren(), new NullElkProgressMonitor());
    }
  } catch (e) {
    return { error: e };
  }
  return { left: [...graph.getNodes()].map((node) => labelOf(node.getProperty(InternalProperties.LEFTNEIGHBOR))) };
}

/**
 * A caterpillar: spine node `k` is `n<2k>`, its leaf `n<2k+1>` (the leaf's edge first), so every level below the root
 * holds a leaf and a spine node.
 */
function deepCaterpillar(depth = DEEP_DEPTH): { g: TGraph; root: TNode } {
  const edges: [number, number][] = [];
  for (let k = 0; k < depth - 1; k++) {
    edges.push([2 * k, 2 * k + 1], [2 * k, 2 * k + 2]);
  }
  const { g, nodes } = graphOf(2 * depth - 1, edges);
  return { g, root: nodes[0]! };
}

describe('NeighborsProcessor.setNeighbors explicit loop (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(buildGraph(specOf(seed), seed), true);
    expect(run(buildGraph(specOf(seed), seed), false)).toEqual(expected);
  });

  it(
    `a ${String(DEEP_DEPTH)}-level caterpillar completes like the twin`,
    () => {
      const p = deepCaterpillar();
      const port = runLevels(p.g, p.root, false);
      expect(port).toHaveProperty('left');
      // NeighborsProcessor.java:105-108: level k holds [leaf of spine k - 1, spine k], so the leaf is the spine's left
      // neighbor
      expect((port as { left: (string | null)[] }).left.slice(0, 6)).toEqual([null, null, 'n1', null, 'n3', null]);
      const t = deepCaterpillar();
      const twin = runLevels(t.g, t.root, true);
      if ('error' in twin) {
        // the recursive twin may overflow the stack; the port must not
        expect(twin.error).toBeInstanceOf(RangeError);
      } else {
        expect(twin).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it('a shallow caterpillar gives the twin the same left neighbors', () => {
    const p = deepCaterpillar(4);
    const t = deepCaterpillar(4);
    expect(runLevels(t.g, t.root, true)).toEqual({ left: [null, null, 'n1', null, 'n3', null, 'n5'] });
    expect(runLevels(p.g, p.root, false)).toEqual(runLevels(t.g, t.root, true));
  });

  it(
    'a node that is its own child never empties the level: RangeError, as the Java StackOverflowError',
    () => {
      const loop = (): { g: TGraph; root: TNode } => {
        const { g, nodes } = graphOf(1, [[0, 0]]);
        return { g, root: nodes[0]! };
      };
      const l1 = loop();
      const port = runLevels(l1.g, l1.root, false) as { error: Error };
      expect(port.error).toBeInstanceOf(RangeError);
      expect(port.error.message).toBe('Maximum call stack size exceeded');
      expect(port.error.stack).toContain('NeighborsProcessor');
      const l2 = loop();
      expect((runLevels(l2.g, l2.root, true) as { error: unknown }).error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});
