// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the self loop branch of NorthSouthPortPostprocessor that only the T13 `sites/SelfLoop/{orthogonal,
// polyline}` rows reach (mission 7e, T14a, unreached.md S13; the rows omit SELF_LOOP_PREPROCESSOR, so the dummy of the
// north-north loop g0/e6 survives to the postprocessor). Each case replays one row with the postprocessor injected and
// asserts the fields the branch decides, the endpoints and the bend points of the loop edge (the loop edge takes its
// bend points from the dummy's edges, NorthSouthPortPostprocessor.java:213-250), never the whole row
// (NorthSouthPortPostprocessor.test.ts replays that). Literals are the row's `expected.edges` and
// `expected.geometry.edges` (hex doubles decoded), within AD-4.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../test/helpers/layered-framework-replay.js';
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
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { NorthSouthPortPostprocessor } from './NorthSouthPortPostprocessor.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums, `NorthSouthPortPostprocessor` injected for NORTH_SOUTH_PORT_POSTPROCESSOR and the real router (`EdgeRouterFactory`) for P5. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return name === 'NORTH_SOUTH_PORT_POSTPROCESSOR'
      ? new NorthSouthPortPostprocessor()
      : IntermediateProcessorStrategy.valueOf(name).create();
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
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
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

/** The bend points and the endpoints of the north-north self loop g0/e6 after the postprocessor reconnected it. */
function selfLoopOf(id: string): { src: string | null; tgt: string | null; bendPoints: (readonly [number, number])[] } {
  const actual = replayed(id);
  const edge = actual.edges.find((candidate) => candidate.path === 'g0/e6')!;
  return {
    src: edge.src,
    tgt: edge.tgt,
    bendPoints: actual.geometry.edges['g0/e6']!.bendPoints.map(([x, y]) => [decodeHex(x), decodeHex(y)]),
  };
}

function expectLoop(id: string, bendPoints: readonly (readonly [number, number])[]): void {
  const loop = selfLoopOf(id);
  // processSelfLoop reconnects the edge to the origin ports of the dummy (NorthSouthPortPostprocessor.java:218-222)
  expect([loop.src, loop.tgt]).toEqual(['g0/n4/p0', 'g0/n4/p1']);
  expect(loop.bendPoints).toHaveLength(bendPoints.length);
  bendPoints.forEach(([x, y], i) => {
    expect(loop.bendPoints[i]![0], `bend point ${String(i)} x`).toBeCloseTo(x, COORDINATE_DIGITS);
    expect(loop.bendPoints[i]![1], `bend point ${String(i)} y`).toBeCloseTo(y, COORDINATE_DIGITS);
  });
}

describe('NorthSouthPortPostprocessor site rows (T14a)', () => {
  it('S13: the self loop dummy after the orthogonal router is replaced by the loop edge and its two bend points', () => {
    // oracle: sites/SelfLoop/orthogonal; NorthSouthPortPostprocessor.java:86 (ORIGIN is an LEdge), :213-217
    // (processSelfLoop takes the dummy's WEST and EAST port)
    expectLoop('sites/SelfLoop/orthogonal', [
      [229.33333333333334, -10],
      [240.66666666666666, -10],
    ]);
  });

  it('S13: the same after the polyline router', () => {
    // oracle: sites/SelfLoop/polyline; NorthSouthPortPostprocessor.java:86, :213-217
    expectLoop('sites/SelfLoop/polyline', [
      [236.38333333333335, -20.75],
      [247.71666666666667, -20.75],
    ]);
  });
});
