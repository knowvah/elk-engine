// SPDX-License-Identifier: EPL-2.0
// CompoundGraphPreprocessor: the facade (mission 7h, T8, H7). `process` delegates to the section entry (`CompoundGraphPreprocessorSections.ts`, H11); the
// behaviour itself is proven by the section tests against the whole ref. Here one recorded `models` row whose stop is the preprocessor is
// replayed through the real driver: the facade's `process` is observed by a call-through spy (it runs the real method), the tree
// at the stop is compared with the row's `expected.tree` at AD-4 (L4: the row is the only expectation).
import { afterEach, expect, it, vi } from 'vitest';
import {
  describeCompound,
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
} from '../../../../test/helpers/layered-compound-replay-rows.js';
import { runToStop } from '../../../../test/helpers/layered-compound-replay-stops.js';
import { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';

const row = loadCompoundRowsIfPresent()
  .filter(isCompoundModelsRow)
  .find((candidate) => candidate.expected.stop.className === 'CompoundGraphPreprocessor');

afterEach(() => {
  vi.restoreAllMocks();
});

describeCompound('CompoundGraphPreprocessor (the facade)', () => {
  it('delegates process to the section entry: one call per compound layout, the recorded tree at the stop', () => {
    const process = vi.spyOn(CompoundGraphPreprocessor.prototype, 'process');
    const result = runToStop(row!);
    expect(process).toHaveBeenCalledTimes(1);
    expect(result.diffs).toEqual([]);
  });
});
