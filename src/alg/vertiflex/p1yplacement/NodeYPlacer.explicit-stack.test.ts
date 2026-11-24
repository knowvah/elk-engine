// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `setYLevels` (mission tree-recursion-depth, #67, D3/D4) against a verbatim transcription of the
// recursive Java (`NodeYPlacer.java:56-68`) on seeded trees laid out end to end, compared at raw bits and property-map order,
// plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { pathSpec, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { dumpVertiFlex } from '../../../../test/helpers/vertiflex-replay-dump.js';
import { VertiFlexLayoutProvider } from '../VertiFlexLayoutProvider.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';
import { NodeYPlacer } from './NodeYPlacer.js';
import {
  buildGraph,
  cycleRoot,
  propertyKeys,
  thrown,
  specOf,
} from '../../../../test/helpers/vertiflex-tree-fixtures.js';

/** The private members of `NodeYPlacer` the twin and the deep case drive (test-only access). */
interface Internals {
  layerDistance: number;
  nodeNodeSpacing: number;
  setYLevels(node: ElkNode, minHeight: number): void;
}

const TREES = 60;
const MIN_LAID_OUT = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;

/** Verbatim transcription of the recursive Java `setYLevels` (NodeYPlacer.java:56). */
function twinSetYLevels(self: Internals, node: ElkNode, minHeight: number): void {
  if (node.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
    minHeight = node.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT);
  }
  node.setY(minHeight);
  const newMinHeight =
    minHeight +
    self.layerDistance +
    node.getHeight() +
    Math.max(node.getProperty(CoreOptions.MARGINS).bottom, self.nodeNodeSpacing);
  for (let i = 0; i < node.getOutgoingEdges().size(); i++) {
    const child = castToElkNode(node.getOutgoingEdges().get(i).getTargets().get(0)!);
    twinSetYLevels(self, child, newMinHeight);
  }
}

type Impl = typeof twinSetYLevels;

interface Outcome {
  readonly error: string | null;
  readonly exits: unknown[];
  readonly keys: string[][];
  readonly dump: unknown;
}

const original = (NodeYPlacer.prototype as unknown as Internals).setYLevels;

/** Lays a spec out with `impl` in place of the method; records the graph at the method's exit, at the end and on a throw. */
function run(spec: TreeSpec, mode: number, seed: number, impl: Impl): Outcome {
  const graph = buildGraph(spec, mode, seed);
  const exits: unknown[] = [];
  let active = false;
  vi.spyOn(NodeYPlacer.prototype as unknown as Internals, 'setYLevels').mockImplementation(function (
    this: Internals,
    node: ElkNode,
    minHeight: number,
  ) {
    // a recursive port re-enters through the spy: nested activations run the original and record nothing
    if (active) {
      original.call(this, node, minHeight);
      return;
    }
    active = true;
    impl(this, node, minHeight);
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

const port: Impl = (self, node, minHeight) => original.call(self, node, minHeight);

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

describe('NodeYPlacer.setYLevels explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect equals the recursive twin', (seed) => {
    const expected = run(specOf(seed), seed % 4, seed, twinSetYLevels);
    expect(run(specOf(seed), seed % 4, seed, port)).toEqual(expected);
  });

  it(`at least ${String(MIN_LAID_OUT)} of the trees reach the method and lay out`, () => {
    const outcomes = SEEDS.map((seed) => run(specOf(seed), seed % 4, seed, port));
    expect(outcomes.filter((o) => o.error === null && o.exits.length === 1).length).toBeGreaterThanOrEqual(
      MIN_LAID_OUT,
    );
  });

  it.each([false, true])(
    `a ${String(DEEP_DEPTH)}-node path (deepest node constrained: %s) completes like the twin`,
    (constrained) => {
      // under --jitless the recursive twin may overflow the interpreter's stack; the port must not
      const build = (): { graph: ElkNode; root: ElkNode; self: Internals } => {
        const graph = buildGraph(pathSpec(DEEP_DEPTH, 20), 0, 1);
        if (constrained) {
          graph
            .getChildren()
            .get(DEEP_DEPTH - 1)
            .setProperty(VertiFlexOptions.VERTICAL_CONSTRAINT, 7.25);
        }
        const self = new NodeYPlacer() as unknown as Internals;
        self.layerDistance = 50;
        self.nodeNodeSpacing = 20;
        return { graph, root: graph.getChildren().get(0), self };
      };
      const portCase = build();
      portCase.self.setYLevels(portCase.root, 0);
      const last = portCase.graph.getChildren().get(DEEP_DEPTH - 1);
      expect(last.getY()).toBe(constrained ? 7.25 : 80 * (DEEP_DEPTH - 1));
      const twinCase = build();
      let twinDone = false;
      try {
        twinSetYLevels(twinCase.self, twinCase.root, 0);
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
      const portError = thrown(() => portCase.self.setYLevels(portCase.root, 0));
      const twinCase = cycleCase();
      const twinError = thrown(() => twinSetYLevels(twinCase.self, twinCase.root, 0));
      expect(portError).toBeInstanceOf(RangeError);
      expect(twinError).toBeInstanceOf(RangeError);
      expect(portError.message).toBe(twinError.message);
      expect(portError.stack).toContain('at NodeYPlacer.');
    },
  );
});

/** Nodes a, b, c with edges a→b, b→c, c→b: a cycle reachable from the root a, so the Java recursion never ends. */
function cycleCase(): { root: ElkNode; self: Internals } {
  const root = cycleRoot();
  const self = new NodeYPlacer() as unknown as Internals;
  self.layerDistance = 50;
  self.nodeNodeSpacing = 20;
  return { root, self };
}
