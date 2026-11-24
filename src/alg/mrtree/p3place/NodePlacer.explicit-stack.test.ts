// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack recursions of `NodePlacer` (mission tree-recursion-depth, #67, D3/D4) against verbatim
// transcriptions of the recursive Java (`NodePlacer.java:137-184` and `:319-343`), compared through `process` on seeded
// trees prepared by the real Neighbors and LevelHeight processors: every node's PRELIM and MODIFIER at raw bits, XCOOR,
// YCOOR and property order, and exceptions; plus a depth no recursion survives and a structure on which the Java
// recursion never ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphOf, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { doubleBits, seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { Direction } from '../../../core/options/Direction.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import { l2i, roundToLong } from '../../../java/lang/JavaMath.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { LevelHeightProcessor } from '../intermediate/LevelHeightProcessor.js';
import { NeighborsProcessor } from '../intermediate/NeighborsProcessor.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { NodePlacer } from './NodePlacer.js';
import { specOf } from '../../../../test/helpers/mrtree-tree-fixtures.js';

/** The private state and methods of `NodePlacer` under proof (test-only access). */
interface Internals {
  spacing: number;
  direction: Direction | null;
  firstWalk(cN: TNode, level: number): void;
  secondWalk(tNode: TNode | null, yCoor: number, modsum: number): void;
  apportion(cN: TNode, level: number): void;
  meanNodeWidth(leftNode: TNode | null, rightNode: TNode | null): number;
}

type MethodName = 'firstWalk' | 'secondWalk';
type Twin = (self: Internals, ...args: never[]) => void;
type Impl = (...args: never[]) => void;

const TREES = 60;
const MIN_LAID_OUT = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;
const DIRECTIONS = [Direction.UNDEFINED, Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP] as const;

/** Verbatim transcription of the recursive Java `firstWalk` (NodePlacer.java:137). */
function twinFirstWalk(self: Internals, cN: TNode, level: number): void {
  cN.setProperty(InternalProperties.MODIFIER, 0);
  const lS = cN.getProperty(InternalProperties.LEFTSIBLING);

  if (cN.isLeaf()) {
    if (lS !== null) {
      const p = lS.getProperty(InternalProperties.PRELIM) + self.spacing + self.meanNodeWidth(lS, cN);
      cN.setProperty(InternalProperties.PRELIM, p);
    } else {
      cN.setProperty(InternalProperties.PRELIM, 0);
    }
  } else {
    for (const child of cN.getChildren()) {
      twinFirstWalk(self, child, level + 1);
    }

    const lM = Iterables.getFirst(cN.getChildren(), null);
    const rM = Iterables.getLast(cN.getChildren(), null);
    const midPoint = (rM!.getProperty(InternalProperties.PRELIM) + lM!.getProperty(InternalProperties.PRELIM)) / 2;

    if (lS !== null) {
      const p = lS.getProperty(InternalProperties.PRELIM) + self.spacing + self.meanNodeWidth(lS, cN);
      cN.setProperty(InternalProperties.PRELIM, p);
      cN.setProperty(InternalProperties.MODIFIER, cN.getProperty(InternalProperties.PRELIM) - midPoint);
      self.apportion(cN, level);
    } else {
      cN.setProperty(InternalProperties.PRELIM, midPoint);
    }
  }
}

/** Verbatim transcription of the recursive Java `secondWalk` (NodePlacer.java:319). */
function twinSecondWalk(self: Internals, tNode: TNode | null, yCoor: number, modsum: number): void {
  if (tNode !== null) {
    const xTemp = tNode.getProperty(InternalProperties.PRELIM) + modsum;
    const yTemp = yCoor + tNode.getProperty(InternalProperties.LEVELHEIGHT) / 2;
    tNode.setProperty(InternalProperties.XCOOR, l2i(roundToLong(xTemp)));
    tNode.setProperty(InternalProperties.YCOOR, l2i(roundToLong(yTemp)));
    if (!tNode.isLeaf()) {
      twinSecondWalk(
        self,
        Iterables.getFirst(tNode.getChildren(), null),
        yCoor + tNode.getProperty(InternalProperties.LEVELHEIGHT) + self.spacing,
        modsum + tNode.getProperty(InternalProperties.MODIFIER),
      );
    }
    if (tNode.getProperty(InternalProperties.RIGHTSIBLING) !== null) {
      twinSecondWalk(self, tNode.getProperty(InternalProperties.RIGHTSIBLING), yCoor, modsum);
    }
  }
}

/**
 * A tree of a spec with sizes from its rectangles, prepared as the pipeline prepares phase 3 (root, neighbors,
 * heights).
 */
function buildGraph(spec: TreeSpec, seed: number): TGraph {
  const rnd = seededRandom(seed);
  const { g, nodes } = graphOf(
    spec.rects.length,
    spec.parents.map((parent, i) => [parent, i + 1] as const),
  );
  nodes.forEach((node, i) => {
    node.getSize().x = spec.rects[i]![2] + rnd() * 4;
    node.getSize().y = spec.rects[i]![3] + rnd() * 4;
  });
  nodes[0]!.setProperty(InternalProperties.ROOT, true);
  g.setProperty(MrTreeOptions.DIRECTION, DIRECTIONS[seed % DIRECTIONS.length]!);
  g.setProperty(MrTreeOptions.SPACING_NODE_NODE, 5 + (seed % 4) * 7.5);
  runOn(new NeighborsProcessor(), g);
  runOn(new LevelHeightProcessor(), g);
  return g;
}

/** Every node's placement properties: raw bits for the doubles, the ints as they are, the property order. */
function placement(graph: TGraph): unknown {
  return [...graph.getNodes()].map((node) => [
    doubleBits(node.getProperty(InternalProperties.PRELIM)),
    doubleBits(node.getProperty(InternalProperties.MODIFIER)),
    node.getProperty(InternalProperties.XCOOR),
    node.getProperty(InternalProperties.YCOOR),
    [...node.getAllProperties()].map(([key]) => key.getId()),
  ]);
}

/** Runs `process` with `twin` (or the port, given `null`) in place of `method`; records every effect. */
function run(method: MethodName, twin: Twin | null, graph: TGraph): unknown {
  if (twin !== null) {
    vi.spyOn(NodePlacer.prototype as unknown as Record<MethodName, Impl>, method).mockImplementation(function (
      this: Internals,
      ...args: never[]
    ) {
      twin(this, ...args);
    });
  }
  let error: string | null = null;
  try {
    new NodePlacer().process(graph, new NullElkProgressMonitor());
  } catch (e) {
    error = `${(e as Error).constructor.name}: ${(e as Error).message}`;
  } finally {
    vi.restoreAllMocks();
  }
  return { error, placement: placement(graph) };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** A placer with the fields `process` sets, for direct calls. */
function placer(): Internals {
  const self = new NodePlacer() as unknown as Internals;
  self.spacing = 20;
  self.direction = Direction.DOWN;
  return self;
}

/** A path of `DEEP_DEPTH` nodes whose node `i` is `10 + i % 5` wide. */
function deepPath(): { g: TGraph; root: TNode } {
  const { g, nodes } = graphOf(
    DEEP_DEPTH,
    Array.from({ length: DEEP_DEPTH - 1 }, (_, i) => [i, i + 1] as const),
  );
  nodes.forEach((node, i) => {
    node.getSize().x = 10 + (i % 5);
  });
  return { g, root: nodes[0]! };
}

/** Runs `call` on a fresh placer; returns the placement or the error. */
function attempt(graph: TGraph, call: (self: Internals) => void): { placement: unknown } | { error: unknown } {
  try {
    call(placer());
  } catch (e) {
    return { error: e };
  }
  return { placement: placement(graph) };
}

const TWINS: readonly (readonly [MethodName, Twin])[] = [
  ['firstWalk', twinFirstWalk as Twin],
  ['secondWalk', twinSecondWalk as Twin],
];

describe.each(TWINS)('NodePlacer.%s explicit stack (AC6, #67)', (method, twin) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(method, twin, buildGraph(specOf(seed), seed));
    expect(run(method, null, buildGraph(specOf(seed), seed))).toEqual(expected);
  });

  it(`at least ${String(MIN_LAID_OUT)} of the trees lay out`, () => {
    const outcomes = SEEDS.map((seed) => run(method, null, buildGraph(specOf(seed), seed)) as { error: unknown });
    expect(outcomes.filter((o) => o.error === null).length).toBeGreaterThanOrEqual(MIN_LAID_OUT);
  });
});

describe('NodePlacer.firstWalk deep and endless (AC6, #67)', () => {
  it(
    `a ${String(DEEP_DEPTH)}-node path completes like the twin`,
    () => {
      const p = deepPath();
      const port = attempt(p.g, (self) => {
        self.firstWalk(p.root, 0);
      });
      expect(port).toHaveProperty('placement');
      // NodePlacer.java:146 and :179: the leaf's PRELIM is 0, and each parent takes the midpoint of its one child, 0
      expect((port as { placement: string[][] }).placement[0]![0]).toBe(doubleBits(0));
      const t = deepPath();
      const twinResult = attempt(t.g, (self) => {
        twinFirstWalk(self, t.root, 0);
      });
      if ('error' in twinResult) {
        // the recursive twin may overflow the stack; the port must not
        expect(twinResult.error).toBeInstanceOf(RangeError);
      } else {
        expect(twinResult).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it(
    'a node that is its own child: RangeError, as the Java StackOverflowError',
    () => {
      const loop = (): { g: TGraph; root: TNode } => {
        const { g, nodes } = graphOf(1, [[0, 0]]);
        return { g, root: nodes[0]! };
      };
      const l1 = loop();
      const port = attempt(l1.g, (self) => {
        self.firstWalk(l1.root, 0);
      }) as { error: Error };
      expect(port.error).toBeInstanceOf(RangeError);
      expect(port.error.message).toBe('Maximum call stack size exceeded');
      expect(port.error.stack).toContain('NodePlacer');
      const l2 = loop();
      const twinResult = attempt(l2.g, (self) => {
        twinFirstWalk(self, l2.root, 0);
      }) as { error: unknown };
      expect(twinResult.error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});

/**
 * A caterpillar of `DEEP_DEPTH` levels prepared by the real NeighborsProcessor: spine node `k` is `n<2k>`, its leaf
 * `n<2k+1>` (the spine edge first, so the leaf is the spine node's right sibling and the walk alternates first-child
 * and right-sibling calls); PRELIM, MODIFIER and LEVELHEIGHT vary per node.
 */
function deepCaterpillar(): { g: TGraph; root: TNode } {
  const edges: [number, number][] = [];
  for (let k = 0; k < DEEP_DEPTH - 1; k++) {
    edges.push([2 * k, 2 * k + 2], [2 * k, 2 * k + 1]);
  }
  const { g, nodes } = graphOf(2 * DEEP_DEPTH - 1, edges);
  nodes[0]!.setProperty(InternalProperties.ROOT, true);
  runOn(new NeighborsProcessor(), g);
  nodes.forEach((node, i) => {
    node.setProperty(InternalProperties.PRELIM, (i % 3) * 12.25);
    node.setProperty(InternalProperties.MODIFIER, (i % 5) * 0.75 - 1);
    node.setProperty(InternalProperties.LEVELHEIGHT, 10 + (i % 4) * 0.5);
  });
  return { g, root: nodes[0]! };
}

describe('NodePlacer.secondWalk deep and endless (AC6, #67)', () => {
  it(
    `a ${String(DEEP_DEPTH)}-level caterpillar completes like the twin`,
    () => {
      const p = deepCaterpillar();
      const port = attempt(p.g, (self) => {
        self.secondWalk(p.root, 0, 0);
      });
      expect(port).toHaveProperty('placement');
      // NodePlacer.java:306-310 for the root: x = round(PRELIM 0 + 0), y = round(0 + 10 / 2)
      expect((port as { placement: unknown[][] }).placement[0]!.slice(2, 4)).toEqual([0, 5]);
      const t = deepCaterpillar();
      const twinResult = attempt(t.g, (self) => {
        twinSecondWalk(self, t.root, 0, 0);
      });
      if ('error' in twinResult) {
        // the recursive twin may overflow the stack; the port must not
        expect(twinResult.error).toBeInstanceOf(RangeError);
      } else {
        expect(twinResult).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it(
    'a node that is its own right sibling: RangeError, as the Java StackOverflowError',
    () => {
      const loop = (): { g: TGraph; root: TNode } => {
        const { g, nodes } = graphOf(1, []);
        nodes[0]!.setProperty(InternalProperties.RIGHTSIBLING, nodes[0]!);
        return { g, root: nodes[0]! };
      };
      const l1 = loop();
      const port = attempt(l1.g, (self) => {
        self.secondWalk(l1.root, 0, 0);
      }) as { error: Error };
      expect(port.error).toBeInstanceOf(RangeError);
      expect(port.error.message).toBe('Maximum call stack size exceeded');
      expect(port.error.stack).toContain('NodePlacer');
      const l2 = loop();
      const twinResult = attempt(l2.g, (self) => {
        twinSecondWalk(self, l2.root, 0, 0);
      }) as { error: unknown };
      expect(twinResult.error).toBeInstanceOf(RangeError);
    },
    TIMEOUT,
  );
});
