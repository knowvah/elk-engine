// SPDX-License-Identifier: EPL-2.0
// The `sorter != null` TRUE arms of RadialCompaction.java:50 and :73 (mission 8a, T19). No recorded row combines
// `compactor=RADIAL_COMPACTION` with a sorter, so the arms are covered by a Java-traced structural test on the 16 recorded
// RADIAL_COMPACTION "before" states: the sorter is called on the first level (:50) and on every next level (:73), and an ID sorter
// over equal ORDER_IDs is a stable no-op (List.sort is stable, so is Array.prototype.sort), hence the result still equals the
// recorded "after" stop. (The polar sorter is not driven here: its `initialize` reads CoreOptions.POSITION, which the recorded states do not carry.)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { rowsWithStepPair } from '../../../../../test/helpers/radial-replay-rows.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { SortingStrategy } from '../../options/SortingStrategy.js';
import { RadialUtil } from '../../RadialUtil.js';
import { IDSorter } from '../../sorting/IDSorter.js';
import { RadialCompaction } from './RadialCompaction.js';

/** Recorded RADIAL_COMPACTION rows without a recorded sorter (the compactor row set of RadialCompaction.test.ts). */
const pairs = rowsWithStepPair('GeneralCompactor').filter(
  ([row]) => layoutOptionsOf(row)['compactor'] === 'RADIAL_COMPACTION' && layoutOptionsOf(row)['sorter'] === undefined,
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RadialCompaction with a sorter (RadialCompaction.java:50, :73)', () => {
  it('has recorded RADIAL_COMPACTION rows without a sorter', () => {
    expect(pairs.length).toBeGreaterThan(5);
  });

  it.each(pairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'ID sorter: sorts the first level, then each next level, and equals the recorded result: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      graph.setProperty(RadialOptions.SORTER, SortingStrategy.ID);
      const firstLevel = RadialUtil.getSuccessors(graph.getProperty(InternalProperties.ROOT_NODE)).map((n) =>
        n.getIdentifier(),
      );
      const sort = vi.spyOn(IDSorter.prototype, 'sort');

      new RadialCompaction().compact(graph);

      // :50 sorts the first-level list, :73 sorts the next-level list of every non-empty `contract`
      expect(sort.mock.calls[0]?.[0].map((n) => n.getIdentifier())).toEqual(firstLevel);
      expect(sort.mock.calls.length).toBeGreaterThanOrEqual(1 + (firstLevel.length > 0 ? 1 : 0));
      expect(compareStop(pair.after, dumpRadial(graph, pair.after.step))).toEqual([]);
    },
  );
});
