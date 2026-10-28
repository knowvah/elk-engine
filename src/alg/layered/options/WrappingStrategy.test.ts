// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { WrappingStrategy } from './WrappingStrategy.js';

const DECLARED = ['OFF', 'SINGLE_EDGE', 'MULTI_EDGE'] as const;

describe('WrappingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(WrappingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(WrappingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(WrappingStrategy.values()[2]).toBe(WrappingStrategy.MULTI_EDGE);
  });

  it('toString is the name', () => {
    expect(WrappingStrategy.MULTI_EDGE.toString()).toBe('MULTI_EDGE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(WrappingStrategy.valueOf(name)).toBe(WrappingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => WrappingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => WrappingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.WrappingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(WrappingStrategy.MULTI_EDGE.compareTo(WrappingStrategy.OFF)).toBe(2);
    expect(WrappingStrategy.OFF.compareTo(WrappingStrategy.MULTI_EDGE)).toBe(-2);
    expect(WrappingStrategy.OFF.compareTo(WrappingStrategy.OFF)).toBe(0);
  });
});

describe('WrappingStrategy oracle row site/enums/WrappingStrategy', () => {
  // oracle: site/enums/WrappingStrategy
  it('site/enums/WrappingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(WrappingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['OFF', 0, 'OFF'],
      ['SINGLE_EDGE', 1, 'SINGLE_EDGE'],
      ['MULTI_EDGE', 2, 'MULTI_EDGE'],
    ]);
  });

  // oracle: site/enums/WrappingStrategy
  it('site/enums/WrappingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => WrappingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => WrappingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.WrappingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/WrappingStrategy
  it('site/enums/WrappingStrategy: compareTo first/last', () => {
    const values = WrappingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
