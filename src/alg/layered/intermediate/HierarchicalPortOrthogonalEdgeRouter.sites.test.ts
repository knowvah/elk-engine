// SPDX-License-Identifier: EPL-2.0
// Anchored cases of HierarchicalPortOrthogonalEdgeRouter (mission 7f, T16b, F12/F16): each case replays one `sites/HierarchicalPortOrthogonalEdgeRouter/*` row of
// test/golden/refs/java/layered-pipeline.json with the real classes through the real enum factories, compares the whole
// recorded state, then asserts the node positions and bend points the branch decides with literals copied from the row.
// Coordinates compare at 1e-6 (AD-4), everything else exactly. HierarchicalPortOrthogonalEdgeRouter.test.ts keeps the injecting cases.
import { beforeAll, expect, it, describe } from 'vitest';
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
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const TOLERANCE = 1e-6;

type Point = readonly [number, number];
interface Site {
  readonly id: string;
  readonly nodes: Readonly<Record<string, Point>>;
  readonly edges: Readonly<Record<string, readonly Point[]>>;
}

const SITES: readonly Site[] = [
  {
    id: 'sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/inside',
    nodes: {
      'g0/n0': [-12.0, 63.0],
      'g0/n6': [15.0, 50.0],
      'g0/n7': [65.0, 30.0],
      'g0/n8': [115.0, 30.0],
      'g0/n9': [165.0, 0.0],
      'g0/n1': [222.0, 13.0],
      'g0/n2': [28.0, -12.0],
      'g0/n4': [78.0, 92.0],
      'g0/n3': [128.0, -12.0],
      'g0/n5': [178.0, 92.0],
    },
    edges: {
      'g0/e0': [],
      'g0/e6': [
        [55.0, 60.0],
        [55.0, 50.0],
      ],
      'g0/e4': [[80.0, 70.0]],
      'g0/e7': [],
      'g0/e2': [[30.0, 40.0]],
      'g0/e5': [[180.0, 40.0]],
      'g0/e8': [
        [155.0, 50.0],
        [155.0, 10.0],
      ],
      'g0/e1': [],
      'g0/e3': [[130.0, 20.0]],
    },
  },
  {
    id: 'sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/outside',
    nodes: {
      'g0/n0': [-12.0, 63.0],
      'g0/n6': [0.0, 50.0],
      'g0/n7': [50.0, 30.0],
      'g0/n8': [100.0, 30.0],
      'g0/n9': [150.0, 0.0],
      'g0/n1': [192.0, 13.0],
      'g0/n2': [13.0, -12.0],
      'g0/n4': [63.0, 92.0],
      'g0/n3': [113.0, -12.0],
      'g0/n5': [163.0, 92.0],
    },
    edges: {
      'g0/e0': [],
      'g0/e6': [
        [40.0, 60.0],
        [40.0, 50.0],
      ],
      'g0/e4': [[65.0, 70.0]],
      'g0/e7': [],
      'g0/e2': [[15.0, 40.0]],
      'g0/e5': [[165.0, 40.0]],
      'g0/e8': [
        [140.0, 50.0],
        [140.0, 10.0],
      ],
      'g0/e1': [],
      'g0/e3': [[115.0, 20.0]],
    },
  },
  {
    id: 'sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/neither',
    nodes: {
      'g0/n0': [-12.0, 63.0],
      'g0/n6': [10.0, 50.0],
      'g0/n7': [60.0, 30.0],
      'g0/n8': [110.0, 30.0],
      'g0/n9': [160.0, 0.0],
      'g0/n1': [202.0, 13.0],
      'g0/n2': [23.0, -12.0],
      'g0/n4': [73.0, 92.0],
      'g0/n3': [123.0, -12.0],
      'g0/n5': [173.0, 92.0],
    },
    edges: {
      'g0/e0': [],
      'g0/e6': [
        [50.0, 60.0],
        [50.0, 50.0],
      ],
      'g0/e4': [[75.0, 70.0]],
      'g0/e7': [],
      'g0/e2': [[25.0, 40.0]],
      'g0/e5': [[175.0, 40.0]],
      'g0/e8': [
        [150.0, 50.0],
        [150.0, 10.0],
      ],
      'g0/e1': [],
      'g0/e3': [[125.0, 20.0]],
    },
  },
];

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

function expectNodes(actual: RoutingExpected, expected: Site['nodes']): void {
  expect(Object.keys(actual.geometry.nodes).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, pos] of Object.entries(expected)) {
    expectPoint(actual.geometry.nodes[path]!.pos as unknown as [string, string], pos);
  }
}

function expectEdges(actual: RoutingExpected, expected: Site['edges']): void {
  expect(Object.keys(actual.geometry.edges).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, bends] of Object.entries(expected)) {
    const live = actual.geometry.edges[path]!.bendPoints as unknown as [string, string][];
    expect(live).toHaveLength(bends.length);
    bends.forEach((bend, i) => {
      expectPoint(live[i]!, bend);
    });
  }
}

describe('HierarchicalPortOrthogonalEdgeRouter (sites/HierarchicalPortOrthogonalEdgeRouter/portLabels)', () => {
  // HierarchicalPortOrthogonalEdgeRouter.java:219-237: the port-label arms move the restored dummies and their edges' bend points
  it.each(SITES)('oracle: $id', (site) => {
    const { actual } = replay(site.id);
    expectNodes(actual, site.nodes);
    expectEdges(actual, site.edges);
  });
});
