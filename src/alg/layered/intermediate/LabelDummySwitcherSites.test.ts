// SPDX-License-Identifier: EPL-2.0
// Anchored case of LabelDummySwitcher (mission 7f2, T17a, G12): the S item of unreached.md for the SPACE_EFFICIENT_LAYER
// strategy (`LabelDummySwitcherSpaceEfficient.ts`, `LabelDummySwitcher.java:407-530`). Every literal below is copied from
// the recorded row; the expectations are never derived by hand (AD-13).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { isStopRow, loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { LabelDummySwitcher } from './LabelDummySwitcher.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROW_ID = 'sites/LabelDummySwitcher/spaceEfficient';

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

describe('LabelDummySwitcher (the space-efficient site, T17a)', () => {
  it('finds the recorded row', () => {
    expect(row().id).toBe(ROW_ID);
  });

  it('puts each label dummy into the layer the space-efficient strategy picks (LabelDummySwitcher.java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient layers; LabelDummySwitcher.java:407-530
    expect(replay().layers).toEqual([
      ['g0/n0'],
      ['new/n0', 'new/n1', 'g0/n1'],
      ['new/n2', 'new/n3', 'g0/n2', 'new/n4'],
      ['new/n5', 'g0/n3', 'new/n6', 'new/n7'],
      ['g0/n4'],
    ]);
  });

  it('keeps the layer order of the recorded edges after the switch', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient edges; LabelDummySwitcher.java:407-530
    const edges = replay().edges.map((edge) => [edge.path, edge.src, edge.tgt]);
    expect(edges).toContainEqual(['new/e2', 'new/p4', 'new/p11']);
    expect(edges).toContainEqual(['new/e5', 'new/p10', 'g0/n4/p1']);
    expect(edges).toHaveLength(16);
  });
});

/** The `[label dummy width, layer index]` of every `assignLayer` call of a replay, in call order. */
function assignmentsOf(): [number, number][] {
  const calls: [number, number][] = [];
  const original = (LabelDummySwitcher.prototype as unknown as { assignLayer: (info: never, layer: number) => void })
    .assignLayer;
  const spy = vi
    .spyOn(LabelDummySwitcher.prototype as unknown as { assignLayer: typeof original }, 'assignLayer')
    .mockImplementation(function (this: LabelDummySwitcher, info: never, layer: number) {
      calls.push([(info as { labelDummy: { getSize(): { x: number } } }).labelDummy.getSize().x, layer]);
      original.call(this, info, layer);
    });
  try {
    replay();
  } finally {
    spy.mockRestore();
  }
  return calls;
}

describe('LabelDummySwitcher (the space-efficient assignment order, internal state, T17a)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('assigns the single-layer label first, then the others from the widest to the narrowest (java:416,430-436)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient input labels le7 90 (one layer), le4 100, le5 80, le6 60
    expect(assignmentsOf().map(([width]) => width)).toEqual([90, 100, 80, 60]);
  });

  it('assigns each label dummy to the layer the recorded row holds it in (java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient layers (the dummies new/n5, n0, n3... by their recorded sizes)
    const dump = replay();
    const layerOf = (path: string): number => dump.layers.findIndex((layer) => layer.includes(path));
    const widthOf = (path: string): number => {
      const hex = (dump.geometry.nodes[path]!.size as unknown as string[])[0]!;
      return new DataView(new BigUint64Array([BigInt(`0x${hex}`)]).buffer).getFloat64(0, true);
    };
    const recorded = dump.layers
      .flat()
      .filter((path) => path.startsWith('new/') && widthOf(path) > 0)
      .map((path): [number, number] => [widthOf(path), layerOf(path)]);
    const assigned = assignmentsOf();
    expect(assigned).toHaveLength(4);
    for (const call of assigned) {
      expect(recorded).toContainEqual(call);
    }
  });
});
