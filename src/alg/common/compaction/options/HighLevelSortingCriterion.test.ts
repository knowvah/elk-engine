// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { HighLevelSortingCriterion } from './HighLevelSortingCriterion.js';

const DECLARED = ['NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST', 'CORNER_CASES_THAN_SINGLE_SIDE_LAST'] as const;

describe('HighLevelSortingCriterion', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(HighLevelSortingCriterion.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(HighLevelSortingCriterion.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(HighLevelSortingCriterion.values()[1]).toBe(HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST);
  });

  it('toString is the name', () => {
    expect(HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST.toString()).toBe(
      'CORNER_CASES_THAN_SINGLE_SIDE_LAST',
    );
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(HighLevelSortingCriterion.valueOf(name)).toBe(HighLevelSortingCriterion[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => HighLevelSortingCriterion.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => HighLevelSortingCriterion.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.compaction.options.HighLevelSortingCriterion.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(
      HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST.compareTo(
        HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST,
      ),
    ).toBe(1);
    expect(
      HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST.compareTo(
        HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST,
      ),
    ).toBe(-1);
    expect(
      HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST.compareTo(
        HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST,
      ),
    ).toBe(0);
  });
});
