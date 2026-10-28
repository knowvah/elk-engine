// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { FixedAlignment } from './FixedAlignment.js';

const DECLARED = ['NONE', 'LEFTUP', 'RIGHTUP', 'LEFTDOWN', 'RIGHTDOWN', 'BALANCED'] as const;

describe('FixedAlignment', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(FixedAlignment.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(FixedAlignment.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(FixedAlignment.values()[5]).toBe(FixedAlignment.BALANCED);
  });

  it('toString is the name', () => {
    expect(FixedAlignment.BALANCED.toString()).toBe('BALANCED');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(FixedAlignment.valueOf(name)).toBe(FixedAlignment[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => FixedAlignment.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => FixedAlignment.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.FixedAlignment.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(FixedAlignment.BALANCED.compareTo(FixedAlignment.NONE)).toBe(5);
    expect(FixedAlignment.NONE.compareTo(FixedAlignment.BALANCED)).toBe(-5);
    expect(FixedAlignment.NONE.compareTo(FixedAlignment.NONE)).toBe(0);
  });
});
