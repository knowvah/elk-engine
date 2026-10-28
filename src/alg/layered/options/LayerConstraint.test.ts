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
