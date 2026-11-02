// SPDX-License-Identifier: EPL-2.0
// Proof of InteractiveNodePlacer (mission 7d, T5): every row of layered-placement.json whose last replayed entry is
// `P4_NODE_PLACEMENT/INTERACTIVE` (pipeline rows by their prefix, step rows by their last runPhase; the NODE_PLACEMENT_REPEATER
// rows end with the repeater and belong to T4/T8), with the placer injected through `createPhase` (T8 wires the enum
// arm) and the 7d processors injected through `createProcessor`. Expectations come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
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
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { HierarchicalPortDummySizeProcessor } from '../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { InteractiveNodePlacer } from './InteractiveNodePlacer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const LAST_ENTRY = 'P4_NODE_PLACEMENT/INTERACTIVE';

/** The recorded rows, pinned by id so a missing row fails loudly. */
const ROW_IDS: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/P4/INTERACTIVE',
  'models/ptolemy-multicoreexecution/N8/P4/INTERACTIVE',
  'models/ptolemy-htvq4/N7/P4/INTERACTIVE',
  'models/ptolemy-producer/root/P4/INTERACTIVE',
  'models/layer_constraints-01/root/P4/INTERACTIVE',
  'models/layer_constraints-02/root/P4/INTERACTIVE',
  'models/layer_constraints-03/root/P4/INTERACTIVE',
  'models/layer_constraints-emptyLayerFirst/root/P4/INTERACTIVE',
  'models/layer_constraints-emptyLayerLast/root/P4/INTERACTIVE',
  'models/layer_constraints-emptyLayerMid/root/P4/INTERACTIVE',
  'models/partitioning-nonConsecutivePartitions/root/P4/INTERACTIVE',
  'models/partitioning-partitions01/root/P4/INTERACTIVE',
  'models/partitioning-partitions02/root/P4/INTERACTIVE',
  'models/ticket-656/root/P4/INTERACTIVE',
  'models/north_south_ports-linear_segments_cycle/root/P4/INTERACTIVE',
  'models/north_south_ports-north_multiple/root/P4/INTERACTIVE',
  'models/north_south_ports-north_south_fixed_side/root/P4/INTERACTIVE',
  'models/north_south_ports-nsp1/root/P4/INTERACTIVE',
  'models/north_south_ports-nsp2/root/P4/INTERACTIVE',
  'models/north_south_ports-nsp3/root/P4/INTERACTIVE',
  'models/north_south_ports-south_multiple/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_leftup/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_rightdown/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_rightup/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_leftdown/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_leftup/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_rightdown/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_rightup/root/P4/INTERACTIVE',
  'models/node_placement-bk-classes-classes_two_samesize/root/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-severalEdges/root/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/P4/INTERACTIVE',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/P4/INTERACTIVE',
  'models/node_placement-compact-unbalanced/root/P4/INTERACTIVE',
  'models/node_placement-flexible_ports-graph01/root/P4/INTERACTIVE',
  'models/node_placement-flexible_ports-graph02/root/P4/INTERACTIVE',
  'models/node_placement-flexible_ports-graph03/root/P4/INTERACTIVE',
  'models/node_placement-flexible_ports-graph04/root/P4/INTERACTIVE',
  'models/node_placement-flexible_ports-graph04/parent/P4/INTERACTIVE',
  'scenarios/p4-interactive/long-edges',
  'scenarios/p4-interactive/fan',
  'scenarios/p4-interactive/port-labels',
  'scenarios/p4-interactive/north-south',
  'scenarios/p4-interactive/external-chain',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/Interactive/originalDummyPosition',
];

/** The 7d processors and the placer are injected (T8 wires their enum arms); every other name goes through the enums. */
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
        return new InteractiveNodePlacer();
    }
  },
};

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: PlacementRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadPlacementRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === LAST_ENTRY);

function replay(row: PlacementRow): LGraph {
  return row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
}

describe('InteractiveNodePlacer (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual([...ROW_IDS]);
  });

  it.each(ROW_IDS.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});

describe('InteractiveNodePlacer.getLayoutProcessorConfiguration', () => {
  it('is null without external ports', () => {
    expect(new InteractiveNodePlacer().getLayoutProcessorConfiguration(new LGraph())).toBeNull();
  });

  it('adds HIERARCHICAL_PORT_POSITION_PROCESSOR before P5 for external ports, as one cached configuration', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    const placer = new InteractiveNodePlacer();
    const configuration = placer.getLayoutProcessorConfiguration(graph)!;
    expect([...configuration.processorsBefore(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT)]).toEqual([]);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([]);
    expect(new InteractiveNodePlacer().getLayoutProcessorConfiguration(graph)).toBe(configuration);
  });
});
