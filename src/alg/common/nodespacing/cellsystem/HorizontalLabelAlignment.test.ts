// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { HorizontalLabelAlignment } from './HorizontalLabelAlignment.js';

describe('HorizontalLabelAlignment', () => {
  it('lists the constants in declaration order', () => {
    const names = 'LEFT,CENTER,RIGHT'.split(',');
    expect(HorizontalLabelAlignment.values().map((v) => v.name())).toEqual(names);
    expect(HorizontalLabelAlignment.values().map((v) => v.ordinal())).toEqual([0, 1, 2]);
    expect(String(HorizontalLabelAlignment.values()[1])).toBe(names[1]);
  });

  it('resolves names and rejects unknown ones with the Java message', () => {
    expect(HorizontalLabelAlignment.valueOf('CENTER')).toBe(HorizontalLabelAlignment.values()[1]);
    expect(() => HorizontalLabelAlignment.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => HorizontalLabelAlignment.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.HorizontalLabelAlignment.NOPE',
    );
  });
});
