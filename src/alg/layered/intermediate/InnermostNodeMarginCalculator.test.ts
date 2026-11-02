// SPDX-License-Identifier: EPL-2.0
// Proof of InnermostNodeMarginCalculator: every row of layered-placement.json whose last replayed entry is INNERMOST_NODE_MARGIN_CALCULATOR (mission 7d, T4), with
// the class injected through `createProcessor` (the enum arm is wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { HierarchicalPortDummySizeProcessor } from './HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from './InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from './InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from './LabelAndNodeSizeProcessor.js';
import { NodePlacementRepeater } from './NodePlacementRepeater.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const PROCESSOR = 'INNERMOST_NODE_MARGIN_CALCULATOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-sinewaveoptimization/N7/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-multicoreexecution/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-multicoreexecution/N2/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-multicoreexecution/N8/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-htvq4/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-htvq4/N7/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-levelcrossingdetector/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-randomwalk/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-router/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-producer/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-01/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-02/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-03/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-emptyLayerFirst/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-emptyLayerLast/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/layer_constraints-emptyLayerMid/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ticket-600/N1/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/partitioning-nonConsecutivePartitions/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/partitioning-partitions01/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/partitioning-partitions02/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ticket-656/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/ticket-528-violatedNodeOrder/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-linear_segments_cycle/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-north_multiple/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-north_south_fixed_side/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-nsp1/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-nsp2/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-nsp3/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/north_south_ports-south_multiple/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_leftdown/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_leftup/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_rightdown/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_rightup/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_leftdown/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_leftup/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_rightup/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-classes-classes_two_samesize/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_above/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_below/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-severalEdges/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-compact-unbalanced/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-flexible_ports-graph01/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-flexible_ports-graph02/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-flexible_ports-graph03/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-flexible_ports-graph04/root/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'models/node_placement-flexible_ports-graph04/parent/INNERMOST_NODE_MARGIN_CALCULATOR/default',
  'scenarios/margin/port-labels',
  'scenarios/margin/ports-only',
  'scenarios/margin/fan-ports',
  'scenarios/margin/long-edges',
];

/** The 7d processors are injected (T8 wires their enum arms); every other name goes through the real enums. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      case 'NODE_PLACEMENT_REPEATER':
        return new NodePlacementRepeater();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return NodePlacementStrategy.valueOf(strategy).create();
    }
  },
};

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: PlacementRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const rows = loadPlacementRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === PROCESSOR);

function replay(row: PlacementRow): LGraph {
  return row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
}

describe('InnermostNodeMarginCalculator (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});
