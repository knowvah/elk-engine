// SPDX-License-Identifier: EPL-2.0
// Replay of the p2 stops of `test/golden/refs/java/rectpacking.json` (mission 8c, T10): the stop before each `after:Compactor`,
// `after:SimplePlacement` and `after:NoPlacement` stop is restored, the phase runs, and the whole dumped state (node positions, props,
// `state.rows` with its detached rows) equals the recorded stop at raw bits (tolerance 0).
import { afterAll, beforeAll, describe, expect, it, vi, type MockInstance } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { compareJson, formatDifferences, type Comparison } from '../../../../test/helpers/rectpacking-replay-dump.js';
import {
  p2StopsWithPrevious,
  recordedState,
  replayP2,
  type P2Found,
  type P2Replay,
} from '../../../../test/helpers/rectpacking-replay-p2.js';
import {
  STOP_AFTER_COMPACTOR,
  STOP_AFTER_NO_PLACEMENT,
  STOP_AFTER_SIMPLE_PLACEMENT,
} from '../../../../test/helpers/rectpacking-replay-rows.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { Compactor } from './Compactor.js';
import { NoPlacement } from './NoPlacement.js';
import { RowFillingAndCompaction } from './RowFillingAndCompaction.js';
import { SimplePlacement } from './SimplePlacement.js';

const LOOP = { timeout: 60_000 };
const EXACT = 0;
const EMPTY_BLOCK_MESSAGE = 'There should not be an empty block. Empty blocks are directly removed.';
/**
 * `compaction.iterations` values of the recorded stops rows (the header's `optionCoverage`: 0 and 6 occur only in `full` rows,
 * which carry no p2 stop; the provider test of T12 replays them end to end).
 */
const RECORDED_ITERATIONS = [-2, 1, 2, 3, 4, 10];

interface Observed {
  readonly found: P2Found;
  readonly replay: P2Replay;
  readonly iterations: number;
  /** `RowFillingAndCompaction.start` calls during the replay. */
  readonly starts: number;
  /** Calls of `console.error` with the empty-block message. */
  readonly emptyBlockMessages: number;
}

const observed: Observed[] = [];

const importedGraph = (): ElkNode => ElkGraphUtil.createGraph();

describe('p2 packing replay', () => {
  let startSpy: MockInstance<RowFillingAndCompaction['start']>;
  let errorSpy: MockInstance<typeof console.error>;

  beforeAll(() => {
    startSpy = vi.spyOn(RowFillingAndCompaction.prototype, 'start');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const found of p2StopsWithPrevious()) {
      startSpy.mockClear();
      errorSpy.mockClear();
      const replay = replayP2(found);
      observed.push({
        found,
        replay,
        iterations: replay.layout.getProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS),
        starts: startSpy.mock.calls.length,
        emptyBlockMessages: errorSpy.mock.calls.filter((args) => args[0] === EMPTY_BLOCK_MESSAGE).length,
      });
    }
  }, 60_000);

  afterAll(() => {
    startSpy.mockRestore();
    errorSpy.mockRestore();
  });

  const named = (stopName: string): readonly Observed[] => observed.filter((o) => o.found.stop.stop === stopName);

  it('replays every p2 stop at raw bits: positions, props and state.rows', LOOP, () => {
    expect(named(STOP_AFTER_COMPACTOR).length).toBe(157);
    expect(named(STOP_AFTER_SIMPLE_PLACEMENT).length).toBe(10);
    expect(named(STOP_AFTER_NO_PLACEMENT).length).toBe(4);
    expect(new Set(observed.map((o) => o.found.row.id)).size).toBe(149);
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    for (const o of observed) {
      compareJson(recordedState(o.found.stop), o.replay.state, EXACT, `${o.found.row.id} ${o.found.stop.stop}`, total);
    }
    expect(formatDifferences(total)).toBe('');
    expect(total.hexClose).toBe(0);
    expect(total.hexExact).toBeGreaterThan(0);
  });

  it('covers every recorded compaction.iterations value and runs the Java loop count', LOOP, () => {
    const compactor = named(STOP_AFTER_COMPACTOR);
    const values = [...new Set(compactor.map((o) => o.iterations))].sort((a, b) => a - b);
    for (const value of RECORDED_ITERATIONS) {
      expect(values, `iterations ${String(value)}`).toContain(value);
    }
    for (const o of compactor) {
      // `while (iterations > 1)` runs one extra compaction per remaining iteration after the first.
      expect(o.starts, `${o.found.row.id} iterations ${String(o.iterations)}`).toBe(Math.max(1, o.iterations));
    }
  });

  it('keeps the first iteration rows while a later accepted iteration moves the nodes (iterations > 1)', LOOP, () => {
    const multi = named(STOP_AFTER_COMPACTOR).filter((o) => o.iterations > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const o of multi) {
      const at = `${o.found.row.id} ${o.found.stop.stop}`;
      const total = compareJson(recordedState(o.found.stop), o.replay.state, EXACT, at);
      expect(formatDifferences(total), at).toBe('');
    }
  });

  it('Compaction.java:74 writes its message with console.error on recorded inputs', () => {
    const row = observed.find((o) => o.found.row.id === 'stops/edge/onlyNewRow/default');
    expect(row?.emptyBlockMessages).toBeGreaterThan(0);
    expect(row?.found.stop.stop).toBe(STOP_AFTER_COMPACTOR);
  });

  it('replays every p2 stop with logging enabled and logs the Java tags', LOOP, () => {
    const total: Comparison = { differences: [], hexExact: 0, hexClose: 0 };
    const tagsOf = new Map<string, readonly string[]>();
    for (const o of observed) {
      const monitor = new BasicProgressMonitor().withLogging(true);
      const replay = replayP2(o.found, monitor);
      const at = `${o.found.row.id} ${o.found.stop.stop}`;
      compareJson(recordedState(o.found.stop), replay.state, EXACT, at, total);
      tagsOf.set(
        at,
        monitor.getLoggedGraphs().map((logged) => logged.getTag()),
      );
    }
    expect(formatDifferences(total)).toBe('');
    const multi = named(STOP_AFTER_COMPACTOR).find((o) => o.iterations === 3);
    const tags = tagsOf.get(`${multi?.found.row.id} ${STOP_AFTER_COMPACTOR}`) ?? [];
    // Compactor.java:70 ("Compacted", after the rows' "Compacted row <i>") and :83 (one "Layouted clone <n>" per extra pass).
    expect(tags).toContain('Compacted');
    expect(tags).toContain('Compacted row 0');
    expect(tags.filter((tag) => tag.startsWith('Layouted clone '))).toEqual(['Layouted clone 3', 'Layouted clone 2']);
  });

  it('the phases answer no layout processor configuration', () => {
    const graph = importedGraph();
    expect(new Compactor().getLayoutProcessorConfiguration(graph)).toBeNull();
    expect(new SimplePlacement().getLayoutProcessorConfiguration(graph)).toBeNull();
    expect(new NoPlacement().getLayoutProcessorConfiguration(graph)).toBeNull();
  });
});
