// SPDX-License-Identifier: EPL-2.0
// Proof of the rectpacking replay helpers (mission 8c, T6): every recorded stop restores onto an imported graph and dumps back to the
// recorded state, and every recorded `state.rows` rebuilds into util objects that dump back to the row (acceptance: "given every p2
// stop row, when the structure is rebuilt and dumped, then it equals the row"). Exact raw bits (tolerance 0).
import { describe, expect, it } from 'vitest';
import { compareJson, dumpRectRows, field, formatDifferences, setFields } from './rectpacking-replay-dump.js';
import { dumpState } from './rectpacking-replay-elk.js';
import { collectStops, decodeHex, loadRectPackingRows, P2_ROW_STOPS, STOP_BEGIN } from './rectpacking-replay-rows.js';
import { p2Stops, replayRows, replayStop } from './rectpacking-replay-run.js';

const LOOP = { timeout: 60_000 };
const EXACT = 0;

describe('rectpacking replay helpers', () => {
  it('loads the ref: 151 stops rows, 558 full rows, 7 throws rows, 640 sort rows', () => {
    const counts = ['full', 'stops', 'throws', 'sort'].map((g) => loadRectPackingRows(g as 'full').length);
    expect(counts).toEqual([558, 151, 7, 640]);
  });

  it('rebuilds every p2 stop row and dumps it back to the recorded rows (167 stops)', LOOP, () => {
    const stops = p2Stops();
    expect(stops.length).toBe(collectStops(P2_ROW_STOPS).length);
    expect(stops.length).toBe(167);
    for (const found of stops) {
      const { rebuilt } = replayRows(found);
      const comparison = compareJson(found.rec, dumpRectRows(rebuilt.list), EXACT);
      expect(formatDifferences(comparison), `${found.row.id} ${found.stop.stop}`).toBe('');
      expect(rebuilt.list.length).toBe(found.rec.listSize);
      expect(rebuilt.rows.length).toBe(found.rec.rows.length);
    }
  });

  it(
    'restores every stop state onto the imported graph and dumps it back (graph, nodes, ports, labels, extras, props, padding)',
    LOOP,
    () => {
      let stops = 0;
      for (const row of loadRectPackingRows('stops')) {
        for (const run of row.expected.graphs) {
          for (const stop of run.stops) {
            const { layout } = replayStop({ row, run, stop });
            const { graph, nodes, ports, labels, extras, props, padding } = stop.state;
            const recorded = { graph, nodes, ports, labels, extras, props, padding };
            const comparison = compareJson(recorded, dumpState(layout), EXACT);
            expect(formatDifferences(comparison), `${row.id} ${stop.stop}`).toBe('');
            stops++;
          }
        }
      }
      expect(stops).toBeGreaterThan(P2_ROW_STOPS.length);
    },
  );

  it('the begin stop of every graph run carries no rows (ROWS is first set by p2)', () => {
    for (const { stop } of collectStops([STOP_BEGIN])) {
      expect(stop.state.rows).toBeNull();
    }
  });

  it('reflection reads and writes a private util field, and rejects an unknown one', () => {
    const [found] = p2Stops();
    const { rec } = found!;
    const { rebuilt } = replayRows(found!);
    const row = rebuilt.rows[0]!;
    expect(field<number>(row, 'nodeNodeSpacing')).toBe(decodeHex(rec.rows[0]!.spacing));
    setFields(row, { width: decodeHex(rec.rows[0]!.width) + 1 });
    expect(row.getWidth()).toBe(decodeHex(rec.rows[0]!.width) + 1);
    expect(() => field(row, 'nope')).toThrow('reflection RectRow.nope');
    expect(() => setFields(row, { nope: 1 })).toThrow('reflection RectRow.nope');
  });
});
