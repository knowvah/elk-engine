// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `routeEdges` (mission tree-recursion-depth, #67, D3/D4) against a verbatim transcription of the
// recursive Java (`StraightEdgeRouter.java:58-72`) on seeded trees, laid out end to end and routed directly (with edges
// leaving ports), compared at raw bits and property-map order, plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkConnectableShape } from '../../../graph/ElkConnectableShape.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { pathSpec, seededRandom, type TreeSpec } from '../../../../test/helpers/spore-tree-fixtures.js';
import { dumpVertiFlex, registerVertiFlex } from '../../../../test/helpers/vertiflex-replay-dump.js';
import { VertiFlexLayoutProvider } from '../VertiFlexLayoutProvider.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import { StraightEdgeRouter } from './StraightEdgeRouter.js';
import { depths, thrown, specOf, cycleRoot, LAYER_STEP } from '../../../../test/helpers/vertiflex-tree-fixtures.js';

/** The private method of `StraightEdgeRouter` under proof (test-only access). */
interface Internals {
  routeEdges(node: ElkNode): void;
}

const TREES = 60;
const MIN_LAID_OUT = 40;
const DEEP_DEPTH = 15_000;
const TIMEOUT = 60_000;

/** Verbatim transcription of the recursive Java `routeEdges` (StraightEdgeRouter.java:58). */
function twinRouteEdges(node: ElkNode): void {
  for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
    const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)!)!;
    const section = ElkGraphUtil.firstEdgeSection(edge, true, true);

    const startX = node.getX() + node.getWidth() / 2;
    const startY = node.getY() + node.getHeight();
    const endX = target.getX() + target.getWidth() / 2;
    const endY = target.getY();

    section.setStartLocation(startX, startY);
    section.setEndLocation(endX, endY);
    twinRouteEdges(target);
  }
}

type Impl = typeof twinRouteEdges;

/**
 * A vertiflex graph of a spec. Mode 0: no constraints; 1: constraints that respect the ancestors; 2: random constraints
 * (some too low, so the layout throws); 3: as 1 with node model order considered. Every third node gets margins. With
 * `viaPorts`, every third edge leaves a fresh port of its source (the router follows `allOutgoingEdges`).
 */
function buildGraph(spec: TreeSpec, mode: number, seed: number, viaPorts = false): ElkNode {
  registerVertiFlex();
  const rnd = seededRandom(seed);
  const graph = ElkGraphUtil.createGraph();
  graph.setIdentifier('root');
  graph.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, mode === 3);
  const level = depths(spec);
  const nodes = spec.rects.map(([x, y, w, h], i) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setIdentifier(`n${String(i)}`);
    node.setDimensions(w, h);
    node.setLocation(x, y);
    if (i % 3 === 0) {
      node.setProperty(CoreOptions.MARGINS, new ElkMargin(rnd() * 8, rnd() * 8, rnd() * 8, rnd() * 8));
    }
    if (mode !== 0 && rnd() < 0.3) {
      const constraint = mode === 2 ? rnd() * LAYER_STEP * level[i]! : (level[i]! + rnd()) * LAYER_STEP * 2;
      node.setProperty(VertiFlexOptions.VERTICAL_CONSTRAINT, constraint);
    }
    return node;
  });
  spec.parents.forEach((parent, i) => {
    let source: ElkConnectableShape = nodes[parent]!;
    if (viaPorts && i % 3 === 0) {
      const port = ElkGraphUtil.createPort(nodes[parent]!);
      port.setIdentifier(`p${String(i + 1)}`);
      source = port;
    }
    ElkGraphUtil.createSimpleEdge(source, nodes[i + 1]!).setIdentifier(`e${String(i + 1)}`);
  });
  return graph;
}

/** Every node's and edge's property keys in map order: the order in which properties were first written. */
function propertyKeys(graph: ElkNode): string[][] {
  return [...graph.getChildren(), ...graph.getContainedEdges()].map((element) =>
    [...element.getProperties()].map(([key]) => key.getId()),
  );
}

interface Outcome {
  readonly error: string | null;
  readonly exits: unknown[];
  readonly keys: string[][];
  readonly dump: unknown;
}

const original = (StraightEdgeRouter.prototype as unknown as Internals).routeEdges;

/** Lays a spec out with `impl` in place of the method; records the graph at the method's exit, at the end and on a throw. */
function run(spec: TreeSpec, seed: number, impl: Impl): Outcome {
  const graph = buildGraph(spec, seed % 4, seed);
  const exits: unknown[] = [];
  let active = false;
  vi.spyOn(StraightEdgeRouter.prototype as unknown as Internals, 'routeEdges').mockImplementation(function (
    this: Internals,
    node: ElkNode,
  ) {
    // a recursive port re-enters through the spy: nested activations run the original and record nothing
    if (active) {
      original.call(this, node);
      return;
    }
    active = true;
    impl(node);
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

/** Routes a spec's graph directly from node 0 with `impl`; the graph's state afterwards. */
function routeDirect(spec: TreeSpec, seed: number, impl: (root: ElkNode) => void): unknown {
  const graph = buildGraph(spec, 0, seed, true);
  impl(graph.getChildren().get(0));
  return [propertyKeys(graph), dumpVertiFlex(graph)];
}

const portImpl = (root: ElkNode): void => (new StraightEdgeRouter() as unknown as Internals).routeEdges(root);

const SEEDS = Array.from({ length: TREES }, (_, i) => i + 1);

describe('StraightEdgeRouter.routeEdges explicit stack (AC6, #67)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SEEDS)('seed %i: every effect of the layout equals the recursive twin', (seed) => {
    const expected = run(specOf(seed), seed, twinRouteEdges);
    expect(run(specOf(seed), seed, (node) => original.call(new StraightEdgeRouter(), node))).toEqual(expected);
  });

  it(`at least ${String(MIN_LAID_OUT)} of the trees reach the method and lay out`, () => {
    const outcomes = SEEDS.map((seed) =>
      run(specOf(seed), seed, (node) => original.call(new StraightEdgeRouter(), node)),
    );
    expect(outcomes.filter((o) => o.error === null && o.exits.length === 1).length).toBeGreaterThanOrEqual(
      MIN_LAID_OUT,
    );
  });

  it.each(SEEDS)('seed %i: routing directly, edges leaving ports included, equals the recursive twin', (seed) => {
    expect(routeDirect(specOf(seed), seed, portImpl)).toEqual(routeDirect(specOf(seed), seed, twinRouteEdges));
  });

  it(
    `a ${String(DEEP_DEPTH)}-node path completes like the twin`,
    () => {
      // under --jitless the recursive twin may overflow the interpreter's stack; the port must not
      const spec = pathSpec(DEEP_DEPTH, 20);
      const port = routeDirect(spec, 1, portImpl) as [string[][], { edges: { sections: unknown[] }[] }];
      expect(port[1].edges).toHaveLength(DEEP_DEPTH - 1);
      expect(port[1].edges.every((e) => e.sections.length === 1)).toBe(true);
      let twin: unknown = null;
      try {
        twin = routeDirect(spec, 1, twinRouteEdges);
      } catch (e) {
        expect(e).toBeInstanceOf(RangeError);
      }
      if (twin !== null) {
        expect(twin).toEqual(port);
      }
    },
    TIMEOUT,
  );

  it(
    'outgoing edges a→b, b→c, c→b from the root a: a recursion without end throws RangeError like the twin',
    { timeout: 60_000 },
    () => {
      // the Java recursion never ends and throws StackOverflowError; the explicit stack is depth-checked (checkStackDepth)
      const portError = thrown(() => portImpl(cycleRoot()));
      const twinError = thrown(() => twinRouteEdges(cycleRoot()));
      expect(portError).toBeInstanceOf(RangeError);
      expect(twinError).toBeInstanceOf(RangeError);
      expect(portError.message).toBe(twinError.message);
      expect(portError.stack).toContain('at StraightEdgeRouter.');
    },
  );
});
