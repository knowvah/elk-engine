// SPDX-License-Identifier: EPL-2.0
// Proof of OrthogonalEdgeRouter and, through it, of the orthogonal routing generator, the hyperedge segments, the
// cycle detector, the splitter and the three direction strategies (mission 7e, T4): every row of layered-routing.json
// and layered-routing-steps.json whose plan runs `P5_EDGE_ROUTING/ORTHOGONAL`, replayed with the router injected
// through the `Factories` and every other name through the real enums. Expectations come only from the rows and the
// Java (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
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
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from './OrthogonalEdgeRouter.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const ORTHOGONAL = 'ORTHOGONAL';
const PHASE_PREFIX = `${ROUTING_PHASE}/${ORTHOGONAL}`;

/** Whether the plan of the row runs the orthogonal router. */
function runsOrthogonal(row: RoutingRow): boolean {
  if (row.steps === null) {
    return (row.prefix ?? []).includes(PHASE_PREFIX);
  }
  return row.steps.some(
    ([op, phase, strategy]) => op === 'runPhase' && phase === ROUTING_PHASE && strategy === ORTHOGONAL,
  );
}

/** The stop of the row: the stop segment of a `models` id, the last phase or processor of a step row. */
function stopOf(row: RoutingRow): string {
  if (row.steps === null) {
    return `${row.id.split('/')[3]!}/${row.id.split('/')[4]!}`;
  }
  const last = row.steps.filter(([op]) => op === 'runPhase' || op === 'runProcessor').at(-1)!;
  return String(last[1]);
}

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
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's; this file injects the class under test
        expect(phase).toBe(ROUTING_PHASE);
        expect(strategy).toBe(ORTHOGONAL);
        return new OrthogonalEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE).filter(isGeometryRow).filter(runsOrthogonal);

function replay(row: RoutingRow): ReturnType<typeof runRoutingPrefix> {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

function rowById(id: string): RoutingRow {
  return rows.find((candidate) => candidate.id === id)!;
}

describe('OrthogonalEdgeRouter (oracle rows)', () => {
  it('finds the recorded rows: 156 model rows and 28 scenarios', () => {
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(156);
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(28);
    const byStop = new Map<string, number>();
    rows.forEach((row) => byStop.set(stopOf(row), (byStop.get(stopOf(row)) ?? 0) + 1));
    expect(Object.fromEntries(byStop)).toEqual({
      'P5/ORTHOGONAL': 97,
      'P5/ORTHOGONAL-unnecessary-bendpoints': 4,
      'P5/ORTHOGONAL-merge-edges': 4,
      'P5/ORTHOGONAL-edge-edge-17': 4,
      'P5/ORTHOGONAL-edge-node-14': 4,
      'P5/ORTHOGONAL-node-node-32': 4,
      'P5/ORTHOGONAL-feedback-edges': 4,
      'LONG_EDGE_JOINER/ORTHOGONAL': 5,
      'LONG_EDGE_JOINER/ORTHOGONAL-unnecessary-bendpoints': 3,
      'LONG_EDGE_JOINER/ORTHOGONAL-merge-edges': 3,
      'NORTH_SOUTH_PORT_POSTPROCESSOR/ORTHOGONAL': 24,
      P5_EDGE_ROUTING: 29,
      LONG_EDGE_JOINER: 5,
      NORTH_SOUTH_PORT_POSTPROCESSOR: 3,
    });
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const graph = replay(row);
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

/** The steps of a scenario row without its final dump and without the orthogonal router. */
function stepsBeforeRouter(row: RoutingRow): NonNullable<RoutingRow['steps']> {
  return row.steps!.filter(([op, phase]) => op !== 'dump' && !(op === 'runPhase' && phase === ROUTING_PHASE));
}

describe('OrthogonalEdgeRouter (the rows are not vacuous)', () => {
  it('the state before P5 differs from the recorded state after it', () => {
    const row = rowById('scenarios/OrthogonalEdgeRouter/long-edges');
    const before = routingDump(
      runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories),
      importRow(row).importDump,
    );
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// getLayoutProcessorConfiguration (R4): OrthogonalEdgeRouter.java:115-214

/** The processors a graph with these properties asks the router for, per placement relative to the phases. */
function configurationOf(
  properties: readonly GraphProperties[],
  feedbackEdges = false,
): Record<string, readonly string[]> {
  const graph = new LGraph();
  const graphProperties = EnumSet.noneOf(GraphProperties);
  properties.forEach((property) => graphProperties.add(property));
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, graphProperties);
  graph.setProperty(LayeredOptions.FEEDBACK_EDGES, feedbackEdges);
  const configuration = new OrthogonalEdgeRouter().getLayoutProcessorConfiguration(graph);
  const names = (processors: Iterable<{ toString(): string }>): string[] => [...processors].map(String);
  // `addAfter(Pn)` is the same slot as `addBefore(Pn+1)`: the processors of all phases but the last are read "before"
  const out: Record<string, readonly string[]> = {};
  for (const phase of LayeredPhases.values()) {
    const before = names(configuration.processorsBefore(phase));
    if (before.length > 0) out[`before ${phase.name()}`] = before;
  }
  const after = names(configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING));
  if (after.length > 0) out[`after ${LayeredPhases.P5_EDGE_ROUTING.name()}`] = after;
  return out;
}

describe('OrthogonalEdgeRouter.getLayoutProcessorConfiguration', () => {
  it('is empty for a graph without the properties it reacts to', () => {
    expect(configurationOf([])).toEqual({});
  });

  it('hyperedges add the dummy merger before P4 and the inverted port processor before P3', () => {
    expect(configurationOf([GraphProperties.HYPEREDGES])).toEqual({
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'],
      'before P4_NODE_PLACEMENT': ['HYPEREDGE_DUMMY_MERGER'],
    });
  });

  it('non-free ports (or feedback edges) add the inverted port processor, north/south ports their pre- and postprocessor', () => {
    const inverted = { 'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'] };
    expect(configurationOf([GraphProperties.NON_FREE_PORTS])).toEqual(inverted);
    expect(configurationOf([], true)).toEqual(inverted);
    expect(configurationOf([GraphProperties.NORTH_SOUTH_PORTS])).toEqual({});
    expect(configurationOf([GraphProperties.NON_FREE_PORTS, GraphProperties.NORTH_SOUTH_PORTS])).toEqual({
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR', 'NORTH_SOUTH_PORT_PREPROCESSOR'],
      'after P5_EDGE_ROUTING': ['NORTH_SOUTH_PORT_POSTPROCESSOR'],
    });
  });

  it('external ports add the hierarchical port processors', () => {
    expect(configurationOf([GraphProperties.EXTERNAL_PORTS])).toEqual({
      'before P3_NODE_ORDERING': ['HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR'],
      'before P4_NODE_PLACEMENT': ['HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR'],
      'after P5_EDGE_ROUTING': ['HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER'],
    });
  });

  it('self loops, hypernodes and the two kinds of labels add their processors', () => {
    expect(configurationOf([GraphProperties.SELF_LOOPS])).toEqual({
      'before P1_CYCLE_BREAKING': ['SELF_LOOP_PREPROCESSOR'],
      'before P4_NODE_PLACEMENT': ['SELF_LOOP_PORT_RESTORER', 'SELF_LOOP_ROUTER'],
      'after P5_EDGE_ROUTING': ['SELF_LOOP_POSTPROCESSOR'],
    });
    expect(configurationOf([GraphProperties.HYPERNODES])).toEqual({ 'after P5_EDGE_ROUTING': ['HYPERNODE_PROCESSOR'] });
    expect(configurationOf([GraphProperties.CENTER_LABELS])).toEqual({
      'before P2_LAYERING': ['LABEL_DUMMY_INSERTER'],
      'before P4_NODE_PLACEMENT': ['LABEL_DUMMY_SWITCHER', 'LABEL_SIDE_SELECTOR'],
      'after P5_EDGE_ROUTING': ['LABEL_DUMMY_REMOVER'],
    });
    expect(configurationOf([GraphProperties.END_LABELS])).toEqual({
      'before P4_NODE_PLACEMENT': ['LABEL_SIDE_SELECTOR', 'END_LABEL_PREPROCESSOR'],
      'after P5_EDGE_ROUTING': ['END_LABEL_POSTPROCESSOR'],
    });
  });

  it('builds a fresh configuration per call from the cached additions', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.HYPEREDGES));
    const router = new OrthogonalEdgeRouter();
    const first = router.getLayoutProcessorConfiguration(graph);
    const second = router.getLayoutProcessorConfiguration(graph);
    expect(first).not.toBe(second);
    first.addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.LONG_EDGE_SPLITTER);
    expect([...second.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The guarded debug output (OrthogonalRoutingGenerator.java:176-184)

describe('OrthogonalEdgeRouter debug output', () => {
  it('reaches DebugUtil.logDebugGraph when logging is on (ported in mission 7f)', () => {
    const row = rowById('scenarios/OrthogonalEdgeRouter/long-edges');
    const graph = runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories);
    const monitor = new BasicProgressMonitor().withLogging(true);
    expect(() => new OrthogonalEdgeRouter().process(graph, monitor)).toThrow(/7f/);
  });

  it('does not touch DebugUtil when logging is off', () => {
    const row = rowById('scenarios/OrthogonalEdgeRouter/long-edges');
    const graph = runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories);
    new OrthogonalEdgeRouter().process(graph, new BasicProgressMonitor());
    expect(graph.getSize().x).toBeGreaterThan(0);
  });
});
