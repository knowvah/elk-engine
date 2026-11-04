// SPDX-License-Identifier: EPL-2.0
// Proof of FinalSplineBendpointsCalculator (mission 7e, T9): every `FINAL_SPLINE_BENDPOINTS_CALCULATOR` stop of
// layered-routing.json (`models`) and every `scenarios/FinalSplineBendpointsCalculator/*` row of
// layered-routing-steps.json, replayed with the class injected through the `Factories` and every other name through the
// real enums (the prefix runs T8's router and T5's joiner). Expectations come only from the rows (L4, AD-13): the bend
// points of every edge are the proof, CONSERVATIVE and SLOPPY modes both. The hyperedge rows are the R9 proof of the
// `SplineSegment.edges` iteration order (`FinalSplineBendpointsCalculator.java:142,174,185`).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { SplineSegment } from '../p5edges/splines/SplineSegment.js';
import { FinalSplineBendpointsCalculator } from './FinalSplineBendpointsCalculator.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const FSBC = 'FINAL_SPLINE_BENDPOINTS_CALCULATOR';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const SPLINES = 'SPLINES';
const MODEL_STOP_INDEX = 3;
const MODEL_VARIANT_INDEX = 4;
const SCENARIO_PREFIX = 'scenarios/FinalSplineBendpointsCalculator/';
/** The hyperedge rows: the ids the brief names (models under SPLINES and the scenario). */
const HYPEREDGE_ROW = /splines-hyperedges|hyperedge_merging-|\/hyperedges$/;

/** Whether the row is a `FINAL_SPLINE_BENDPOINTS_CALCULATOR` stop of a model or a scenario of this processor. */
function isFsbcRow(row: RoutingRow): boolean {
  if (row.group === 'scenarios') {
    return row.id.startsWith(SCENARIO_PREFIX);
  }
  return row.id.split('/')[MODEL_STOP_INDEX] === FSBC;
}

/** The variant of a row: the last segment of a `models` id, the scenario name after the processor for the others. */
function variantOf(row: RoutingRow): string {
  return row.group === 'models' ? row.id.split('/')[MODEL_VARIANT_INDEX]! : row.id.slice(SCENARIO_PREFIX.length);
}

/** A factory set that builds everything from the real enums; `override` replaces the processor under test. */
function factoriesWith(override: (name: string) => ILayoutProcessor<LGraph> | undefined): Factories {
  return {
    createProcessor(name): ILayoutProcessor<LGraph> {
      return override(name) ?? IntermediateProcessorStrategy.valueOf(name).create();
    },
    createPhase(phase, strategy): ILayoutProcessor<LGraph> {
      switch (phase) {
        case 'P1_CYCLE_BREAKING':
          return CycleBreakingStrategy.valueOf(strategy).create();
        case 'P2_LAYERING':
          return LayeringStrategy.valueOf(strategy).create();
        case 'P3_NODE_ORDERING':
          return CrossingMinimizationStrategy.valueOf(strategy).create();
        case 'P4_NODE_PLACEMENT':
          return NodePlacementStrategy.valueOf(strategy).create();
        default:
          // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's; this file injects the spline router
          expect(phase).toBe(ROUTING_PHASE);
          expect(strategy).toBe(SPLINES);
          return new SplineEdgeRouter();
      }
    },
  };
}

/** The class under test injected for its own processor name, everything else real. */
const injected: Factories = factoriesWith((name) =>
  name === FSBC ? new FinalSplineBendpointsCalculator() : undefined,
);

/** The processor name replaced by a processor that does nothing: the state the rows start from. */
const withoutFsbc: Factories = factoriesWith((name) =>
  name === FSBC ? { process: (): void => undefined } : undefined,
);

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE).filter(isGeometryRow).filter(isFsbcRow);

function replay(row: RoutingRow, factories: Factories): ReturnType<typeof runRoutingPrefix> {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

describe('FinalSplineBendpointsCalculator (oracle rows)', () => {
  it('finds the recorded rows: 101 model stops and 8 scenarios, by variant', () => {
    const models = rows.filter((row) => row.group === 'models');
    expect(models).toHaveLength(101);
    const byVariant = new Map<string, number>();
    models.forEach((row) => byVariant.set(variantOf(row), (byVariant.get(variantOf(row)) ?? 0) + 1));
    expect(Object.fromEntries(byVariant)).toEqual({
      SPLINES: 81,
      'SPLINES-sloppy': 4,
      'SPLINES-sloppy-0.6': 4,
      'SPLINES-edge-edge-17': 4,
      'SPLINES-edge-node-14': 4,
      'SPLINES-node-node-32': 4,
    });
    expect(
      rows
        .filter((row) => row.group === 'scenarios')
        .map((row) => variantOf(row))
        .sort(),
    ).toEqual(
      [
        'chain',
        'fan',
        'hyperedges',
        'long-edges',
        'north-south-ports',
        'sizes',
        'sloppy/fan',
        'sloppy/long-edges',
      ].sort(),
    );
  });

  it('includes the hyperedge spline rows that prove the Pair set order (R9): 13 model stops and the scenario', () => {
    const hyperedgeRows = rows.filter((row) => HYPEREDGE_ROW.test(row.id));
    expect(hyperedgeRows.filter((row) => row.group === 'models')).toHaveLength(13);
    expect(hyperedgeRows.filter((row) => row.group === 'scenarios').map((row) => row.id)).toEqual([
      'scenarios/FinalSplineBendpointsCalculator/hyperedges',
    ]);
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const graph = replay(row, injected);
      const actual = routingDump(graph, importRow(row).importDump);
      expect(compareRouting(actual, row.expected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// The rows are not vacuous

describe('FinalSplineBendpointsCalculator (the rows are not vacuous)', () => {
  it('the state without the processor differs from the recorded state exactly on the rows that record bend points', () => {
    let differing = 0;
    for (const row of rows) {
      const actual = routingDump(replay(row, withoutFsbc), importRow(row).importDump);
      const recordsBendPoints = Object.values(row.expected.geometry.edges).some((edge) => edge.bendPoints.length > 0);
      const differs = compareRouting(actual, row.expected).length > 0;
      expect(differs, row.id).toBe(recordsBendPoints);
      differing += differs ? 1 : 0;
    }
    expect(differing).toBeGreaterThan(100);
  });

  it('is a processor of its own class that takes a monitor and leaves no route property on the start edges', () => {
    const row = rows.find((candidate) => candidate.id === 'scenarios/FinalSplineBendpointsCalculator/long-edges')!;
    const graph = replay(row, withoutFsbc);
    new FinalSplineBendpointsCalculator().process(graph, new BasicProgressMonitor());
    const actual = routingDump(graph, importRow(row).importDump);
    expect(compareRouting(actual, row.expected)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// R9: the order of `SplineSegment.edges`

/** The distinct segments of every start edge of a routed graph, in the order the processor visits them. */
function segmentsOf(graph: LGraph): SplineSegment[] {
  const segments = new Set<SplineSegment>();
  for (const layer of graph) {
    for (const node of layer) {
      for (const edge of node.getOutgoingEdges()) {
        (edge.getProperty(InternalProperties.SPLINE_ROUTE_START) ?? []).forEach((segment) => segments.add(segment));
      }
    }
  }
  return [...segments];
}

/** A factory set whose processor sees (and optionally reverses the `edges` of) the multi-edge segments first. */
function observing(observe: (segments: SplineSegment[]) => void): Factories {
  return factoriesWith((name) =>
    name === FSBC
      ? {
          process(graph, monitor): void {
            observe(segmentsOf(graph));
            new FinalSplineBendpointsCalculator().process(graph, monitor);
          },
        }
      : undefined,
  );
}

describe('FinalSplineBendpointsCalculator (R9: the order of SplineSegment.edges)', () => {
  const multiEdgeSizes: number[] = [];
  const rowsWithMultiEdgeSegments = new Set<string>();

  it('replays every row identically with the edges of every multi-edge segment in reverse order, and reaches such segments', () => {
    for (const row of rows) {
      const factories = observing((segments) => {
        for (const segment of segments.filter((candidate) => candidate.edges.size >= 2)) {
          multiEdgeSizes.push(segment.edges.size);
          rowsWithMultiEdgeSegments.add(row.id);
          const reversed = [...segment.edges].reverse();
          segment.edges.clear();
          reversed.forEach((edge) => segment.edges.add(edge));
        }
      });
      const actual = routingDump(replay(row, factories), importRow(row).importDump);
      expect(compareRouting(actual, row.expected), row.id).toEqual([]);
    }
    // the hyperedge rows reach the order: 18 segments of exactly two edges on 10 rows, 6 of them hyperedge rows
    expect(multiEdgeSizes).toHaveLength(18);
    expect(new Set(multiEdgeSizes)).toEqual(new Set([2]));
    expect(rowsWithMultiEdgeSegments.size).toBe(10);
    expect([...rowsWithMultiEdgeSegments].filter((id) => HYPEREDGE_ROW.test(id))).toHaveLength(6);
  });
});
