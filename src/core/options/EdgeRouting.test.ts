// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EdgeRouting } from './EdgeRouting.js';

const DECLARED = ['UNDEFINED', 'POLYLINE', 'ORTHOGONAL', 'SPLINES'] as const;

describe('EdgeRouting', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeRouting.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeRouting.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(EdgeRouting.values()).toHaveLength(4);
    expect(EdgeRouting.values()[3]).toBe(EdgeRouting.SPLINES);
  });

  it('toString is the name', () => {
    expect(EdgeRouting.SPLINES.toString()).toBe('SPLINES');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeRouting.valueOf(name)).toBe(EdgeRouting[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeRouting.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeRouting.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.EdgeRouting.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeRouting.SPLINES.compareTo(EdgeRouting.UNDEFINED)).toBe(3);
    expect(EdgeRouting.UNDEFINED.compareTo(EdgeRouting.SPLINES)).toBe(-3);
    expect(EdgeRouting.UNDEFINED.compareTo(EdgeRouting.UNDEFINED)).toBe(0);
  });
});
