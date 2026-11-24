// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit loop of `LevelProcessor.setLevel` (mission tree-recursion-depth, #67, D3/D4) against a verbatim
// transcription of the recursive Java (`LevelProcessor.java:64-77`), compared through `process` on seeded trees and
// DAGs with one or several roots: every node's TREE_LEVEL and property order and the level map; plus a depth no
// recursion survives and a child structure that never ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphOf, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import type { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { LevelProcessor } from './LevelProcessor.js';
import { specOf } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and method of `LevelProcessor` under proof (test-only access). */
interface Internals {
  gloLevelMap: JavaHashMap<number, number>;
  setLevel(currentLevel: LinkedList<TNode>, level: number): void;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const EXTRA_EDGE_PROBABILITY = 0.15;
const EXTRA_ROOT_PROBABILITY = 0.1;

/** Verbatim transcription of the recursive Java `setLevel` (LevelProcessor.java:64). */
function twinSetLevel(self: Internals, currentLevel: LinkedList<TNode>, level: number): void {
  if (!currentLevel.isEmpty()) {
    const nextLevel = new LinkedList<TNode>();

    for (const tNode of currentLevel) {
      self.gloLevelMap.put(tNode.id, level);
      for (const tChild of tNode.getChildren()) {
        nextLevel.add(tChild);
      }
    }

    twinSetLevel(self, nextLevel, level + 1);
  }
}

/** A tree of a spec with extra forward edges (a DAG) and extra roots; node 0 is a root on all but every tenth seed. */
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
  nodes.forEach((node, i) => {
    if ((i === 0 && seed % 10 !== 0) || rnd() < EXTRA_ROOT_PROBABILITY) {
      node.setProperty(InternalProperties.ROOT, true);
    }
  });
  return g;
}

/** Runs `process` with the port or, given `useTwin`, with the twin in place of `setLevel`; records every effect. */
function run(graph: TGraph, useTwin: boolean): unknown {
  if (useTwin) {
    vi.spyOn(LevelProcessor.prototype as unknown as Internals, 'setLevel').mockImplementation(function (
      this: Internals,
      currentLevel: LinkedList<TNode>,
      level: number,
    ) {
      twinSetLevel(this, currentLevel, level);
    });
  }
  const processor = new LevelProcessor();
  try {
    runOn(processor, graph);
  } finally {
    vi.restoreAllMocks();
  }
  return {
    nodes: [...graph.getNodes()].map((node) => [
      node.getProperty(MrTreeOptions.TREE_LEVEL),
      [...node.getAllProperties()].map(([key]) => key.getId()),
    ]),
    levels: [...(processor as unknown as Internals).gloLevelMap],
  };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** Runs `setLevel` (port, or twin) from one node at level 0; returns the level map or the error. */
function runLevels(root: TNode, useTwin: boolean): { levels: unknown } | { error: unknown } {
  const self = new LevelProcessor() as unknown as Internals;
  const rootLevel = new LinkedList<TNode>();
  rootLevel.add(root);
  try {
    if (useTwin) {
      twinSetLevel(self, rootLevel, 0);
    } else {
      self.setLevel(rootLevel, 0);
    }
  } catch (e) {
    return { error: e };
  }
  return { levels: [...self.gloLevelMap] };
}

const deepPath = (): TNode =>
  graphOf(
    DEEP_DEPTH,
    Array.from({ length: DEEP_DEPTH - 1 }, (_, i) => [i, i + 1] as const),
  ).nodes[0]!;

describe('LevelProcessor.setLevel explicit loop (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(buildGraph(specOf(seed), seed), true);
    expect(run(buildGraph(specOf(seed), seed), false)).toEqual(expected);
  });

  it(
    `a ${String(DEEP_DEPTH)}-level path completes like the twin`,
    () => {
      const port = runLevels(deepPath(), false);
      expect(port).toHaveProperty('levels');
      // LevelProcessor.java:69: node i of the path is put at level i
      expect((port as { levels: [number, number][] }).levels.find(([id]) => id === DEEP_DEPTH - 1)).toEqual([
        DEEP_DEPTH - 1,
        DEEP_DEPTH - 1,
      ]);
      const twin = runLevels(deepPath(), true);
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
      const loop = (): TNode => graphOf(1, [[0, 0]]).nodes[0]!;
      const port = runLevels(loop(), false) as { error: Error };
      expect(port.error).toBeInstanceOf(RangeError);
      expect(port.error.message).toBe('Maximum call stack size exceeded');
      expect(port.error.stack).toContain('LevelProcessor');
      expect((runLevels(loop(), true) as { error: unknown }).error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});
