// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { MAX_VALUE, MIN_VALUE } from '../../../../java/lang/JavaInteger.js';
import { Quadruple } from '../../../../core/util/Quadruple.js';
import type { UniqueTriple } from '../../utils/UniqueTriple.js';
import { Direction } from './Direction.js';
import type { Polyomino } from './Polyomino.js';
import { TwoBitGrid } from './TwoBitGrid.js';

/**
 * Runtime stand-in for Java's static overload choice `(Polyomino, int, int)`. `Polyomino` extends `PlanarGrid`, so
 * `PlanarGrid` cannot import it as a value (ESM cycle); the type guard checks for the member only `Polyomino` adds.
 */
function isPolyomino(grid: PlanarGrid): grid is Polyomino {
  return typeof (grid as Partial<Polyomino>).getPolyominoExtensions === 'function';
}

/**
 * Binary grid structure with some extra operations, like addressing coordinates of the grid relative to its center,
 * testing for intersections with other planar grids and adding filled cells from other planar grids.
 *
 * The Java no-argument constructor (package-private, `super(0, 0)`) is the default of both parameters.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/PlanarGrid.java
 */
export class PlanarGrid extends TwoBitGrid {
  /** Indicates the x-coordinate of the center of the grid (if the center is not integral, value is truncated). */
  private xCenter: number;
  /** Indicates the y-coordinate of the center of the grid (if the center is not integral, value is truncated). */
  private yCenter: number;

  /** Constructs a planar grid of size width * height. Computes the center coordinates of this grid. */
  constructor(width = 0, height = 0) {
    super(width, height);
    this.xCenter = Int32.shr(Int32.sub(width, 1), 1);
    this.yCenter = Int32.shr(Int32.sub(height, 1), 1);
  }

  /** The Java `catch (IndexOutOfBoundsException e)` clause of the center based accessors. */
  private static centerBasedFailure(e: unknown, x: number, y: number): unknown {
    if (e instanceof IndexOutOfBoundsException) {
      return new IndexOutOfBoundsException(`${e.message} Given center based coordinates were (${x}, ${y}).`);
    }
    return e;
  }

  /** Returns whether a given cell is empty or not. Coordinates are given relative to the center of the grid. */
  isEmptyCenterBased(x: number, y: number): boolean {
    try {
      return this.isEmpty(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }

  /** Returns whether a given cell is blocked or not. Coordinates are given relative to the center of the grid. */
  isBlockedCenterBased(x: number, y: number): boolean {
    try {
      return this.isBlocked(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }

  /** Returns whether a given cell is weakly blocked or not. Coordinates are given relative to the center. */
  isWeaklyBlockedCenterBased(x: number, y: number): boolean {
    try {
      return this.isWeaklyBlocked(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }

  /** Returns whether given point (x,y) is inside the grid. Coordinates are given relative to the center. */
  inBoundsCenterBased(x: number, y: number): boolean {
    let xt = x;
    let yt = y;
    xt = Int32.add(xt, this.xCenter);
    yt = Int32.add(yt, this.yCenter);
    return this.inBounds(xt, yt);
  }

  /**
   * Tests whether the filled cells of two grids intersect with which each other, whereby the center of both grids are
   * placed upon each other (unless there is an offset). Weakly blocked cells are allowed to overlap each other
   * without being determined intersected, but blocked cells intersect with weakly blocked cells.
   *
   * Java declares two overloads, `<G extends PlanarGrid>(G, int, int)` and `(Polyomino, int, int)`; both are
   * this method, dispatched on {@link isPolyomino} (translation rule 6.5).
   */
  intersectsWithCenterBased(other: PlanarGrid, xOffset: number, yOffset: number): boolean {
    if (isPolyomino(other)) {
      return this.intersectsWithCenterBasedPolyomino(other, xOffset, yOffset);
    }
    return this.intersectsWithCenterBasedGrid(other, xOffset, yOffset);
  }

  /** The `<G extends PlanarGrid>` overload of `intersectsWithCenterBased`. */
  private intersectsWithCenterBasedGrid(other: PlanarGrid, xOffset: number, yOffset: number): boolean {
    for (let x = 0; x < other.getWidth(); x++) {
      const xTranslated = Int32.add(Int32.sub(x, other.getCenterX()), xOffset);
      for (let y = 0; y < other.getHeight(); y++) {
        const yTranslated = Int32.add(Int32.sub(y, other.getCenterY()), yOffset);
        if (
          this.inBoundsCenterBased(xTranslated, yTranslated) &&
          ((!other.isEmpty(x, y) && this.isBlockedCenterBased(xTranslated, yTranslated)) ||
            (other.isBlocked(x, y) && !this.isEmptyCenterBased(xTranslated, yTranslated)))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /** The `Polyomino` overload of `intersectsWithCenterBased`. */
  private intersectsWithCenterBasedPolyomino(other: Polyomino, xOffset: number, yOffset: number): boolean {
    if (this.intersectsWithCenterBasedGrid(other, xOffset, yOffset)) {
      return true;
    }
    for (const ext of other.getPolyominoExtensions()) {
      if (this.extensionIntersects(ext, other, xOffset, yOffset)) {
        return true;
      }
    }
    return false;
  }

  /** The body of the extension loop of the `Polyomino` overload of `intersectsWithCenterBased`. */
  private extensionIntersects(
    ext: UniqueTriple<Direction, number, number>,
    other: Polyomino,
    xOffset: number,
    yOffset: number,
  ): boolean {
    // Some transformations of the coordinates, as center based coordinates aren't that practical for
    // checking the extensions
    const leftX = Int32.add(Int32.sub(this.getCenterX(), other.getCenterX()), xOffset);
    const rightX = Int32.add(leftX, other.getWidth());
    const topY = Int32.add(Int32.sub(this.getCenterY(), other.getCenterY()), yOffset);
    const bottomY = Int32.add(topY, other.getHeight());
    const second = ext.getSecond();
    const third = ext.getThird();
    const lastX = Int32.sub(this.getWidth(), 1);
    const lastY = Int32.sub(this.getHeight(), 1);

    switch (ext.getFirst()) {
      case Direction.NORTH:
        return this.weaklyIntersectsArea(Int32.add(leftX, second), 0, Int32.add(leftX, third), Int32.sub(topY, 1));
      case Direction.EAST:
        return this.weaklyIntersectsArea(rightX, Int32.add(topY, second), lastX, Int32.add(topY, third));
      case Direction.SOUTH:
        return this.weaklyIntersectsArea(Int32.add(leftX, second), bottomY, Int32.add(leftX, third), lastY);
      default: // WEST
        return this.weaklyIntersectsArea(0, Int32.add(topY, second), Int32.sub(leftX, 1), Int32.add(topY, third));
    }
  }

  /**
   * Adds blocked and weakly blocked cells from another grid to this one, whereby the center of both grids are placed
   * upon each other (unless there is an offset). Existing blocked cells won't be overwritten. For a {@link Polyomino}
   * argument, additionally sets its upper left corner coordinates relative to the upper left corner of this grid and
   * weakly blocks the areas of its extensions.
   *
   * Java declares two overloads, `<G extends PlanarGrid>(G, int, int)` and `(Polyomino, int, int)`; both are
   * this method, dispatched on {@link isPolyomino} (translation rule 6.5).
   *
   * @throws IndexOutOfBoundsException not all cells of other fit into this grid (considering the given offset).
   */
  addFilledCellsFrom(other: PlanarGrid, xOffset: number, yOffset: number): void {
    if (isPolyomino(other)) {
      this.addFilledCellsFromPolyomino(other, xOffset, yOffset);
    } else {
      this.addFilledCellsFromGrid(other, xOffset, yOffset);
    }
  }

  /** The `<G extends PlanarGrid>` overload of `addFilledCellsFrom`. */
  private addFilledCellsFromGrid(other: PlanarGrid, xOffset: number, yOffset: number): void {
    for (let x = 0; x < other.getWidth(); x++) {
      const xTranslated = Int32.add(Int32.sub(x, other.getCenterX()), xOffset);
      for (let y = 0; y < other.getHeight(); y++) {
        const yTranslated = Int32.add(Int32.sub(y, other.getCenterY()), yOffset);
        if (other.isBlocked(x, y)) {
          if (!this.isWeaklyBlockedCenterBased(xTranslated, yTranslated)) {
            // Might throw exception.
            this.setBlockedCenterBased(xTranslated, yTranslated);
          }
        } else if (other.isWeaklyBlocked(x, y)) {
          // (priorities for overwriting: blocked > weakly_blocked > empty)
          // Might throw exception.
          if (!this.isBlockedCenterBased(xTranslated, yTranslated)) {
            this.setWeaklyBlockedCenterBased(xTranslated, yTranslated);
          }
        }
      }
    }
  }

  /** The `Polyomino` overload of `addFilledCellsFrom`. */
  private addFilledCellsFromPolyomino(other: Polyomino, xOffset: number, yOffset: number): void {
    // Might throw exception.
    this.addFilledCellsFromGrid(other, xOffset, yOffset);
    other.setX(Int32.add(Int32.sub(this.xCenter, other.getCenterX()), xOffset));
    other.setY(Int32.add(Int32.sub(this.yCenter, other.getCenterY()), yOffset));

    for (const ext of other.getPolyominoExtensions()) {
      this.weaklyBlockExtension(ext, other);
    }
  }

  /** The body of the extension loop of the `Polyomino` overload of `addFilledCellsFrom`. */
  private weaklyBlockExtension(ext: UniqueTriple<Direction, number, number>, other: Polyomino): void {
    const x = other.getX();
    const y = other.getY();
    const second = ext.getSecond();
    const third = ext.getThird();

    switch (ext.getFirst()) {
      case Direction.NORTH:
        this.weaklyBlockArea(Int32.add(x, second), 0, Int32.add(x, third), Int32.sub(y, 1));
        break;
      case Direction.EAST:
        this.weaklyBlockArea(
          Int32.add(x, other.getWidth()),
          Int32.add(y, second),
          Int32.sub(this.getWidth(), 1),
          Int32.add(y, third),
        );
        break;
      case Direction.SOUTH:
        this.weaklyBlockArea(
          Int32.add(x, second),
          Int32.add(y, other.getHeight()),
          Int32.add(x, third),
          Int32.sub(this.getHeight(), 1),
        );
        break;
      default: // WEST
        this.weaklyBlockArea(0, Int32.add(y, second), Int32.sub(x, 1), Int32.add(y, third));
    }
  }

  /**
   * Gets the bounds of the rectangle bounding the filled cells of this grid.
   *
   * @returns (x, y, width, height) of the bounding rectangle. (x, y) is the position of the upper left corner of the
   *     rectangle relative to the upper left corner of this grid.
   */
  getFilledBounds(): Quadruple<number, number, number, number> {
    const gridWidth = this.getWidth();
    const gridHeight = this.getHeight();
    let minX = MAX_VALUE;
    let maxX = MIN_VALUE;
    let minY = MAX_VALUE;
    let maxY = MIN_VALUE;
    for (let xi = 0; xi < gridWidth; ++xi) {
      for (let yi = 0; yi < gridHeight; ++yi) {
        if (this.isBlocked(xi, yi)) {
          minX = Math.min(minX, xi);
          maxX = Math.max(maxX, xi);
          minY = Math.min(minY, yi);
          maxY = Math.max(maxY, yi);
        }
      }
    }
    const width = Int32.add(Int32.sub(maxX, minX), 1);
    const height = Int32.add(Int32.sub(maxY, minY), 1);

    return new Quadruple<number, number, number, number>(minX, minY, width, height);
  }

  /**
   * Weakly blocks all cells in a given rectangular area given in coordinates with the upper left corner as origin,
   * doesn't overwrite blocked cells.
   *
   * @throws IndexOutOfBoundsException One of given corner points is out of bounds.
   */
  weaklyBlockArea(xUpperLeft: number, yUpperleft: number, xBottomRight: number, yBottomRight: number): void {
    for (let yi = yUpperleft; yi <= yBottomRight; yi++) {
      for (let xi = xUpperLeft; xi <= xBottomRight; xi++) {
        if (!this.isBlocked(xi, yi)) {
          // Might throw IndexOutOfBoundsException
          this.setWeaklyBlocked(xi, yi);
        }
      }
    }
  }

  /**
   * Returns whether a given rectangular area given in coordinates with the upper left corner as origin contains at
   * least one blocked cell.
   *
   * @throws IndexOutOfBoundsException One of given corner points is out of bounds.
   */
  weaklyIntersectsArea(xUpperLeft: number, yUpperleft: number, xBottomRight: number, yBottomRight: number): boolean {
    for (let yi = yUpperleft; yi <= yBottomRight; yi++) {
      for (let xi = xUpperLeft; xi <= xBottomRight; xi++) {
        // Might throw IndexOutOfBoundsException
        if (this.isBlocked(xi, yi)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Gets the x-coordinate of the (truncated) center of this grid. */
  getCenterX(): number {
    return this.xCenter;
  }

  /** Gets the y-coordinate of the (truncated) center of this grid. */
  getCenterY(): number {
    return this.yCenter;
  }

  override reinitialize(width: number, height: number): void {
    super.reinitialize(width, height);
    this.xCenter = Int32.shr(Int32.sub(width, 1), 1);
    this.yCenter = Int32.shr(Int32.sub(height, 1), 1);
  }

  /** Blocks the cell at position (x,y). Coordinates are given relative to the center of the grid. */
  setBlockedCenterBased(x: number, y: number): void {
    try {
      this.setBlocked(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }

  /** Empties the cell at position (x,y). Coordinates are given relative to the center of the grid. */
  setEmptyCenterBased(x: number, y: number): void {
    try {
      this.setEmpty(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }

  /** Weakly blocks the cell at position (x,y). Coordinates are given relative to the center of the grid. */
  setWeaklyBlockedCenterBased(x: number, y: number): void {
    try {
      this.setWeaklyBlocked(Int32.add(x, this.xCenter), Int32.add(y, this.yCenter));
    } catch (e) {
      throw PlanarGrid.centerBasedFailure(e, x, y);
    }
  }
}
