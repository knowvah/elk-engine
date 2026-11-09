// SPDX-License-Identifier: EPL-2.0
// Anchored cases of CommentPreprocessor (mission 7f2, T17b) for the branches the oracle replay leaves unreached
// (plans/layered-labels/unreached.md, Sc9 and Sc10): each case replays one `sites/CommentPreprocessor/*` row of
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

const SITE_ODD = 'sites/CommentPreprocessor/oddlyConnected';
const SITE_FOUR = 'sites/CommentPreprocessor/fourBoxes';
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

describe('CommentPreprocessor, oddly connected box (Sc9)', () => {
  // oracle: sites/CommentPreprocessor/oddlyConnected; CommentPreprocessor.java:88-104 (the edges reversed, :93 and :99 arms)
  it('marks exactly e0 and e2 reversed (the oddly connected edges) and none of the others', () => {
    const { actual, diffs } = replay(SITE_ODD);
    expect(actual.edges).toEqual([
      { path: 'g0/e0', src: 'g0/n1/p0', tgt: 'g0/n0/p0', reversed: true },
      { path: 'g0/e1', src: 'g0/n0/p1', tgt: 'g0/n3/p0', reversed: false },
      { path: 'g0/e2', src: 'g0/n0/p2', tgt: 'g0/n4/p0', reversed: true },
      { path: 'g0/e3', src: 'g0/n6/p0', tgt: 'g0/n0/p3', reversed: false },
      { path: 'g0/e4', src: 'g0/n1/p0', tgt: 'g0/n2/p0', reversed: false },
      { path: 'g0/e5', src: 'g0/n5/p0', tgt: 'g0/n4/p0', reversed: false },
    ]);
    expect(actual.changed.map((entry) => entry.path)).toEqual(['g0/e0', 'g0/e2']);
    expect(diffs).toEqual([]);
  });

  // oracle: sites/CommentPreprocessor/oddlyConnected/layout; CommentPreprocessor.java:88-104
  it('lays the box out with the two reversed edges routed around it', () => {
    const { layout, diffs } = replay(`${SITE_ODD}/layout`);
    const e0 = sectionOf(layout, 'e0');
    closePoint(e0.startPoint, { x: 116, y: 33.666666666666664 });
    closePoint(e0.endPoint, { x: 62, y: 77 });
    expect(e0.bendPoints).toHaveLength(4);
    const e3 = sectionOf(layout, 'e3');
    closePoint(e3.startPoint, { x: 210, y: 77 });
    closePoint(e3.endPoint, { x: 156, y: 33.666666666666664 });
    expect(e3.bendPoints).toHaveLength(4);
    expect(diffs).toEqual([]);
  });
});

describe('CommentPreprocessor, four boxes on one node (Sc10)', () => {
  // oracle: sites/CommentPreprocessor/fourBoxes; CommentPreprocessor.java:194-198 (the fourth box goes on top)
  it('files c0 and c2 under the bottom comments and c1 and c3 under the top comments of the labelled node', () => {
    const { actual, diffs } = replay(SITE_FOUR);
    const node = actual.changed.find((entry) => entry.path === 'g0/n0');
    expect(node?.props).toEqual({
      BottomSideComments: [{ ref: 'g0/n1' }, { ref: 'g0/n3' }],
      TopSideComments: [{ ref: 'g0/n2' }, { ref: 'g0/n4' }],
    });
    expect(diffs).toEqual([]);
  });

  // oracle: sites/CommentPreprocessor/fourBoxes/layout; CommentPreprocessor.java:194-198
  it('lays the fourth box (c3) above the node and the third (c2) below it', () => {
    const { layout, diffs } = replay(`${SITE_FOUR}/layout`);
    const at = (id: string): Point => layout.children.find((c) => c.id === id)!;
    closePoint(at('c0'), { x: 12, y: 112 });
    closePoint(at('c1'), { x: 12, y: 12 });
    closePoint(at('c2'), { x: 62, y: 112 });
    closePoint(at('c3'), { x: 62, y: 12 });
    expect(diffs).toEqual([]);
  });
});
