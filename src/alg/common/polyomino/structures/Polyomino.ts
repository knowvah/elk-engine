// SPDX-License-Identifier: EPL-2.0
import { UniqueTriple } from '../../utils/UniqueTriple.js';
import type { Direction } from './Direction.js';
import { PlanarGrid } from './PlanarGrid.js';

/**
 * This class provides a low resolution grid for representing polyominoes.
 *
 * Java's three constructors `(width, height, extensions)`, `(width, height)` and `()` are one constructor with
 * defaults; the default extension list is a fresh list per call, as `Lists.newArrayList()` is.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/Polyomino.java
 */
export class Polyomino extends PlanarGrid {
  /**
   * If this polyomino is added to another grid structure, the coordinates of its upper left corner relative to the
   * underlying grid, are set here. This is the x-coordinate.
   */
  private x = 0;
  /** The y-coordinate counterpart of {@link x}. */
  private y = 0;

  private polyominoExtensions: UniqueTriple<Direction, number, number>[];

  /**
   * Creates an empty polyomino of a specified size. Attaches the given extensions to the boundaries of the polyomino.
   * Cells have to be manually set to blocked and weakly blocked afterwards, though.
   *
   * @param width width of the polyomino in discrete cells
   * @param height height of the polyomino in discrete cells
   * @param extensions extensions defined by a cardinal direction, a horizontal or vertical offset from the origin of
   *     the grid depending on the given direction, and the width of the extension in discrete cells.
   */
  constructor(width = 0, height = 0, extensions: UniqueTriple<Direction, number, number>[] = []) {
    super(width, height);
    this.polyominoExtensions = extensions;
  }

  /** Gets the x-coordinate of the origin of this polyomino (potentially relative to another grid). */
  getX(): number {
    return this.x;
  }

  /** Gets the y-coordinate of the origin of this polyomino (potentially relative to another grid). */
  getY(): number {
    return this.y;
  }

  /** Sets the x-coordinate of the origin of this polyomino. */
  setX(val: number): void {
    this.x = val;
  }

  /** Sets the y-coordinate of the origin of this polyomino. */
  setY(val: number): void {
    this.y = val;
  }

  /** @returns the polyominoExtensions */
  getPolyominoExtensions(): UniqueTriple<Direction, number, number>[] {
    return this.polyominoExtensions;
  }

  /**
   * Attaches the given extension to the boundaries of the polyomino.
   *
   * @param dir cardinal direction of the extension
   * @param offset a horizontal or vertical offset from the origin of the grid depending on the given direction
   * @param width the width of the extension in discrete cells
   */
  addExtension(dir: Direction, offset: number, width: number): void {
    this.polyominoExtensions.push(new UniqueTriple<Direction, number, number>(dir, offset, width));
  }
}
