// SPDX-License-Identifier: EPL-2.0
import { AtomicCell } from './AtomicCell.js';
import { Cell } from './Cell.js';

/**
 * A container cell contains other cells. How it contains them depends on the actual container cell. This abstract
 * class simply adds methods that allow clients to tell the container to lay out its children.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/ContainerCell.java
 */
export abstract class ContainerCell extends Cell {
  /** Compute x coordinates and widths of children. */
  abstract layoutChildrenHorizontally(): void;

  /** Compute y coordinates and heights of children. */
  abstract layoutChildrenVertically(): void;

  /**
   * Returns the minimum width of the given cell.
   *
   * @param cell the cell whose minimum width to return.
   * @param respectContributionFlag if `true`, zero is returned for cells that don't have the width contribution
   *            flag set.
   * @returns minimum width.
   */
  protected static minWidthOfCell(cell: Cell | null, respectContributionFlag: boolean): number {
    // If there's no cell, there's no minimum with
    if (cell === null) {
      return 0;
    }

    // If the cell doesn't have its contribution flag activated, there's no minimum width
    if (respectContributionFlag && !cell.isContributingToMinimumWidth()) {
      return 0;
    }

    // If the cell is an atomic cell with a content area of no width, there's no minimum width
    if (cell instanceof AtomicCell) {
      if (cell.getMinimumContentAreaSize().x === 0) {
        return 0;
      }
    }

    return cell.getMinimumWidth();
  }

  /**
   * Returns the minimum height of the given cell.
   *
   * @param cell the cell whose minimum height to return.
   * @param respectContributionFlag if `true`, zero is returned for cells that don't have the height contribution
   *            flag set.
   * @returns minimum height.
   */
  protected static minHeightOfCell(cell: Cell | null, respectContributionFlag: boolean): number {
    // If there's no cell, there's no minimum height
    if (cell === null) {
      return 0;
    }

    // If the cell doesn't have its contribution flag activated, there's no minimum height
    if (respectContributionFlag && !cell.isContributingToMinimumHeight()) {
      return 0;
    }

    // If the cell is an atomic cell with a content area of no height, there's no minimum height
    if (cell instanceof AtomicCell) {
      if (cell.getMinimumContentAreaSize().y === 0) {
        return 0;
      }
    }

    return cell.getMinimumHeight();
  }

  /**
   * Applies the given horizontal layout information to the given cell if it's not `null`.
   *
   * @param cell the cell to apply the layout information to.
   * @param x the cell's new x coordinate.
   * @param width the cell's new width.
   */
  protected applyHorizontalLayout(cell: Cell | null, x: number, width: number): void {
    if (cell !== null) {
      const cellRect = cell.getCellRectangle();
      cellRect.x = x;
      cellRect.width = width;
    }
  }

  /**
   * Applies the given vertical layout information to the given cell if it's not `null`.
   *
   * @param cell the cell to apply the layout information to.
   * @param y the cell's new y coordinate.
   * @param height the cell's new height.
   */
  protected applyVerticalLayout(cell: Cell | null, y: number, height: number): void {
    if (cell !== null) {
      const cellRect = cell.getCellRectangle();
      cellRect.y = y;
      cellRect.height = height;
    }
  }
}
