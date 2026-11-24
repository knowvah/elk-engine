// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack recursions of `AbsoluteXPlacer` (mission tree-recursion-depth, #67, D3/D4) against verbatim
// transcriptions of the recursive Java (`AbsoluteXPlacer.java:46-71`) on seeded trees laid out end to end, compared at raw
// bits (return values included) and property-map order, plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { doubleBits, pathSpec, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { dumpVertiFlex } from '../../../../test/helpers/vertiflex-replay-dump.js';
import { VertiFlexLayoutProvider } from '../VertiFlexLayoutProvider.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';
import { AbsoluteXPlacer } from './AbsoluteXPlacer.js';
import {
  buildGraph,
  cycleRoot,
  propertyKeys,
  thrown,
  specOf,
} from '../../../../test/helpers/vertiflex-tree-fixtures.js';

/** The private methods of `AbsoluteXPlacer` under proof (test-only access). */
interface Internals {
  findMinimalX(tree: ElkNode): number;
  absoluteTreeCoords(tree: ElkNode): void;
}

type MethodName = keyof Internals;
type Impl = (tree: ElkNode) => number | undefined;

const TREES = 60;
const MIN_LAID_OUT = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;

/** Verbatim transcription of the recursive Java `findMinimalX` (AbsoluteXPlacer.java:46). */
function twinFindMinimalX(tree: ElkNode): number {
  const numOfChildren = tree.getOutgoingEdges().size();
  if (numOfChildren === 0) {
    return tree.getX();
  } else {
    let minSubtreeX = 0.0;
    let testX = 0.0;
    for (let i = 0; i < numOfChildren; i++) {
      testX = twinFindMinimalX(castToElkNode(tree.getOutgoingEdges().get(i).getTargets().get(0)!));
      minSubtreeX = testX < minSubtreeX ? testX : minSubtreeX;
    }
    return minSubtreeX + tree.getX();
  }
}

/** Verbatim transcription of the recursive Java `absoluteTreeCoords` (AbsoluteXPlacer.java:61). */
function twinAbsoluteTreeCoords(tree: ElkNode): undefined {
  const numOfChildren = tree.getOutgoingEdges().size();
  if (numOfChildren > 0) {
    let child: ElkNode;
    for (let i = 0; i < numOfChildren; i++) {
      child = castToElkNode(tree.getOutgoingEdges().get(i).getTargets().get(0)!);
      child.setX(child.getX() + tree.getX());
      twinAbsoluteTreeCoords(child);
    }
  }
  return undefined;
}

interface Outcome {
  readonly error: string | null;
  readonly exits: unknown[];
  readonly keys: string[][];
  readonly dump: unknown;
}

/** Lays a spec out with `impl` in place of `method`; records the result and graph at the method's exit and at the end. */
function run(method: MethodName, spec: TreeSpec, seed: number, impl: Impl | null): Outcome {
  const original = (AbsoluteXPlacer.prototype as unknown as Record<MethodName, Impl>)[method];
  const graph = buildGraph(spec, seed % 4, seed);
  const exits: unknown[] = [];
  let active = false;
  vi.spyOn(AbsoluteXPlacer.prototype as unknown as Record<MethodName, Impl>, method).mockImplementation(function (
    this: Internals,
    tree: ElkNode,
  ) {
    // a recursive port re-enters through the spy: nested activations run the original and record nothing
    if (active) {
      return original.call(this, tree);
    }
    active = true;
    const result = impl === null ? original.call(this, tree) : impl(tree);
    active = false;
    exits.push([result === undefined ? null : doubleBits(result), propertyKeys(graph), dumpVertiFlex(graph)]);
    return result;
  });
  let error: string | null = null;
  try {
    new VertiFlexLayoutProvider().layout(graph, new BasicProgressMonitor());
  } catch (e) {
    error = `${(e as Error).constructor.name}: ${(e as Error).message}`;
  }
  vi.restoreAllMocks();
  return { error, exits, keys: propertyKeys(graph), dump: dumpVertiFlex(graph) };
}

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** A deep path whose node `i` sits at relative x `xOf(i)`, as phase 2 leaves it. */
function deepPath(xOf: (i: number) => number): { graph: ElkNode; root: ElkNode } {
  const graph = buildGraph(pathSpec(DEEP_DEPTH, 20), 0, 1);
  [...graph.getChildren()].forEach((node, i) => node.setX(xOf(i)));
  return { graph, root: graph.getChildren().get(0) };
}

/** Runs `impl` on a fresh deep path; `null` when the recursion overflows the stack. */
function deepAttempt(
  impl: (self: Internals, root: ElkNode) => number | undefined,
  xOf: (i: number) => number,
): { result: number | undefined; dump: unknown } | null {
  const { graph, root } = deepPath(xOf);
  try {
    const result = impl(new AbsoluteXPlacer() as unknown as Internals, root);
    return { result, dump: dumpVertiFlex(graph) };
  } catch (e) {
    expect(e).toBeInstanceOf(RangeError);
    return null;
  }
}

const TWINS: readonly (readonly [MethodName, Impl])[] = [
  ['findMinimalX', twinFindMinimalX],
  ['absoluteTreeCoords', twinAbsoluteTreeCoords],
];

describe.each(TWINS)('AbsoluteXPlacer.%s explicit stack (AC6, #67)', (method, twin) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(method, specOf(seed), seed, twin);
    expect(run(method, specOf(seed), seed, null)).toEqual(expected);
  });

  it(`at least ${String(MIN_LAID_OUT)} of the trees reach the method and lay out`, () => {
    const outcomes = SEEDS.map((seed) => run(method, specOf(seed), seed, null));
    expect(outcomes.filter((o) => o.error === null && o.exits.length === 1).length).toBeGreaterThanOrEqual(
      MIN_LAID_OUT,
    );
  });

  it(
    `a ${String(DEEP_DEPTH)}-node path completes like the twin`,
    () => {
      // under --jitless the recursive twin may overflow the interpreter's stack; the port must not
      const xOf = (i: number): number => (i % 7) * -1.5 + (i % 3) * 0.25;
      const port = deepAttempt(
        (self, root) => (self as unknown as Record<MethodName, Impl>)[method].call(self, root),
        xOf,
      );
      expect(port).not.toBeNull();
      const twinResult = deepAttempt((_self, root) => twin(root), xOf);
      if (twinResult !== null) {
        expect(twinResult).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it(
    'outgoing edges a→b, b→c, c→b from the root a: a recursion without end throws RangeError like the twin',
    { timeout: 60_000 },
    () => {
      // the Java recursion never ends and throws StackOverflowError; the explicit stack is depth-checked (checkStackDepth)
      const self = new AbsoluteXPlacer() as unknown as Record<MethodName, Impl>;
      const portError = thrown(() => self[method].call(self, cycleRoot()));
      const twinError = thrown(() => twin(cycleRoot()));
      expect(portError).toBeInstanceOf(RangeError);
      expect(twinError).toBeInstanceOf(RangeError);
      expect(portError.message).toBe(twinError.message);
      expect(portError.stack).toContain('at AbsoluteXPlacer.');
    },
  );
});

describe('AbsoluteXPlacer deep values', () => {
  it('findMinimalX of the deep path is the minimum of its prefix sums', () => {
    const { root } = deepPath((i) => (i === DEEP_DEPTH - 1 ? -3 : 1));
    // AbsoluteXPlacer.java:46-58 by hand: the leaf returns -3, its ancestors -2, -1, 0, then min(0, 0) + 1 = 1 upward
    expect((new AbsoluteXPlacer() as unknown as Internals).findMinimalX(root)).toBe(1);
  });
});
