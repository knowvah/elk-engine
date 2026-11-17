// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the wrapping classes (mission 7g, T21b, W14/F12). Each case replays one row of
// test/golden/refs/java/layered-loops.json through the real classes (`runLoopsRow`, the same interpreter as
// `replayLoopsRow`) and asserts one class-level fact against the value the row records: the cut indexes a heuristic returns,
// the layer shape a processor leaves, the `BPInfo` chain of a breaking-point dummy, the bend points of a joined edge.
// Coordinates compare at AD-4 (1e-6). A leading `// oracle:` comment names the row and the Java line; the structural cases at
// the end derive their expectation from the Java line they cite.
import { beforeAll, describe, expect, it } from 'vitest';
import { runLabelsFullRow } from '../../../../../test/helpers/layered-labels-replay-full.js';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../../test/helpers/layered-labels-replay-dump.js';
import {
  loadLoopsRows,
  registerLoopsEnums,
  rowsByGroup,
  type FullRow,
  type LoopsRow,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import { runLoopsRow } from '../../../../../test/helpers/layered-loops-replay-ops.js';
import { withoutSelfLoopHolder } from '../../../../../test/helpers/layered-loops-replay-selfloops.js';
import { installWrappingEncoding, withListOptions } from '../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { addLayer, addNode } from '../../../../../test/helpers/lgraph-builders.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { ComponentsProcessor } from '../../components/ComponentsProcessor.js';
import { LGraph } from '../../graph/LGraph.js';
import { CuttingStrategy } from '../../options/CuttingStrategy.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { ValidifyStrategy } from '../../options/ValidifyStrategy.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import { GraphStats } from './GraphStats.js';
import { ManualCutIndexCalculator } from './ICutIndexCalculator.js';
import { MSDCutIndexHeuristic } from './MSDCutIndexHeuristic.js';
import { SingleEdgeGraphWrapper } from './SingleEdgeGraphWrapper.js';

const AD4_TOLERANCE = 1e-6;
const HEX_DIGITS_PER_DOUBLE = 16;
const NEW_PREFIX = 'new/';
const BPI_KEY = 'breakingPoint.info';
const INSERTER_STEP = 'BREAKING_POINT_INSERTER';
const WRAPPER_STEP = 'SINGLE_EDGE_GRAPH_WRAPPER';

const rowsById = new Map(
  rowsByGroup('sites', loadLoopsRows())
    .concat(rowsByGroup('scenarios', loadLoopsRows()), rowsByGroup('full', loadLoopsRows()))
    .map((row) => [row.id, row] as const),
);

function rowOf(id: string): LoopsRow {
  const row = rowsById.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  return row;
}

/** A hex-encoded double of a row (`encodeHex`). */
function decode(hex: string): number {
  expect(hex).toHaveLength(HEX_DIGITS_PER_DOUBLE);
  return new DataView(Uint8Array.from(hex.match(/../g)!, (byte) => Number.parseInt(byte, 16)).buffer).getFloat64(0);
}

const environment = { components: new ComponentsProcessor() };

/** The row replayed to its `dump` and dumped as the replay does (`replayStop`). */
function dumpOf(id: string): LabelsExpected {
  const row = withListOptions(rowOf(id) as never) as never as Parameters<typeof runLoopsRow>[0];
  const result = runLoopsRow(row, environment);
  return withoutSelfLoopHolder(labelsDump(result, row.expected as never)) as LabelsExpected;
}

/** The graph a row's steps leave before the first `runProcessor <processor>` (no dump). */
function graphBefore(id: string, processor: string): LGraph {
  const row = withListOptions(rowOf(id) as never) as never as Parameters<typeof runLoopsRow>[0];
  const steps = row.steps!;
  const stop = steps.findIndex(([op, name]) => op === 'runProcessor' && name === processor);
  expect(stop).toBeGreaterThan(0);
  return runLoopsRow({ ...row, steps: steps.slice(0, stop) }, environment).graph;
}

/** The `cuts` list of a row's `setProperty` step (a recorded `List<Integer>`). */
function recordedCuts(id: string): number[] {
  const step = rowOf(id).steps!.find(([op, , key]) => op === 'setProperty' && String(key).endsWith('cutting.cuts'))!;
  return (step[3] as { v: number }[]).map((entry) => entry.v);
}

/**
 * The cut indexes a `BreakingPointInserter` row shows: each run of layers that hold breaking-point dummies (the nodes the row
 * records a `breakingPoint.info` for) follows that many other layers.
 */
function cutsShownBy(id: string): number[] {
  const expected = rowOf(id).expected as unknown as LabelsExpected;
  const breaking = new Set(expected.changed.filter((entry) => BPI_KEY in entry.props).map((entry) => entry.path));
  const cuts: number[] = [];
  let other = 0;
  let previousBreaking = false;
  for (const layer of expected.layers) {
    const isBreaking = layer.some((path) => breaking.has(path));
    if (!isBreaking) {
      other++;
    } else if (!previousBreaking) {
      cuts.push(other);
    }
    previousBreaking = isBreaking;
  }
  return cuts;
}

/** The number of layers of a `SingleEdgeGraphWrapper` row that hold a wrapping dummy: the width of the first row. */
const wrappedWidth = (layers: readonly (readonly string[])[]): number =>
  layers.filter((layer) => layer.some((p) => p.startsWith(NEW_PREFIX))).length;

const bendPointsOf = (dump: LabelsExpected, path: string): [number, number][] =>
  dump.geometry.edges![path]!.bendPoints.map(([x, y]) => [decode(x), decode(y)]);

function expectBendPointsNear(actual: [number, number][], row: LoopsRow, path: string): void {
  const recorded = (row.expected as unknown as LabelsExpected).geometry.edges![path]!.bendPoints;
  expect(actual).toHaveLength(recorded.length);
  recorded.forEach(([x, y], i) => {
    expect(Math.abs(actual[i]![0] - decode(x))).toBeLessThanOrEqual(AD4_TOLERANCE);
    expect(Math.abs(actual[i]![1] - decode(y))).toBeLessThanOrEqual(AD4_TOLERANCE);
  });
}

const recordedLayers = (id: string): readonly (readonly string[])[] =>
  (rowOf(id).expected as unknown as { layers: string[][] }).layers;

type Layout = { width: number; height: number; children?: (Layout & { id: string; x: number; y: number })[] };

/** `[id, x, y]` of every node of an exported layout, nested ids joined with `/`. */
function flatten(node: Layout, prefix = ''): [string, number, number][] {
  return (node.children ?? []).flatMap((child): [string, number, number][] => [
    [`${prefix}${child.id}`, child.x, child.y],
    ...flatten(child, `${prefix}${child.id}/`),
  ]);
}

/** The layout of a `full` row, laid out by the engine, and the one the row records. */
function fullLayoutsOf(id: string): { actual: Layout; recorded: Layout } {
  const row = rowOf(id) as FullRow;
  return { actual: runLabelsFullRow(row).layout as Layout, recorded: (row.expected as { layout: Layout }).layout };
}

beforeAll(() => {
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
});

describe('wrapping classes on the oracle rows (F12)', () => {
  // oracle: scenarios/BreakingPointInserter/chain-msd/RIGHT; MSDCutIndexHeuristic.java:40-120
  it('MSD heuristic returns the cut indexes where the row shows breaking points', () => {
    const id = 'scenarios/BreakingPointInserter/chain-msd/RIGHT';
    const graph = graphBefore(id, INSERTER_STEP);
    const cuts = new MSDCutIndexHeuristic().getCutIndexes(graph, new GraphStats(graph));
    expect(cuts).toEqual(cutsShownBy(id));
    expect(cuts).toEqual([4, 8]);
  });

  // oracle: scenarios/BreakingPointInserter/chain-ard/RIGHT; ARDCutIndexHeuristic.java:29-59
  it('ARD heuristic returns the cut indexes where the row shows breaking points', () => {
    const id = 'scenarios/BreakingPointInserter/chain-ard/RIGHT';
    const graph = graphBefore(id, INSERTER_STEP);
    const cuts = new ARDCutIndexHeuristic().getCutIndexes(graph, new GraphStats(graph));
    expect(cuts).toEqual(cutsShownBy(id));
    expect(cuts).toEqual([4, 8]);
  });

  // oracle: scenarios/BreakingPointInserter/chain-manual/RIGHT; ICutIndexCalculator.java:52-58
  it('the manual calculator returns the recorded cuts and the row shows them', () => {
    const id = 'scenarios/BreakingPointInserter/chain-manual/RIGHT';
    const graph = graphBefore(id, INSERTER_STEP);
    const cuts = new ManualCutIndexCalculator().getCutIndexes(graph, new GraphStats(graph));
    expect(cuts).toEqual(recordedCuts(id));
    // the inserter's `improveCuts` then moves the last cut from 6 to 5 (BreakingPointInserter.java:248-300): the row shows 5
    expect(cutsShownBy(id)).toEqual([2, 4, 5]);
  });

  // oracle: sites/SingleEdgeGraphWrapper/manualNoCuts; ICutIndexCalculator.java:52-58
  it('the manual calculator answers no cuts without the cuts property and the layering stays', () => {
    const id = 'sites/SingleEdgeGraphWrapper/manualNoCuts';
    const graph = graphBefore(id, WRAPPER_STEP);
    expect(new ManualCutIndexCalculator().getCutIndexes(graph, new GraphStats(graph))).toEqual([]);
    expect(dumpOf(id).layers).toEqual(recordedLayers(id));
    expect(recordedLayers(id)).toHaveLength(8);
  });

  // oracle: sites/SingleEdgeGraphWrapper/aspectAbove; SingleEdgeGraphWrapper.java:82-86
  it('SingleEdgeGraphWrapper leaves the layering when the desired aspect ratio exceeds the layer count', () => {
    const id = 'sites/SingleEdgeGraphWrapper/aspectAbove';
    const dump = dumpOf(id);
    expect(dump.layers).toEqual(recordedLayers(id));
    expect(dump.layers).toHaveLength(8);
    expect(dump.layers.every((layer) => layer.every((p) => !p.startsWith(NEW_PREFIX)))).toBe(true);
  });

  // oracle: sites/SingleEdgeGraphWrapper/validifyLookBack/{lower,upper,skip}; SingleEdgeGraphWrapper.java:151-213
  describe.each([
    ['lower', [4], [3]],
    ['upper', [5], [6]],
    ['skip', [5, 5], [6]],
  ] as const)('validifyIndexesLookingBack %s', (variant, desired, validified) => {
    it(`moves the desired cuts to the cuts the row wraps at`, () => {
      const id = `sites/SingleEdgeGraphWrapper/validifyLookBack/${variant}`;
      expect(recordedCuts(id)).toEqual(desired);
      const graph = graphBefore(id, WRAPPER_STEP);
      const cuts = SingleEdgeGraphWrapper.validifyIndexesLookingBack(new GraphStats(graph), desired);
      expect(cuts).toEqual(validified);
      expect(cuts).toEqual([wrappedWidth(recordedLayers(id))]);
      expect(dumpOf(id).layers).toEqual(recordedLayers(id));
    });
  });

  // oracle: sites/GraphStats/forbiddenOutOfRange/{greedy,lookBack}; GraphStats.java:293-317. The forbidden indices 0 and
  // 99 are out of range. Before eclipse-elk/elk#1223 the property skipped the default `isCutAllowed` pass, so every cut was
  // forbidden; now the default pass runs first and out-of-range indices forbid nothing.
  it.each(['greedy', 'lookBack'] as const)('forbidden indices out of range leave the default cuts (%s)', (variant) => {
    const id = `sites/GraphStats/forbiddenOutOfRange/${variant}`;
    const graph = graphBefore(id, WRAPPER_STEP);
    const gs = new GraphStats(graph);
    const allowed = Array.from({ length: gs.longestPath }, (_, i) => gs.isCutAllowed(i));
    expect(allowed).toEqual([false, ...Array.from({ length: gs.longestPath - 1 }, () => true)]);
    const validified =
      variant === 'greedy'
        ? SingleEdgeGraphWrapper.validifyIndexesGreedily(gs, recordedCuts(id))
        : SingleEdgeGraphWrapper.validifyIndexesLookingBack(gs, recordedCuts(id));
    expect(recordedCuts(id)).toEqual([3]);
    expect(validified).toEqual([3]);
    expect(dumpOf(id).layers).toEqual(recordedLayers(id));
    expect(wrappedWidth(recordedLayers(id))).toBe(3);
  });

  // oracle: sites/GraphStats/northSouthHeight; GraphStats.java:249
  it('a north-south port dummy adds to the layer height and the wrapper cuts the row at the recorded width', () => {
    const id = 'sites/GraphStats/northSouthHeight';
    const dump = dumpOf(id);
    expect(dump.layers).toEqual(recordedLayers(id));
    expect(dump.layers).toHaveLength(2);
    expect(wrappedWidth(dump.layers)).toBe(2);
  });

  // oracle: scenarios/BreakingPointInserter/chain-labels-msd/RIGHT; MSDCutIndexHeuristic.java:68-90
  it('MSD heuristic cuts a labelled chain where the row shows breaking points', () => {
    const id = 'scenarios/BreakingPointInserter/chain-labels-msd/RIGHT';
    const graph = graphBefore(id, INSERTER_STEP);
    const cuts = new MSDCutIndexHeuristic().getCutIndexes(graph, new GraphStats(graph));
    expect(cuts).toEqual([6, 12]);
    // `improveCuts` then moves the first cut from 6 to 5: the row shows 5 and 12
    expect(cutsShownBy(id)).toEqual([5, 12]);
  });

  // oracle: full/wrapping/preserve_order-simpleLongEdges01/SINGLE_EDGE-ARD-NO; GraphStats.java:249
  it('a north-south port dummy raises the layer height the ARD wrapper sees (full layout)', () => {
    const { actual, recorded } = fullLayoutsOf('full/wrapping/preserve_order-simpleLongEdges01/SINGLE_EDGE-ARD-NO');
    expect([actual.width, actual.height]).toEqual([104, 51]);
    expect(flatten(actual)).toEqual([
      ['l0p0', 12, 15],
      ['l2p1', 52, 15],
      ['l4p0', 92, 15],
    ]);
    expect(flatten(actual)).toEqual(flatten(recorded));
  });

  // oracle: sites/BreakingPointInserter/oneLayerImproveCuts; BreakingPointInserter.java:248-300
  it('the inserter leaves a one-layer graph without breaking points', () => {
    const id = 'sites/BreakingPointInserter/oneLayerImproveCuts';
    const dump = dumpOf(id);
    expect(dump.layers).toEqual(recordedLayers(id));
    expect(dump.layers).toEqual([['g0/n0', 'g0/n1']]);
  });

  // oracle: sites/CuttingUtils/negativeThickness; CuttingUtils.java:104-109
  it('a wrapped edge of negative thickness gets thickness 0 on the edge and every dummy edge', () => {
    const id = 'sites/CuttingUtils/negativeThickness';
    const dump = dumpOf(id);
    const thicknessOf = (changed: LabelsExpected['changed']): [string, number][] =>
      changed
        .filter((entry) => 'org.eclipse.elk.edge.thickness' in entry.props)
        .map((entry) => [entry.path, Number((entry.props['org.eclipse.elk.edge.thickness'] as { v: unknown }).v)]);
    const thickness = thicknessOf(dump.changed);
    expect(thickness).toEqual([
      ['g0/e3', 0],
      ['new/e1', 0],
      ['new/e3', 0],
      ['new/e4', 0],
    ]);
    expect(thickness).toEqual(thicknessOf((rowOf(id).expected as unknown as LabelsExpected).changed));
  });

  // oracle: scenarios/BreakingPointInserter/chain-msd/RIGHT; BreakingPointInserter.java:192-228 (BPInfo)
  it('the inserter chains the BPInfo of an edge crossing two cuts (new/n1)', () => {
    const id = 'scenarios/BreakingPointInserter/chain-msd/RIGHT';
    const info = dumpOf(id).changed.find((entry) => entry.path === 'new/n1')!.props[BPI_KEY] as {
      fields: Record<string, { ref?: string; fields?: Record<string, { ref?: string } | null> } | null>;
    };
    expect(info.fields.start).toEqual({ ref: 'new/n1' });
    expect(info.fields.end).toEqual({ ref: 'new/n4' });
    expect(info.fields.nodeStartEdge).toEqual({ ref: 'new/e1' });
    expect(info.fields.startEndEdge).toEqual({ ref: 'new/e4' });
    expect(info.fields.originalEdge).toEqual({ ref: 'g0/e4' });
    expect(info.fields.prev).toBeNull();
    expect(info.fields.next!.fields!.start).toEqual({ ref: 'new/n6' });
    expect(info.fields.next!.fields!.end).toEqual({ ref: 'new/n9' });
    const recorded = (rowOf(id).expected as unknown as LabelsExpected).changed.find(
      (entry) => entry.path === 'new/n1',
    )!;
    expect(info).toEqual(recorded.props[BPI_KEY]);
  });
  // oracle: sites/BreakingPointProcessor/inLayerDummies/{improveOn,improveOff}; BreakingPointProcessor.java:340-358,380-383
  it.each([
    ['improveOn', [2, 3, 4, 5, 9, 7]],
    ['improveOff', [6, 7, 8, 9, 9, 7]],
  ] as const)('the processor leaves the recorded layer sizes with improveWrappedEdges (%s)', (variant, sizes) => {
    const id = `sites/BreakingPointProcessor/inLayerDummies/${variant}`;
    const layers = dumpOf(id).layers;
    expect(layers).toEqual(recordedLayers(id));
    expect(layers.map((layer) => layer.length)).toEqual(sizes);
  });

  // oracle: sites/BreakingPointProcessor/inLayerDummies/improveOn; BreakingPointProcessor.java:211-253
  it('improveWrappedEdges drops the in-layer dummies the row no longer shows', () => {
    const on = dumpOf('sites/BreakingPointProcessor/inLayerDummies/improveOn');
    const off = dumpOf('sites/BreakingPointProcessor/inLayerDummies/improveOff');
    const count = (layers: readonly (readonly string[])[]): number => layers.flat().length;
    expect(count(on.layers)).toBe(30);
    expect(count(off.layers)).toBe(46);
    expect(on.layers[0]).toEqual(['new/n0', 'new/n1']);
  });

  // oracle: sites/BreakingPointProcessor/emptyBreakingLayer; BreakingPointProcessor.java:151
  it('a cut crossed by no edge leaves no empty breaking-point layer', () => {
    const id = 'sites/BreakingPointProcessor/emptyBreakingLayer';
    const layers = dumpOf(id).layers;
    expect(layers).toEqual(recordedLayers(id));
    expect(layers.map((layer) => layer.length)).toEqual([1, 1, 1, 1, 1]);
  });

  // oracle: sites/BreakingPointRemover/multiCutEdge/ORTHOGONAL; BreakingPointRemover.java:68-72
  it('the remover joins an edge crossing two cuts and leaves the recorded orthogonal bend points', () => {
    const id = 'sites/BreakingPointRemover/multiCutEdge/ORTHOGONAL';
    const dump = dumpOf(id);
    expect(dump.edges.find((e) => e.path === 'g0/e1')).toEqual({
      path: 'g0/e1',
      src: 'g0/n0/p1',
      tgt: 'g0/n11/p1',
      reversed: false,
    });
    const bends = bendPointsOf(dump, 'g0/e1');
    expect(bends).toHaveLength(12);
    expect(bends[0]).toEqual([80, -176]);
    expect(bends[11]).toEqual([290, 10]);
    expectBendPointsNear(bends, rowOf(id), 'g0/e1');
  });

  // oracle: sites/BreakingPointRemover/multiCutEdge/POLYLINE; BreakingPointRemover.java:68-72
  it('the remover joins an edge crossing two cuts under POLYLINE routing', () => {
    const id = 'sites/BreakingPointRemover/multiCutEdge/POLYLINE';
    const dump = dumpOf(id);
    const bends = bendPointsOf(dump, 'g0/e1');
    expect(bends).toHaveLength(16);
    expect(bends[0]![0]).toBeCloseTo(83.2, 6);
    expect(bends[0]![1]).toBe(-187);
    expect(bends[15]![0]).toBeCloseTo(277.6, 6);
    expect(bends[15]![1]).toBe(-1);
    expectBendPointsNear(bends, rowOf(id), 'g0/e1');
  });

  // oracle: sites/BreakingPointRemover/wrapSplinesPolyline/SPLINES; BreakingPointRemover.java:105-146
  it('the remover joins the spline routes of a wrapped edge', () => {
    const id = 'sites/BreakingPointRemover/wrapSplinesPolyline/SPLINES';
    const dump = dumpOf(id);
    expect(dump.edges.find((e) => e.path === 'g0/e5')).toEqual({
      path: 'g0/e5',
      src: 'g0/n3/p2',
      tgt: 'g0/n9/p2',
      reversed: false,
    });
    const bends = bendPointsOf(dump, 'g0/e5');
    expect(bends).toHaveLength(44);
    expect(bends[0]).toEqual([100, 138]);
    expect(bends[43]).toEqual([50, 286]);
    expectBendPointsNear(bends, rowOf(id), 'g0/e5');
  });

  // oracle: sites/BreakingPointRemover/wrapSplinesPolyline/POLYLINE; BreakingPointRemover.java:105-146
  it('the remover joins the polyline route of a wrapped edge', () => {
    const id = 'sites/BreakingPointRemover/wrapSplinesPolyline/POLYLINE';
    const bends = bendPointsOf(dumpOf(id), 'g0/e5');
    expect(bends).toHaveLength(7);
    expect(bends[0]![0]).toBeCloseTo(97.1, 6);
    expect(bends[0]![1]).toBe(138);
    expect(bends[6]![0]).toBeCloseTo(25.6, 6);
    expect(bends[6]![1]).toBe(286);
    expectBendPointsNear(bends, rowOf(id), 'g0/e5');
  });

  // oracle: scenarios/BreakingPointInserter/chain-manual/RIGHT; BreakingPointInserter.java:215-219
  it('the BPInfo of a multi-cut edge links forward to the next breaking point (new/n0)', () => {
    const id = 'scenarios/BreakingPointInserter/chain-manual/RIGHT';
    type Info = { fields: Record<string, { ref?: string; fields?: Info['fields'] } | null> };
    const info = dumpOf(id).changed.find((entry) => entry.path === 'new/n0')!.props[BPI_KEY] as Info;
    expect(info.fields.start).toEqual({ ref: 'new/n0' });
    expect(info.fields.end).toEqual({ ref: 'new/n2' });
    expect(info.fields.originalEdge).toEqual({ ref: 'g0/e1' });
    expect(info.fields.prev).toBeNull();
    expect(info.fields.next!.fields!.start).toEqual({ ref: 'new/n4' });
    expect(info.fields.next!.fields!.end).toEqual({ ref: 'new/n7' });
    expect(info.fields.next!.fields!.next!.fields!.start).toEqual({ ref: 'new/n10' });
    const recorded = (rowOf(id).expected as unknown as LabelsExpected).changed.find(
      (entry) => entry.path === 'new/n0',
    )!;
    expect(info).toEqual(recorded.props[BPI_KEY]);
  });

  // oracle: sites/Empty/{ORTHOGONAL,POLYLINE,SPLINES}/wrap; SingleEdgeGraphWrapper.java:71
  it.each(['ORTHOGONAL', 'POLYLINE', 'SPLINES'] as const)(
    'a childless graph is laid out to the recorded size with wrapping (%s)',
    (routing) => {
      const id = `sites/Empty/${routing}/wrap`;
      const row = withListOptions(rowOf(id) as never) as never as Parameters<typeof runLoopsRow>[0];
      const layout = runLoopsRow(row, environment).layout as { width: number; height: number };
      const recorded = (rowOf(id).expected as unknown as { layout: { width: number; height: number } }).layout;
      expect(layout.width).toBe(recorded.width);
      expect(layout.height).toBe(recorded.height);
      expect([layout.width, layout.height]).toEqual([24, 24]);
    },
  );
});

describe('wrapping classes, structural (expectations from the Java line cited)', () => {
  /** The members of `GraphStats` the heuristics read, over `layers` equal layers of width and height 10. */
  const statsOf = (layers: number, dar: number): GraphStats =>
    ({
      dar,
      longestPath: layers,
      getWidths: () => new Array<number>(layers).fill(10),
      getHeights: () => new Array<number>(layers).fill(10),
      getSumWidth: () => layers * 10,
      getMaxHeight: () => 10,
    }) as unknown as GraphStats;

  // ARDCutIndexHeuristic.java:55-59: rows = Math.min(rows, gs.longestPath)
  it('ARD never asks for more chunks than there are layers', () => {
    const gs = statsOf(5, 0.001);
    expect(ARDCutIndexHeuristic.getChunkCount(gs)).toBe(gs.longestPath);
  });

  // MSDCutIndexHeuristic.java:56,63-64: with freedom 0 the only candidate is `cutCnt = getChunkCount(gs) - 1` cuts
  it('MSD with freedom 0 tries exactly one cut count less than the chunk count', () => {
    const gs = statsOf(8, 1);
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM, 0);
    expect(new MSDCutIndexHeuristic().getCutIndexes(graph, gs)).toHaveLength(
      ARDCutIndexHeuristic.getChunkCount(gs) - 1,
    );
  });

  // MSDCutIndexHeuristic.java:112: `maxScale > bestMaxScale` keeps the first of two equally good candidates
  it('MSD keeps the first of two candidates with the same score (twin: freedom 0 runs only the first)', () => {
    const gs = statsOf(6, 1);
    const free = new LGraph();
    const first = new LGraph();
    first.setProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM, 0);
    const firstCuts = new MSDCutIndexHeuristic().getCutIndexes(first, gs);
    expect(firstCuts).toHaveLength(ARDCutIndexHeuristic.getChunkCount(gs) - 1);
    expect(new MSDCutIndexHeuristic().getCutIndexes(free, gs)).toEqual(firstCuts);
  });

  // SingleEdgeGraphWrapper.java:199: `distLower > distHigher` (a tie takes the lower valid cut)
  it('validifyIndexesLookingBack takes the lower valid cut when both are equally far', () => {
    const allowed = new Set([3, 7]);
    const gs = { longestPath: 8, isCutAllowed: (index: number) => allowed.has(index) } as unknown as GraphStats;
    expect(SingleEdgeGraphWrapper.validifyIndexesLookingBack(gs, [5])).toEqual([3]);
  });

  // SingleEdgeGraphWrapper.java:82: `gs.dar > currentAR` returns early; an aspect ratio equal to the layer count wraps
  it('SingleEdgeGraphWrapper wraps when the desired aspect ratio equals the current one', () => {
    const graph = new LGraph();
    for (let i = 0; i < 8; i++) {
      const node = addNode(graph);
      node.getSize().x = 30;
      node.getSize().y = 30;
      node.setLayer(addLayer(graph));
    }
    graph.setProperty(LayeredOptions.ASPECT_RATIO, 8);
    graph.setProperty(LayeredOptions.WRAPPING_CUTTING_STRATEGY, CuttingStrategy.MANUAL);
    graph.setProperty(LayeredOptions.WRAPPING_VALIDIFY_STRATEGY, ValidifyStrategy.NO);
    graph.setProperty(LayeredOptions.WRAPPING_CUTTING_CUTS, [4]);
    new SingleEdgeGraphWrapper().process(graph, new BasicProgressMonitor());
    // the cut at 4 turns 8 layers into two rows of 4 columns
    expect(graph.getLayers().map((layer) => layer.getNodes().length)).toEqual([2, 2, 2, 2]);
  });
});
