// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { UniqueTriple } from '../../utils/UniqueTriple.js';
import { Direction } from './Direction.js';
import { PlanarGrid } from './PlanarGrid.js';
import { Polyomino } from './Polyomino.js';

const INT_MAX = 2147483647;

describe('PlanarGrid center', () => {
  it.each([
    [5, 5, 2, 2],
    [4, 6, 1, 2],
    [1, 2, 0, 0],
    [0, 0, -1, -1],
  ])('truncates the center of a %i x %i grid to (%i, %i)', (w, h, cx, cy) => {
    const grid = new PlanarGrid(w, h);
    expect([grid.getCenterX(), grid.getCenterY()]).toEqual([cx, cy]);
  });

  it('defaults to a 0 x 0 grid (package-private Java constructor)', () => {
    const grid = new PlanarGrid();
    expect([grid.getWidth(), grid.getHeight(), grid.getCenterX(), grid.getCenterY()]).toEqual([0, 0, -1, -1]);
  });

  it('recomputes the center on reinitialize', () => {
    const grid = new PlanarGrid(5, 5);
    grid.reinitialize(8, 3);
    expect([grid.getWidth(), grid.getHeight(), grid.getCenterX(), grid.getCenterY()]).toEqual([8, 3, 3, 1]);
  });
});

describe('PlanarGrid center based access', () => {
  it('translates by the center', () => {
    const grid = new PlanarGrid(5, 5);
    grid.setBlockedCenterBased(-2, -2);
    grid.setWeaklyBlockedCenterBased(2, 1);
    expect(grid.isBlocked(0, 0)).toBe(true);
    expect(grid.isWeaklyBlocked(4, 3)).toBe(true);
    expect(grid.isBlockedCenterBased(-2, -2)).toBe(true);
    expect(grid.isWeaklyBlockedCenterBased(2, 1)).toBe(true);
    expect(grid.isEmptyCenterBased(0, 0)).toBe(true);
    grid.setEmptyCenterBased(-2, -2);
    expect(grid.isEmpty(0, 0)).toBe(true);
  });

  it('tests the bounds in center based coordinates', () => {
    const grid = new PlanarGrid(5, 5);
    expect(grid.inBoundsCenterBased(-2, -2)).toBe(true);
    expect(grid.inBoundsCenterBased(2, 2)).toBe(true);
    expect(grid.inBoundsCenterBased(-3, 0)).toBe(false);
    expect(grid.inBoundsCenterBased(0, 3)).toBe(false);
  });

  it('appends the center based coordinates to the out of bounds message', () => {
    const grid = new PlanarGrid(5, 5);
    const tail = (x: number, y: number): string => ` Given center based coordinates were (${x}, ${y}).`;
    const base = (x: number, y: number): string =>
      `Grid is only of size 5*5. Requested point (${x}, ${y}) is out of bounds.`;
    expect(() => grid.isEmptyCenterBased(30, 0)).toThrow(new IndexOutOfBoundsException(base(32, 2) + tail(30, 0)));
    expect(() => grid.isBlockedCenterBased(0, -3)).toThrow(new IndexOutOfBoundsException(base(2, -1) + tail(0, -3)));
    expect(() => grid.isWeaklyBlockedCenterBased(-3, 0)).toThrow(
      new IndexOutOfBoundsException(base(-1, 2) + tail(-3, 0)),
    );
    expect(() => grid.setBlockedCenterBased(3, 0)).toThrow(new IndexOutOfBoundsException(base(5, 2) + tail(3, 0)));
    expect(() => grid.setEmptyCenterBased(0, 3)).toThrow(new IndexOutOfBoundsException(base(2, 5) + tail(0, 3)));
    expect(() => grid.setWeaklyBlockedCenterBased(-3, -3)).toThrow(
      new IndexOutOfBoundsException(base(-1, -1) + tail(-3, -3)),
    );
  });

  it('reads padding cells of the last word without an exception (as Java does)', () => {
    expect(new PlanarGrid(5, 5).isEmptyCenterBased(3, 0)).toBe(true);
  });
});

describe('PlanarGrid.intersectsWithCenterBased (grid overload)', () => {
  function centerCell(size: number, kind: 'blocked' | 'weak' | 'none'): PlanarGrid {
    const grid = new PlanarGrid(size, size);
    if (kind === 'blocked') {
      grid.setBlockedCenterBased(0, 0);
    } else if (kind === 'weak') {
      grid.setWeaklyBlockedCenterBased(0, 0);
    }
    return grid;
  }

  it('finds blocked cells that meet at the given offset', () => {
    const grid = new PlanarGrid(5, 5);
    grid.setBlockedCenterBased(1, 0);
    const other = centerCell(3, 'blocked');
    expect(grid.intersectsWithCenterBased(other, 1, 0)).toBe(true);
    expect(grid.intersectsWithCenterBased(other, 0, 0)).toBe(false);
  });

  it('lets weakly blocked cells overlap each other', () => {
    expect(centerCell(5, 'weak').intersectsWithCenterBased(centerCell(3, 'weak'), 0, 0)).toBe(false);
  });

  it('lets blocked cells intersect weakly blocked cells in both roles', () => {
    expect(centerCell(5, 'weak').intersectsWithCenterBased(centerCell(3, 'blocked'), 0, 0)).toBe(true);
    expect(centerCell(5, 'blocked').intersectsWithCenterBased(centerCell(3, 'weak'), 0, 0)).toBe(true);
  });

  it('ignores cells of the other grid outside this grid', () => {
    const other = centerCell(3, 'blocked');
    expect(centerCell(5, 'blocked').intersectsWithCenterBased(other, 10, 0)).toBe(false);
  });
});

describe('PlanarGrid with polyominoes', () => {
  it('intersects through the extension areas of a polyomino', () => {
    const grid = new PlanarGrid(7, 7);
    grid.setBlocked(3, 0);
    const bare = new Polyomino(2, 2);
    expect(grid.intersectsWithCenterBased(bare, 0, 0)).toBe(false);
    const extended = new Polyomino(2, 2, [new UniqueTriple(Direction.NORTH, 0, 1)]);
    // leftX = 3 - 0 + 0, topY = 3: area x 3..4, y 0..2 contains the blocked cell (3, 0)
    expect(grid.intersectsWithCenterBased(extended, 0, 0)).toBe(true);
  });

  it.each([
    // 7x7 grid (center 3), 2x2 polyomino (center 0): leftX = 3 + xOffset, topY = 3 + yOffset
    // EAST: x rightX..6, y topY..topY+1; SOUTH: x leftX..leftX+1, y bottomY..6;
    // WEST: x 0..leftX-1, y topY..topY+1
    [Direction.EAST, -3, -3, 5, 1],
    [Direction.SOUTH, -3, -3, 1, 5],
    [Direction.WEST, -1, -3, 1, 1],
  ] as const)('checks the %s extension area', (dir, xOffset, yOffset, bx, by) => {
    const grid = new PlanarGrid(7, 7);
    grid.setBlocked(bx, by);
    const poly = new Polyomino(2, 2, [new UniqueTriple(dir, 0, 1)]);
    expect(grid.intersectsWithCenterBased(poly, xOffset, yOffset)).toBe(true);
    expect(new PlanarGrid(7, 7).intersectsWithCenterBased(poly, xOffset, yOffset)).toBe(false);
  });

  it('propagates the out of bounds error of an extension area', () => {
    const poly = new Polyomino(2, 2, [new UniqueTriple(Direction.NORTH, 0, 40)]);
    expect(() => new PlanarGrid(7, 7).intersectsWithCenterBased(poly, 0, 0)).toThrow(IndexOutOfBoundsException);
  });

  it('adds blocked and weakly blocked cells, sets the position and weakly blocks the extensions', () => {
    const grid = new PlanarGrid(7, 7);
    const poly = new Polyomino(2, 2, [new UniqueTriple(Direction.NORTH, 0, 1), new UniqueTriple(Direction.EAST, 0, 1)]);
    poly.setBlocked(0, 0);
    poly.setBlocked(1, 1);
    poly.setWeaklyBlocked(1, 0);
    grid.addFilledCellsFrom(poly, 1, 1);
    // cell (x, y) of the polyomino lands on (x + 4, y + 4); position = 3 - 0 + 1
    expect([poly.getX(), poly.getY()]).toEqual([4, 4]);
    expect(grid.isBlocked(4, 4)).toBe(true);
    expect(grid.isBlocked(5, 5)).toBe(true);
    expect(grid.isWeaklyBlocked(5, 4)).toBe(true);
    expect(grid.isEmpty(4, 5)).toBe(true);
    // NORTH: x 4..5, y 0..3; EAST: x 6..6, y 4..5
    for (const [x, y] of [
      [4, 0],
      [5, 3],
      [6, 4],
      [6, 5],
    ] as const) {
      expect(grid.isWeaklyBlocked(x, y)).toBe(true);
    }
    expect(grid.isEmpty(6, 6)).toBe(true);
  });

  it('weakly blocks the SOUTH and WEST extension areas', () => {
    const grid = new PlanarGrid(7, 7);
    const poly = new Polyomino(2, 2, [new UniqueTriple(Direction.SOUTH, 0, 0), new UniqueTriple(Direction.WEST, 1, 1)]);
    grid.addFilledCellsFrom(poly, -2, -2);
    // position (3 - 0 - 2) = (1, 1); SOUTH: x 1..1, y 3..6; WEST: x 0..0, y 2..2
    for (const y of [3, 4, 5, 6]) {
      expect(grid.isWeaklyBlocked(1, y)).toBe(true);
    }
    expect(grid.isWeaklyBlocked(0, 2)).toBe(true);
    expect(grid.isEmpty(0, 1)).toBe(true);
  });

  it('applies the priorities blocked > weakly blocked > empty in both directions', () => {
    const grid = new PlanarGrid(5, 5);
    grid.setBlockedCenterBased(0, 0);
    grid.setWeaklyBlockedCenterBased(1, 0);
    const other = new PlanarGrid(3, 3);
    other.setWeaklyBlockedCenterBased(0, 0);
    other.setBlockedCenterBased(1, 0);
    other.setBlockedCenterBased(0, 1);
    grid.addFilledCellsFrom(other, 0, 0);
    // weakly blocked does not overwrite blocked
    expect(grid.isBlockedCenterBased(0, 0)).toBe(true);
    // blocked does not overwrite weakly blocked (Java tests isWeaklyBlocked before setBlocked)
    expect(grid.isWeaklyBlockedCenterBased(1, 0)).toBe(true);
    // blocked fills an empty cell
    expect(grid.isBlockedCenterBased(0, 1)).toBe(true);
  });

  it('throws when the other grid does not fit', () => {
    const grid = new PlanarGrid(1, 1);
    const other = new PlanarGrid(3, 3);
    other.setBlockedCenterBased(-1, -1);
    expect(() => grid.addFilledCellsFrom(other, 0, 0)).toThrow(
      new IndexOutOfBoundsException(
        'Grid is only of size 1*1. Requested point (-1, -1) is out of bounds.' +
          ' Given center based coordinates were (-1, -1).',
      ),
    );
  });
});

describe('PlanarGrid area operations and bounds', () => {
  it('bounds the blocked cells', () => {
    const grid = new PlanarGrid(4, 4);
    grid.setBlocked(1, 2);
    grid.setBlocked(3, 0);
    grid.setWeaklyBlocked(0, 3);
    const bounds = grid.getFilledBounds();
    expect([bounds.getFirst(), bounds.getSecond(), bounds.getThird(), bounds.getFourth()]).toEqual([1, 0, 3, 3]);
  });

  it('returns the wrapped int arithmetic of an empty grid (MAX/MIN seeds)', () => {
    const bounds = new PlanarGrid(4, 4).getFilledBounds();
    // width = MIN - MAX + 1 wraps to 1, plus 1
    expect([bounds.getFirst(), bounds.getSecond(), bounds.getThird(), bounds.getFourth()]).toEqual([
      INT_MAX,
      INT_MAX,
      2,
      2,
    ]);
  });

  it('weakly blocks an area without overwriting blocked cells', () => {
    const grid = new PlanarGrid(5, 5);
    grid.setBlocked(2, 2);
    grid.weaklyBlockArea(1, 1, 3, 2);
    expect(grid.isBlocked(2, 2)).toBe(true);
    expect(grid.isWeaklyBlocked(1, 1)).toBe(true);
    expect(grid.isWeaklyBlocked(3, 2)).toBe(true);
    expect(grid.isEmpty(1, 3)).toBe(true);
    expect(grid.isEmpty(4, 1)).toBe(true);
  });

  it('weakly blocking an empty range changes nothing, an out of range cell throws', () => {
    const grid = new PlanarGrid(5, 5);
    grid.weaklyBlockArea(3, 3, 2, 2);
    expect(grid.isEmpty(3, 3)).toBe(true);
    expect(grid.isEmpty(2, 2)).toBe(true);
    expect(() => grid.weaklyBlockArea(0, 0, 0, 5)).toThrow(IndexOutOfBoundsException);
  });

  it('tests an area for blocked cells (weakly blocked cells do not count)', () => {
    const grid = new PlanarGrid(5, 5);
    grid.setWeaklyBlocked(1, 1);
    expect(grid.weaklyIntersectsArea(0, 0, 4, 4)).toBe(false);
    grid.setBlocked(3, 2);
    expect(grid.weaklyIntersectsArea(0, 0, 4, 4)).toBe(true);
    expect(grid.weaklyIntersectsArea(0, 0, 2, 4)).toBe(false);
    expect(() => grid.weaklyIntersectsArea(0, 0, 0, 5)).toThrow(IndexOutOfBoundsException);
  });
});
