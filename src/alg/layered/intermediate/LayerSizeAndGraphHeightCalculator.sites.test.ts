// SPDX-License-Identifier: EPL-2.0
// Anchored case for the branch of LayerSizeAndGraphHeightCalculator that only the T13 `sites/EmptyLayer/layerSize` row
// reaches (mission 7e, T14a, unreached.md S11). The case replays the row with the calculator injected and asserts the
// fields the branch decides, the layer sizes and the graph size (LayerSizeAndGraphHeightCalculator.java:60-61,:64),
// never the whole row (LayerSizeAndGraphHeightCalculator.test.ts replays that). Literals are the row's
// `expected.geometry.layers` and `graph` (hex doubles decoded).
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
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { LayerSizeAndGraphHeightCalculator } from './LayerSizeAndGraphHeightCalculator.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums, `LayerSizeAndGraphHeightCalculator` injected for LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return name === 'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR'
      ? new LayerSizeAndGraphHeightCalculator()
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
        throw new Error(`the plan of this row stops before ${phase}`);
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

describe('LayerSizeAndGraphHeightCalculator site rows (T14a)', () => {
  it('S11: an empty layer keeps size 0 x 0 and does not count towards the graph height', () => {
    // oracle: sites/EmptyLayer/layerSize; LayerSizeAndGraphHeightCalculator.java:64 (an empty layer is skipped after
    // its size was reset); the graph height comes from the two non-empty layers only
    const actual = replayed('sites/EmptyLayer/layerSize');
    expect(actual.geometry.layers.map((size) => size.map(decodeHex))).toEqual([
      [30, 30],
      [0, 0],
      [30, 30],
    ]);
    expect(actual.geometry.graph.size.map(decodeHex)).toEqual([0, 30]);
    expect(actual.geometry.graph.offset.map(decodeHex)).toEqual([0, 0]);
  });
});
