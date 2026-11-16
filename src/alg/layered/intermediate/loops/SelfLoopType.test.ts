// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { SelfLoopType } from './SelfLoopType.js';

// Expectations read from SelfLoopType.java#fromPortSides (the switch over the number of sides).
describe('SelfLoopType', () => {
  it('lists its constants in declaration order and looks them up by name', () => {
    expect(SelfLoopType.values().map(String)).toEqual([
      'ONE_SIDE',
      'TWO_SIDES_CORNER',
      'TWO_SIDES_OPPOSING',
      'THREE_SIDES',
      'FOUR_SIDES',
    ]);
    expect(SelfLoopType.valueOf('THREE_SIDES')).toBe(SelfLoopType.THREE_SIDES);
    expect(SelfLoopType.THREE_SIDES.ordinal()).toBe(3);
    expect(SelfLoopType.THREE_SIDES.name()).toBe('THREE_SIDES');
    expect(SelfLoopType.FOUR_SIDES.compareTo(SelfLoopType.ONE_SIDE)).toBeGreaterThan(0);
    expect(() => SelfLoopType.valueOf('NOPE')).toThrow(IllegalArgumentException);
  });

  it('one side is ONE_SIDE', () => {
    expect(SelfLoopType.fromPortSides(new Set([PortSide.WEST]))).toBe(SelfLoopType.ONE_SIDE);
  });

  it('two opposing sides are TWO_SIDES_OPPOSING, two adjacent ones TWO_SIDES_CORNER', () => {
    expect(SelfLoopType.fromPortSides(new Set([PortSide.EAST, PortSide.WEST]))).toBe(SelfLoopType.TWO_SIDES_OPPOSING);
    expect(SelfLoopType.fromPortSides(new Set([PortSide.SOUTH, PortSide.NORTH]))).toBe(SelfLoopType.TWO_SIDES_OPPOSING);
    expect(SelfLoopType.fromPortSides(new Set([PortSide.NORTH, PortSide.EAST]))).toBe(SelfLoopType.TWO_SIDES_CORNER);
  });

  it('three and four sides, and none', () => {
    expect(SelfLoopType.fromPortSides(new Set([PortSide.NORTH, PortSide.EAST, PortSide.SOUTH]))).toBe(
      SelfLoopType.THREE_SIDES,
    );
    expect(SelfLoopType.fromPortSides(new Set([PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]))).toBe(
      SelfLoopType.FOUR_SIDES,
    );
    expect(SelfLoopType.fromPortSides(new Set())).toBeNull();
  });

  it('rejects UNDEFINED', () => {
    expect(() => SelfLoopType.fromPortSides(new Set([PortSide.UNDEFINED]))).toThrow(
      'Port sides must not contain UNDEFINED',
    );
  });
});
