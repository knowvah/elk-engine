// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EdgeCoords } from './EdgeCoords.js';

const DECLARED = ['INHERIT', 'CONTAINER', 'PARENT', 'ROOT'] as const;

describe('EdgeCoords', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeCoords.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeCoords.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(EdgeCoords.values()).toHaveLength(4);
    expect(EdgeCoords.values()[3]).toBe(EdgeCoords.ROOT);
  });

  it('toString is the name', () => {
    expect(EdgeCoords.ROOT.toString()).toBe('ROOT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeCoords.valueOf(name)).toBe(EdgeCoords[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeCoords.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeCoords.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.EdgeCoords.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeCoords.ROOT.compareTo(EdgeCoords.INHERIT)).toBe(3);
    expect(EdgeCoords.INHERIT.compareTo(EdgeCoords.ROOT)).toBe(-3);
    expect(EdgeCoords.INHERIT.compareTo(EdgeCoords.INHERIT)).toBe(0);
  });
});
