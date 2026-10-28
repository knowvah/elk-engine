// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ValidifyStrategy } from './ValidifyStrategy.js';

const DECLARED = ['NO', 'GREEDY', 'LOOK_BACK'] as const;

describe('ValidifyStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(ValidifyStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(ValidifyStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(ValidifyStrategy.values()[2]).toBe(ValidifyStrategy.LOOK_BACK);
  });

  it('toString is the name', () => {
    expect(ValidifyStrategy.LOOK_BACK.toString()).toBe('LOOK_BACK');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(ValidifyStrategy.valueOf(name)).toBe(ValidifyStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => ValidifyStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ValidifyStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.ValidifyStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(ValidifyStrategy.LOOK_BACK.compareTo(ValidifyStrategy.NO)).toBe(2);
    expect(ValidifyStrategy.NO.compareTo(ValidifyStrategy.LOOK_BACK)).toBe(-2);
    expect(ValidifyStrategy.NO.compareTo(ValidifyStrategy.NO)).toBe(0);
  });
});

describe('ValidifyStrategy oracle row site/enums/ValidifyStrategy', () => {
  // oracle: site/enums/ValidifyStrategy
  it('site/enums/ValidifyStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(ValidifyStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NO', 0, 'NO'],
      ['GREEDY', 1, 'GREEDY'],
      ['LOOK_BACK', 2, 'LOOK_BACK'],
    ]);
  });

  // oracle: site/enums/ValidifyStrategy
  it('site/enums/ValidifyStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => ValidifyStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => ValidifyStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.ValidifyStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/ValidifyStrategy
  it('site/enums/ValidifyStrategy: compareTo first/last', () => {
    const values = ValidifyStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
