// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Alignment } from './Alignment.js';

const DECLARED = ['AUTOMATIC', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'CENTER'] as const;

describe('Alignment', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(Alignment.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(Alignment.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4, 5]);
    expect(Alignment.values()).toHaveLength(6);
    expect(Alignment.values()[5]).toBe(Alignment.CENTER);
  });

  it('toString is the name', () => {
    expect(Alignment.CENTER.toString()).toBe('CENTER');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(Alignment.valueOf(name)).toBe(Alignment[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => Alignment.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => Alignment.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.Alignment.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(Alignment.CENTER.compareTo(Alignment.AUTOMATIC)).toBe(5);
    expect(Alignment.AUTOMATIC.compareTo(Alignment.CENTER)).toBe(-5);
    expect(Alignment.AUTOMATIC.compareTo(Alignment.AUTOMATIC)).toBe(0);
  });
});
