// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `checkVerticalConstraintValidity` (mission tree-recursion-depth, #67, D3/D4) against a verbatim
// transcription of the recursive Java (`VertiFlexLayoutProvider.java:134-160`) on seeded trees, compared at raw bits and
// property-map order, plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import {
  pathSpec,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../test/helpers/spore-tree-fixtures.js';
import { dumpVertiFlex } from '../../../test/helpers/vertiflex-replay-dump.js';
import { VertiFlexLayoutProvider } from './VertiFlexLayoutProvider.js';
import { VertiFlexOptions } from './options/VertiFlexOptions.js';
import { castToElkNode } from './p2relative/RelativeXPlacerChildren.js';
import { buildGraph, cycleRoot, propertyKeys, thrown } from '../../../test/helpers/vertiflex-tree-fixtures.js';

/** The private members of `VertiFlexLayoutProvider` the twin and the deep case drive (test-only access). */
interface Internals {
  nodeNodeSpacing: number;
  checkVerticalConstraintValidity(root: ElkNode, currentMinConstraint: number): void;
}

const TREES = 60;
const MIN_LAID_OUT = 40;
const MAX_NODES = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = { timeout: 60_000 };

/** Verbatim transcription of the recursive Java `checkVerticalConstraintValidity` (VertiFlexLayoutProvider.java:134). */
function twinCheckVerticalConstraintValidity(self: Internals, root: ElkNode, currentMinConstraint: number): void {
  let rootHeight: number;
  if (root.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
    rootHeight = root.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT);
  } else {
    rootHeight = currentMinConstraint;
  }

  const newMinConstraint =
    rootHeight + root.getHeight() + Math.max(root.getProperty(CoreOptions.MARGINS).bottom, self.nodeNodeSpacing);

  for (const outgoingEdge of root.getOutgoingEdges()) {
    const child = castToElkNode(outgoingEdge.getTargets().get(0)!);
    if (child.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
      if (
        newMinConstraint >
        child.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT) + child.getProperty(CoreOptions.MARGINS).top
      ) {
        throw new UnsupportedConfigurationException(
          `Invalid vertical constraints. Node ${String(child.getIdentifier())} has a vertical constraint that is too low for its ancestors.`,
        );
      }
    }
  }
  for (const outgoingEdge of root.getOutgoingEdges()) {
    const child = castToElkNode(outgoingEdge.getTargets().get(0)!);
    twinCheckVerticalConstraintValidity(self, child, newMinConstraint);
  }
}

interface Outcome {
  readonly error: string | null;
  readonly exits: unknown[];
  readonly keys: string[][];
  readonly dump: unknown;
}

const original = (VertiFlexLayoutProvider.prototype as unknown as Internals).checkVerticalConstraintValidity;

type Impl = typeof twinCheckVerticalConstraintValidity;

/** Lays a spec out with `impl` in place of the method; records the graph at the method's exit, at the end and on a throw. */
function run(spec: TreeSpec, mode: number, seed: number, impl: Impl): Outcome {
  const graph = buildGraph(spec, mode, seed);
  const exits: unknown[] = [];
  let active = false;
  vi.spyOn(
    VertiFlexLayoutProvider.prototype as unknown as Internals,
    'checkVerticalConstraintValidity',
  ).mockImplementation(function (this: Internals, root: ElkNode, currentMinConstraint: number) {
    // a recursive port re-enters through the spy: nested activations run the original and record nothing
    if (active) {
      original.call(this, root, currentMinConstraint);
      return;
    }
    active = true;
    impl(this, root, currentMinConstraint);
    active = false;
    exits.push([propertyKeys(graph), dumpVertiFlex(graph)]);
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

const port: Impl = (self, root, c) => original.call(self, root, c);

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

describe('VertiFlexLayoutProvider.checkVerticalConstraintValidity explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const rnd = seededRandom(seed * 7919);
    const shape = SHAPES[seed % SHAPES.length]!;
    const spec = randomSpec(shape, 2 + Math.floor(rnd() * (MAX_NODES - 1)), rnd);
    const mode = seed % 4;
    const expected = run(spec, mode, seed, twinCheckVerticalConstraintValidity);
    expect(run(spec, mode, seed, port)).toEqual(expected);
  });

  it('the mix contains trees whose constraints throw and trees that lay out', () => {
    const errors = SEEDS.map((seed) => {
      const rnd = seededRandom(seed * 7919);
      const spec = randomSpec(SHAPES[seed % SHAPES.length]!, 2 + Math.floor(rnd() * (MAX_NODES - 1)), rnd);
      return run(spec, seed % 4, seed, port).error;
    });
    expect(errors.filter((e) => e !== null).length).toBeGreaterThan(0);
    expect(errors.filter((e) => e === null).length).toBeGreaterThanOrEqual(MIN_LAID_OUT);
  });

  it.each([false, true])(
    `a ${String(DEEP_DEPTH)}-node path (deepest constraint too low: %s) completes like the twin`,
    (tooLow) => {
      // under --jitless the recursive twin may overflow the interpreter's stack; the port must not
      const build = (): { graph: ElkNode; root: ElkNode; self: Internals } => {
        const graph = buildGraph(pathSpec(DEEP_DEPTH, 20), 0, 1);
        const last = graph.getChildren().get(DEEP_DEPTH - 1);
        if (tooLow) {
          last.setProperty(VertiFlexOptions.VERTICAL_CONSTRAINT, 1);
        }
        const self = new VertiFlexLayoutProvider() as unknown as Internals;
        self.nodeNodeSpacing = 20;
        return { graph, root: graph.getChildren().get(0), self };
      };
      const attempt = (impl: () => void): string | null => {
        try {
          impl();
          return null;
        } catch (e) {
          if (e instanceof RangeError) {
            throw e;
          }
          return (e as Error).message;
        }
      };
      const portCase = build();
      const portError = attempt(() => portCase.self.checkVerticalConstraintValidity(portCase.root, 0));
      expect(portError).toBe(
        tooLow
          ? `Invalid vertical constraints. Node n${String(DEEP_DEPTH - 1)} has a vertical constraint that is too low for its ancestors.`
          : null,
      );
      const twinCase = build();
      let twinError: string | null | undefined;
      try {
        twinError = attempt(() => twinCheckVerticalConstraintValidity(twinCase.self, twinCase.root, 0));
      } catch (e) {
        expect(e).toBeInstanceOf(RangeError);
      }
      if (twinError !== undefined) {
        expect(twinError).toBe(portError);
        expect(propertyKeys(twinCase.graph)).toEqual(propertyKeys(portCase.graph));
      }
    },
    TIMEOUT.timeout,
  );

  it(
    'outgoing edges a→b, b→c, c→b from the root a: a recursion without end throws RangeError like the twin',
    TIMEOUT,
    () => {
      // the Java recursion never ends and throws StackOverflowError; the explicit stack is depth-checked (checkStackDepth)
      const portCase = cycleCase();
      const portError = thrown(() => portCase.self.checkVerticalConstraintValidity(portCase.root, 0));
      const twinCase = cycleCase();
      const twinError = thrown(() => twinCheckVerticalConstraintValidity(twinCase.self, twinCase.root, 0));
      expect(portError).toBeInstanceOf(RangeError);
      expect(twinError).toBeInstanceOf(RangeError);
      expect(portError.message).toBe(twinError.message);
      expect(portError.stack).toContain('at VertiFlexLayoutProvider.');
    },
  );
});

/** Nodes a, b, c with edges a→b, b→c, c→b: a cycle reachable from the root a, so the Java recursion never ends. */
function cycleCase(): { root: ElkNode; self: Internals } {
  const root = cycleRoot();
  const self = new VertiFlexLayoutProvider() as unknown as Internals;
  self.nodeNodeSpacing = 20;
  return { root, self };
}
