// SPDX-License-Identifier: EPL-2.0
// Proof of InLayerConstraintProcessor: every row of layered-placement.json whose last replayed entry is IN_LAYER_CONSTRAINT_PROCESSOR (mission 7d, T4), with
// the class injected through `createProcessor` (the enum arm is wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { PLACEMENT_PROCESSOR_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const PROCESSOR = 'IN_LAYER_CONSTRAINT_PROCESSOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-sinewaveoptimization/N7/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N2/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-htvq4/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-levelcrossingdetector/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-randomwalk/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-router/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-producer/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-01/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-02/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-03/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-emptyLayerFirst/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-emptyLayerLast/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/layer_constraints-emptyLayerMid/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ticket-600/N1/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/partitioning-nonConsecutivePartitions/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/partitioning-partitions01/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/partitioning-partitions02/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ticket-656/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/ticket-528-violatedNodeOrder/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-linear_segments_cycle/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-north_multiple/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-north_south_fixed_side/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-nsp1/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-nsp2/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-nsp3/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/north_south_ports-south_multiple/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_leftdown/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_leftup/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_rightdown/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_rightup/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_leftdown/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_leftup/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_rightup/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-classes-classes_two_samesize/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_above/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-edge_length-edge_length_space_below/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-severalEdges/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-compact-unbalanced/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph01/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph02/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph03/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph04/root/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'models/node_placement-flexible_ports-graph04/parent/IN_LAYER_CONSTRAINT_PROCESSOR/default',
  'scenarios/in-layer/north-south',
  'scenarios/in-layer/sides',
  'scenarios/in-layer/external-chain',
];

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: PlacementRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const rows = loadPlacementRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === PROCESSOR);

function replay(row: PlacementRow): LGraph {
  return row.steps === null
    ? runPlacementPrefix(row, PLACEMENT_PROCESSOR_FACTORIES)
    : runSteps(row, PLACEMENT_PROCESSOR_FACTORIES);
}

describe('InLayerConstraintProcessor (oracle rows)', () => {
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
