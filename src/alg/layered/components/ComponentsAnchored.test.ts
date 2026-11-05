// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the component classes (mission 7f, T16a, F12/F16). Every `sites/*` row below is replayed through
// `runPipelineSteps` with the real classes and the real enum factories; the literals are copied from the row and
// coordinates compare at AD-4 (1e-6). The structural cases at the end derive their expectation from the Java line they cite.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import {
  comparePipeline,
  pipelineDump,
  runPipelineSteps,
} from '../../../../test/helpers/layered-pipeline-replay-ops.js';
import {
  isStopRow,
  loadPipelineRows,
  registerPipelineEnums,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import type { RoutingExpected } from '../../../../test/helpers/layered-routing-replay-rows.js';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { KVector } from '../../../core/math/KVector.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { buildConstraintTable, constraintsFor } from './ComponentGroupSides.js';
import { ComponentOrderingStrategy } from './ComponentOrderingStrategy.js';
import { ComponentGroupModelOrderGraphPlacer } from './ComponentGroupModelOrderGraphPlacer.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { ModelOrderComponentGroup } from './ModelOrderComponentGroup.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const AD4_TOLERANCE = 1e-6;
const HEX_DIGITS_PER_DOUBLE = 16;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      case 'P5_EDGE_ROUTING':
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

const rowsById = new Map(
  loadPipelineRows(PIPELINE_REF)
    .filter(isStopRow)
    .map((row) => [row.id, row] as const),
);

function rowOf(id: string): PipelineStopRow {
  const row = rowsById.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  return row;
}

/** A hex-encoded double of a row (`encodeHex`). */
function decode(hex: string): number {
  expect(hex).toHaveLength(HEX_DIGITS_PER_DOUBLE);
  return new DataView(Uint8Array.from(hex.match(/../g)!, (byte) => Number.parseInt(byte, 16)).buffer).getFloat64(0);
}

/** What a row decides: the `layerless` order, the node positions and the graph size of the combined target. */
interface SiteLiterals {
  readonly id: string;
  readonly java: string;
  readonly layerless: readonly string[];
  readonly size: readonly [number, number];
  readonly nodes: Readonly<Record<string, readonly [number, number]>>;
}

const SITES: readonly SiteLiterals[] = [
  {
    id: 'sites/ComponentGroupGraphPlacer/newGroup',
    java: 'ComponentGroup.java:218,235-244; ComponentGroupGraphPlacer.java:153',
    layerless: ['g0/n6', 'g0/n0', 'g0/n5', 'g0/n1', 'g0/n4', 'g0/n2', 'g0/n3'],
    size: [130, 110],
    nodes: {
      'g0/n6': [0, 50],
      'g0/n0': [-12, 13],
      'g0/n5': [0, 0],
      'g0/n1': [42, 13],
      'g0/n4': [70, 90],
      'g0/n2': [48, 78],
      'g0/n3': [128, 122],
    },
  },
  {
    id: 'sites/ComponentGroupGraphPlacer/rowWrap',
    java: 'ComponentGroupGraphPlacer.java:384',
    layerless: ['g0/n3', 'g0/n4', 'g0/n5', 'g0/n6', 'g0/n0', 'g0/n2', 'g0/n1'],
    size: [40, 180],
    nodes: {
      'g0/n3': [0, 40],
      'g0/n4': [0, 80],
      'g0/n5': [0, 120],
      'g0/n6': [0, 160],
      'g0/n0': [-12, 8],
      'g0/n2': [0, 0],
      'g0/n1': [52, 8],
    },
  },
  {
    id: 'sites/ComponentGroupModelOrderGraphPlacer/newGroup',
    java: 'ModelOrderComponentGroup.java:244-245',
    layerless: ['g0/n4', 'g0/n2', 'g0/n3', 'g0/n6', 'g0/n0', 'g0/n5', 'g0/n1'],
    size: [130, 110],
    nodes: {
      'g0/n4': [20, 0],
      'g0/n2': [-2, -12],
      'g0/n3': [78, 32],
      'g0/n6': [100, 90],
      'g0/n0': [88, 53],
      'g0/n5': [100, 40],
      'g0/n1': [142, 53],
    },
  },
  {
    id: 'sites/ComponentGroupModelOrderGraphPlacer/vertical/DOWN/WEST',
    java: 'ComponentGroupModelOrderGraphPlacer.java:79,103',
    layerless: ['g0/n2', 'g0/n3', 'g0/n4', 'g0/n0', 'g0/n5', 'g0/n1'],
    size: [120, 190],
    nodes: {
      'g0/n2': [5, 0],
      'g0/n3': [0, 50],
      'g0/n4': [80, 110],
      'g0/n0': [48, 90],
      'g0/n5': [80, 170],
      'g0/n1': [48, 150],
    },
  },
  {
    id: 'sites/ComponentGroupModelOrderGraphPlacer/vertical/DOWN/EAST',
    java: 'ComponentGroupModelOrderGraphPlacer.java:79,103',
    layerless: ['g0/n2', 'g0/n3', 'g0/n4', 'g0/n0', 'g0/n5', 'g0/n1'],
    size: [120, 100],
    nodes: {
      'g0/n2': [5, 0],
      'g0/n3': [0, 50],
      'g0/n4': [60, 0],
      'g0/n0': [122, 40],
      'g0/n5': [60, 60],
      'g0/n1': [132, 100],
    },
  },
  {
    id: 'sites/ComponentGroupModelOrderGraphPlacer/vertical/UP/WEST',
    java: 'ComponentGroupModelOrderGraphPlacer.java:79,103',
    layerless: ['g0/n2', 'g0/n3', 'g0/n4', 'g0/n0', 'g0/n5', 'g0/n1'],
    size: [120, 190],
    nodes: {
      'g0/n2': [5, 40],
      'g0/n3': [0, 0],
      'g0/n4': [80, 90],
      'g0/n0': [48, 126],
      'g0/n5': [80, 150],
      'g0/n1': [48, 186],
    },
  },
  {
    id: 'sites/ComponentGroupModelOrderGraphPlacer/vertical/UP/EAST',
    java: 'ComponentGroupModelOrderGraphPlacer.java:79,103',
    layerless: ['g0/n2', 'g0/n3', 'g0/n4', 'g0/n0', 'g0/n5', 'g0/n1'],
    size: [120, 100],
    nodes: {
      'g0/n2': [5, 40],
      'g0/n3': [0, 0],
      'g0/n4': [60, 20],
      'g0/n0': [122, -4],
      'g0/n5': [60, 80],
      'g0/n1': [132, 56],
    },
  },
  {
    id: 'sites/SimpleRowGraphPlacer/priority',
    java: 'SimpleRowGraphPlacer.java:122-123',
    layerless: ['g0/n1', 'g0/n2', 'g0/n0'],
    size: [50, 110],
    nodes: {
      'g0/n1': [0, 0],
      'g0/n2': [0, 50],
      'g0/n0': [0, 90],
    },
  },
];

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('component placers on the oracle site rows (F12)', () => {
  it.each(SITES.map((site) => [site.id, site.java, site] as const))('oracle: %s; %s', (_id, _java, site) => {
    const row = rowOf(site.id);
    const result = runPipelineSteps(row, factories, new ComponentsProcessor());
    expect(result.terminal).toBe('combine');
    const actual = pipelineDump(result) as RoutingExpected;

    expect(actual.layerless).toEqual(site.layerless);
    expect([...Object.keys(actual.geometry.nodes)].sort()).toEqual([...Object.keys(site.nodes)].sort());
    for (const [path, [x, y]] of Object.entries(site.nodes)) {
      const { pos } = actual.geometry.nodes[path]!;
      expect(Math.abs(decode(pos[0]) - x)).toBeLessThanOrEqual(AD4_TOLERANCE);
      expect(Math.abs(decode(pos[1]) - y)).toBeLessThanOrEqual(AD4_TOLERANCE);
    }
    const [width, height] = actual.geometry.graph.size.map(decode);
    expect(Math.abs(width! - site.size[0])).toBeLessThanOrEqual(AD4_TOLERANCE);
    expect(Math.abs(height! - site.size[1])).toBeLessThanOrEqual(AD4_TOLERANCE);
    // the whole row, every field, as the replay compares it
    expect(comparePipeline(actual, row.expected as RoutingExpected)).toEqual([]);
  });
});

describe('component classes, structural (expectations from the Java)', () => {
  it('reads a key set missing from the constraint table as empty (ComponentGroup.java:244, HashMultimap.get)', () => {
    const table = buildConstraintTable([['NORTH', 'SOUTH']]);
    expect(constraintsFor(table, PortSide.SIDES_EAST)).toEqual([]);
    expect(constraintsFor(table, PortSide.SIDES_NORTH).map((set) => Array.from(set))).toEqual([[PortSide.SOUTH]]);
  });

  it('constructs a model order group empty without a component (ModelOrderComponentGroup.java:195)', () => {
    expect(new ModelOrderComponentGroup().getComponentOrder()).toEqual([]);
  });

  it('adds the component of the one-argument constructor to the order twice (ModelOrderComponentGroup.java:205-208, :227)', () => {
    const component = new LGraph();
    component.setProperty(InternalProperties.EXT_PORT_CONNECTIONS, EnumSet.noneOf(PortSide));
    expect(new ModelOrderComponentGroup(component).getComponentOrder()).toEqual([component, component]);
  });

  it('sorts components with a smaller minimal model order first (ComponentsProcessor.java:163-168)', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, ComponentOrderingStrategy.MODEL_ORDER);
    const late = addNode(graph);
    const early = addNode(graph);
    late.setProperty(InternalProperties.MODEL_ORDER, 1);
    early.setProperty(InternalProperties.MODEL_ORDER, 0);
    const components = new ComponentsProcessor().split(graph);
    expect(components.map((component) => component.getLayerlessNodes())).toEqual([[early], [late]]);
  });

  it('keeps components of equal minimal model order in discovery order (Integer.compare is 0, stable sort)', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, ComponentOrderingStrategy.MODEL_ORDER);
    const first = addNode(graph);
    const second = addNode(graph);
    first.setProperty(InternalProperties.MODEL_ORDER, 2);
    second.setProperty(InternalProperties.MODEL_ORDER, 2);
    const components = new ComponentsProcessor().split(graph);
    expect(components.map((component) => component.getLayerlessNodes())).toEqual([[first], [second]]);
  });

  // twin of the vertical/{DOWN,UP}/EAST rows: their one group never reads the state `advanceVertically` leaves behind
  describe.each([
    [PortSide.EAST, 100],
    [PortSide.WEST, 0],
  ] as const)(
    'advanceVertically after a group on %s (ComponentGroupModelOrderGraphPlacer.java:103-114)',
    (side, blocked) => {
      it(`blocks the south edges at ${String(blocked)}, keeping the rest of the update`, () => {
        const component = new LGraph();
        component.setProperty(InternalProperties.EXT_PORT_CONNECTIONS, EnumSet.of(side));
        const group = new ModelOrderComponentGroup(component);
        const state = {
          spaceBlockedBySouthEdges: new KVector(),
          spaceBlockedByComponents: new KVector(),
          offset: new KVector(),
          maxSize: new KVector(),
        };
        // the size of the target of vertical/UP/EAST is (120, 100)
        (
          new ComponentGroupModelOrderGraphPlacer() as unknown as {
            advanceVertically(g: ModelOrderComponentGroup, size: KVector, s: typeof state): void;
          }
        ).advanceVertically(group, new KVector(120, 100), state);
        expect(state.spaceBlockedBySouthEdges.y).toBe(blocked);
        expect(state.spaceBlockedByComponents.y).toBe(100);
        expect(state.maxSize.y).toBe(100);
        expect(state.offset.x).toBe(120);
        expect(state.maxSize.x).toBe(120);
      });
    },
  );
});
