// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit loop of `LevelHeightProcessor.setNeighbors` (mission tree-recursion-depth, #67, D3/D4) against
// a verbatim transcription of the recursive Java (`LevelHeightProcessor.java:81-131`), compared through `process` on
// seeded trees and DAGs in all directions: every node's LEVELHEIGHT at raw bits and property order, and the progress
// monitor's sub-tasks; plus a depth no recursion survives and a child structure that never ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphOf } from '../../../../test/helpers/mrtree-processor-replay.js';
import { doubleBits, seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { Direction } from '../../../core/options/Direction.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { LevelHeightProcessor } from './LevelHeightProcessor.js';
import { specOf, monitorTree } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and method of `LevelHeightProcessor` under proof (test-only access). */
interface Internals {
  numberOfNodes: number;
  setNeighbors(currentLevel: Iterable<TNode>, progressMonitor: IElkProgressMonitor, layoutDirection: Direction): void;
}

const TREES = 60;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const EXTRA_EDGE_PROBABILITY = 0.15;
const DIRECTIONS = [Direction.UNDEFINED, Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP] as const;

const EMPTY_ITERABLE: Iterable<TNode> = {
  [Symbol.iterator]: (): Iterator<TNode> => [][Symbol.iterator](),
};

/**
 * The two scan loops of the Java `setNeighbors` (LevelHeightProcessor.java:100-117), verbatim; split for the NLOC
 * limit.
 */
function twinScan(currentLevel: Iterable<TNode>, layoutDirection: Direction): [Iterable<TNode>, number] {
  let nextLevel: Iterable<TNode> = EMPTY_ITERABLE;
  let height = 0;
  if (layoutDirection.isHorizontal()) {
    for (const cN of currentLevel) {
      nextLevel = Iterables.concat(nextLevel, cN.getChildren());
      if (height < cN.getSize().x) {
        height = cN.getSize().x;
      }
    }
  } else {
    for (const cN of currentLevel) {
      nextLevel = Iterables.concat(nextLevel, cN.getChildren());
      if (height < cN.getSize().y) {
        height = cN.getSize().y;
      }
    }
  }
  return [nextLevel, height];
}

/** Verbatim transcription of the recursive Java `setNeighbors` (LevelHeightProcessor.java:81). */
function twinSetNeighbors(
  self: Internals,
  currentLevel: Iterable<TNode>,
  progressMonitor: IElkProgressMonitor,
  layoutDirection: Direction,
): void {
  if (!Iterables.isEmpty(currentLevel)) {
    const sT = progressMonitor.subTask(Int32.div(Iterables.size(currentLevel), self.numberOfNodes))!;
    sT.begin('Set neighbors in level', 1);
    const [nextLevel, height] = twinScan(currentLevel, layoutDirection);
    for (const cN of currentLevel) {
      cN.setProperty(InternalProperties.LEVELHEIGHT, height);
    }
    sT.done();
    twinSetNeighbors(self, nextLevel, progressMonitor, layoutDirection);
  }
}

/**
 * A tree of a spec (sizes from its rectangles) with extra forward edges; node 0 is the root on all but every tenth
 * seed.
 */
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
    node.getSize().x = spec.rects[i]![2] + rnd();
    node.getSize().y = spec.rects[i]![3] + rnd();
  });
  if (seed % 10 !== 0) {
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
  }
  g.setProperty(MrTreeOptions.DIRECTION, DIRECTIONS[seed % DIRECTIONS.length]!);
  return g;
}

const heightBits = (node: TNode): string | null => {
  const height = node.getProperty(InternalProperties.LEVELHEIGHT);
  return node.hasProperty(InternalProperties.LEVELHEIGHT) ? doubleBits(height) : null;
};

/** Runs `process` with the port or, given `useTwin`, with the twin in place of `setNeighbors`; records every effect. */
function run(graph: TGraph, useTwin: boolean): unknown {
  if (useTwin) {
    vi.spyOn(LevelHeightProcessor.prototype as unknown as Internals, 'setNeighbors').mockImplementation(function (
      this: Internals,
      currentLevel: Iterable<TNode>,
      progressMonitor: IElkProgressMonitor,
      layoutDirection: Direction,
    ) {
      twinSetNeighbors(this, currentLevel, progressMonitor, layoutDirection);
    });
  }
  const monitor = new BasicProgressMonitor();
  try {
    new LevelHeightProcessor().process(graph, monitor);
  } finally {
    vi.restoreAllMocks();
  }
  return {
    nodes: [...graph.getNodes()].map((node) => [
      heightBits(node),
      [...node.getAllProperties()].map(([key]) => key.getId()),
    ]),
    monitor: monitorTree(monitor),
  };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** Runs `setNeighbors` (port, or twin) from one root; returns every node's level height bits, or the error. */
function runLevels(graph: TGraph, root: TNode, useTwin: boolean): { heights: unknown } | { error: unknown } {
  const self = new LevelHeightProcessor() as unknown as Internals;
  self.numberOfNodes = graph.getNodes().size();
  try {
    if (useTwin) {
      twinSetNeighbors(self, [root], new NullElkProgressMonitor(), Direction.DOWN);
    } else {
      self.setNeighbors([root], new NullElkProgressMonitor(), Direction.DOWN);
    }
  } catch (e) {
    return { error: e };
  }
  return { heights: [...graph.getNodes()].map(heightBits) };
}

function deepPath(): { g: TGraph; root: TNode } {
  const { g, nodes } = graphOf(
    DEEP_DEPTH,
    Array.from({ length: DEEP_DEPTH - 1 }, (_, i) => [i, i + 1] as const),
  );
  nodes.forEach((node, i) => {
    node.getSize().y = 10 + (i % 7) * 0.5;
  });
  return { g, root: nodes[0]! };
}

describe('LevelHeightProcessor.setNeighbors explicit loop (AC6, #67)', () => {
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
      const p = deepPath();
      const port = runLevels(p.g, p.root, false);
      expect(port).toHaveProperty('heights');
      // LevelHeightProcessor.java:112-121: one node per level, so its own height (10 + (i % 7) * 0.5) is the level's
      expect((port as { heights: string[] }).heights[DEEP_DEPTH - 1]).toBe(
        doubleBits(10 + ((DEEP_DEPTH - 1) % 7) * 0.5),
      );
      const t = deepPath();
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
      expect(port.error.stack).toContain('LevelHeightProcessor');
      const l2 = loop();
      expect((runLevels(l2.g, l2.root, true) as { error: unknown }).error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});
