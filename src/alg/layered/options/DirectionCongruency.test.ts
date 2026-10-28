// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { DirectionCongruency } from './DirectionCongruency.js';

const DECLARED = ['READING_DIRECTION', 'ROTATION'] as const;

describe('DirectionCongruency', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(DirectionCongruency.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(DirectionCongruency.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(DirectionCongruency.values()[1]).toBe(DirectionCongruency.ROTATION);
  });

  it('toString is the name', () => {
    expect(DirectionCongruency.ROTATION.toString()).toBe('ROTATION');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(DirectionCongruency.valueOf(name)).toBe(DirectionCongruency[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => DirectionCongruency.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => DirectionCongruency.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.DirectionCongruency.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(DirectionCongruency.ROTATION.compareTo(DirectionCongruency.READING_DIRECTION)).toBe(1);
    expect(DirectionCongruency.READING_DIRECTION.compareTo(DirectionCongruency.ROTATION)).toBe(-1);
    expect(DirectionCongruency.READING_DIRECTION.compareTo(DirectionCongruency.READING_DIRECTION)).toBe(0);
  });
});
