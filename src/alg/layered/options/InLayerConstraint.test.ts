// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { InLayerConstraint } from './InLayerConstraint.js';

const DECLARED = ['NONE', 'TOP', 'BOTTOM'] as const;

describe('InLayerConstraint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(InLayerConstraint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(InLayerConstraint.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(InLayerConstraint.values()[2]).toBe(InLayerConstraint.BOTTOM);
  });

  it('toString is the name', () => {
    expect(InLayerConstraint.BOTTOM.toString()).toBe('BOTTOM');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(InLayerConstraint.valueOf(name)).toBe(InLayerConstraint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => InLayerConstraint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => InLayerConstraint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.InLayerConstraint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(InLayerConstraint.BOTTOM.compareTo(InLayerConstraint.NONE)).toBe(2);
    expect(InLayerConstraint.NONE.compareTo(InLayerConstraint.BOTTOM)).toBe(-2);
    expect(InLayerConstraint.NONE.compareTo(InLayerConstraint.NONE)).toBe(0);
  });
});
