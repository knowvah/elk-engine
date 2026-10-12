// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Direction } from './Direction.js';

const DECLARED = ['UNDEFINED', 'RIGHT', 'LEFT', 'DOWN', 'UP'] as const;

describe('Direction', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(Direction.values().map((d) => d.name())).toEqual([...DECLARED]);
    expect(Direction.values().map((d) => d.ordinal())).toEqual([0, 1, 2, 3, 4]);
    expect(Direction.values()).toHaveLength(5);
    expect(Direction.values()[1]).toBe(Direction.RIGHT);
  });

  it('toString is the name', () => {
    expect(Direction.LEFT.toString()).toBe('LEFT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(Direction.valueOf(name)).toBe(Direction[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => Direction.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => Direction.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.Direction.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(Direction.UP.compareTo(Direction.UNDEFINED)).toBe(4);
    expect(Direction.UNDEFINED.compareTo(Direction.DOWN)).toBe(-3);
    expect(Direction.LEFT.compareTo(Direction.LEFT)).toBe(0);
  });

  it('isHorizontal is true only for LEFT and RIGHT', () => {
    expect(Direction.values().filter((d) => d.isHorizontal())).toEqual([Direction.RIGHT, Direction.LEFT]);
  });

  it('isVertical is true only for UP and DOWN', () => {
    expect(Direction.values().filter((d) => d.isVertical())).toEqual([Direction.DOWN, Direction.UP]);
  });

  it('opposite swaps each axis pair and maps UNDEFINED to UNDEFINED', () => {
    expect(Direction.LEFT.opposite()).toBe(Direction.RIGHT);
    expect(Direction.RIGHT.opposite()).toBe(Direction.LEFT);
    expect(Direction.UP.opposite()).toBe(Direction.DOWN);
    expect(Direction.DOWN.opposite()).toBe(Direction.UP);
    expect(Direction.UNDEFINED.opposite()).toBe(Direction.UNDEFINED);
  });
});
