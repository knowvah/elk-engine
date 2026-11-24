// SPDX-License-Identifier: EPL-2.0
// Proof of the iterative `extend` (mission tree-recursion-depth, #67, D4) against a verbatim transcription of the recursive Java
// (`RadiusExtensionOverlapRemoval.java:57-95`) on seeded trees positioned by EadesRadial, compared at raw bits together with the
// progress monitor's log tags, plus a depth no recursion survives.
import { describe, expect, it } from 'vitest';
import {
  doubleBits,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../../../test/helpers/spore-tree-fixtures.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { NullElkProgressMonitor } from '../../../../core/util/NullElkProgressMonitor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../../InternalProperties.js';
import { AnnulusWedgeCriteria } from '../../options/AnnulusWedgeCriteria.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { RadialTranslationStrategy } from '../../options/RadialTranslationStrategy.js';
import { SortingStrategy } from '../../options/SortingStrategy.js';
import { EadesRadial } from '../../p1position/EadesRadial.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IRadialSorter } from '../../sorting/IRadialSorter.js';
import { RadiusExtensionOverlapRemoval, type NextLevelOrder } from './RadiusExtensionOverlapRemoval.js';
import { bitsOf } from '../../../../../test/helpers/radial-tree-fixtures.js';

const TREES = 60;
const MAX_NODES = 30;
const DEEP_PATH = 15_000;
const DEEP_SPACING = 20;
const TIMEOUT = { timeout: 120_000 };
const ENDLESS_TIMEOUT = { timeout: 60_000 };
const SORTERS = [SortingStrategy.NONE, SortingStrategy.POLAR_COORDINATE, SortingStrategy.ID] as const;
const RADII = [15, 30, 8] as const;
const SPACINGS = [0, 5, 12.5] as const;
const ORDERS: readonly NextLevelOrder[] = ['java', 'reversed'];

type Extend = (graph: ElkNode, nodes: ElkNode[], progressMonitor: IElkProgressMonitor) => void;

/** The state of `RadiusExtensionOverlapRemoval` the twin drives (test-only access to the private sorter). */
interface Internals {
  sorter: IRadialSorter | null;
  nextLevelOrder: NextLevelOrder;
  extend: Extend;
  overlapLayer(nodes: readonly ElkNode[]): boolean;
  contractLayer(layerNodes: readonly ElkNode[], isContracting: boolean): void;
  moveNode(node: ElkNode, distance: number): void;
}

/** `RadiusExtensionOverlapRemoval.java:59-78`, verbatim: extends the level until it no longer overlaps, the first node's move. */
function twinMovedDistance(
  self: Internals,
  graph: ElkNode,
  nodes: ElkNode[],
  progressMonitor: IElkProgressMonitor,
): number {
  const oldPositions: KVector[] = [];
  for (const node of nodes) {
    oldPositions.push(new KVector(node.getX(), node.getY()));
  }
  progressMonitor.logGraph(graph, 'Before removing overlaps');
  while (self.overlapLayer(nodes)) {
    self.contractLayer(nodes, false);
  }
  progressMonitor.logGraph(graph, 'After removing overlaps');
  let movedX = 0;
  let movedY = 0;
  if (nodes.length > 0) {
    const firstNode = nodes[0]!;
    movedX = firstNode.getX() - oldPositions[0]!.x;
    movedY = firstNode.getY() - oldPositions[0]!.y;
  }
  return Math.sqrt(movedX * movedX + movedY * movedY);
}

/**
 * Verbatim transcription of the recursive Java `extend` (`RadiusExtensionOverlapRemoval.java:57-95`) over the state of `self`,
 * with the port's I30 order switch; the recursive call goes through `self.extend`, which is this twin once installed.
 */
function twinExtendOf(self: Internals): Extend {
  return (graph, nodes, progressMonitor) => {
    if (nodes.length > 0) {
      const movedDistance = twinMovedDistance(self, graph, nodes, progressMonitor);
      const nextLevelSet = RadialUtil.getNextLevelNodeSet(nodes);
      const nextLevelNodes = self.nextLevelOrder === 'reversed' ? new Set([...nextLevelSet].reverse()) : nextLevelSet;
      let index = 1;
      if (nextLevelNodes.size > 0) {
        for (const nextLevelNode of nextLevelNodes) {
          self.moveNode(nextLevelNode, movedDistance);
        }
        progressMonitor.logGraph(graph, `Child movement ${String(index)}`);
        index++;
      }
      if (self.sorter !== null) {
        self.sorter.sort([...nextLevelNodes]);
      }
      self.extend(graph, [...nextLevelNodes], progressMonitor);
    }
  };
}

function twinRemoval(): RadiusExtensionOverlapRemoval {
  const removal = new RadiusExtensionOverlapRemoval();
  const internals = removal as unknown as Internals;
  internals.extend = twinExtendOf(internals);
  return removal;
}

/** A progress monitor that records the tags of `logGraph`, in call order. */
function recordingMonitor(): { monitor: IElkProgressMonitor; tags: string[] } {
  const tags: string[] = [];
  const monitor = new NullElkProgressMonitor();
  (monitor as unknown as { logGraph: (graph: unknown, tag: string) => void }).logGraph = (_graph, tag) => {
    tags.push(tag);
  };
  return { monitor, tags };
}

interface Setup {
  readonly sorter: SortingStrategy;
  readonly radius: number;
  readonly spacing: number;
  readonly order: NextLevelOrder;
}

/** Builds the tree of a spec iteratively and positions it with EadesRadial (node-size wedges, no optimizer). */
function buildPositionedGraph(spec: TreeSpec, setup: Setup): { graph: ElkNode; nodes: ElkNode[] } {
  const graph = ElkGraphUtil.createGraph();
  const nodes = spec.rects.map(([x, y, w, h]) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(w + x / 17, h + y / 13);
    node.setProperty(CoreOptions.POSITION, new KVector(x - 50, y - 50));
    return node;
  });
  spec.parents.forEach((parent, i) => ElkGraphUtil.createSimpleEdge(nodes[parent]!, nodes[i + 1]!));
  graph.setProperty(InternalProperties.ROOT_NODE, nodes[0]!);
  graph.setProperty(RadialOptions.RADIUS, setup.radius);
  graph.setProperty(RadialOptions.SORTER, setup.sorter);
  graph.setProperty(RadialOptions.WEDGE_CRITERIA, AnnulusWedgeCriteria.NODE_SIZE);
  graph.setProperty(RadialOptions.OPTIMIZATION_CRITERIA, RadialTranslationStrategy.NONE);
  graph.setProperty(CoreOptions.SPACING_NODE_NODE, setup.spacing);
  new EadesRadial().process(graph, new NullElkProgressMonitor());
  return { graph, nodes };
}

/** Every effect of the overlap removal: the log tags, then each node's location at raw bits and its ORDER_ID. */
function runRemoval(spec: TreeSpec, setup: Setup, removal: RadiusExtensionOverlapRemoval): string[] {
  const { graph, nodes } = buildPositionedGraph(spec, setup);
  const { monitor, tags } = recordingMonitor();
  removal.nextLevelOrder = setup.order;
  removal.removeOverlaps(graph, monitor);
  return [
    ...tags,
    ...nodes.map(
      (n) => `${doubleBits(n.getX())} ${doubleBits(n.getY())} ${String(n.getProperty(RadialOptions.ORDER_ID))}`,
    ),
  ];
}

/** A path of `length` nodes 10 x 10 along the x axis, `DEEP_SPACING` apart, the first one the root. */
function deepRun(removal: RadiusExtensionOverlapRemoval): { nodes: ElkNode[]; tags: string[] } {
  const graph = ElkGraphUtil.createGraph();
  const nodes: ElkNode[] = [];
  for (let i = 0; i < DEEP_PATH; i++) {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(10, 10);
    node.setLocation(i * DEEP_SPACING, 0);
    if (i > 0) {
      ElkGraphUtil.createSimpleEdge(nodes[i - 1]!, node);
    }
    nodes.push(node);
  }
  graph.setProperty(InternalProperties.ROOT_NODE, nodes[0]!);
  const { monitor, tags } = recordingMonitor();
  removal.removeOverlaps(graph, monitor);
  return { nodes, tags };
}

/**
 * Root r and nodes a, b (10 x 10, apart) with edges r→a, a→b, b→a: the levels alternate [a], [b], [a], ... and never empty, so
 * the Java tail recursion never ends.
 */
function endlessRun(removal: RadiusExtensionOverlapRemoval): void {
  const graph = ElkGraphUtil.createGraph();
  const [r, a, b] = [0, 1, 2].map((i) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(10, 10);
    node.setLocation(i * DEEP_SPACING, 0);
    return node;
  });
  ElkGraphUtil.createSimpleEdge(r!, a!);
  ElkGraphUtil.createSimpleEdge(a!, b!);
  ElkGraphUtil.createSimpleEdge(b!, a!);
  graph.setProperty(InternalProperties.ROOT_NODE, r!);
  removal.removeOverlaps(graph, new NullElkProgressMonitor());
}

/** The sorter, radius, spacing and set order of the `i`-th tree. */
const setupOf = (i: number): Setup => ({
  sorter: SORTERS[i % SORTERS.length]!,
  radius: RADII[Math.floor(i / 5) % RADII.length]!,
  spacing: SPACINGS[Math.floor(i / 2) % SPACINGS.length]!,
  order: ORDERS[Math.floor(i / 15) % ORDERS.length]!,
});

/** Whether the removal's result (`runRemoval` output) moved any node away from its EadesRadial location. */
function movesNodes(spec: TreeSpec, setup: Setup, result: readonly string[]): boolean {
  const { nodes } = buildPositionedGraph(spec, setup);
  const after = result.slice(-nodes.length).map((entry) => entry.split(' ').slice(0, 2).join(' '));
  return bitsOf(nodes).join('|') !== after.join('|');
}

describe('RadiusExtensionOverlapRemoval.extend: the loop equals the verbatim recursion', () => {
  it(
    `${TREES} seeded trees, every sorter and both set orders: log tags, locations and order ids equal the twin`,
    TIMEOUT,
    () => {
      const rnd = seededRandom(26_112_023);
      const mismatches: number[] = [];
      let moved = 0;
      for (let i = 0; i < TREES; i++) {
        const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
        const setup = setupOf(i);
        const expected = runRemoval(spec, setup, twinRemoval());
        const actual = runRemoval(spec, setup, new RadiusExtensionOverlapRemoval());
        if (actual.join('|') !== expected.join('|')) {
          mismatches.push(i);
        }
        moved += movesNodes(spec, setup, expected) ? 1 : 0;
      }
      expect(mismatches).toEqual([]);
      // the comparison has power: the removal moves nodes in many of the trees
      expect(moved).toBeGreaterThan(TREES / 3);
    },
  );

  it(`a ${DEEP_PATH}-level path is processed without overflow, like the twin`, TIMEOUT, () => {
    const port = deepRun(new RadiusExtensionOverlapRemoval());
    // the levels start at the root's successors (RadiusExtensionOverlapRemoval.java:48-49): DEEP_PATH - 1 of them. One node per
    // level never overlaps: each level logs before, after and (but the last) the child movement; nothing moves
    expect(port.tags).toHaveLength(3 * (DEEP_PATH - 1) - 1);
    expect(port.tags.slice(0, 3)).toEqual(['Before removing overlaps', 'After removing overlaps', 'Child movement 1']);
    expect([port.nodes[DEEP_PATH - 1]!.getX(), port.nodes[DEEP_PATH - 1]!.getY()]).toEqual([
      (DEEP_PATH - 1) * DEEP_SPACING,
      0,
    ]);
    let twin: { nodes: ElkNode[]; tags: string[] } | null = null;
    try {
      twin = deepRun(twinRemoval());
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(twin.tags).toEqual(port.tags);
      expect(bitsOf(twin.nodes)).toEqual(bitsOf(port.nodes));
    }
  });

  it(
    'a level list that never empties (cycle a→b, b→a below the root) throws RangeError, like the twin',
    ENDLESS_TIMEOUT,
    () => {
      // the Java recursion never ends there and throws StackOverflowError; the loop counts the levels it enters
      expect(() => endlessRun(new RadiusExtensionOverlapRemoval())).toThrow(RangeError);
      expect(() => endlessRun(twinRemoval())).toThrow(RangeError);
    },
  );
});
