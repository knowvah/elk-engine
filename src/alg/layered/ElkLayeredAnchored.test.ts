// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the driver (mission 7f, T16a, F12/F16): the `sites/LayeredLayoutProvider/*` and
// `sites/ElkLayered/resize/*` rows of test/golden/refs/java/layered-pipeline.json replayed through `runPipelineSteps`
// (terminal ops `layout` and `layoutCancelled`) with the real classes. Literals are copied from the row; coordinates
// compare at AD-4 (1e-6). The two cancelled rows keep the input coordinates on both exits, so each has a structural twin
// on the components processor's internal state (ElkLayered.java:154 against :599 and :160).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { comparePipeline, pipelineDump, runPipelineSteps } from '../../../test/helpers/layered-pipeline-replay-ops.js';
import {
  isStopRow,
  loadPipelineRows,
  registerPipelineEnums,
  type PipelineStopRow,
} from '../../../test/helpers/layered-pipeline-replay-rows.js';
import type { RoutingExpected } from '../../../test/helpers/layered-routing-replay-rows.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ElkLayered } from './ElkLayered.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const AD4_TOLERANCE = 1e-6;

/** The private announcement of a processor, which every processor run of `layout` goes through. */
interface ProcessorNotifier {
  notifyProcessorReady(): void;
}

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

interface ExportedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

interface ExportedGraph {
  readonly width: number;
  readonly height: number;
  readonly children: readonly ExportedNode[];
}

/** What a row decides, copied from `expected.layout`: the root size and the child positions. */
interface LayoutLiterals {
  readonly id: string;
  readonly java: string;
  readonly size: readonly [number, number];
  readonly nodes: readonly (readonly [string, number, number])[];
}

const KEEPS_INPUT = [
  ['a', 10, 20],
  ['b', 200, 30],
  ['c', 400, 50],
] as const;

const LAYOUTS: readonly LayoutLiterals[] = [
  {
    id: 'sites/LayeredLayoutProvider/flat',
    java: 'ElkLayered.java:135-166',
    size: [158, 54],
    nodes: [
      ['a', 12, 12],
      ['b', 66, 12],
      ['c', 116, 12],
    ],
  },
  { id: 'sites/LayeredLayoutProvider/cancelled', java: 'ElkLayered.java:154', size: [0, 0], nodes: KEEPS_INPUT },
  {
    id: 'sites/LayeredLayoutProvider/cancelledOneComponent',
    java: 'ElkLayered.java:599',
    size: [0, 0],
    nodes: KEEPS_INPUT,
  },
  {
    id: 'sites/ElkLayered/resize/noDefaultMinimum',
    java: 'ElkLayered.java:675',
    size: [5, 2],
    nodes: [
      ['a', 0, 0],
      ['b', 3, 0],
    ],
  },
  {
    id: 'sites/ElkLayered/resize/defaultMinimum',
    java: 'ElkLayered.java:675',
    size: [20, 20],
    nodes: [
      ['a', 0, 0],
      ['b', 3, 0],
    ],
  },
];

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ElkLayered through the provider on the oracle site rows (F12)', () => {
  it.each(LAYOUTS.map((site) => [site.id, site.java, site] as const))('oracle: %s; %s', (_id, _java, site) => {
    const row = rowOf(site.id);
    const result = runPipelineSteps(row, factories, new ComponentsProcessor());
    expect(result.terminal).toBe('layout');
    const actual = pipelineDump(result) as RoutingExpected & { readonly layout: ExportedGraph };
    const { layout } = actual;

    expect(Math.abs(layout.width - site.size[0])).toBeLessThanOrEqual(AD4_TOLERANCE);
    expect(Math.abs(layout.height - site.size[1])).toBeLessThanOrEqual(AD4_TOLERANCE);
    expect(layout.children.map((child) => child.id)).toEqual(site.nodes.map(([id]) => id));
    site.nodes.forEach(([id, x, y], i) => {
      expect(layout.children[i]!.id).toBe(id);
      expect(Math.abs(layout.children[i]!.x - x)).toBeLessThanOrEqual(AD4_TOLERANCE);
      expect(Math.abs(layout.children[i]!.y - y)).toBeLessThanOrEqual(AD4_TOLERANCE);
    });
    expect(comparePipeline(actual, row.expected as RoutingExpected)).toEqual([]);
  });

  it('exits at the multi-component check before combining (twin of cancelled; ElkLayered.java:154)', () => {
    const split = vi.spyOn(ComponentsProcessor.prototype, 'split');
    const combine = vi.spyOn(ComponentsProcessor.prototype, 'combine');
    const ready = vi.spyOn(ElkLayered.prototype as unknown as ProcessorNotifier, 'notifyProcessorReady');
    runPipelineSteps(rowOf('sites/LayeredLayoutProvider/cancelled'), factories, new ComponentsProcessor());
    expect(split.mock.results.map((r) => (r.value as readonly unknown[]).length)).toEqual([2]);
    expect(combine).toHaveBeenCalledTimes(0);
    expect(ready).toHaveBeenCalledTimes(0);
  });

  it('combines after the cancelled sole component returned from its plan (twin of cancelledOneComponent; ElkLayered.java:599, :160)', () => {
    const split = vi.spyOn(ComponentsProcessor.prototype, 'split');
    const combine = vi.spyOn(ComponentsProcessor.prototype, 'combine');
    const ready = vi.spyOn(ElkLayered.prototype as unknown as ProcessorNotifier, 'notifyProcessorReady');
    runPipelineSteps(rowOf('sites/LayeredLayoutProvider/cancelledOneComponent'), factories, new ComponentsProcessor());
    expect(split.mock.results.map((r) => (r.value as readonly unknown[]).length)).toEqual([1]);
    expect(combine).toHaveBeenCalledTimes(1);
    // the sole component returns at its first check (ElkLayered.java:599) before any processor is announced
    expect(ready).toHaveBeenCalledTimes(0);
  });
});
