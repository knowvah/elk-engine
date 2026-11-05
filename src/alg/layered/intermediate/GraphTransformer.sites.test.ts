// SPDX-License-Identifier: EPL-2.0
// Anchored cases of GraphTransformer (mission 7f, T16b, F12/F16): each case replays one `sites/GraphTransformer/*` row of
// test/golden/refs/java/layered-pipeline.json with the real classes through the real enum factories, compares the whole
// recorded state, then asserts the field the branch decides with a literal copied from the row. Coordinates compare at
// 1e-6 (AD-4), everything else exactly. These rows are the oracle proof of the six ROTATION arms; the twin comparisons of
// GraphTransformerLaws.test.ts stay (AD-13). `GraphTransformer.test.ts` keeps the injecting cases.
import { beforeAll, describe, expect, it } from 'vitest';
// the enum first: tests enter through it, never through the class (E1/F10, module cycle)
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex, registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
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
import { compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { DirectionCongruency } from '../options/DirectionCongruency.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const TOLERANCE = 1e-6;
const SIDE_SELECTION_KEY = 'org.eclipse.elk.layered.edgeLabels.sideSelection';
const ALIGNMENT_KEY = 'org.eclipse.elk.alignment';
const LAYER_CONSTRAINT_KEY = 'org.eclipse.elk.layered.layering.layerConstraint';
const PLACEMENT_KEY = 'org.eclipse.elk.nodeLabels.placement';
const GRAPH = 'g0';
const NODE_1 = 'g0/n1';
const NODE_0 = 'g0/n0';

type Point = readonly [number, number];
type Nodes = Readonly<Record<string, Point>>;
interface RotationSite {
  readonly id: string;
  readonly sideSelection: string | null;
  readonly n1Sides?: readonly string[];
  readonly nodes?: Nodes;
}
interface LayerConstraintSite {
  readonly id: string;
  readonly n0: string;
  readonly nodes: Nodes;
  readonly edges: Readonly<Record<string, readonly Point[]>>;
}

const ROTATION: readonly RotationSite[] = [
  {
    id: 'sites/GraphTransformer/rotation/LEFT/pre',
    sideSelection: null,
    n1Sides: ['EAST', 'SOUTH', 'SOUTH', 'NORTH', 'NORTH', 'WEST'],
  },
  {
    id: 'sites/GraphTransformer/rotation/LEFT/post',
    sideSelection: null,
    nodes: {
      'g0/n0': [198.0, -112.0],
      'g0/n1': [124.0, -86.0],
      'g0/n3': [70.0, -57.0],
      'g0/n2': [70.0, -125.0],
      'g0/n4': [0.0, -116.0],
    },
  },
  {
    id: 'sites/GraphTransformer/rotation/DOWN/pre',
    sideSelection: 'SMART_UP',
    n1Sides: ['SOUTH', 'WEST', 'WEST', 'EAST', 'EAST', 'NORTH'],
  },
  {
    id: 'sites/GraphTransformer/rotation/DOWN/post',
    sideSelection: 'SMART_DOWN',
    nodes: {
      'g0/n0': [-121.66666666666669, 0.0],
      'g0/n1': [-95.66666666666669, 64.0],
      'g0/n2': [-39.000000000000014, 118.0],
      'g0/n3': [-90.00000000000001, 118.0],
      'g0/n4': [-81.00000000000001, 188.0],
    },
  },
  {
    id: 'sites/GraphTransformer/rotation/UP/pre',
    sideSelection: 'SMART_UP',
    n1Sides: ['NORTH', 'EAST', 'EAST', 'WEST', 'WEST', 'SOUTH'],
  },
  {
    id: 'sites/GraphTransformer/rotation/UP/post',
    sideSelection: 'SMART_DOWN',
    nodes: {
      'g0/n0': [-64.33333333333333, 198.0],
      'g0/n1': [-55.666666666666664, 124.0],
      'g0/n3': [-100.0, 70.0],
      'g0/n2': [-49.99999999999999, 70.0],
      'g0/n4': [-34.0, 0.0],
    },
  },
];
const ALIGNMENT: readonly (readonly [string, string])[] = [
  ['sites/GraphTransformer/alignment/LEFT/LEFT', 'RIGHT'],
  ['sites/GraphTransformer/alignment/LEFT/RIGHT', 'LEFT'],
  ['sites/GraphTransformer/alignment/LEFT/TOP', 'TOP'],
  ['sites/GraphTransformer/alignment/LEFT/BOTTOM', 'BOTTOM'],
  ['sites/GraphTransformer/alignment/UP/LEFT', 'TOP'],
  ['sites/GraphTransformer/alignment/UP/RIGHT', 'BOTTOM'],
  ['sites/GraphTransformer/alignment/UP/TOP', 'RIGHT'],
  ['sites/GraphTransformer/alignment/UP/BOTTOM', 'LEFT'],
  ['sites/GraphTransformer/alignment/DOWN/LEFT', 'TOP'],
  ['sites/GraphTransformer/alignment/DOWN/RIGHT', 'BOTTOM'],
  ['sites/GraphTransformer/alignment/DOWN/TOP', 'LEFT'],
  ['sites/GraphTransformer/alignment/DOWN/BOTTOM', 'RIGHT'],
];
const LAYER_CONSTRAINT: readonly LayerConstraintSite[] = [
  {
    id: 'sites/GraphTransformer/layerConstraint/FIRST',
    n0: 'LAST',
    nodes: {
      'g0/n2': [100.0, 3.333333333333334],
      'g0/n3': [50.0, 0.0],
      'g0/n4': [0.0, -16.666666666666668],
      'g0/n1': [-12.0, 11.333333333333332],
      'g0/n0': [63.0, -28.666666666666668],
    },
    edges: {
      'g0/e2': [],
      'g0/e0': [
        [90.0, 16.666666666666664],
        [90.0, -10.0],
        [65.0, -10.0],
      ],
      'g0/e3': [
        [40.0, 6.666666666666666],
        [40.0, -6.666666666666668],
      ],
      'g0/e1': [],
    },
  },
  {
    id: 'sites/GraphTransformer/layerConstraint/LAST',
    n0: 'FIRST',
    nodes: {
      'g0/n2': [110.0, 0.0],
      'g0/n3': [60.0, 0.0],
      'g0/n1': [-12.0, -7.333333333333334],
      'g0/n4': [0.0, 6.666666666666666],
      'g0/n0': [73.0, -22.0],
    },
    edges: {
      'g0/e2': [],
      'g0/e1': [
        [40.0, -5.333333333333334],
        [40.0, 6.666666666666666],
      ],
      'g0/e3': [],
      'g0/e0': [
        [75.0, -10.0],
        [50.0, -10.0],
        [50.0, 20.0],
      ],
    },
  },
];
const NODE_LABEL_PLACEMENT = {
  id: 'sites/GraphTransformer/nodeLabelPlacement',
  n0: ['H_LEFT', 'INSIDE', 'H_PRIORITY'],
  n1: ['V_TOP', 'INSIDE', 'H_PRIORITY'],
};

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase(phase, strategy) {
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

const rows = new Map(
  loadPipelineRows(PIPELINE_REF)
    .filter(isStopRow)
    .map((row): [string, PipelineStopRow] => [row.id, row]),
);

interface Replayed {
  readonly actual: RoutingExpected;
  readonly dump: ReturnType<typeof dumpWithPropertyValues>;
}

/** Replays the row, asserts the whole recorded state (compare and full dump), and returns the live dumps. */
function replay(id: string): Replayed {
  const row = rows.get(id);
  if (row === undefined) {
    throw new Error(`row ${id} is not in the ref`);
  }
  const result = runPipelineSteps(row, factories, new ComponentsProcessor());
  const actual = pipelineDump(result) as RoutingExpected;
  expect(comparePipeline(actual, row.expected)).toEqual([]);
  const dump = dumpWithPropertyValues(result.graph);
  expect(compareRoutingFullDump({ ...actual, dump }, row.expected)).toEqual([]);
  return { actual, dump };
}

function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

function expectPoint(actual: readonly [string, string], expected: Point): void {
  near(decodeHex(actual[0]), expected[0]);
  near(decodeHex(actual[1]), expected[1]);
}

function expectNodes(actual: RoutingExpected, expected: Nodes): void {
  expect(Object.keys(actual.geometry.nodes).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, pos] of Object.entries(expected)) {
    expectPoint(actual.geometry.nodes[path]!.pos as unknown as [string, string], pos);
  }
}

interface EncodedEnum {
  readonly n?: string;
  readonly items?: readonly string[];
}

/** The encoded value of `changed[path].props[key]`, or `undefined` when the step left it unchanged. */
function changedProp(actual: RoutingExpected, path: string, key: string): EncodedEnum | undefined {
  const entry = (actual as unknown as { changed: { path: string; props: Record<string, EncodedEnum> }[] }).changed.find(
    (c) => c.path === path,
  );
  return entry?.props[key];
}

function dumpedNode(
  dump: Replayed['dump'],
  path: string,
): Replayed['dump']['graphs'][number]['layerlessNodes'][number] {
  return dump.graphs[0]!.layerlessNodes.find((n) => n.path === path)!;
}

describe('GraphTransformer rotation (GraphTransformer.java:96-135, sites/GraphTransformer/rotation)', () => {
  it.each(ROTATION)('oracle: $id; GraphTransformer.java:106-138', (site) => {
    const { actual, dump } = replay(site.id);
    // the edge label side selection is the one graph property the rotation rewrites (LEFT leaves it unchanged)
    const side = changedProp(actual, GRAPH, SIDE_SELECTION_KEY);
    expect(side?.n ?? null).toBe(site.sideSelection);
    if (site.n1Sides !== undefined) {
      expect(dumpedNode(dump, NODE_1).ports.map((p) => p.side)).toEqual(site.n1Sides);
    }
    if (site.nodes !== undefined) {
      expectNodes(actual, site.nodes);
    }
  });
});

// The rows' `changed` alignment does not tell LEFT/{TOP,BOTTOM} apart from "no arm ran" (an unchanged alignment is absent
// from `changed`), so each case also reads the live property from the full dump: the internal-state twin with the row's literal.
describe('GraphTransformer alignment (GraphTransformer.java:226-233, :425-432, :831-844)', () => {
  it.each(ALIGNMENT)('oracle: %s; GraphTransformer.java alignment', (id, after) => {
    const { dump } = replay(id);
    const live = dumpedNode(dump, NODE_1).properties[ALIGNMENT_KEY] as unknown as EncodedEnum;
    expect(live.n).toBe(after);
  });
});

describe('GraphTransformer layer constraint (mirrorX, sites/GraphTransformer/layerConstraint)', () => {
  it.each(LAYER_CONSTRAINT)('oracle: $id; GraphTransformer.java layer constraint', (site) => {
    const { actual } = replay(site.id);
    expect(changedProp(actual, NODE_0, LAYER_CONSTRAINT_KEY)?.n).toBe(site.n0);
    expectNodes(actual, site.nodes);
    for (const [path, bends] of Object.entries(site.edges)) {
      const live = actual.geometry.edges[path]!.bendPoints as unknown as [string, string][];
      expect(live).toHaveLength(bends.length);
      bends.forEach((bend, i) => {
        expectPoint(live[i]!, bend);
      });
    }
  });
});

describe('GraphTransformer node label placement (GraphTransformer.java transposeNodeLabelPlacement)', () => {
  it('oracle: sites/GraphTransformer/nodeLabelPlacement; flags without a vertical or horizontal member stay', () => {
    const { actual } = replay(NODE_LABEL_PLACEMENT.id);
    expect(changedProp(actual, NODE_0, PLACEMENT_KEY)?.items).toEqual(NODE_LABEL_PLACEMENT.n0);
    expect(changedProp(actual, NODE_1, PLACEMENT_KEY)?.items).toEqual(NODE_LABEL_PLACEMENT.n1);
  });
});

describe('GraphTransformer.transposeLayerConstraint (GraphTransformer.java:795-811, structural)', () => {
  // An external port dummy with neither a layer nor an in-layer constraint matches none of the four branches of the Java,
  // so both constraints stay NONE (the importer always sets one, so no row reaches this).
  it.each([
    [Direction.LEFT, Mode.TO_INTERNAL_LTR],
    [Direction.DOWN, Mode.TO_INTERNAL_LTR],
    [Direction.DOWN, Mode.TO_INPUT_DIRECTION],
    [Direction.UP, Mode.TO_INTERNAL_LTR],
    [Direction.UP, Mode.TO_INPUT_DIRECTION],
  ])('%s %s leaves an unconstrained external dummy unconstrained', (direction, mode) => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, direction);
    graph.setProperty(LayeredOptions.DIRECTION_CONGRUENCY, DirectionCongruency.READING_DIRECTION);
    const dummy = addNode(graph, NodeType.EXTERNAL_PORT);
    dummy.setProperty(InternalProperties.EXT_PORT_SIDE, PortSide.NORTH);
    addPort(dummy, PortSide.EAST);
    new GraphTransformer(mode).process(graph, new NullElkProgressMonitor());
    expect(dummy.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.NONE);
    expect(dummy.getProperty(InternalProperties.IN_LAYER_CONSTRAINT)).toBe(InLayerConstraint.NONE);
  });
});

describe('GraphTransformer.Mode.name (GraphTransformer.java:52-57, structural)', () => {
  it('returns the declared constant names, as java.lang.Enum.name()', () => {
    expect(Mode.values().map((m) => m.name())).toEqual(['TO_INTERNAL_LTR', 'TO_INPUT_DIRECTION']);
  });
});
