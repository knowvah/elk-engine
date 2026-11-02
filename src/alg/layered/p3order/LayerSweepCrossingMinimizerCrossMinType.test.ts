// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';

describe('CrossMinType (LayerSweepCrossingMinimizer.java:655-668)', () => {
  it('lists the constants in declaration order with their ordinals and names', () => {
    expect(CrossMinType.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['BARYCENTER', 0, 'BARYCENTER'],
      ['ONE_SIDED_GREEDY_SWITCH', 1, 'ONE_SIDED_GREEDY_SWITCH'],
      ['TWO_SIDED_GREEDY_SWITCH', 2, 'TWO_SIDED_GREEDY_SWITCH'],
      ['MEDIAN', 3, 'MEDIAN'],
    ]);
  });

  it('resolves a constant by name and rejects an unknown name', () => {
    expect(CrossMinType.valueOf('MEDIAN')).toBe(CrossMinType.MEDIAN);
    expect(() => CrossMinType.valueOf('NOPE')).toThrow(IllegalArgumentException);
  });
});
