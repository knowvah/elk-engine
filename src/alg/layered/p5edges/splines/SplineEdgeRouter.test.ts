// SPDX-License-Identifier: EPL-2.0
// Proof of SplineEdgeRouter (mission 7e, T8): every `P5/SPLINES*` stop of layered-routing.json and every
// `scenarios/SplineEdgeRouter/*` row of layered-routing-steps.json, replayed with the router injected through the
// `Factories` and every other name through the real enums. The `FINAL_SPLINE_BENDPOINTS_CALCULATOR` stops are T9's.
// Expectations come only from the rows and the Java (L4, AD-13): the `splines` summaries (chains, boxes, ranks,
// straightness, xDelta) and the node x positions are the proof.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { LayeredPhases } from '../../LayeredPhases.js';
import { LGraph } from '../../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { SplineEdgeRouter } from './SplineEdgeRouter.js';
import { SplineSegment, isStraight as segmentIsStraight } from './SplineSegment.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const SPLINES = 'SPLINES';
const P5_STOP = 'P5';
const MODEL_STOP_INDEX = 3;
const MODEL_VARIANT_INDEX = 4;
const SCENARIO_PREFIX = 'scenarios/SplineEdgeRouter/';
/** The `P5` stops of the models whose variant is SPLINES or one of its option variants. */
const HYPEREDGE_ROW = /splines-hyperedges|hyperedge_merging-|\/hyperedges$/;

/** Whether the row is a `P5/SPLINES*` stop of a model or a spline router scenario. */
function isSplineRouterRow(row: RoutingRow): boolean {
  if (row.group === 'scenarios') {
    return row.id.startsWith(SCENARIO_PREFIX);
  }
  const segments = row.id.split('/');
  return segments[MODEL_STOP_INDEX] === P5_STOP && segments[MODEL_VARIANT_INDEX]!.startsWith(SPLINES);
}

/** The variant of a row: the last segment of a `models` id, the scenario name after the router for the others. */
function variantOf(row: RoutingRow): string {
  return row.group === 'models' ? row.id.split('/')[MODEL_VARIANT_INDEX]! : row.id.slice(SCENARIO_PREFIX.length);
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
        expect(strategy).toBe(SPLINES);
        return new SplineEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE).filter(isGeometryRow).filter(isSplineRouterRow);

function replay(row: RoutingRow): ReturnType<typeof runRoutingPrefix> {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

function rowById(id: string): RoutingRow {
  return rows.find((candidate) => candidate.id === id)!;
}

describe('SplineEdgeRouter (oracle rows)', () => {
  it('finds the recorded rows: 105 model stops and 23 scenarios, by variant', () => {
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(105);
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(23);
    const byVariant = new Map<string, number>();
    rows
      .filter((row) => row.group === 'models')
      .forEach((row) => byVariant.set(variantOf(row), (byVariant.get(variantOf(row)) ?? 0) + 1));
    expect(Object.fromEntries(byVariant)).toEqual({
      SPLINES: 81,
      'SPLINES-sloppy': 4,
      'SPLINES-sloppy-0.6': 4,
      'SPLINES-edge-edge-17': 4,
      'SPLINES-edge-node-14': 4,
      'SPLINES-node-node-32': 4,
      'SPLINES-feedback-edges': 4,
    });
  });

  it('includes the hyperedge spline rows that prove the Pair set order (R9): 14 model stops and the scenario', () => {
    const hyperedgeRows = rows.filter((row) => HYPEREDGE_ROW.test(row.id));
    expect(hyperedgeRows.filter((row) => row.group === 'models')).toHaveLength(14);
    expect(hyperedgeRows.filter((row) => row.group === 'scenarios').map((row) => row.id)).toEqual([
      'scenarios/SplineEdgeRouter/hyperedges',
    ]);
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

/** The steps of a scenario row without its final dump and without the spline router. */
function stepsBeforeRouter(row: RoutingRow): NonNullable<RoutingRow['steps']> {
  return row.steps!.filter(([op, phase]) => op !== 'dump' && !(op === 'runPhase' && phase === ROUTING_PHASE));
}

describe('SplineEdgeRouter (the rows are not vacuous)', () => {
  it('the state before P5 differs from the recorded state after it', () => {
    const row = rowById('scenarios/SplineEdgeRouter/long-edges');
    const before = routingDump(
      runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories),
      importRow(row).importDump,
    );
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });

  it('leaves the spline chain and route start on the start edges only after the router has run', () => {
    const row = rowById('scenarios/SplineEdgeRouter/long-edges');
    const graph = runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories);
    const edges = graph
      .getLayers()
      .flatMap((layer) => layer.getNodes().flatMap((node) => [...node.getOutgoingEdges()]));
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.some((edge) => edge.hasProperty(InternalProperties.SPLINE_ROUTE_START))).toBe(false);

    new SplineEdgeRouter().process(graph, new BasicProgressMonitor());
    const withRoute = edges.filter((edge) => edge.hasProperty(InternalProperties.SPLINE_ROUTE_START));
    expect(withRoute.length).toBeGreaterThan(0);
    for (const edge of withRoute) {
      const chain = edge.getProperty(InternalProperties.SPLINE_EDGE_CHAIN)!;
      const route = edge.getProperty(InternalProperties.SPLINE_ROUTE_START)!;
      expect(chain[0]).toBe(edge);
      expect(route).toHaveLength(chain.length);
      expect(route.every((segment) => segment instanceof SplineSegment)).toBe(true);
      expect(route[0]!.initialSegment).toBe(true);
      expect(route.at(-1)!.lastSegment).toBe(true);
    }
  });
});

/** The segments of every start edge of a routed graph. */
function routedSegments(graph: LGraph): SplineSegment[] {
  return graph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .flatMap((node) => [...node.getOutgoingEdges()])
    .flatMap((edge) => edge.getProperty(InternalProperties.SPLINE_ROUTE_START) ?? []);
}

describe('SplineEdgeRouter (the hyperedge rows reach the Pair set order)', () => {
  it('the hyperedges scenario routes at least one segment that represents several edges', () => {
    const graph = replay(rowById('scenarios/SplineEdgeRouter/hyperedges'));
    expect(routedSegments(graph).filter((segment) => segment.isHyperEdge()).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// getLayoutProcessorConfiguration (R4): SplineEdgeRouter.java:87-124

/** The processors a graph with these properties asks the router for, per placement relative to the phases. */
function configurationOf(properties: readonly GraphProperties[]): Record<string, readonly string[]> {
  const graph = new LGraph();
  const graphProperties = EnumSet.noneOf(GraphProperties);
  properties.forEach((property) => graphProperties.add(property));
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, graphProperties);
  const configuration = new SplineEdgeRouter().getLayoutProcessorConfiguration(graph);
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

const BASELINE = {
  'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'],
  'after P5_EDGE_ROUTING': ['FINAL_SPLINE_BENDPOINTS_CALCULATOR'],
};

describe('SplineEdgeRouter.getLayoutProcessorConfiguration', () => {
  it('always asks for the final bend point calculator and the inverted port processor', () => {
    expect(configurationOf([])).toEqual(BASELINE);
  });

  it('north/south ports add the preprocessor before P3 and the postprocessor before P5', () => {
    expect(configurationOf([GraphProperties.NORTH_SOUTH_PORTS])).toEqual({
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR', 'NORTH_SOUTH_PORT_PREPROCESSOR'],
      'before P5_EDGE_ROUTING': ['NORTH_SOUTH_PORT_POSTPROCESSOR'],
      'after P5_EDGE_ROUTING': ['FINAL_SPLINE_BENDPOINTS_CALCULATOR'],
    });
  });

  it('self loops and the two kinds of labels add their processors', () => {
    expect(configurationOf([GraphProperties.SELF_LOOPS])).toEqual({
      'before P1_CYCLE_BREAKING': ['SELF_LOOP_PREPROCESSOR'],
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'],
      'before P4_NODE_PLACEMENT': ['SELF_LOOP_PORT_RESTORER', 'SELF_LOOP_ROUTER'],
      'after P5_EDGE_ROUTING': ['FINAL_SPLINE_BENDPOINTS_CALCULATOR', 'SELF_LOOP_POSTPROCESSOR'],
    });
    expect(configurationOf([GraphProperties.CENTER_LABELS])).toEqual({
      'before P2_LAYERING': ['LABEL_DUMMY_INSERTER'],
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'],
      'before P4_NODE_PLACEMENT': ['LABEL_DUMMY_SWITCHER', 'LABEL_SIDE_SELECTOR'],
      'after P5_EDGE_ROUTING': ['FINAL_SPLINE_BENDPOINTS_CALCULATOR', 'LABEL_DUMMY_REMOVER'],
    });
    expect(configurationOf([GraphProperties.END_LABELS])).toEqual({
      'before P3_NODE_ORDERING': ['INVERTED_PORT_PROCESSOR'],
      'before P4_NODE_PLACEMENT': ['LABEL_SIDE_SELECTOR', 'END_LABEL_PREPROCESSOR'],
      'after P5_EDGE_ROUTING': ['FINAL_SPLINE_BENDPOINTS_CALCULATOR', 'END_LABEL_POSTPROCESSOR'],
    });
  });

  it('builds a fresh configuration per call from the cached additions', () => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.NORTH_SOUTH_PORTS));
    const router = new SplineEdgeRouter();
    const first = router.getLayoutProcessorConfiguration(graph);
    const second = router.getLayoutProcessorConfiguration(graph);
    expect(first).not.toBe(second);
    first.addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.LONG_EDGE_SPLITTER);
    expect([...second.processorsBefore(LayeredPhases.P1_CYCLE_BREAKING)]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The statics of the interface contract (consumed by T9 and T10)

describe('SplineEdgeRouter statics', () => {
  it('SPLINE_DIMENSION is 3 (SplineEdgeRouter.java:84)', () => {
    expect(SplineEdgeRouter.SPLINE_DIMENSION).toBe(3);
  });

  it('isStraight is the module function of SplineSegment.ts (the segment calls it; twin comparison)', () => {
    const pairs: ReadonlyArray<readonly [number, number]> = [
      [10, 10],
      [10, 10.1],
      [10.1, 10],
      [10, 10.2],
      [10, 11],
      [-3, 5],
    ];
    for (const [first, second] of pairs) {
      expect(SplineEdgeRouter.isStraight(first, second)).toBe(segmentIsStraight(first, second));
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Node types: SplineEdgeRouter.java:980-1000, over every node of the scenario rows

describe('SplineEdgeRouter node type predicates', () => {
  const nodesOf = (graph: LGraph) => graph.getLayers().flatMap((layer) => layer.getNodes());

  it('classify the node types of the long edge and external port scenarios', () => {
    const types = new Map<string, { normal: boolean; starting: boolean }>();
    for (const id of ['scenarios/SplineEdgeRouter/long-edges', 'scenarios/SplineEdgeRouter/external-ports']) {
      const row = rowById(id);
      const graph = runSteps({ ...row, steps: stepsBeforeRouter(row) }, factories);
      for (const node of nodesOf(graph)) {
        types.set(node.getType().name(), {
          normal: SplineEdgeRouter.isNormalNode(node),
          starting: SplineEdgeRouter.isQualifiedAsStartingNode(node),
        });
      }
    }
    expect(Object.fromEntries(types)).toEqual({
      NORMAL: { normal: true, starting: true },
      LONG_EDGE: { normal: false, starting: false },
      EXTERNAL_PORT: { normal: false, starting: true },
    });
  });
});
