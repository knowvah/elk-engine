// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { VerticalLabelAlignment } from './VerticalLabelAlignment.js';

describe('VerticalLabelAlignment', () => {
  it('lists the constants in declaration order', () => {
    const names = 'TOP,CENTER,BOTTOM'.split(',');
    expect(VerticalLabelAlignment.values().map((v) => v.name())).toEqual(names);
    expect(VerticalLabelAlignment.values().map((v) => v.ordinal())).toEqual([0, 1, 2]);
    expect(String(VerticalLabelAlignment.values()[1])).toBe(names[1]);
  });

  it('resolves names and rejects unknown ones with the Java message', () => {
    expect(VerticalLabelAlignment.valueOf('CENTER')).toBe(VerticalLabelAlignment.values()[1]);
    expect(() => VerticalLabelAlignment.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => VerticalLabelAlignment.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.VerticalLabelAlignment.NOPE',
    );
  });
});
