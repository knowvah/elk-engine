// SPDX-License-Identifier: EPL-2.0
// Anchored cases of HypernodesProcessor (mission 7f, T16b, F12/F16): each case replays one `sites/HypernodesProcessor/*` row of
// test/golden/refs/java/layered-pipeline.json with the real classes through the real enum factories, compares the whole
// recorded state, then asserts the node positions and bend points the branch decides with literals copied from the row.
// Coordinates compare at 1e-6 (AD-4), everything else exactly. HypernodesProcessor.test.ts keeps the injecting cases.
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
    id: 'sites/HypernodesProcessor/moreLeftEdges/south',
    nodes: { 'g0/n1': [0.0, 0.0], 'g0/n0': [0.0, 70.0], 'g0/n2': [2200000007.0, 22.0] },
    edges: { 'g0/e1': [], 'g0/e0': [[2200000010.0, 85.0]] },
  },
  {
    id: 'sites/HypernodesProcessor/moreLeftEdges/aboveAndBelow',
    nodes: { 'g0/n2': [0.0, 0.0], 'g0/n1': [0.0, 40.0], 'g0/n0': [0.0, 80.0], 'g0/n3': [2200000007.0, 47.0] },
    edges: { 'g0/e2': [[2200000010.0, 10.0]], 'g0/e1': [], 'g0/e0': [[2200000010.0, 90.0]] },
  },
  {
    id: 'sites/HypernodesProcessor/moreLeftEdges/trimmed',
    nodes: {
      'g0/n1': [0.0, -165.33333333333334],
      'g0/n2': [0.0, -115.33333333333334],
      'g0/n0': [2200000017.0, 22.0],
      'g0/n5': [2200000017.0, -76.66666666666669],
      'g0/n3': [2200000000.0, -50.0],
      'g0/n4': [2200000000.0, 0.0],
    },
    edges: {
      'g0/e3': [
        [2200000010.0, -150.33333333333334],
        [2200000010.0, -75.33333333333336],
      ],
      'g0/e4': [],
      'g0/e1': [],
      'g0/e0': [[2200000020.0, -35.0]],
      'g0/e2': [],
    },
  },
  {
    id: 'sites/HypernodesProcessor/notShifted',
    nodes: { 'g0/n0': [0.0, 0.0], 'g0/n1': [50.0, 0.0], 'g0/n2': [270.0, 0.0], 'g0/n3': [270.0, 50.0] },
    edges: {
      'g0/e0': [],
      'g0/e1': [],
      'g0/e2': [
        [260.0, 15.0],
        [260.0, 80.0],
      ],
    },
  },
  {
    id: 'sites/HypernodesProcessor/bendChoice',
    nodes: {
      'g0/n0': [0.0, -20.333333333333336],
      'new/n0': [55.0, -5.333333333333336],
      'g0/n1': [67.0, 5.333333333333332],
      'g0/n2': [90.0, -190.0],
      'g0/n3': [90.0, -140.0],
      'g0/n4': [90.0, -60.0],
      'g0/n5': [90.0, 0.0],
    },
    edges: {
      'g0/e0': [],
      'new/e0': [
        [70.0, -5.333333333333336],
        [70.0, 6.666666666666666],
      ],
      'g0/e1': [
        [80.0, 10.0],
        [80.0, -40.0],
      ],
      'g0/e2': [],
      'g0/e3': [[70.0, -175.0]],
      'g0/e4': [[70.0, -110.0]],
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

/** The Java lines each row anchors (`// oracle: <row id>; <Java file:line>`). */
const JAVA: Readonly<Record<string, string>> = {
  'sites/HypernodesProcessor/moreLeftEdges/south': 'HypernodesProcessor.java:103-118',
  'sites/HypernodesProcessor/moreLeftEdges/aboveAndBelow': 'HypernodesProcessor.java:103-118,166-172',
  'sites/HypernodesProcessor/moreLeftEdges/trimmed': 'HypernodesProcessor.java:103-118,166-172',
  'sites/HypernodesProcessor/notShifted': 'HypernodesProcessor.java:125',
  'sites/HypernodesProcessor/bendChoice': 'HypernodesProcessor.java:95-178',
};

describe('HypernodesProcessor (sites/HypernodesProcessor)', () => {
  it.each(SITES.map((site) => [site.id, JAVA[site.id], site] as const))('oracle: %s; %s', (_id, _java, site) => {
    const { actual } = replay(site.id);
    expectNodes(actual, site.nodes);
    expectEdges(actual, site.edges);
  });
});
