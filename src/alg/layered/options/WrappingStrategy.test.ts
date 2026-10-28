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
