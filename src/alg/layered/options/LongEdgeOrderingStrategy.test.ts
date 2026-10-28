// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LongEdgeOrderingStrategy } from './LongEdgeOrderingStrategy.js';

const DECLARED = ['DUMMY_NODE_OVER', 'DUMMY_NODE_UNDER', 'EQUAL'] as const;

describe('LongEdgeOrderingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LongEdgeOrderingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LongEdgeOrderingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(LongEdgeOrderingStrategy.values()[2]).toBe(LongEdgeOrderingStrategy.EQUAL);
  });

  it('toString is the name', () => {
    expect(LongEdgeOrderingStrategy.EQUAL.toString()).toBe('EQUAL');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LongEdgeOrderingStrategy.valueOf(name)).toBe(LongEdgeOrderingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LongEdgeOrderingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LongEdgeOrderingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.LongEdgeOrderingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(LongEdgeOrderingStrategy.EQUAL.compareTo(LongEdgeOrderingStrategy.DUMMY_NODE_OVER)).toBe(2);
    expect(LongEdgeOrderingStrategy.DUMMY_NODE_OVER.compareTo(LongEdgeOrderingStrategy.EQUAL)).toBe(-2);
    expect(LongEdgeOrderingStrategy.DUMMY_NODE_OVER.compareTo(LongEdgeOrderingStrategy.DUMMY_NODE_OVER)).toBe(0);
  });

  it('returnValue is Integer.MAX_VALUE, Integer.MIN_VALUE and 0 respectively', () => {
    expect(LongEdgeOrderingStrategy.DUMMY_NODE_OVER.returnValue()).toBe(2147483647);
    expect(LongEdgeOrderingStrategy.DUMMY_NODE_UNDER.returnValue()).toBe(-2147483648);
    expect(LongEdgeOrderingStrategy.EQUAL.returnValue()).toBe(0);
  });
});
