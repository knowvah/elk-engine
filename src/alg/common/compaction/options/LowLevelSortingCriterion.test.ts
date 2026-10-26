// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LowLevelSortingCriterion } from './LowLevelSortingCriterion.js';

const DECLARED = ['BY_SIZE', 'BY_SIZE_AND_SHAPE'] as const;

describe('LowLevelSortingCriterion', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LowLevelSortingCriterion.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LowLevelSortingCriterion.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(LowLevelSortingCriterion.values()[1]).toBe(LowLevelSortingCriterion.BY_SIZE_AND_SHAPE);
  });

  it('toString is the name', () => {
    expect(LowLevelSortingCriterion.BY_SIZE_AND_SHAPE.toString()).toBe('BY_SIZE_AND_SHAPE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LowLevelSortingCriterion.valueOf(name)).toBe(LowLevelSortingCriterion[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LowLevelSortingCriterion.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LowLevelSortingCriterion.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.compaction.options.LowLevelSortingCriterion.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(LowLevelSortingCriterion.BY_SIZE_AND_SHAPE.compareTo(LowLevelSortingCriterion.BY_SIZE)).toBe(1);
    expect(LowLevelSortingCriterion.BY_SIZE.compareTo(LowLevelSortingCriterion.BY_SIZE_AND_SHAPE)).toBe(-1);
    expect(LowLevelSortingCriterion.BY_SIZE.compareTo(LowLevelSortingCriterion.BY_SIZE)).toBe(0);
  });
});
