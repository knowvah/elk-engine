// SPDX-License-Identifier: EPL-2.0
// Replay of the p3 stops and the p3 throws rows of `test/golden/refs/java/rectpacking.json` (mission 8c, T9): the p2 stop before each
// `after:EqualWhitespaceEliminator` / `after:ToAspectratioNodeExpander` stop is rebuilt (restored graph and props, rebuilt rows as ROWS),
// the phase runs, and node bounds and props equal the recorded stop at the AD-4 bar (1e-6; the bit-exact count is asserted below).
import { describe, expect, it } from 'vitest';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import {
  compareJson,
  formatDifferences,
  TOLERANCE,
  type Comparison,
} from '../../../../test/helpers/rectpacking-replay-dump.js';
import {
  noPlacementReplay,
  P3_STOPS,
  recordedElkPart,
  replayP3,
  simpleJavaName,
  stopsWithPrevious,
  throwsLayoutNode,
} from '../../../../test/helpers/rectpacking-replay-p1p3.js';
import {
  loadRectPackingRows,
  STOP_AFTER_ASPECT_RATIO_EXPANDER,
  STOP_AFTER_EQUAL_WHITESPACE,
  type ThrowsRow,
} from '../../../../test/helpers/rectpacking-replay-rows.js';
import { EqualWhitespaceEliminator } from './EqualWhitespaceEliminator.js';
import { ToAspectratioNodeExpander } from './ToAspectratioNodeExpander.js';

const LOOP = { timeout: 60_000 };

const throwsRow = (id: string): ThrowsRow => loadRectPackingRows('throws').find((r) => r.id === id)!;

function catchError(action: () => void): Error {
  try {
    action();
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected the action to throw');
}

describe('p3 whitespace elimination replay', () => {
  it('every p3 stop replays at 1e-6 (17 equal + 17 to-aspect-ratio stops)', LOOP, () => {
    const stops = stopsWithPrevious(P3_STOPS);
    expect(stops.filter((s) => s.stop.stop === STOP_AFTER_EQUAL_WHITESPACE).length).toBe(17);
    expect(stops.filter((s) => s.stop.stop === STOP_AFTER_ASPECT_RATIO_EXPANDER).length).toBe(17);
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    for (const found of stops) {
      const { state } = replayP3(found);
      compareJson(recordedElkPart(found.stop), state, TOLERANCE, `${found.row.id} ${found.stop.stop}`, total);
    }
    expect(formatDifferences(total)).toBe('');
    expect(total.hexExact + total.hexClose).toBeGreaterThan(0);
    // The number of values that are bit-exact and the number that differ in the last bits, for the report.
    console.info(`p3 replay: ${String(total.hexExact)} bit-exact, ${String(total.hexClose)} within 1e-6`);
  });

  it('the rows after the phase equal the recorded rows of the stop at 1e-6', LOOP, () => {
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    for (const found of stopsWithPrevious(P3_STOPS)) {
      const recorded = found.stop.state.rows;
      expect(recorded, `${found.row.id} ${found.stop.stop}`).not.toBeNull();
      compareJson(recorded, replayP3(found).rows, TOLERANCE, `${found.row.id} ${found.stop.stop} rows`, total);
    }
    expect(formatDifferences(total)).toBe('');
    console.info(`p3 rows replay: ${String(total.hexExact)} bit-exact, ${String(total.hexClose)} within 1e-6`);
  });

  it('equalWithoutRows: class and message equal the row', () => {
    const row = throwsRow('throws/equalWithoutRows');
    const thrown = catchError(() =>
      new EqualWhitespaceEliminator().process(throwsLayoutNode(row), new BasicProgressMonitor()),
    );
    expect(thrown).toBeInstanceOf(UnsupportedConfigurationException);
    expect(thrown.name).toBe(simpleJavaName(row.expected.throws.class));
    expect(thrown.message).toBe(row.expected.throws.message);
  });

  it('toAspectWithoutRows: from the recorded NoPlacement state (drawing props set, no ROWS) the phase throws the row', () => {
    const row = throwsRow('throws/toAspectWithoutRows');
    const { layout } = noPlacementReplay();
    const thrown = catchError(() => new ToAspectratioNodeExpander().process(layout, new BasicProgressMonitor()));
    expect(thrown).toBeInstanceOf(UnsupportedConfigurationException);
    expect(thrown.name).toBe(simpleJavaName(row.expected.throws.class));
    expect(thrown.message).toBe(row.expected.throws.message);
  });

  it('the phases ask for no further processors (getLayoutProcessorConfiguration is null)', () => {
    const graph = throwsLayoutNode(throwsRow('throws/equalWithoutRows'));
    expect(new EqualWhitespaceEliminator().getLayoutProcessorConfiguration(graph)).toBeNull();
    expect(new ToAspectratioNodeExpander().getLayoutProcessorConfiguration(graph)).toBeNull();
  });

  it('ToAspectratioNodeExpander without drawing props throws a NullPointerException stand-in (unboxing a missing double)', () => {
    const graph = throwsLayoutNode(throwsRow('throws/toAspectWithoutRows'));
    const thrown = catchError(() => new ToAspectratioNodeExpander().process(graph, new BasicProgressMonitor()));
    expect(thrown).toBeInstanceOf(TypeError);
    expect(thrown.message).toContain('java.lang.Double.doubleValue()');
  });
});
