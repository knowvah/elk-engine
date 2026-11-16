// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EdgeRoutingStrategy } from './EdgeRoutingStrategy.js';

const DECLARED = ['STRAIGHT', 'BEND'] as const;

describe('EdgeRoutingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeRoutingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(EdgeRoutingStrategy.values()[1]).toBe(EdgeRoutingStrategy.BEND);
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeRoutingStrategy.BEND.compareTo(EdgeRoutingStrategy.STRAIGHT)).toBe(1);
    expect(EdgeRoutingStrategy.STRAIGHT.compareTo(EdgeRoutingStrategy.BEND)).toBe(-1);
    expect(EdgeRoutingStrategy.STRAIGHT.compareTo(EdgeRoutingStrategy.STRAIGHT)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeRoutingStrategy.valueOf(name)).toBe(EdgeRoutingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeRoutingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeRoutingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.vertiflex.EdgeRoutingStrategy.FOO',
    );
  });
});
