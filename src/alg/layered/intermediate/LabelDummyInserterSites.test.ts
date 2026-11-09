// SPDX-License-Identifier: EPL-2.0
// Anchored case of LabelDummyInserter (mission 7f2, T17a, G12): the S item of unreached.md for `retrieveThickness`
// (`LabelDummyInserter.ts:152`, the clamp of a negative `edge.thickness`). Every literal below is copied from the recorded
// row; the expectations are never derived by hand (AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { isStopRow, loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROW_ID = 'sites/LabelDummyInserter/negativeThickness';
const THICKNESS_KEY = 'org.eclipse.elk.edge.thickness';
const HEX_DOUBLE_DIGITS = 16;

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

/** The IEEE-754 double the recorder printed as 16 hex digits. */
function fromHex(hex: string): number {
  expect(hex).toHaveLength(HEX_DOUBLE_DIGITS);
  return new DataView(new BigUint64Array([BigInt(`0x${hex}`)]).buffer).getFloat64(0, true);
}

const row = (): PipelineStopRow =>
  loadLabelsRows()
    .filter(isStopRow)
    .find((r) => r.id === ROW_ID)!;
const replay = (): LabelsExpected =>
  labelsDump(
    runLabelsRow(row(), { factories, components: new ComponentsProcessor() }),
    row().expected as unknown as LabelsExpected,
  );
const sizeOf = (dump: LabelsExpected, path: string): number[] =>
  (dump.geometry.nodes[path]!.size as unknown as string[]).map(fromHex);
/** The recorded double of the dump's `edge.thickness` entry (the replay encodes it as `number`, the row as `"0.0"`). */
const thicknessOf = (dump: LabelsExpected, path: string): number =>
  Number((dump.changed.find((entry) => entry.path === path)?.props[THICKNESS_KEY] as { v: unknown }).v);

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('LabelDummyInserter (the negative edge thickness site, T17a)', () => {
  it('finds the recorded row', () => {
    expect(row().id).toBe(ROW_ID);
  });

  it('clamps a thickness of -2 to 0 on the edge and on the split edge (LabelDummyInserter.java:140-142)', () => {
    const dump = replay();
    // oracle: sites/LabelDummyInserter/negativeThickness changed[g0/e0] and changed[new/e0]; java:140-142
    expect(thicknessOf(dump, 'g0/e0')).toBe(0);
    expect(thicknessOf(dump, 'new/e0')).toBe(0);
  });

  it('sizes the label dummy with the clamped thickness (LabelDummyInserter.java:165-170)', () => {
    const dump = replay();
    // oracle: sites/LabelDummyInserter/negativeThickness geometry.nodes[new/n0].size 4044.. 4028..; java:165
    expect(sizeOf(dump, 'new/n0')).toEqual([40, 12]);
    expect(sizeOf(dump, 'new/n0')).toEqual(
      (row().expected.geometry.nodes['new/n0']!.size as unknown as string[]).map(fromHex),
    );
  });
});
