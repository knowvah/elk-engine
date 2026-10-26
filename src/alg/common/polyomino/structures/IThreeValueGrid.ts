// SPDX-License-Identifier: EPL-2.0

/**
 * Interface for grids whose cells hold one of three values: empty, blocked or weakly blocked. The setters and
 * getters throw an `IndexOutOfBoundsException` for coordinates outside of the grid.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/IThreeValueGrid.java
 */
export interface IThreeValueGrid {
  /** @returns the width of the grid */
  getWidth(): number;

  /** @returns the height of the grid */
  getHeight(): number;

  /** @returns true if the cell is empty */
  isEmpty(x: number, y: number): boolean;

  /** @returns true if the cell is blocked */
  isBlocked(x: number, y: number): boolean;

  /** @returns true if the cell is weakly blocked */
  isWeaklyBlocked(x: number, y: number): boolean;

  /** @returns true if (x, y) lies inside the grid */
  inBounds(x: number, y: number): boolean;

  /** Replaces the grid by an empty one of the given size. */
  reinitialize(width: number, height: number): void;

  /** Makes the cell empty. */
  setEmpty(x: number, y: number): void;

  /** Blocks the cell. */
  setBlocked(x: number, y: number): void;

  /** Weakly blocks the cell. */
  setWeaklyBlocked(x: number, y: number): void;
}
