// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LayerConstraint } from './LayerConstraint.js';

const DECLARED = ['NONE', 'FIRST', 'FIRST_SEPARATE', 'LAST', 'LAST_SEPARATE'] as const;

describe('LayerConstraint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LayerConstraint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LayerConstraint.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(LayerConstraint.values()[4]).toBe(LayerConstraint.LAST_SEPARATE);
  });

  it('toString is the name', () => {
    expect(LayerConstraint.LAST_SEPARATE.toString()).toBe('LAST_SEPARATE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LayerConstraint.valueOf(name)).toBe(LayerConstraint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LayerConstraint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LayerConstraint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.LayerConstraint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(LayerConstraint.LAST_SEPARATE.compareTo(LayerConstraint.NONE)).toBe(4);
    expect(LayerConstraint.NONE.compareTo(LayerConstraint.LAST_SEPARATE)).toBe(-4);
    expect(LayerConstraint.NONE.compareTo(LayerConstraint.NONE)).toBe(0);
  });
});

describe('LayerConstraint oracle row site/enums/LayerConstraint', () => {
  // oracle: site/enums/LayerConstraint
  it('site/enums/LayerConstraint: constants in declaration order with name, ordinal and toString', () => {
    expect(LayerConstraint.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['FIRST', 1, 'FIRST'],
      ['FIRST_SEPARATE', 2, 'FIRST_SEPARATE'],
      ['LAST', 3, 'LAST'],
      ['LAST_SEPARATE', 4, 'LAST_SEPARATE'],
    ]);
  });

  // oracle: site/enums/LayerConstraint
  it('site/enums/LayerConstraint: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => LayerConstraint.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => LayerConstraint.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.LayerConstraint.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/LayerConstraint
  it('site/enums/LayerConstraint: compareTo first/last', () => {
    const values = LayerConstraint.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-4);
    expect(last.compareTo(first)).toBe(4);
    expect(first.compareTo(first)).toBe(0);
  });
});
