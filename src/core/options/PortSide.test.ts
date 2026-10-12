// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { Direction } from './Direction.js';
import { PortSide } from './PortSide.js';

const DECLARED = ['UNDEFINED', 'NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
const { UNDEFINED, NORTH, EAST, SOUTH, WEST } = PortSide;

describe('PortSide enum scaffolding', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PortSide.values().map((s) => s.name())).toEqual([...DECLARED]);
    expect(PortSide.values().map((s) => s.ordinal())).toEqual([0, 1, 2, 3, 4]);
    expect(PortSide.values()).toHaveLength(5);
  });

  it('toString is the name', () => {
    expect(SOUTH.toString()).toBe('SOUTH');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PortSide.valueOf(name)).toBe(PortSide[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PortSide.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortSide.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.PortSide.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(WEST.compareTo(UNDEFINED)).toBe(4);
    expect(NORTH.compareTo(SOUTH)).toBe(-2);
    expect(EAST.compareTo(EAST)).toBe(0);
  });

  it('EnumSet.of iterates in ordinal order', () => {
    expect([...EnumSet.of(WEST, NORTH)]).toEqual([NORTH, WEST]);
  });
});

describe('PortSide rotation', () => {
  it('right is the next side clockwise', () => {
    expect(NORTH.right()).toBe(EAST);
    expect(EAST.right()).toBe(SOUTH);
    expect(SOUTH.right()).toBe(WEST);
    expect(WEST.right()).toBe(NORTH);
    expect(UNDEFINED.right()).toBe(UNDEFINED);
  });

  it('left is the next side counter-clockwise', () => {
    expect(NORTH.left()).toBe(WEST);
    expect(EAST.left()).toBe(NORTH);
    expect(SOUTH.left()).toBe(EAST);
    expect(WEST.left()).toBe(SOUTH);
    expect(UNDEFINED.left()).toBe(UNDEFINED);
  });

  it('opposed is the facing side', () => {
    expect(NORTH.opposed()).toBe(SOUTH);
    expect(EAST.opposed()).toBe(WEST);
    expect(SOUTH.opposed()).toBe(NORTH);
    expect(WEST.opposed()).toBe(EAST);
    expect(UNDEFINED.opposed()).toBe(UNDEFINED);
  });
});

describe('PortSide.areAdjacent', () => {
  it('is false for UNDEFINED against every side', () => {
    for (const other of PortSide.values()) {
      expect(UNDEFINED.areAdjacent(other)).toBe(false);
    }
  });

  it('is true for neighbours on either rotation side', () => {
    expect(NORTH.areAdjacent(EAST)).toBe(true);
    expect(NORTH.areAdjacent(WEST)).toBe(true);
    expect(EAST.areAdjacent(SOUTH)).toBe(true);
    expect(SOUTH.areAdjacent(WEST)).toBe(true);
  });

  it('is false for the same side, the opposed side and UNDEFINED', () => {
    expect(NORTH.areAdjacent(NORTH)).toBe(false);
    expect(NORTH.areAdjacent(SOUTH)).toBe(false);
    expect(EAST.areAdjacent(WEST)).toBe(false);
    expect(WEST.areAdjacent(UNDEFINED)).toBe(false);
  });
});

describe('PortSide.fromDirection', () => {
  it('maps each direction to its side', () => {
    expect(PortSide.fromDirection(Direction.UP)).toBe(NORTH);
    expect(PortSide.fromDirection(Direction.RIGHT)).toBe(EAST);
    expect(PortSide.fromDirection(Direction.DOWN)).toBe(SOUTH);
    expect(PortSide.fromDirection(Direction.LEFT)).toBe(WEST);
    expect(PortSide.fromDirection(Direction.UNDEFINED)).toBe(UNDEFINED);
  });
});

describe('PortSide.isVertical and isHorizontal', () => {
  it('isVertical is true only for NORTH and SOUTH', () => {
    expect(PortSide.values().filter((s) => PortSide.isVertical(s))).toEqual([NORTH, SOUTH]);
  });

  it('isHorizontal is true only for EAST and WEST', () => {
    expect(PortSide.values().filter((s) => PortSide.isHorizontal(s))).toEqual([EAST, WEST]);
  });
});

describe('PortSide side combinations', () => {
  const combinations: readonly (readonly [ReadonlySet<PortSide>, readonly PortSide[]])[] = [
    [PortSide.SIDES_NONE, []],
    [PortSide.SIDES_NORTH, [NORTH]],
    [PortSide.SIDES_EAST, [EAST]],
    [PortSide.SIDES_SOUTH, [SOUTH]],
    [PortSide.SIDES_WEST, [WEST]],
    [PortSide.SIDES_NORTH_SOUTH, [NORTH, SOUTH]],
    [PortSide.SIDES_EAST_WEST, [EAST, WEST]],
    [PortSide.SIDES_NORTH_WEST, [NORTH, WEST]],
    [PortSide.SIDES_NORTH_EAST, [NORTH, EAST]],
    [PortSide.SIDES_SOUTH_WEST, [SOUTH, WEST]],
    [PortSide.SIDES_EAST_SOUTH, [EAST, SOUTH]],
    [PortSide.SIDES_NORTH_EAST_WEST, [NORTH, EAST, WEST]],
    [PortSide.SIDES_EAST_SOUTH_WEST, [EAST, SOUTH, WEST]],
    [PortSide.SIDES_NORTH_SOUTH_WEST, [NORTH, SOUTH, WEST]],
    [PortSide.SIDES_NORTH_EAST_SOUTH, [NORTH, EAST, SOUTH]],
    [PortSide.SIDES_NORTH_EAST_SOUTH_WEST, [NORTH, EAST, SOUTH, WEST]],
  ];

  it('declares all 16 combinations', () => {
    expect(combinations).toHaveLength(16);
  });

  it.each(combinations)('holds exactly its sides in ordinal order (%#)', (set, expected) => {
    expect([...set]).toEqual([...expected]);
    expect(set.size).toBe(expected.length);
  });

  it('SIDES_NORTH_EAST contains exactly NORTH and EAST', () => {
    expect(PortSide.SIDES_NORTH_EAST.has(NORTH)).toBe(true);
    expect(PortSide.SIDES_NORTH_EAST.has(EAST)).toBe(true);
    expect(PortSide.SIDES_NORTH_EAST.has(SOUTH)).toBe(false);
    expect(PortSide.SIDES_NORTH_EAST.has(WEST)).toBe(false);
    expect(PortSide.SIDES_NORTH_EAST.has(UNDEFINED)).toBe(false);
  });

  it('the sets are unmodifiable', () => {
    const none = PortSide.SIDES_NONE as Set<PortSide>;
    const north = PortSide.SIDES_NORTH as Set<PortSide>;
    expect(() => none.add(NORTH)).toThrow(UnsupportedOperationException);
    expect(() => north.add(EAST)).toThrow(UnsupportedOperationException);
  });
});
