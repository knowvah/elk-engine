// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';

/**
 * A cell is the basic component of the cell system. Each cell has a padding, which determines the amount of space
 * between its content area and its border. It also has a minimum width and height, which is the minimum size it
 * would like to be in the final layout. {@link ContainerCell Container cells} will use that information to compute
 * their own minimum size. Whether or not a cell contributes to that is controlled through its flags, for width and
 * height separately. Finally, a cell has a rectangle which describes its actual position and size. While these
 * information can be set manually, they will often be computed by container cells.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/Cell.java
 */
export abstract class Cell {
  /** A cell has a padding. */
  readonly #padding: ElkPadding = new ElkPadding();
  /** The actual size and position of the cell. Includes the padding. */
  readonly #cellRectangle: ElkRectangle = new ElkRectangle();
  /** Whether the cell contributes to the minimum width calculation of a container cell or not. */
  #contributesToMinimumWidth = false;
  /** Whether the cell contributes to the minimum height calculation of a container cell or not. */
  #contributesToMinimumHeight = false;

  /** Returns this cell's padding, to be modified by the caller. */
  getPadding(): ElkPadding {
    return this.#padding;
  }

  /** Returns a rectangle that describes the cell's size and position, including padding, to be modified by the caller. */
  getCellRectangle(): ElkRectangle {
    return this.#cellRectangle;
  }

  /** Checks whether this cell should be included when calculating a container cell's minimum width. */
  isContributingToMinimumWidth(): boolean {
    return this.#contributesToMinimumWidth;
  }

  /** Sets whether this cell should be included when calculating a container cell's minimum width. */
  setContributesToMinimumWidth(contributesToMinimumWidth: boolean): void {
    this.#contributesToMinimumWidth = contributesToMinimumWidth;
  }

  /** Checks whether this cell should be included when calculating a container cell's minimum height. */
  isContributingToMinimumHeight(): boolean {
    return this.#contributesToMinimumHeight;
  }

  /** Sets whether this cell should be included when calculating a container cell's minimum height. */
  setContributesToMinimumHeight(contributesToMinimumHeight: boolean): void {
    this.#contributesToMinimumHeight = contributesToMinimumHeight;
  }

  /** Returns this cell's minimum width, including padding. */
  abstract getMinimumWidth(): number;

  /** Returns this cell's minimum height, including padding. */
  abstract getMinimumHeight(): number;
}
