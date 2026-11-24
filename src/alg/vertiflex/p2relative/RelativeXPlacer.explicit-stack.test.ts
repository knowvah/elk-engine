// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `recursiveStraightlinePlacement` (mission tree-recursion-depth, #67, D3/D4) against a verbatim
// transcription of the recursive Java (`RelativeXPlacer.java:156-292`, over the ported step helpers) on seeded trees laid
// out end to end, compared at raw bits, outline structures and property-map order, plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { pathSpec, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { dumpVertiFlex } from '../../../../test/helpers/vertiflex-replay-dump.js';
import { InternalProperties } from '../InternalProperties.js';
import { VertiFlexLayoutProvider } from '../VertiFlexLayoutProvider.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import { NodeYPlacer } from '../p1yplacement/NodeYPlacer.js';
import { RelativeXPlacer } from './RelativeXPlacer.js';
import { bundleChildren } from './RelativeXPlacerBundling.js';
import { castToElkNode } from './RelativeXPlacerChildren.js';
import { makeSimpleOutlines } from './RelativeXPlacerOutlines.js';
import { sortSubTrees } from './RelativeXPlacerSorting.js';
import {
  computeRootMove,
  improveMoveRoot,
  updateMinMax,
  updateStraightOutlines,
} from './RelativeXPlacerStraightSteps.js';
import {
  buildGraph,
  cycleRoot,
  propertyKeys,
  thrown,
  specOf,
} from '../../../../test/helpers/vertiflex-tree-fixtures.js';

/** The private members of `RelativeXPlacer` the twin and the deep case drive (test-only access). */
interface Internals {
  spacingNodeNode: number;
  considerNodeModelOrder: boolean;
  recursiveStraightlinePlacement(graph: ElkNode): void;
}

const TREES = 60;
const MIN_LAID_OUT = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 120_000;

/** Verbatim transcription of the recursive Java `recursiveStraightlinePlacement` (RelativeXPlacer.java:156). */
function twinRecursiveStraightlinePlacement(self: Internals, graph: ElkNode): void {
  makeSimpleOutlines(graph, self.spacingNodeNode);

  if (!graph.getOutgoingEdges().isEmpty()) {
    const children: ElkNode[] = [];
    for (let i = 0; i < graph.getOutgoingEdges().size(); i++) {
      const child = castToElkNode(graph.getOutgoingEdges().get(i).getTargets().get(0)!);
      twinRecursiveStraightlinePlacement(self, child);
      children.push(child);
    }
    sortSubTrees(children, self.considerNodeModelOrder);

    for (let i = 0; i < children.length - 1; i++) {
      bundleChildren(children[0]!, children[i]!, children[i + 1]!);
    }

    const rootMove = computeRootMove(graph, children);
    let moveRoot = rootMove.moveRoot;

    if (!graph.getProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER)) {
      moveRoot = improveMoveRoot(graph, children, rootMove);
    }

    for (const child of children) {
      child.setX(child.getX() - moveRoot);
    }

    updateStraightOutlines(graph, children);

    updateMinMax(graph, children);
  }
}

type Impl = typeof twinRecursiveStraightlinePlacement;

interface Outcome {
  readonly error: string | null;
  readonly exits: unknown[];
  readonly keys: string[][];
  readonly dump: unknown;
}

const original = (RelativeXPlacer.prototype as unknown as Internals).recursiveStraightlinePlacement;

/** Lays a spec out with `impl` in place of the method; records the graph at the method's exit, at the end and on a throw. */
function run(spec: TreeSpec, mode: number, seed: number, impl: Impl): Outcome {
  const graph = buildGraph(spec, mode, seed);
  const exits: unknown[] = [];
  let active = false;
  vi.spyOn(RelativeXPlacer.prototype as unknown as Internals, 'recursiveStraightlinePlacement').mockImplementation(
    function (this: Internals, node: ElkNode) {
      // a recursive port re-enters through the spy: nested activations run the original and record nothing
      if (active) {
        original.call(this, node);
        return;
      }
      active = true;
      impl(this, node);
      active = false;
      exits.push([propertyKeys(graph), dumpVertiFlex(graph)]);
    },
  );
  let error: string | null = null;
  try {
    new VertiFlexLayoutProvider().layout(graph, new BasicProgressMonitor());
  } catch (e) {
    error = `${(e as Error).constructor.name}: ${(e as Error).message}`;
  }
  vi.restoreAllMocks();
  return { error, exits, keys: propertyKeys(graph), dump: dumpVertiFlex(graph) };
}

const port: Impl = (self, node) => original.call(self, node);

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

/** A deep path with y levels placed by phase 1, and a placer whose fields are set as `process` sets them. */
function deepCase(spec: TreeSpec): { graph: ElkNode; root: ElkNode; self: Internals } {
  const graph = buildGraph(spec, 0, 1);
  const root = graph.getChildren().get(0);
  graph.setProperty(InternalProperties.ROOT_NODE, root);
  // the model order `VertiFlexLayoutProvider.layout` stores before the phases (VertiFlexLayoutProvider.java:84-88)
  let count = 0;
  for (const node of graph.getChildren()) {
    node.setProperty(InternalProperties.NODE_MODEL_ORDER, count);
    count += 1;
  }
  new NodeYPlacer().process(graph, new BasicProgressMonitor());
  const self = new RelativeXPlacer() as unknown as Internals;
  self.spacingNodeNode = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
  self.considerNodeModelOrder = false;
  return { graph, root, self };
}

/** A caterpillar of `length` spine nodes, each with one leaf (the probe's shape). */
function caterpillarSpec(length: number): TreeSpec {
  const rects: [number, number, number, number][] = [];
  const parents: number[] = [];
  for (let i = 0; i < length; i++) {
    rects.push([0, 0, 10, 10], [0, 0, 10, 10]);
    if (i > 0) {
      parents.push(2 * (i - 1));
    }
    parents.push(2 * i);
  }
  return { shape: 'caterpillar', rects, parents };
}

describe('RelativeXPlacer.recursiveStraightlinePlacement explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(specOf(seed), seed % 4, seed, twinRecursiveStraightlinePlacement);
    expect(run(specOf(seed), seed % 4, seed, port)).toEqual(expected);
  });

  it(`at least ${String(MIN_LAID_OUT)} of the trees reach the method and lay out`, () => {
    const outcomes = SEEDS.map((seed) => run(specOf(seed), seed % 4, seed, port));
    expect(outcomes.filter((o) => o.error === null && o.exits.length === 1).length).toBeGreaterThanOrEqual(
      MIN_LAID_OUT,
    );
  });

  it.each([
    ['path', pathSpec(DEEP_DEPTH, 20)],
    ['caterpillar', caterpillarSpec(DEEP_DEPTH)],
  ] as const)(
    `a ${String(DEEP_DEPTH)}-deep %s completes like the twin`,
    (_name, spec) => {
      // under --jitless the recursive twin may overflow the interpreter's stack; the port must not
      const portCase = deepCase(spec);
      portCase.self.recursiveStraightlinePlacement(portCase.root);
      expect(portCase.root.hasProperty(InternalProperties.MAX_Y)).toBe(true);
      const twinCase = deepCase(spec);
      let twinDone = false;
      try {
        twinRecursiveStraightlinePlacement(twinCase.self, twinCase.root);
        twinDone = true;
      } catch (e) {
        expect(e).toBeInstanceOf(RangeError);
      }
      if (twinDone) {
        expect(dumpVertiFlex(twinCase.graph)).toEqual(dumpVertiFlex(portCase.graph));
        expect(propertyKeys(twinCase.graph)).toEqual(propertyKeys(portCase.graph));
      }
    },
    TIMEOUT,
  );

  it(
    'outgoing edges a→b, b→c, c→b from the root a: a recursion without end throws RangeError like the twin',
    { timeout: 60_000 },
    () => {
      // the Java recursion never ends and throws StackOverflowError; the explicit stack is depth-checked (checkStackDepth)
      const portCase = cycleCase();
      const portError = thrown(() => portCase.self.recursiveStraightlinePlacement(portCase.root));
      const twinCase = cycleCase();
      const twinError = thrown(() => twinRecursiveStraightlinePlacement(twinCase.self, twinCase.root));
      expect(portError).toBeInstanceOf(RangeError);
      expect(twinError).toBeInstanceOf(RangeError);
      expect(portError.message).toBe(twinError.message);
      expect(portError.stack).toContain('at RelativeXPlacer.');
    },
  );
});

/** Nodes a, b, c with edges a→b, b→c, c→b: a cycle reachable from the root a, so the Java recursion never ends. */
function cycleCase(): { root: ElkNode; self: Internals } {
  const root = cycleRoot();
  const self = new RelativeXPlacer() as unknown as Internals;
  self.spacingNodeNode = 20;
  self.considerNodeModelOrder = false;
  return { root, self };
}
