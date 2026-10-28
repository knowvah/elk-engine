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

describe('GreedySwitchType oracle row site/enums/GreedySwitchType', () => {
  // oracle: site/enums/GreedySwitchType
  it('site/enums/GreedySwitchType: constants in declaration order with name, ordinal and toString', () => {
    expect(GreedySwitchType.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['ONE_SIDED', 0, 'ONE_SIDED'],
      ['TWO_SIDED', 1, 'TWO_SIDED'],
      ['OFF', 2, 'OFF'],
    ]);
  });

  // oracle: site/enums/GreedySwitchType
  it('site/enums/GreedySwitchType: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => GreedySwitchType.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => GreedySwitchType.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.GreedySwitchType.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/GreedySwitchType
  it('site/enums/GreedySwitchType: compareTo first/last', () => {
    const values = GreedySwitchType.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
