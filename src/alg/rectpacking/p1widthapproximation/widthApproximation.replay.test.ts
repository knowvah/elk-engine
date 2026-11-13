// SPDX-License-Identifier: EPL-2.0
// Replay of the p1 stops and the p1 throws rows of `test/golden/refs/java/rectpacking.json` (mission 8c, T9): the stop before each
// `after:GreedyWidthApproximator` / `after:TargetWidthWidthApproximator` stop is restored, the phase runs, and the whole dumped state
// (node positions, props.targetWidth, and for the greedy stop the recomputed `drawing`) equals the recorded stop at raw bits.
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import { compareJson, formatDifferences, type Comparison } from '../../../../test/helpers/rectpacking-replay-dump.js';
import {
  P1_STOPS,
  recordedElkPart,
  replayP1,
  simpleJavaName,
  STOP_AFTER_GREEDY,
  STOP_AFTER_TARGET_WIDTH,
  stopsWithPrevious,
  throwsLayoutNode,
} from '../../../../test/helpers/rectpacking-replay-p1p3.js';
import { loadRectPackingRows } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { GreedyWidthApproximator } from './GreedyWidthApproximator.js';
import { TargetWidthWidthApproximator } from './TargetWidthWidthApproximator.js';

const LOOP = { timeout: 60_000 };
const EXACT = 0;

describe('p1 width approximation replay', () => {
  it('every greedy and target-width stop replays at raw bits (155 + 16 stops)', LOOP, () => {
    const stops = stopsWithPrevious(P1_STOPS);
    expect(stops.filter((s) => s.stop.stop === STOP_AFTER_GREEDY).length).toBe(155);
    expect(stops.filter((s) => s.stop.stop === STOP_AFTER_TARGET_WIDTH).length).toBe(16);
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    let drawings = 0;
    for (const found of stops) {
      const { state, drawing } = replayP1(found);
      const at = `${found.row.id} ${found.stop.stop}`;
      compareJson(recordedElkPart(found.stop), state, EXACT, at, total);
      expect(found.stop.state.rows, at).toBeNull();
      expect(drawing, at).toEqual(found.stop.state.drawing);
      drawings += drawing === undefined ? 0 : 1;
    }
    expect(formatDifferences(total)).toBe('');
    expect(total.hexClose).toBe(0);
    expect(total.hexExact).toBeGreaterThan(0);
    expect(drawings).toBe(155);
  });

  it('targetWidthMissing: class and message equal the row', () => {
    const row = loadRectPackingRows('throws').find((r) => r.id === 'throws/targetWidthMissing')!;
    const thrown = catchError(() =>
      new TargetWidthWidthApproximator().process(throwsLayoutNode(row), new BasicProgressMonitor()),
    );
    expect(thrown).toBeInstanceOf(UnsupportedConfigurationException);
    expect(simpleJavaName(row.expected.throws.class)).toBe((thrown as Error).name);
    expect((thrown as Error).message).toBe(row.expected.throws.message);
  });

  it('emptyGreedy: the phase alone throws the BasicIndexOutOfBoundsException of the row', () => {
    const row = loadRectPackingRows('throws').find((r) => r.id === 'throws/emptyGreedy')!;
    const thrown = catchError(() =>
      new GreedyWidthApproximator().process(throwsLayoutNode(row), new BasicProgressMonitor()),
    ) as Error;
    expect(simpleJavaName(row.expected.throws.class)).toBe(thrown.name);
    expect(thrown.message).toBe(row.expected.throws.message);
    expect(thrown.message).toBe('index=0, size=0');
  });

  it('the phases ask for no further processors (getLayoutProcessorConfiguration is null)', () => {
    const row = loadRectPackingRows('throws')[0]!;
    const graph = throwsLayoutNode(row);
    expect(new GreedyWidthApproximator().getLayoutProcessorConfiguration(graph)).toBeNull();
    expect(new TargetWidthWidthApproximator().getLayoutProcessorConfiguration(graph)).toBeNull();
  });
});

function catchError(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('expected the action to throw');
}
