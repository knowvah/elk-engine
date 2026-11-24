// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `positionNodes` (mission tree-recursion-depth, #67, D4) against a verbatim transcription of the
// recursive Java (`EadesRadial.java:92-130`) on seeded trees under every sorter, wedge criteria and several radii and
// optimizers, compared at raw bits, plus a depth no recursion survives.
import { describe, expect, it } from 'vitest';
import {
  doubleBits,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../InternalProperties.js';
import { AnnulusWedgeCriteria } from '../options/AnnulusWedgeCriteria.js';
import { RadialOptions } from '../options/RadialOptions.js';
import { RadialTranslationStrategy } from '../options/RadialTranslationStrategy.js';
import { SortingStrategy } from '../options/SortingStrategy.js';
import { RadialUtil } from '../RadialUtil.js';
import type { IRadialSorter } from '../sorting/IRadialSorter.js';
import { EadesRadial } from './EadesRadial.js';
import type { IAnnulusWedgeCriteria } from './wedge/IAnnulusWedgeCriteria.js';
import { buildCaterpillar, bitsOf } from '../../../../test/helpers/radial-tree-fixtures.js';

const TREES = 72;
const MAX_NODES = 30;
const DEEP_SPINE = 15_000;
const DEEP_RADIUS = 20;
const TIMEOUT = { timeout: 120_000 };
const ENDLESS_TIMEOUT = { timeout: 60_000 };
const SORTERS = [SortingStrategy.NONE, SortingStrategy.POLAR_COORDINATE, SortingStrategy.ID] as const;
const CRITERIA = [AnnulusWedgeCriteria.NODE_SIZE, AnnulusWedgeCriteria.LEAF_NUMBER] as const;
const RADII = [25, 7.5, -1, 40] as const;
const OPTIMIZER_EVERY = 9;

/** The private state of `EadesRadial` the twin and the deep case drive (test-only access). */
interface Internals {
  radius: number;
  sorter: IRadialSorter | null;
  annulusWedgeCriteria: IAnnulusWedgeCriteria;
  root: ElkNode;
  positionNodes(node: ElkNode, currentRadius: number, minAlpha: number, maxAlpha: number, optimalOffset: number): void;
}

/** The `tau` block of the Java `positionNodes` (`EadesRadial.java:108-117`), verbatim, the precedence quirk of :108 included. */
function twinWedgeStart(
  radius: number,
  currentRadius: number,
  minAlpha: number,
  maxAlpha: number,
  numberOfLeafs: number,
) {
  const tau = 2 * Math.acos(currentRadius / currentRadius + radius);
  let s: number;
  let alpha: number;
  if (tau < maxAlpha - minAlpha) {
    s = tau / numberOfLeafs;
    alpha = (minAlpha + maxAlpha - tau) / 2;
  } else {
    s = (maxAlpha - minAlpha) / numberOfLeafs;
    alpha = minAlpha;
  }
  return { s, alpha };
}

/**
 * Verbatim transcription of the recursive Java `positionNodes` (`EadesRadial.java:92-130`) over the state of `self`; the
 * recursive call goes through `self.positionNodes`, which is this twin once installed.
 */
function twinPositionNodesOf(self: Internals): Internals['positionNodes'] {
  return (node, currentRadius, minAlpha, maxAlpha, optimalOffset) => {
    const radOffest = optimalOffset;
    const alphaPoint = (minAlpha + maxAlpha) / 2 + radOffest;
    const xPos = currentRadius * Math.cos(alphaPoint);
    const yPos = currentRadius * Math.sin(alphaPoint);
    RadialUtil.centerNodesOnRadi(node, xPos, yPos);

    const numberOfLeafs = self.annulusWedgeCriteria.calculateWedgeSpace(node);
    const wedge = twinWedgeStart(self.radius, currentRadius, minAlpha, maxAlpha, numberOfLeafs);
    const s = wedge.s;
    let alpha = wedge.alpha;
    const successors = RadialUtil.getSuccessors(node);
    if (self.sorter !== null) {
      self.sorter.initialize(self.root);
      self.sorter.sort(successors);
    }
    for (const child of successors) {
      const numberOfChildLeafs = self.annulusWedgeCriteria.calculateWedgeSpace(child);
      self.positionNodes(child, currentRadius + self.radius, alpha, alpha + s * numberOfChildLeafs, optimalOffset);
      alpha += s * numberOfChildLeafs;
    }
  };
}

/** An EadesRadial whose `positionNodes` is the twin (`translate` calls it, and the twin calls itself, through the instance). */
function twinEades(): EadesRadial {
  const eades = new EadesRadial();
  const internals = eades as unknown as Internals;
  internals.positionNodes = twinPositionNodesOf(internals);
  return eades;
}

interface Setup {
  readonly sorter: SortingStrategy;
  readonly criteria: AnnulusWedgeCriteria;
  readonly radius: number;
  readonly optimizer: RadialTranslationStrategy;
}

/** Builds the tree of a spec iteratively, with sizes, a POSITION for the polar sorter, and the phase's graph options. */
function buildRadialGraph(spec: TreeSpec, setup: Setup): { graph: ElkNode; nodes: ElkNode[] } {
  const graph = ElkGraphUtil.createGraph();
  const nodes = spec.rects.map(([x, y, w, h]) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(w + x / 17, h + y / 13);
    node.setLocation(x - 50, y - 50);
    node.setProperty(CoreOptions.POSITION, new KVector(x - 50, y - 50));
    return node;
  });
  spec.parents.forEach((parent, i) => ElkGraphUtil.createSimpleEdge(nodes[parent]!, nodes[i + 1]!));
  graph.setProperty(InternalProperties.ROOT_NODE, nodes[0]!);
  graph.setProperty(RadialOptions.RADIUS, setup.radius);
  graph.setProperty(RadialOptions.SORTER, setup.sorter);
  graph.setProperty(RadialOptions.WEDGE_CRITERIA, setup.criteria);
  graph.setProperty(RadialOptions.OPTIMIZATION_CRITERIA, setup.optimizer);
  return { graph, nodes };
}

/** Every effect of the phase: each node's location at raw bits and its ORDER_ID, or what was thrown. */
function runPhase(spec: TreeSpec, setup: Setup, eades: EadesRadial): string[] {
  const { graph, nodes } = buildRadialGraph(spec, setup);
  try {
    eades.process(graph, new NullElkProgressMonitor());
  } catch (e) {
    return [`threw ${(e as Error).name}: ${(e as Error).message}`];
  }
  return nodes.map(
    (n) => `${doubleBits(n.getX())} ${doubleBits(n.getY())} ${String(n.getProperty(RadialOptions.ORDER_ID))}`,
  );
}

/**
 * The node-size wedge spaces of the caterpillar (a leaf 5, spine node k from the end 5k), looked up in constant time: the deep
 * case is about the traversal of `positionNodes`, not the linear cost of the criteria per call.
 */
function memoCriteria(spineNodes: readonly ElkNode[], leaves: readonly ElkNode[]): IAnnulusWedgeCriteria {
  const space = new Map<ElkNode, number>();
  spineNodes.forEach((node, i) => space.set(node, 5 * (spineNodes.length - i)));
  leaves.forEach((leaf) => space.set(leaf, 5));
  return { calculateWedgeSpace: (node) => space.get(node)! };
}

function deepRun(eades: EadesRadial): { spineNodes: ElkNode[]; leaves: ElkNode[] } {
  const tree = buildCaterpillar(DEEP_SPINE);
  const internals = eades as unknown as Internals;
  internals.root = tree.spineNodes[0]!;
  internals.radius = DEEP_RADIUS;
  internals.sorter = null;
  internals.annulusWedgeCriteria = memoCriteria(tree.spineNodes, tree.leaves);
  internals.positionNodes.call(internals, internals.root, 0, 0, 2 * Math.PI, 0);
  return tree;
}

/**
 * `positionNodes` from a over a, b and c (3 x 4, apart) with edges a→b, b→c, c→b, a successor cycle the recursion never
 * leaves. A constant wedge space isolates `positionNodes`: the node-size criteria would run into the cycle first.
 */
function endlessRun(eades: EadesRadial): void {
  const graph = ElkGraphUtil.createGraph();
  const [a, b, c] = [0, 1, 2].map((i) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(3, 4);
    node.setLocation(10 * i, 0);
    return node;
  });
  ElkGraphUtil.createSimpleEdge(a!, b!);
  ElkGraphUtil.createSimpleEdge(b!, c!);
  ElkGraphUtil.createSimpleEdge(c!, b!);
  const internals = eades as unknown as Internals;
  internals.root = a!;
  internals.radius = DEEP_RADIUS;
  internals.sorter = null;
  internals.annulusWedgeCriteria = { calculateWedgeSpace: () => 1 };
  internals.positionNodes.call(internals, internals.root, 0, 0, 2 * Math.PI, 0);
}

describe('EadesRadial.positionNodes: explicit stack equals the verbatim recursion', () => {
  it(
    `${TREES} seeded trees, every sorter, criteria and radius: every node's location and order id equal the twin`,
    TIMEOUT,
    () => {
      const rnd = seededRandom(23_112_026);
      const mismatches: number[] = [];
      let threw = 0;
      for (let i = 0; i < TREES; i++) {
        const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
        const setup: Setup = {
          sorter: SORTERS[i % SORTERS.length]!,
          criteria: CRITERIA[Math.floor(i / SORTERS.length) % CRITERIA.length]!,
          radius: RADII[Math.floor(i / 6) % RADII.length]!,
          optimizer: i % OPTIMIZER_EVERY === 0 ? RadialTranslationStrategy.EDGE_LENGTH : RadialTranslationStrategy.NONE,
        };
        const expected = runPhase(spec, setup, twinEades());
        const actual = runPhase(spec, setup, new EadesRadial());
        if (actual.join('|') !== expected.join('|')) {
          mismatches.push(i);
        }
        threw += expected[0]!.startsWith('threw') ? 1 : 0;
      }
      expect(mismatches).toEqual([]);
      // the comparison has power: the phase completes on the trees, it does not merely throw the same way
      expect(threw).toBe(0);
    },
  );

  it(`a ${DEEP_SPINE}-node caterpillar spine is positioned without overflow, like the twin`, TIMEOUT, () => {
    const port = deepRun(new EadesRadial());
    // the root is centred on the origin; leaf k sits on circle k + 1 (EadesRadial.java:95-100, radius added per level)
    expect([port.spineNodes[0]!.getX(), port.spineNodes[0]!.getY()]).toEqual([-1.5, -2]);
    const deepest = port.leaves[DEEP_SPINE - 1]!;
    expect(Math.hypot(deepest.getX() + 1.5, deepest.getY() + 2)).toBeCloseTo(DEEP_SPINE * DEEP_RADIUS, 6);
    let twin: { spineNodes: ElkNode[]; leaves: ElkNode[] } | null = null;
    try {
      twin = deepRun(twinEades());
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(bitsOf(twin.spineNodes)).toEqual(bitsOf(port.spineNodes));
      expect(bitsOf(twin.leaves)).toEqual(bitsOf(port.leaves));
    }
  });

  it(
    'a successor cycle reachable from the root (a→b, b→c, c→b) throws RangeError, like the twin',
    ENDLESS_TIMEOUT,
    () => {
      // the Java recursion never ends there and throws StackOverflowError; the port's stack is depth-checked
      expect(() => endlessRun(new EadesRadial())).toThrow(RangeError);
      expect(() => endlessRun(twinEades())).toThrow(RangeError);
    },
  );
});
