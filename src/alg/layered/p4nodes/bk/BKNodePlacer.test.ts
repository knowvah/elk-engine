// SPDX-License-Identifier: EPL-2.0
// Proof of BKNodePlacer (mission 7d, T6): every row of layered-placement.json that stops at
// `P4_NODE_PLACEMENT`/`BRANDES_KOEPF` (the pinned id lists below), replayed with the placer injected through the
// `Factories`. The four before-P4 processors T4 ports are injected by path (the `IntermediateProcessorStrategy` arms
// throw until T8). Expectations come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import {
  comparePlacement,
  comparePlacementFullDump,
} from '../../../../../test/helpers/layered-placement-replay-compare.js';
import { placementDump } from '../../../../../test/helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../../../../../test/helpers/layered-placement-replay-ops.js';
import { loadPlacementRows, type PlacementRow } from '../../../../../test/helpers/layered-placement-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { LayeredPhases } from '../../LayeredPhases.js';
import { LGraph } from '../../graph/LGraph.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { HierarchicalPortDummySizeProcessor } from '../../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../../intermediate/LabelAndNodeSizeProcessor.js';
import { LayerSweepCrossingMinimizer } from '../../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { BKNodePlacer } from './BKNodePlacer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;
const BRANDES_KOEPF = 'BRANDES_KOEPF';
const P4_PREFIX_END = `P4_NODE_PLACEMENT/${BRANDES_KOEPF}`;

/** The pipeline rows (`steps === null`) whose prefix ends in `P4_NODE_PLACEMENT/BRANDES_KOEPF`: 99 rows of the `models` group, among them the `bk-*` and `favor-*` variants. */
const PIPELINE_ROWS: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/P4/BRANDES_KOEPF',
  'models/ptolemy-multicoreexecution/N8/P4/BRANDES_KOEPF',
  'models/ptolemy-htvq4/N7/P4/BRANDES_KOEPF',
  'models/ptolemy-producer/root/P4/BRANDES_KOEPF',
  'models/ptolemy-producer/root/P4/bk-NONE-NONE',
  'models/ptolemy-producer/root/P4/bk-NONE-LEFTUP',
  'models/ptolemy-producer/root/P4/bk-NONE-RIGHTUP',
  'models/ptolemy-producer/root/P4/bk-NONE-LEFTDOWN',
  'models/ptolemy-producer/root/P4/bk-NONE-RIGHTDOWN',
  'models/ptolemy-producer/root/P4/bk-NONE-BALANCED',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-NONE',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-LEFTUP',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-RIGHTUP',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-LEFTDOWN',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-RIGHTDOWN',
  'models/ptolemy-producer/root/P4/bk-IMPROVE_STRAIGHTNESS-BALANCED',
  'models/ptolemy-producer/root/P4/favor-straight-edges-false-BRANDES_KOEPF',
  'models/layer_constraints-01/root/P4/BRANDES_KOEPF',
  'models/layer_constraints-02/root/P4/BRANDES_KOEPF',
  'models/layer_constraints-03/root/P4/BRANDES_KOEPF',
  'models/layer_constraints-emptyLayerFirst/root/P4/BRANDES_KOEPF',
  'models/layer_constraints-emptyLayerLast/root/P4/BRANDES_KOEPF',
  'models/layer_constraints-emptyLayerMid/root/P4/BRANDES_KOEPF',
  'models/partitioning-nonConsecutivePartitions/root/P4/BRANDES_KOEPF',
  'models/partitioning-partitions01/root/P4/BRANDES_KOEPF',
  'models/partitioning-partitions02/root/P4/BRANDES_KOEPF',
  'models/ticket-656/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-linear_segments_cycle/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-north_multiple/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-north_south_fixed_side/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-nsp1/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-nsp2/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-nsp3/root/P4/BRANDES_KOEPF',
  'models/north_south_ports-south_multiple/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-NONE',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-LEFTUP',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-RIGHTUP',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-LEFTDOWN',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-RIGHTDOWN',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-NONE-BALANCED',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-NONE',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-LEFTUP',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-RIGHTUP',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-LEFTDOWN',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-RIGHTDOWN',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/bk-IMPROVE_STRAIGHTNESS-BALANCED',
  'models/node_placement-bk-classes-classes_leftdown/root/P4/favor-straight-edges-false-BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_leftup/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_rightdown/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_rightup/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_leftdown/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_leftup/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_rightdown/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_rightdown_surrounded/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_rightup/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-classes-classes_two_samesize/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-severalEdges/root/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesLeft/c1/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesLeft/c2/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesLeft/c3/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesLeft/c4/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesRight/c1/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesRight/c2/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesRight/c3/P4/BRANDES_KOEPF',
  'models/node_placement-bk-straightness-straightEdgesRight/c4/P4/BRANDES_KOEPF',
  'models/node_placement-compact-unbalanced/root/P4/BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph01/root/P4/BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph01/root/P4/favor-straight-edges-false-BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph02/root/P4/BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph03/root/P4/BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph03/root/P4/favor-straight-edges-false-BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph04/root/P4/BRANDES_KOEPF',
  'models/node_placement-flexible_ports-graph04/parent/P4/BRANDES_KOEPF',
];

/** The step rows whose last `runPhase` is `P4_NODE_PLACEMENT`/`BRANDES_KOEPF` with no later `runProcessor`: 5 `p4-brandes_koepf`, the 24 `bk-matrix` and `bk-options/favor-straight-edges-false` scenarios. */
const STEP_ROWS: readonly string[] = [
  'scenarios/p4-brandes_koepf/long-edges',
  'scenarios/p4-brandes_koepf/fan',
  'scenarios/p4-brandes_koepf/port-labels',
  'scenarios/p4-brandes_koepf/north-south',
  'scenarios/p4-brandes_koepf/external-chain',
  'scenarios/bk-matrix/long-edges-none-none',
  'scenarios/bk-matrix/fan-none-none',
  'scenarios/bk-matrix/long-edges-none-leftup',
  'scenarios/bk-matrix/fan-none-leftup',
  'scenarios/bk-matrix/long-edges-none-rightup',
  'scenarios/bk-matrix/fan-none-rightup',
  'scenarios/bk-matrix/long-edges-none-leftdown',
  'scenarios/bk-matrix/fan-none-leftdown',
  'scenarios/bk-matrix/long-edges-none-rightdown',
  'scenarios/bk-matrix/fan-none-rightdown',
  'scenarios/bk-matrix/long-edges-none-balanced',
  'scenarios/bk-matrix/fan-none-balanced',
  'scenarios/bk-matrix/long-edges-improve_straightness-none',
  'scenarios/bk-matrix/fan-improve_straightness-none',
  'scenarios/bk-matrix/long-edges-improve_straightness-leftup',
  'scenarios/bk-matrix/fan-improve_straightness-leftup',
  'scenarios/bk-matrix/long-edges-improve_straightness-rightup',
  'scenarios/bk-matrix/fan-improve_straightness-rightup',
  'scenarios/bk-matrix/long-edges-improve_straightness-leftdown',
  'scenarios/bk-matrix/fan-improve_straightness-leftdown',
  'scenarios/bk-matrix/long-edges-improve_straightness-rightdown',
  'scenarios/bk-matrix/fan-improve_straightness-rightdown',
  'scenarios/bk-matrix/long-edges-improve_straightness-balanced',
  'scenarios/bk-matrix/fan-improve_straightness-balanced',
  'scenarios/bk-options/favor-straight-edges-false',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/BK/inLayerEdges',
  'sites/BK/straightnessPriority',
  'sites/BK/type1Conflict',
  'sites/BK/infeasible/lastInLayer',
];

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      case 'ONE_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
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
        // P4_NODE_PLACEMENT: the NodePlacementStrategy arm stays throwing until T8 wires it
        expect(strategy).toBe(BRANDES_KOEPF);
        return new BKNodePlacer();
    }
  },
};

/** Whether a row stops at the Brandes-Koepf placer: the last prefix entry, or the last step is its `runPhase`. */
function stopsAtBrandesKoepf(row: PlacementRow): boolean {
  if (row.steps === null) {
    return row.prefix?.at(-1) === P4_PREFIX_END;
  }
  const last = row.steps.filter(([op]) => op === 'runPhase' || op === 'runProcessor').at(-1);
  return last !== undefined && last[0] === 'runPhase' && last[1] === 'P4_NODE_PLACEMENT' && last[2] === BRANDES_KOEPF;
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadPlacementRows(ROWS_FILE).filter(stopsAtBrandesKoepf);

function replay(row: PlacementRow): LGraph {
  return row.steps === null ? runPlacementPrefix(row, factories) : runSteps(row, factories);
}

function rowById(id: string): PlacementRow {
  return rows.find((candidate) => candidate.id === id)!;
}

describe('BKNodePlacer (oracle rows)', () => {
  it('finds the 109 recorded rows', () => {
    const found = new Set(rows.map((row) => row.id));
    expect(rows).toHaveLength(PIPELINE_ROWS.length + STEP_ROWS.length);
    expect(rows.filter((row) => row.steps === null).map((row) => row.id)).toEqual([...PIPELINE_ROWS]);
    expect(rows.filter((row) => row.steps !== null).map((row) => row.id)).toEqual([...STEP_ROWS]);
    expect(found.size).toBe(109);
  });

  it.each([...PIPELINE_ROWS, ...STEP_ROWS].map((id) => [id] as const))('replays %s', (id) => {
    const row = rowById(id);
    const graph = replay(row);
    const actual = placementDump(graph, importRow(row).importDump);
    expect(comparePlacement(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(comparePlacementFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The rows are not vacuous

describe('BKNodePlacer (the rows are not vacuous)', () => {
  it('the state before P4 differs from the recorded state after it', () => {
    const row = rowById('scenarios/p4-brandes_koepf/long-edges');
    const steps = row.steps!.filter(([op, a]) => op !== 'dump' && !(op === 'runPhase' && a === 'P4_NODE_PLACEMENT'));
    const before = placementDump(runSteps({ ...row, steps }, factories), importRow(row).importDump);
    expect(comparePlacement(before, row.expected).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// getLayoutProcessorConfiguration (N4)

describe('BKNodePlacer.getLayoutProcessorConfiguration', () => {
  it('is null without external ports', () => {
    expect(new BKNodePlacer().getLayoutProcessorConfiguration(new LGraph())).toBeNull();
  });

  it('adds HIERARCHICAL_PORT_POSITION_PROCESSOR before P5 for external ports, the same instance every time', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
    const configuration = new BKNodePlacer().getLayoutProcessorConfiguration(graph)!;
    expect([...configuration.processorsBefore(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([
      IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR,
    ]);
    expect([...configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT)]).toEqual([]);
    expect([...configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING)]).toEqual([]);
    expect(new BKNodePlacer().getLayoutProcessorConfiguration(graph)).toBe(configuration);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// N8: the monitor.log lines

/** The graph of `id` right before its P4 phase (the steps of the row without the `dump` and the P4 `runPhase`). */
function graphBeforeP4(id: string): LGraph {
  const row = rowById(id);
  const steps = row.steps!.filter(([op, a]) => op !== 'dump' && !(op === 'runPhase' && a === 'P4_NODE_PLACEMENT'));
  return runSteps({ ...row, steps }, factories);
}

function logsOf(graph: LGraph): string[] {
  const monitor = new BasicProgressMonitor().withLogging(true);
  new BKNodePlacer().process(graph, monitor);
  return monitor.getLogs();
}

describe('BKNodePlacer debug output (N8)', () => {
  it('logs, for the LEFTUP layout of the long-edges graph, the Java lines of BKNodePlacer.java:230-234 and 277-281', () => {
    expect(logsOf(graphBeforeP4('scenarios/bk-matrix/long-edges-none-leftup'))).toEqual([
      'LEFTUP size is 96.0',
      'LEFTUP is feasible: true',
      'Chosen node placement: LEFTUP',
      'Blocks: {n_root.n2=[n_root.n0, n_root.n1, n_root.n2], ' +
        'n(long_edge)_0=[n(long_edge)_0, n(long_edge)_0, n(long_edge)_0], ' +
        'n_root.n4=[n(long_edge)_2, n(long_edge)_3, n_root.n3, n_root.n4], ' +
        'n_root.n5=[n(long_edge)_1, n_root.n5]}',
      'Classes: {n_root.n4=[n_root.n2, n(long_edge)_0, n_root.n4, n_root.n5]}',
      'Marked edges: []',
    ]);
  });

  it('logs the size and feasibility of each of the four layouts when no alignment is fixed', () => {
    const logs = logsOf(graphBeforeP4('scenarios/p4-brandes_koepf/long-edges'));
    expect(logs.slice(0, 8)).toEqual([
      'RIGHTDOWN size is 106.0',
      'RIGHTUP size is 105.0',
      'LEFTDOWN size is 117.0',
      'LEFTUP size is 96.0',
      'RIGHTDOWN is feasible: true',
      'RIGHTUP is feasible: true',
      'LEFTDOWN is feasible: true',
      'LEFTUP is feasible: true',
    ]);
    expect(logs[8]).toBe('Chosen node placement: LEFTUP');
  });

  it('logs the balanced layout with a null block key and the "no classes" line', () => {
    const logs = logsOf(graphBeforeP4('scenarios/bk-matrix/fan-none-balanced'));
    expect(logs.slice(0, 6)).toEqual([
      'RIGHTDOWN size is 177.5',
      'RIGHTUP size is 173.5',
      'LEFTDOWN size is 182.25',
      'LEFTUP size is 173.5',
      'BALANCED is feasible: true',
      'Chosen node placement: BALANCED',
    ]);
    expect(logs[6]).toMatch(/^Blocks: \{null=\[n_root\.n0, .*, n_root\.n6\]\}$/u);
    expect(logs.slice(7)).toEqual(['There are no classes in a balanced layout.', 'Classes: {}', 'Marked edges: []']);
  });

  it('logs nothing when logging is disabled', () => {
    const monitor = new BasicProgressMonitor();
    new BKNodePlacer().process(graphBeforeP4('scenarios/bk-matrix/long-edges-none-leftup'), monitor);
    expect(monitor.isLoggingEnabled()).toBe(false);
    expect(monitor.getLogs()).toBeNull();
  });
});
