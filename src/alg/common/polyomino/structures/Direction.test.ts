// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { Direction } from './Direction.js';

describe('Direction', () => {
  it('declares the four constants in Java order', () => {
    expect(Direction.values().map((d) => d.name())).toEqual(['NORTH', 'EAST', 'SOUTH', 'WEST']);
    expect(Direction.values().map((d) => d.ordinal())).toEqual([0, 1, 2, 3]);
  });

  it('marks EAST and WEST as horizontal (static initializer)', () => {
    expect(Direction.NORTH.isHorizontal()).toBe(false);
    expect(Direction.EAST.isHorizontal()).toBe(true);
    expect(Direction.SOUTH.isHorizontal()).toBe(false);
    expect(Direction.WEST.isHorizontal()).toBe(true);
  });

  it('resolves valueOf and rejects unknown names', () => {
    expect(Direction.valueOf('SOUTH')).toBe(Direction.SOUTH);
    expect(() => Direction.valueOf('UP')).toThrow(IllegalArgumentException);
  });

  it('prints its name and compares by ordinal', () => {
    expect(String(Direction.WEST)).toBe('WEST');
    expect(Direction.WEST.compareTo(Direction.NORTH)).toBe(3);
  });
});
