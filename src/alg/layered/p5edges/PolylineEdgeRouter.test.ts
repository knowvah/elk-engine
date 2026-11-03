// SPDX-License-Identifier: EPL-2.0
// Proof of PolylineEdgeRouter (mission 7e, T5): every row of layered-routing.json and layered-routing-steps.json whose
// plan runs `P5_EDGE_ROUTING/POLYLINE` as its last phase, replayed with the router injected through the `Factories`
// and every other name through the real enums. Expectations come only from the rows and the Java (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const POLYLINE = 'POLYLINE';

/** The strategy names of a `P5_EDGE_ROUTING` phase in a row's prefix or steps (`[]`: the plan stops before P5). */
function routersOf(row: RoutingRow): string[] {
  if (row.steps === null) {
    return (row.prefix ?? []).filter((entry) => entry.startsWith(`${ROUTING_PHASE}/`)).map((e) => e.split('/')[1]!);
  }
  return row.steps.filter(([op, phase]) => op === 'runPhase' && phase === ROUTING_PHASE).map((step) => String(step[2]));
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
        expect(strategy).toBe(POLYLINE);
        return new PolylineEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[3];

/** The rows that stop at the polyline router: the `P5` stop with a `POLYLINE*` variant, and the router scenarios. */
const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE)
  .filter(isGeometryRow)
  .filter((row) =>
    row.group === 'models'
      ? stopOf(row) === 'P5' && row.id.split('/')[4]!.startsWith(POLYLINE)
      : row.id.startsWith('scenarios/PolylineEdgeRouter/'),
  );

function replay(row: RoutingRow): ReturnType<typeof runRoutingPrefix> {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

describe('PolylineEdgeRouter (oracle rows)', () => {
  it('finds the 93 recorded model rows and the 21 router scenarios', () => {
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(93);
    expect(rows.filter((row) => row.id.startsWith('scenarios/PolylineEdgeRouter/'))).toHaveLength(21);
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const graph = replay(row);
    const actual = routingDump(graph, importRow(row).importDump);
    expect(compareRouting(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The rows are not vacuous

describe('PolylineEdgeRouter (the rows are not vacuous)', () => {
  it('the state before P5 differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id === 'scenarios/PolylineEdgeRouter/long-edges')!;
    const steps = row.steps!.filter(([op, a]) => op !== 'dump' && !(op === 'runPhase' && a === ROUTING_PHASE));
    const before = routingDump(runSteps({ ...row, steps }, factories), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// PRED_EXTERNAL_WEST_OR_EAST_PORT (T2)

/** A node of the given type whose external-port side is set when given (structural, L4-neutral). */
function node(type: NodeType, extPortSide?: PortSide): LNode {
  const built = new LNode(new LGraph());
  built.setType(type);
  if (extPortSide !== undefined) built.setProperty(InternalProperties.EXT_PORT_SIDE, extPortSide);
  return built;
}

describe('PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT', () => {
  it('accepts external-port dummies on WEST or EAST only', () => {
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.WEST))).toBe(true);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.EAST))).toBe(true);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.NORTH))).toBe(
      false,
    );
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.SOUTH))).toBe(
      false,
    );
    // the default side is UNDEFINED
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT))).toBe(false);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.NORMAL, PortSide.WEST))).toBe(false);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.LONG_EDGE, PortSide.EAST))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// getLayoutProcessorConfiguration (R4)

const P = LayeredPhases;
const S = IntermediateProcessorStrategy;

function configurationFor(...properties: GraphProperties[]): Map<string, IntermediateProcessorStrategy[]> {
  const graph = new LGraph();
  graph.setProperty(
    InternalProperties.GRAPH_PROPERTIES,
    properties.length === 0 ? EnumSet.noneOf(GraphProperties) : EnumSet.of(properties[0]!, ...properties.slice(1)),
  );
  const configuration = new PolylineEdgeRouter().getLayoutProcessorConfiguration(graph)!;
  const result = new Map<string, IntermediateProcessorStrategy[]>();
  for (const phase of LayeredPhases.values()) {
    result.set(`before ${phase.name()}`, [...configuration.processorsBefore(phase)] as IntermediateProcessorStrategy[]);
  }
  // the slot after a phase is the slot before the next one, except after the last phase
  result.set(`after ${P.P5_EDGE_ROUTING.name()}`, [
    ...configuration.processorsAfter(P.P5_EDGE_ROUTING),
  ] as IntermediateProcessorStrategy[]);
  return new Map([...result].filter(([, processors]) => processors.length > 0));
}

describe('PolylineEdgeRouter.getLayoutProcessorConfiguration', () => {
  it('always adds INVERTED_PORT_PROCESSOR before P3 (the baseline)', () => {
    expect(configurationFor()).toEqual(new Map([['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR]]]));
  });

  it('adds the north/south pre- and postprocessor for NORTH_SOUTH_PORTS', () => {
    expect(configurationFor(GraphProperties.NORTH_SOUTH_PORTS)).toEqual(
      new Map([
        ['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR, S.NORTH_SOUTH_PORT_PREPROCESSOR]],
        ['after P5_EDGE_ROUTING', [S.NORTH_SOUTH_PORT_POSTPROCESSOR]],
      ]),
    );
  });

  it('adds the self loop processors for SELF_LOOPS', () => {
    expect(configurationFor(GraphProperties.SELF_LOOPS)).toEqual(
      new Map([
        ['before P1_CYCLE_BREAKING', [S.SELF_LOOP_PREPROCESSOR]],
        ['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR]],
        ['before P4_NODE_PLACEMENT', [S.SELF_LOOP_PORT_RESTORER, S.SELF_LOOP_ROUTER]],
        ['after P5_EDGE_ROUTING', [S.SELF_LOOP_POSTPROCESSOR]],
      ]),
    );
  });

  it('adds the label dummy processors for CENTER_LABELS', () => {
    expect(configurationFor(GraphProperties.CENTER_LABELS)).toEqual(
      new Map([
        ['before P2_LAYERING', [S.LABEL_DUMMY_INSERTER]],
        ['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR]],
        ['before P4_NODE_PLACEMENT', [S.LABEL_DUMMY_SWITCHER, S.LABEL_SIDE_SELECTOR]],
        ['after P5_EDGE_ROUTING', [S.LABEL_DUMMY_REMOVER]],
      ]),
    );
  });

  it('adds the end label processors for END_LABELS', () => {
    expect(configurationFor(GraphProperties.END_LABELS)).toEqual(
      new Map([
        ['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR]],
        ['before P4_NODE_PLACEMENT', [S.LABEL_SIDE_SELECTOR, S.END_LABEL_PREPROCESSOR]],
        ['after P5_EDGE_ROUTING', [S.END_LABEL_POSTPROCESSOR]],
      ]),
    );
  });

  it('does not mutate the shared statics: a second call gives the same contents', () => {
    configurationFor(GraphProperties.NORTH_SOUTH_PORTS, GraphProperties.END_LABELS);
    expect(configurationFor()).toEqual(new Map([['before P3_NODE_ORDERING', [S.INVERTED_PORT_PROCESSOR]]]));
    expect(P.P5_EDGE_ROUTING.name()).toBe(ROUTING_PHASE);
  });
});
