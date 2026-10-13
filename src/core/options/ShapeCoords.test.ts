// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ShapeCoords } from './ShapeCoords.js';

const DECLARED = ['INHERIT', 'PARENT', 'ROOT'] as const;

describe('ShapeCoords', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(ShapeCoords.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(ShapeCoords.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
    expect(ShapeCoords.values()).toHaveLength(3);
    expect(ShapeCoords.values()[2]).toBe(ShapeCoords.ROOT);
  });

  it('toString is the name', () => {
    expect(ShapeCoords.ROOT.toString()).toBe('ROOT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(ShapeCoords.valueOf(name)).toBe(ShapeCoords[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => ShapeCoords.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ShapeCoords.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.ShapeCoords.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(ShapeCoords.ROOT.compareTo(ShapeCoords.INHERIT)).toBe(2);
    expect(ShapeCoords.INHERIT.compareTo(ShapeCoords.ROOT)).toBe(-2);
    expect(ShapeCoords.INHERIT.compareTo(ShapeCoords.INHERIT)).toBe(0);
  });
});
