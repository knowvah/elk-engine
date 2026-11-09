// SPDX-License-Identifier: EPL-2.0
// Anchored case of CommentPostprocessor (mission 7f2, T17b) for the branch the oracle replay leaves unreached
// (plans/layered-labels/unreached.md, Sc11): the case replays the `sites/CommentPostprocessor/idlePort` row of
// `layered-labels.json` with the real enums and asserts the field the branch decides, with literals copied from the row
// (`// oracle: <row id>; <Java file:line>`). Expectations come only from the rows (L4, AD-13); numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const SITE_IDLE = 'sites/CommentPostprocessor/idlePort';
const AD4_DIGITS = 6;

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

interface Point {
  readonly x: number;
  readonly y: number;
}
interface Section {
  readonly startPoint: Point;
  readonly endPoint: Point;
  readonly bendPoints?: readonly Point[];
}
interface Exported {
  readonly children: readonly { id: string; x: number; y: number }[];
  readonly edges: readonly { id: string; sections: readonly Section[] }[];
}

function replay(id: string): { actual: ReturnType<typeof labelsDump>; layout: Exported; diffs: unknown[] } {
  const row = loadLabelsRows().find((candidate) => candidate.id === id);
  if (row === undefined || !isStopRow(row)) {
    throw new Error(`no stop row ${id}`);
  }
  const result = runLabelsRow(row, { factories, components: new ComponentsProcessor() });
  const actual = labelsDump(result, row.expected);
  return { actual, layout: result.layout as Exported, diffs: compareLabels(actual, row.expected) };
}

const sectionOf = (layout: Exported, edge: string): Section => layout.edges.find((e) => e.id === edge)!.sections[0]!;
const closePoint = (actual: Point, expected: Point): void => {
  expect(actual.x).toBeCloseTo(expected.x, AD4_DIGITS);
  expect(actual.y).toBeCloseTo(expected.y, AD4_DIGITS);
};

describe('CommentPostprocessor, box with an idle first port (Sc11)', () => {
  // oracle: sites/CommentPostprocessor/idlePort; CommentPostprocessor.java:171-182 (getBoxPort skips the unconnected c.p0)
  it('reconnects the edge at the box port after the idle one and routes it from the box to the node', () => {
    const { actual, layout, diffs } = replay(SITE_IDLE);
    expect(actual.edges).toEqual([{ path: 'g0/e0', src: 'g0/n0/p1', tgt: 'g0/n1/p0', reversed: false }]);
    expect(actual.ports).toEqual({ 'g0/n0': ['g0/n0/p0', 'g0/n0/p1'], 'g0/n1': ['g0/n1/p0'] });
    const e0 = sectionOf(layout, 'e0');
    closePoint(e0.startPoint, { x: 27, y: 42 });
    closePoint(e0.endPoint, { x: 27, y: 52 });
    const box = layout.children.find((c) => c.id === 'c')!;
    closePoint(box, { x: 12, y: 12 });
    const node = layout.children.find((c) => c.id === 'n')!;
    closePoint(node, { x: 12, y: 52 });
    expect(diffs).toEqual([]);
  });
});
