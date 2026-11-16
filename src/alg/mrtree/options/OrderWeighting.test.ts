// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { OrderWeighting } from './OrderWeighting.js';

const DECLARED = ['MODEL_ORDER', 'DESCENDANTS', 'FAN', 'CONSTRAINT'] as const;

describe('OrderWeighting', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(OrderWeighting.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(OrderWeighting.values()[3]).toBe(OrderWeighting.CONSTRAINT);
  });

  it('compareTo orders by ordinal', () => {
    expect(OrderWeighting.CONSTRAINT.compareTo(OrderWeighting.MODEL_ORDER)).toBe(3);
    expect(OrderWeighting.MODEL_ORDER.compareTo(OrderWeighting.CONSTRAINT)).toBe(-3);
    expect(OrderWeighting.MODEL_ORDER.compareTo(OrderWeighting.MODEL_ORDER)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(OrderWeighting.valueOf(name)).toBe(OrderWeighting[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => OrderWeighting.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => OrderWeighting.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.options.OrderWeighting.FOO',
    );
  });
});
