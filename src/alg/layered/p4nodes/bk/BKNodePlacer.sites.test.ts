// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the branches of the Brandes-Koepf placer that only the T11 `sites/BK/*` rows reach (mission 7d,
// T12b, unreached.md S11-S14). Each case replays one row with the placer injected and asserts the y coordinate of the
// nodes the branch decides (the field BK writes, `BKNodePlacer.java:272`), never the whole row (BKNodePlacer.test.ts
// replays that). Literals are the row's `expected.geometry.nodes[path].pos[1]` (hex doubles decoded), within AD-4.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import { placementDump } from '../../../../../test/helpers/layered-placement-replay-dump.js';
import { loadPlacementRows, type PlacementRow } from '../../../../../test/helpers/layered-placement-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../../graph/LGraph.js';
import { InLayerConstraintProcessor } from '../../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { LayerSweepCrossingMinimizer } from '../../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { BKNodePlacer } from './BKNodePlacer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const BRANDES_KOEPF = 'BRANDES_KOEPF';
const COORDINATE_DIGITS = 6;
const Y = 1;

/** The row-replaying factories of BKNodePlacer.test.ts: the processors the site rows' chains name, BK for P4. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'TWO_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        expect(strategy).toBe(BRANDES_KOEPF);
        return new BKNodePlacer();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadPlacementRows(ROWS_FILE);

/** Replays the row and returns the y of each requested node path as BK left it. */
function placedY(id: string, paths: readonly string[]): Record<string, number> {
  const row: PlacementRow = rows.find((candidate) => candidate.id === id)!;
  const actual = placementDump(runSteps(row, factories), importRow(row).importDump);
  return Object.fromEntries(paths.map((path) => [path, decodeHex(actual.geometry.nodes[path]!.pos[Y])]));
}

function expectY(actual: Record<string, number>, expected: Record<string, number>): void {
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  for (const [path, y] of Object.entries(expected)) {
    expect(actual[path], path).toBeCloseTo(y, COORDINATE_DIGITS);
  }
}

describe('BKNodePlacer site rows (T12b)', () => {
  it('S11: the inner segment between the two long-edge dummies stays straight, the crossing edge is not', () => {
    // oracle: sites/BK/type1Conflict; BKNodePlacer.java:355-378 (markConflicts marks n1->n2, which crosses the inner segment)
    expectY(placedY('sites/BK/type1Conflict', ['new/n0', 'new/n1', 'g0/n1', 'g0/n2']), {
      'new/n0': 40,
      'new/n1': 40,
      'g0/n1': 0,
      'g0/n2': 51,
    });
  });

  it('S12: the in-layer edges of the inverted-port node are skipped as neighbours and in the threshold search', () => {
    // oracle: sites/BK/inLayerEdges; NeighborhoodInformation.java:160,183 and ThresholdStrategy.java:231,290
    expectY(placedY('sites/BK/inLayerEdges', ['g0/n3', 'g0/n0', 'new/n0', 'g0/n1', 'new/n1', 'g0/n2', 'g0/n4']), {
      'g0/n3': -121.33333333333333,
      'g0/n0': -71.33333333333333,
      'new/n0': -106.33333333333333,
      'g0/n1': -75.66666666666666,
      'new/n1': 15,
      'g0/n2': -49.99999999999999,
      'g0/n4': 0,
    });
  });

  it('S13: only the highest-priority edges are neighbours, the lower-priority ones do not pull', () => {
    // oracle: sites/BK/straightnessPriority; NeighborhoodInformation.java:158-170,181-193
    expectY(placedY('sites/BK/straightnessPriority', ['g0/n1', 'g0/n0', 'g0/n2', 'g0/n3', 'g0/n4']), {
      'g0/n1': -45,
      'g0/n0': 5,
      'g0/n2': 0,
      'g0/n3': -45,
      'g0/n4': 5,
    });
  });

  it('S14: the last node of each layer keeps the y of a block shifted down by the post-processing', () => {
    // oracle: sites/BK/infeasible/lastInLayer; BKAlignedLayout.java checkSpaceBelow/getLowerNeighbor on a layer's last node
    expectY(placedY('sites/BK/infeasible/lastInLayer', ['g0/n2', 'g0/n3', 'g0/n6', 'new/n2']), {
      'g0/n2': 175,
      'g0/n3': 204,
      'g0/n6': 218,
      'new/n2': 194,
    });
  });
});
