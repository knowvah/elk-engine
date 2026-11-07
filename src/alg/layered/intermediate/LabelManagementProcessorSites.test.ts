// SPDX-License-Identifier: EPL-2.0
// Anchored case of LabelManagementProcessor (mission 7f2, T17a, G12): the S item of unreached.md for the labels of the
// comment boxes attached to a node (`LabelManagementProcessor.ts:147,179`, `LabelManagementProcessor.java:126,155`). Every
// literal below is copied from the recorded row; the expectations are never derived by hand (AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { isStopRow, loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROW_ID = 'sites/LabelManagementProcessor/comments';

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
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

const row = (): PipelineStopRow =>
  loadLabelsRows()
    .filter(isStopRow)
    .find((r) => r.id === ROW_ID)!;
const replay = (): LabelsExpected =>
  labelsDump(
    runLabelsRow(row(), { factories, components: new ComponentsProcessor() }),
    row().expected as unknown as LabelsExpected,
  );

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const layoutOf = (dump: LabelsExpected): { children: Box[]; width: number; height: number } =>
  dump.layout as { children: Box[]; width: number; height: number };
const boxOf = (dump: LabelsExpected, id: string): Box => layoutOf(dump).children.find((child) => child.id === id)!;

describe('LabelManagementProcessor (the attached comments site, T17a)', () => {
  it('finds the recorded row', () => {
    expect(row().id).toBe(ROW_ID);
  });

  it('places the node and the three comment boxes where the oracle does (LabelManagementProcessor.java:126-130,155)', () => {
    const dump = replay();
    // oracle: sites/LabelManagementProcessor/comments layout; LabelManagementProcessor.java:126-130,155
    expect([boxOf(dump, 'n').x, boxOf(dump, 'n').y]).toEqual([42, 42]);
    expect([boxOf(dump, 'c1').x, boxOf(dump, 'c1').y]).toEqual([12, 12]);
    expect([boxOf(dump, 'c2').x, boxOf(dump, 'c2').y]).toEqual([37, 82]);
    expect([boxOf(dump, 'c3').x, boxOf(dump, 'c3').y]).toEqual([62, 12]);
  });

  it('sizes the graph from the managed comment labels (LabelManagementProcessor.java:126-130,155)', () => {
    const dump = replay();
    // oracle: sites/LabelManagementProcessor/comments layout width and height
    expect([layoutOf(dump).width, layoutOf(dump).height]).toEqual([114, 114]);
  });
});

/**
 * The plan of `scenarios/LabelManagementProcessor/end-node-port/wide/RIGHT` (its steps up to the processor, without the
 * dump), run on the input of the site row: the comment labels are then in the `TOP_COMMENTS` / `BOTTOM_COMMENTS` lists of
 * their node, where the layout export cannot see them.
 */
const PLAN: [string, ...unknown[]][] = [
  ['labelManager', 'shrink-width'],
  ['importGraph', null],
  ['normalise'],
  ['runProcessor', 'COMMENT_PREPROCESSOR'],
  ['runProcessor', 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER'],
  ['runPhase', 'P1_CYCLE_BREAKING', 'GREEDY'],
  ['runProcessor', 'LABEL_DUMMY_INSERTER'],
  ['runProcessor', 'LAYER_CONSTRAINT_PREPROCESSOR'],
  ['runPhase', 'P2_LAYERING', 'NETWORK_SIMPLEX'],
  ['runProcessor', 'LAYER_CONSTRAINT_POSTPROCESSOR'],
  ['runProcessor', 'LONG_EDGE_SPLITTER'],
  ['runProcessor', 'PORT_SIDE_PROCESSOR'],
  ['runProcessor', 'INVERTED_PORT_PROCESSOR'],
  ['runProcessor', 'PORT_LIST_SORTER'],
  ['runProcessor', 'NORTH_SOUTH_PORT_PREPROCESSOR'],
  ['runPhase', 'P3_NODE_ORDERING', 'LAYER_SWEEP'],
  ['runProcessor', 'TWO_SIDED_GREEDY_SWITCH'],
  ['runProcessor', 'IN_LAYER_CONSTRAINT_PROCESSOR'],
  ['runProcessor', 'END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR'],
];

/** `MIN_WIDTH_NODE_LABELS` (`LabelManagementProcessor.java:59`), the width the shrink-width manager gives a wide label. */
const MIN_WIDTH_NODE_LABELS = 40;

function managedComments(): { top: LNode[]; bottom: LNode[] } {
  const plan = { ...row(), steps: PLAN } as unknown as PipelineStopRow;
  const graph = runLabelsRow(plan, { factories, components: new ComponentsProcessor() }).graph;
  const holder = graph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .find((node) => node.hasProperty(InternalProperties.TOP_COMMENTS))!;
  return {
    top: holder.getProperty(InternalProperties.TOP_COMMENTS),
    bottom: holder.getProperty(InternalProperties.BOTTOM_COMMENTS),
  };
}

const labelSize = (box: LNode): [number, number] => [box.getLabels()[0]!.getSize().x, box.getLabels()[0]!.getSize().y];

describe('LabelManagementProcessor (the attached comments, internal state, T17a)', () => {
  it('holds c1 and c3 above and c2 below the node (the row input: c1 TOP, c2 BOTTOM, c3 TOP)', () => {
    const { top, bottom } = managedComments();
    expect(top.map((box) => box.getLabels().length)).toEqual([1, 0]);
    expect(bottom.map((box) => box.getLabels().length)).toEqual([1]);
  });

  it('shrinks the labels of the comments above to MIN_WIDTH_NODE_LABELS (LabelManagementProcessor.java:126-130)', () => {
    // oracle: sites/LabelManagementProcessor/comments input c1 label 160 x 10 -> 40 x 10 (java:59,126-130)
    expect(labelSize(managedComments().top[0]!)).toEqual([MIN_WIDTH_NODE_LABELS, 10]);
  });

  it('shrinks the labels of the comments below to MIN_WIDTH_NODE_LABELS (LabelManagementProcessor.java:131-135)', () => {
    // oracle: sites/LabelManagementProcessor/comments input c2 label 180 x 10 -> 40 x 10 (java:59,131-135)
    expect(labelSize(managedComments().bottom[0]!)).toEqual([MIN_WIDTH_NODE_LABELS, 10]);
  });
});
