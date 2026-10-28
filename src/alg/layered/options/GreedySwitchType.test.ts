// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GreedySwitchType } from './GreedySwitchType.js';

const DECLARED = ['ONE_SIDED', 'TWO_SIDED', 'OFF'] as const;

describe('GreedySwitchType', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(GreedySwitchType.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(GreedySwitchType.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(GreedySwitchType.values()[2]).toBe(GreedySwitchType.OFF);
  });

  it('toString is the name', () => {
    expect(GreedySwitchType.OFF.toString()).toBe('OFF');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(GreedySwitchType.valueOf(name)).toBe(GreedySwitchType[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => GreedySwitchType.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => GreedySwitchType.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.GreedySwitchType.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(GreedySwitchType.OFF.compareTo(GreedySwitchType.ONE_SIDED)).toBe(2);
    expect(GreedySwitchType.ONE_SIDED.compareTo(GreedySwitchType.OFF)).toBe(-2);
    expect(GreedySwitchType.ONE_SIDED.compareTo(GreedySwitchType.ONE_SIDED)).toBe(0);
  });
});
