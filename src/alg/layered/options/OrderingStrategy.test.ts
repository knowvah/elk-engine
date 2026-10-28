// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { OrderingStrategy } from './OrderingStrategy.js';

const DECLARED = ['NONE', 'NODES_AND_EDGES', 'PREFER_EDGES', 'PREFER_NODES'] as const;

describe('OrderingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(OrderingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(OrderingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(OrderingStrategy.values()[3]).toBe(OrderingStrategy.PREFER_NODES);
  });

  it('toString is the name', () => {
    expect(OrderingStrategy.PREFER_NODES.toString()).toBe('PREFER_NODES');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(OrderingStrategy.valueOf(name)).toBe(OrderingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => OrderingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => OrderingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.OrderingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(OrderingStrategy.PREFER_NODES.compareTo(OrderingStrategy.NONE)).toBe(3);
    expect(OrderingStrategy.NONE.compareTo(OrderingStrategy.PREFER_NODES)).toBe(-3);
    expect(OrderingStrategy.NONE.compareTo(OrderingStrategy.NONE)).toBe(0);
  });
});
