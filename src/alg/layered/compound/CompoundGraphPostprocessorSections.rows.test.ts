// SPDX-License-Identifier: EPL-2.0
// Row proof of CompoundGraphPostprocessorSections (mission 7h, T7; wired by T8; reduced by T9): every `models` row whose stop is the
// CompoundGraphPostprocessor (the class's own stops) is replayed through the real driver (`RecursiveGraphLayoutEngine` ->
// `ElkLayered.doCompoundLayout`) with no spy: the facade delegates to the section entry, and `expected.tree` must match at AD-4.
// LayeredCompoundVectors.test.ts replays every row of the ref (scenarios and full rows included) and
// LayeredCompoundTwins.test.ts the reversed iterations (decision H3); this file keeps the class's own stops so that the class is
// proven by its own rows.
import { describe, expect, it } from 'vitest';
import {
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
} from '../../../../test/helpers/layered-compound-replay-rows.js';
import { COMPOUND_POSTPROCESSOR } from '../../../../test/helpers/layered-compound-replay-run.js';
import { runToStop } from '../../../../test/helpers/layered-compound-replay-stops.js';

const modelsRows: readonly CompoundModelsRow[] = loadCompoundRowsIfPresent()
  .filter(isCompoundModelsRow)
  .filter((row) => row.expected.stop.className === COMPOUND_POSTPROCESSOR);

describe('CompoundGraphPostprocessorSections (models rows stopping after the postprocessor)', () => {
  it('has recorded rows', () => {
    expect(modelsRows.length).toBeGreaterThan(0);
  });

  it.each(modelsRows.map((row) => [row.id, row] as const))('matches the oracle for %s', (_id, row) => {
    expect(runToStop(row).diffs).toEqual([]);
  });
});
