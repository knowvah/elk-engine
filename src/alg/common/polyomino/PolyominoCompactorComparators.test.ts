// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CornerCasesGreaterThanRestComparator } from './PolyominoCompactorCornerCasesGreaterThanRestComparator.js';
import { MinNumOfExtensionDirectionsComparator } from './PolyominoCompactorMinNumOfExtensionDirectionsComparator.js';
import { MinNumOfExtensionsComparator } from './PolyominoCompactorMinNumOfExtensionsComparator.js';
import { MinPerimeterComparator } from './PolyominoCompactorMinPerimeterComparator.js';
import { MinPerimeterComparatorWithShape } from './PolyominoCompactorMinPerimeterComparatorWithShape.js';
import { SingleExtensionSideGreaterThanRestComparator } from './PolyominoCompactorSingleExtensionSideGreaterThanRestComparator.js';
import { Direction } from './structures/Direction.js';
import { Polyomino } from './structures/Polyomino.js';

function poly(width: number, height: number, ...dirs: Direction[]): Polyomino {
  const p = new Polyomino(width, height);
  for (const d of dirs) {
    p.addExtension(d, 0, 0);
  }
  return p;
}

const { NORTH, EAST, SOUTH, WEST } = Direction;

describe('MinPerimeterComparator', () => {
  const cmp = new MinPerimeterComparator();
  it('orders by width + height', () => {
    expect(cmp.compare(poly(1, 2), poly(2, 3))).toBe(-1);
    expect(cmp.compare(poly(2, 3), poly(1, 2))).toBe(1);
    expect(cmp.compare(poly(1, 4), poly(2, 3))).toBe(0);
  });
});

describe('MinPerimeterComparatorWithShape', () => {
  const cmp = new MinPerimeterComparatorWithShape();
  it('squares the shorter side and adds the longer side', () => {
    // 1x5: 1 + 5 = 6 (width < height squares width); 3x3: 3 + 9 = 12
    expect(cmp.compare(poly(1, 5), poly(3, 3))).toBe(-1);
    expect(cmp.compare(poly(3, 3), poly(1, 5))).toBe(1);
  });
  it('squares the height when width >= height', () => {
    // 5x1: 5 + 1 = 6 equals 1x5
    expect(cmp.compare(poly(5, 1), poly(1, 5))).toBe(0);
    expect(cmp.compare(poly(5, 1), poly(3, 3))).toBe(-1);
  });
});

describe('MinNumOfExtensionsComparator', () => {
  const cmp = new MinNumOfExtensionsComparator();
  it('orders by extension count', () => {
    expect(cmp.compare(poly(1, 1), poly(1, 1, NORTH))).toBe(-1);
    expect(cmp.compare(poly(1, 1, NORTH, NORTH), poly(1, 1, NORTH))).toBe(1);
    expect(cmp.compare(poly(1, 1, NORTH), poly(1, 1, EAST))).toBe(0);
  });
});

describe('MinNumOfExtensionDirectionsComparator', () => {
  const cmp = new MinNumOfExtensionDirectionsComparator();
  it('orders by distinct directions, not extensions', () => {
    expect(cmp.compare(poly(1, 1, NORTH, NORTH), poly(1, 1, NORTH, EAST))).toBe(-1);
    expect(cmp.compare(poly(1, 1, NORTH, EAST, SOUTH), poly(1, 1, NORTH, EAST))).toBe(1);
    expect(cmp.compare(poly(1, 1, NORTH, NORTH), poly(1, 1, WEST))).toBe(0);
  });
});

describe('SingleExtensionSideGreaterThanRestComparator', () => {
  const cmp = new SingleExtensionSideGreaterThanRestComparator();
  it('ranks exactly one direction above every other count', () => {
    expect(cmp.compare(poly(1, 1), poly(1, 1, NORTH, NORTH))).toBe(-1);
    expect(cmp.compare(poly(1, 1, NORTH, EAST), poly(1, 1, SOUTH))).toBe(-1);
    expect(cmp.compare(poly(1, 1, SOUTH), poly(1, 1, NORTH, EAST, WEST))).toBe(1);
    expect(cmp.compare(poly(1, 1), poly(1, 1, NORTH, EAST))).toBe(0);
  });
});

describe('CornerCasesGreaterThanRestComparator', () => {
  const cmp = new CornerCasesGreaterThanRestComparator();
  it('ranks one horizontal plus one vertical direction above the rest', () => {
    expect(cmp.compare(poly(1, 1, NORTH), poly(1, 1, NORTH, EAST))).toBe(-1);
    expect(cmp.compare(poly(1, 1, SOUTH, WEST), poly(1, 1, NORTH))).toBe(1);
  });
  it('treats two parallel directions as a non-corner case', () => {
    expect(cmp.compare(poly(1, 1, NORTH, SOUTH), poly(1, 1, EAST, WEST))).toBe(0);
    expect(cmp.compare(poly(1, 1, NORTH, SOUTH), poly(1, 1, NORTH, WEST))).toBe(-1);
    expect(cmp.compare(poly(1, 1, NORTH, EAST), poly(1, 1, NORTH, EAST, SOUTH))).toBe(1);
  });
});
