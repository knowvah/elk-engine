// SPDX-License-Identifier: EPL-2.0
// Proof of LabelAndNodeSizeProcessor: every row of layered-placement.json whose last replayed entry is LABEL_AND_NODE_SIZE_PROCESSOR (mission 7d, T4), with
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
const PROCESSOR = 'LABEL_AND_NODE_SIZE_PROCESSOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-sinewaveoptimization/N7/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N2/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-htvq4/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-levelcrossingdetector/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-randomwalk/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-router/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-producer/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-01/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-02/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-03/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerFirst/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerLast/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerMid/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ticket-600/N1/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/partitioning-nonConsecutivePartitions/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/partitioning-partitions01/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/partitioning-partitions02/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ticket-656/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/ticket-528-violatedNodeOrder/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-linear_segments_cycle/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-north_multiple/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-north_south_fixed_side/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-nsp1/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-nsp2/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-nsp3/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/north_south_ports-south_multiple/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_leftdown/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_leftup/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_rightdown/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_rightup/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_leftdown/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_leftup/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightup/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_samesize/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_above/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_below/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-severalEdges/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-compact-unbalanced/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph01/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph02/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph03/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph04/root/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph04/parent/LABEL_AND_NODE_SIZE_PROCESSOR/default',
  'scenarios/label-size/port-labels',
  'scenarios/label-size/ports-only',
  'scenarios/label-size/fan-ports',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/LabelAndNodeSize/externalPortLabels/outside',
  'sites/LabelAndNodeSize/externalPortLabels/fixed',
  'sites/LabelAndNodeSize/externalPortLabels/outsideNext',
  'sites/LabelAndNodeSize/externalPortLabels/insideNext',
  'sites/LabelAndNodeSize/externalPortLabels/outsideNextUngrouped',
  'sites/LabelAndNodeSize/externalPortLabels/insideNextUngrouped',
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

describe('LabelAndNodeSizeProcessor (oracle rows)', () => {
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
