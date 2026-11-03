// SPDX-License-Identifier: EPL-2.0
// Anchored case for the self loop branch of PolylineEdgeRouter that only the T13 `sites/SelfLoop/polyline` row reaches
// (mission 7e, T14a, unreached.md S13; the row omits SELF_LOOP_PREPROCESSOR so the east-east loop g0/e2 reaches the
// router). The case replays the row with the router injected and asserts the field the branch decides, the bend points
// of every edge (PolylineEdgeRouter.java:469-474), never the whole row (PolylineEdgeRouter.test.ts replays that).
// Literals are the row's `expected.geometry.edges` (hex doubles decoded), within AD-4.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex, type HexPair } from '../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingExpected,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums, `PolylineEdgeRouter` injected for P5. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return IntermediateProcessorStrategy.valueOf(name).create();
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        expect(strategy).toBe('POLYLINE');
        return new PolylineEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

/** Replays the row with the class under test injected and dumps the resulting state (the recorder's shape). */
function replayed(id: string): RoutingExpected {
  const row = rows.find((candidate) => candidate.id === id)!;
  return routingDump(runRoutingSteps(row, factories), importRow(row).importDump);
}

type Point = readonly [number, number];
interface Route {
  readonly bendPoints: readonly Point[];
  readonly junctionPoints?: readonly Point[];
}

const pointOf = ([x, y]: HexPair): Point => [decodeHex(x), decodeHex(y)];

function expectPoints(
  actual: readonly Point[] | undefined,
  expected: readonly Point[] | undefined,
  what: string,
): void {
  expect(actual?.length, what).toBe(expected?.length);
  expected?.forEach(([x, y], i) => {
    expect(actual![i]![0], `${what}[${String(i)}].x`).toBeCloseTo(x, COORDINATE_DIGITS);
    expect(actual![i]![1], `${what}[${String(i)}].y`).toBeCloseTo(y, COORDINATE_DIGITS);
  });
}

function expectRoutes(id: string, expected: Record<string, Route>): void {
  const actual = replayed(id).geometry.edges;
  // the edge map is unordered (the comparators of the helpers treat it as a map)
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, route] of Object.entries(expected)) {
    expectPoints(actual[path]!.bendPoints.map(pointOf), route.bendPoints, `${path} bend points`);
    expectPoints(actual[path]!.junctionPoints?.map(pointOf), route.junctionPoints, `${path} junction points`);
  }
}

describe('PolylineEdgeRouter site rows (T14a)', () => {
  it('S13: the polyline router adds no bend point to a self loop it meets', () => {
    // oracle: sites/SelfLoop/polyline; PolylineEdgeRouter.java:469 (!edge.isSelfLoop() is false for the east-east
    // loop g0/e2, so no bend point is inserted)
    expectRoutes('sites/SelfLoop/polyline', {
      'g0/e1': { bendPoints: [] },
      'g0/e0': { bendPoints: [[54, 38]] },
      'g0/e4': { bendPoints: [] },
      'g0/e3': { bendPoints: [[154, 28.5]] },
      'g0/e2': { bendPoints: [] },
      'g0/e5': { bendPoints: [] },
      'g0/e6': {
        bendPoints: [
          [236.38333333333335, -20.75],
          [247.71666666666667, -20.75],
        ],
      },
    });
  });
});
