// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { rowsWithStepPair } from '../../../../../test/helpers/radial-replay-rows.js';
import { AnnulusWedgeCompaction } from './AnnulusWedgeCompaction.js';

const pairs = rowsWithStepPair('GeneralCompactor').filter(
  ([row]) => layoutOptionsOf(row)['compactor'] === 'WEDGE_COMPACTION',
);

describe('AnnulusWedgeCompaction', () => {
  it('has recorded stop pairs of rows with the wedge compaction, with both step sizes', () => {
    expect(pairs.length).toBeGreaterThan(5);
    expect(new Set(pairs.map(([row]) => layoutOptionsOf(row)['compactionStepSize'])).size).toBeGreaterThan(1);
  });

  // acceptance: the recorded stop before the compactor, run through `compact`, equals the recorded stop after it
  it.each(pairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'compacts the recorded before state into the recorded after state: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      new AnnulusWedgeCompaction().compact(graph);
      expect(compareStop(pair.after, dumpRadial(graph, pair.after.step))).toEqual([]);
    },
  );
});
