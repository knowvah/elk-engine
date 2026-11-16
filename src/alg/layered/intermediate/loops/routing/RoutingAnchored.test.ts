// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the self loop routing classes (mission 7g, T21a, W14/F12): `RoutingSlotAssigner`, `LabelPlacer`,
// `RoutingDirector`, `SelfHyperLoopLabels` and the three routers. Every case replays one row of
// test/golden/refs/java/layered-loops.json through the real classes, then asserts a class-level fact against the value the
// row records (the replay suites compare whole rows; a regression there names a row, these name the class). No literal is
// typed here: slots, sides, alignments, label coordinates and bend points are read from the row, coordinates compare at
// AD-4 (1e-6), enum constants compare by name.
import { describe, expect, it } from 'vitest';
import { InteractiveLayeredGraphVisitor } from '../../../InteractiveLayeredGraphVisitor.js';
import { ComponentsProcessor } from '../../../components/ComponentsProcessor.js';
import { LEdge } from '../../../graph/LEdge.js';
import type { LGraph } from '../../../graph/LGraph.js';
import { LNode } from '../../../graph/LNode.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { decodeHex, registerLayered } from '../../../../../../test/helpers/layered-framework-replay.js';
import { withLoopsLabelManager } from '../../../../../../test/helpers/layered-loops-replay-manager.js';
import { runLoopsRow, strategyFactories } from '../../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  isStopRow,
  loadLoopsRows,
  registerLoopsEnums,
  type PipelineStopRow,
} from '../../../../../../test/helpers/layered-loops-replay-rows.js';
import {
  installWrappingEncoding,
  withListOptions,
} from '../../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { contextOf, elementAt } from '../../../../../../test/helpers/layered-phase-replay-dump.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';

const AD4_TOLERANCE = 1e-6;

type Hex = string;
type HexPair = readonly [Hex, Hex];

interface LabelsRow {
  readonly side: string | null;
  readonly alignment: string | null;
  readonly size: HexPair;
  readonly position: HexPair;
  readonly reference: string | null;
}

interface LoopRow {
  readonly type: string | null;
  readonly ports: readonly string[];
  readonly occupiedSides: readonly string[];
  readonly slots: readonly number[];
  readonly leftmost: string | null;
  readonly rightmost: string | null;
  readonly labels: LabelsRow | null;
}

interface HolderRow {
  readonly slotCounts: readonly number[];
  readonly loops: readonly LoopRow[];
}

interface Expected {
  readonly selfLoops: Readonly<Record<string, HolderRow>>;
  readonly geometry: {
    readonly edges: Readonly<Record<string, { readonly bendPoints: readonly HexPair[] }>>;
    readonly nodes: Readonly<Record<string, { readonly margin: readonly [Hex, Hex, Hex, Hex] }>>;
  };
}

const rows = new Map(
  loadLoopsRows()
    .filter(isStopRow)
    .map((row) => [row.id, row] as const),
);

/** A row replayed through the real pipeline: the graph after the row's last step and the row's recording. */
interface Replayed {
  readonly graph: LGraph;
  readonly expected: Expected;
}

function replay(id: string): Replayed {
  const row = rows.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
  const env = {
    factories: strategyFactories,
    components: new ComponentsProcessor(),
    createInteractiveVisitor: () => new InteractiveLayeredGraphVisitor(),
  };
  const result = withLoopsLabelManager(withListOptions(row) as PipelineStopRow, (stepRow) => runLoopsRow(stepRow, env));
  return { graph: result.graph, expected: row.expected as unknown as Expected };
}

const holderOf = (replayed: Replayed, node: string): SelfLoopHolder =>
  (elementAt(replayed.graph, node) as LNode).getProperty(InternalProperties.SELF_LOOP_HOLDER);

const pathOf = (replayed: Replayed, element: object): string => {
  const path = contextOf(replayed.graph).paths.get(element);
  if (path === undefined) {
    throw new Error('element without a path');
  }
  return path;
};

const slotsOf = (loop: SelfHyperLoop): number[] => PortSide.values().map((side) => loop.getRoutingSlot(side));

const near = (actual: number, expected: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(AD4_TOLERANCE);
};

/** The bend points of `edge` equal the row's `geometry.edges[edge]`: same count, each coordinate within AD-4. */
function expectBendPoints(replayed: Replayed, edge: string): void {
  const actual = [...(elementAt(replayed.graph, edge) as LEdge).getBendPoints()];
  const expected = replayed.expected.geometry.edges[edge]!.bendPoints;
  expect(actual).toHaveLength(expected.length);
  expect(expected.length).toBeGreaterThan(0);
  expected.forEach(([x, y], i) => {
    near(actual[i]!.x, decodeHex(x));
    near(actual[i]!.y, decodeHex(y));
  });
}

describe('RoutingSlotAssigner', () => {
  // oracle: sites/RoutingSlotAssigner/labelledThenUnlabelled; RoutingSlotAssigner.java:83-118 (label crossing matrix),
  // :56 (assignRoutingSlots): the unlabelled second loop is pushed one slot away from the labelled first one
  it('assigns the labelled loop and the unlabelled loop of one side to the recorded slots', () => {
    const replayed = replay('sites/RoutingSlotAssigner/labelledThenUnlabelled');
    const holder = holderOf(replayed, 'g0/n1');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const loops = holder.getSLHyperLoops();
    expect(loops).toHaveLength(recorded.loops.length);
    loops.forEach((loop, i) => {
      expect(slotsOf(loop)).toEqual(recorded.loops[i]!.slots);
    });
    // the two slots differ on the shared side: the recorded values tell which loop is outer
    const north = PortSide.values().indexOf(PortSide.NORTH);
    expect(slotsOf(loops[0]!)[north]).not.toBe(slotsOf(loops[1]!)[north]);
    expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
  });

  // oracle: sites/RoutingSlotAssigner/cyclicHyperLoops/seed1 and /seed4096; OrthogonalRoutingGenerator.java:471-483,
  // HyperEdgeCycleDetector.java:203-205: the random draw of the cycle breaker decides which dependency is reversed
  it('breaks the cyclic loop dependencies with the draw of each seed to the two recorded outcomes', () => {
    const outcomes = ['seed1', 'seed4096'].map((seed) => {
      const replayed = replay(`sites/RoutingSlotAssigner/cyclicHyperLoops/${seed}`);
      const holder = holderOf(replayed, 'g0/n0');
      const recorded = replayed.expected.selfLoops['g0/n0']!;
      holder.getSLHyperLoops().forEach((loop, i) => {
        expect(slotsOf(loop)).toEqual(recorded.loops[i]!.slots);
      });
      expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
      return holder.getSLHyperLoops().map(slotsOf);
    });
    expect(outcomes[0]).not.toEqual(outcomes[1]);
  });

  // oracle: sites/RoutingSlotAssigner/cyclicHyperLoops/loops4a/seed1 and loops4b/seed1; same Java lines as above: two more
  // graphs whose draw reaches the cycle breaker
  it.each(['loops4a', 'loops4b'])('assigns the slots of the %s loops to the recorded values', (graph) => {
    const replayed = replay(`sites/RoutingSlotAssigner/cyclicHyperLoops/${graph}/seed1`);
    const holder = holderOf(replayed, 'g0/n0');
    const recorded = replayed.expected.selfLoops['g0/n0']!;
    expect(holder.getSLHyperLoops().map(slotsOf)).toEqual(recorded.loops.map((loop) => loop.slots));
    expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
  });
});

describe('RoutingSlotAssigner label conflicts', () => {
  // oracle: sites/SelfLoopRouter/labelManager/shrink; RoutingSlotAssigner.java:129-150 (labelsOverlap: only loops whose labels
  // share a northern or southern side can conflict, the eastern label of the first loop never does): the four loops get the
  // recorded slots and the holder the recorded slot counts
  it('assigns the slots of loops with labels on the north and the east side as recorded', () => {
    const replayed = replay('sites/SelfLoopRouter/labelManager/shrink');
    const holder = holderOf(replayed, 'g0/n1');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    expect(holder.getSLHyperLoops().map(slotsOf)).toEqual(recorded.loops.map((loop) => loop.slots));
    expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
  });
});

describe('RoutingDirector', () => {
  // oracle: sites/RoutingSlotAssigner/cyclicHyperLoops/seed1; RoutingDirector.java:57 (determineLoopRoutes), :241-300 (four
  // sides, leftmost / rightmost ports), :179 (three sides)
  it('picks the recorded leftmost and rightmost port of a four-sided, a three-sided and an opposing loop', () => {
    const replayed = replay('sites/RoutingSlotAssigner/cyclicHyperLoops/seed1');
    const recorded = replayed.expected.selfLoops['g0/n0']!;
    holderOf(replayed, 'g0/n0')
      .getSLHyperLoops()
      .forEach((loop, i) => {
        const row = recorded.loops[i]!;
        expect(String(loop.getSelfLoopType())).toBe(row.type);
        expect(pathOf(replayed, loop.getLeftmostPort()!.getLPort())).toBe(row.leftmost);
        expect(pathOf(replayed, loop.getRightmostPort()!.getLPort())).toBe(row.rightmost);
        expect([...loop.getOccupiedPortSides()].map((side) => side.name())).toEqual(row.occupiedSides);
      });
  });
});

describe('LabelPlacer', () => {
  const labelsOf = (replayed: Replayed, node: string): { actual: SelfHyperLoop[]; recorded: LoopRow[] } => ({
    actual: holderOf(replayed, node).getSLHyperLoops(),
    recorded: [...replayed.expected.selfLoops[node]!.loops],
  });

  // oracle: sites/LabelPlacer/sequencedSouthOnly; LabelPlacer.java:123-135 (SEQUENCED collects the southern one-sided loops),
  // :178 (assignOneSidedSequencedSideAndAlignment): the two labels align away from each other
  it('aligns the labels of two sequenced southern loops to the recorded sides and alignments', () => {
    const replayed = replay('sites/LabelPlacer/sequencedSouthOnly');
    const { actual, recorded } = labelsOf(replayed, 'g0/n1');
    actual.forEach((loop, i) => {
      const labels = loop.getSLLabels()!;
      const row = recorded[i]!.labels!;
      expect(labels.getSide()!.name()).toBe(row.side);
      expect(labels.getAlignment()!.name()).toBe(row.alignment);
      expect(pathOf(replayed, labels.getAlignmentReferenceSLPort()!.getLPort())).toBe(row.reference);
    });
    expect(recorded[0]!.labels!.alignment).not.toBe(recorded[1]!.labels!.alignment);
  });

  // oracle: sites/LabelPlacer/fourSidesLabel/northFirst and /otherFirst; LabelPlacer.java:290-303 (assignFourSides...,
  // line 302 reads the leftmost port twice): the label goes to the side that the leftmost port does not occupy
  it.each(['northFirst', 'otherFirst'])(
    'places the label of the %s four-sided loop on the recorded side',
    (variant) => {
      const replayed = replay(`sites/LabelPlacer/fourSidesLabel/${variant}`);
      const { actual, recorded } = labelsOf(replayed, 'g0/n0');
      const labels = actual[0]!.getSLLabels()!;
      expect(labels.getSide()!.name()).toBe(recorded[0]!.labels!.side);
      expect(labels.getAlignment()!.name()).toBe(recorded[0]!.labels!.alignment);
    },
  );

  // oracle: sites/LabelPlacer/westLoopLabel; LabelPlacer.java:158-163 (the topmost port of a western loop is the rightmost one)
  it('references the topmost port for the label of a western one-sided loop', () => {
    const replayed = replay('sites/LabelPlacer/westLoopLabel');
    const { actual, recorded } = labelsOf(replayed, 'g0/n1');
    const labels = actual[0]!.getSLLabels()!;
    expect(labels.getAlignment()!.name()).toBe(recorded[0]!.labels!.alignment);
    expect(pathOf(replayed, labels.getAlignmentReferenceSLPort()!.getLPort())).toBe(recorded[0]!.labels!.reference);
  });

  // oracle: sites/SelfLoopRouter/inlineLabels/RIGHT and /DOWN; LabelPlacer.java:253-290 (opposing and three-sided loops keep
  // the inline property; the label side is the side that is not covered)
  it.each(['RIGHT', 'DOWN'])(
    'keeps inline labels of opposing and three-sided loops at the recorded side (%s)',
    (direction) => {
      const replayed = replay(`sites/SelfLoopRouter/inlineLabels/${direction}`);
      const { actual, recorded } = labelsOf(replayed, 'g0/n1');
      actual.forEach((loop, i) => {
        const labels = loop.getSLLabels()!;
        const row = recorded[i]!.labels!;
        expect(labels.getSide()!.name()).toBe(row.side);
        expect(labels.getAlignment()!.name()).toBe(row.alignment);
        near(labels.getPosition().x, decodeHex(row.position[0]));
        near(labels.getPosition().y, decodeHex(row.position[1]));
      });
    },
  );

  // oracle: sites/SelfLoopRouter/labelManager/shrink; LabelPlacer.java:323 (manageLabels), SelfHyperLoopLabels.java
  // (applyLabelManagement): labels wider than the available width are shortened for every alignment
  it('shrinks the labels of every alignment to the recorded size', () => {
    const replayed = replay('sites/SelfLoopRouter/labelManager/shrink');
    const { actual, recorded } = labelsOf(replayed, 'g0/n1');
    expect(new Set(recorded.map((loop) => loop.labels!.alignment))).toEqual(
      new Set(['TOP', 'CENTER', 'LEFT', 'RIGHT']),
    );
    actual.forEach((loop, i) => {
      const labels = loop.getSLLabels()!;
      const row = recorded[i]!.labels!;
      expect(labels.getAlignment()!.name()).toBe(row.alignment);
      near(labels.getSize().x, decodeHex(row.size[0]));
      near(labels.getSize().y, decodeHex(row.size[1]));
    });
  });
});

describe('OrthogonalSelfLoopRouter', () => {
  // oracle: sites/SelfLoopRouter/inlineLabels/RIGHT; OrthogonalSelfLoopRouter.java:104-107,156-158 (inline labels widen
  // the trunk by half the label size) and :55-95 (margins grow to the bend points)
  it('routes the loops with inline labels along the recorded bend points', () => {
    const replayed = replay('sites/SelfLoopRouter/inlineLabels/RIGHT');
    for (const edge of ['g0/e2', 'g0/e3', 'g0/e4', 'g0/e5', 'g0/e6', 'g0/e7']) {
      expectBendPoints(replayed, edge);
    }
  });

  // oracle: scenarios/SelfLoopRouter/e-e/RIGHT; OrthogonalSelfLoopRouter.java:55-95: the node margin is extended by the
  // loop's bend points (top, right, bottom, left)
  it('leaves the recorded margins on a node with an eastern loop', () => {
    const replayed = replay('scenarios/SelfLoopRouter/e-e/RIGHT');
    const margin = (elementAt(replayed.graph, 'g0/n1') as LNode).getMargin();
    const recorded = replayed.expected.geometry.nodes['g0/n1']!.margin.map(decodeHex);
    near(margin.top, recorded[0]!);
    near(margin.right, recorded[1]!);
    near(margin.bottom, recorded[2]!);
    near(margin.left, recorded[3]!);
    expect(recorded[1]).toBeGreaterThan(0);
  });
});

describe('PolylineSelfLoopRouter', () => {
  // oracle: scenarios/SelfLoopRouter/<kind>-polyline/RIGHT; PolylineSelfLoopRouter.java (routeSelfLoops, :112
  // areOrthogonallyRouted): the corners of the orthogonal route, merged where collinear
  it.each([
    ['e-e', 'g0/e3'],
    ['n-s', 'g0/e3'],
    ['hyper-nes', 'g0/e3'],
    ['hyper-nes', 'g0/e4'],
  ])('routes the %s loop edge %s along the recorded bend points', (kind, edge) => {
    expectBendPoints(replay(`scenarios/SelfLoopRouter/${kind}-polyline/RIGHT`), edge);
  });
});

describe('SplineSelfLoopRouter', () => {
  // oracle: scenarios/SelfLoopRouter/<kind>-splines/RIGHT; SplineSelfLoopRouter.java:67 (addSplineControlPoints)
  it.each([
    ['e-e', 'g0/e3'],
    ['n-s', 'g0/e3'],
    ['hyper-nes', 'g0/e3'],
    ['hyper-nes', 'g0/e4'],
  ])('routes the %s loop edge %s along the recorded spline control points', (kind, edge) => {
    expectBendPoints(replay(`scenarios/SelfLoopRouter/${kind}-splines/RIGHT`), edge);
  });

  // oracle: scenarios/SelfLoopRouter/e-e-polyline/RIGHT and e-e-splines/RIGHT; SelfLoopRouter.java:75-87
  // (routerForGraph): one graph, two routers, the recorded counts differ (4 polyline points against 5 spline points)
  it('is selected over the polyline router by the edge routing option', () => {
    const polyline = replay('scenarios/SelfLoopRouter/e-e-polyline/RIGHT');
    const splines = replay('scenarios/SelfLoopRouter/e-e-splines/RIGHT');
    const count = (replayed: Replayed): number =>
      [...(elementAt(replayed.graph, 'g0/e3') as LEdge).getBendPoints()].length;
    expect(count(polyline)).toBe(polyline.expected.geometry.edges['g0/e3']!.bendPoints.length);
    expect(count(splines)).toBe(splines.expected.geometry.edges['g0/e3']!.bendPoints.length);
    expect(count(splines)).not.toBe(count(polyline));
  });
});
