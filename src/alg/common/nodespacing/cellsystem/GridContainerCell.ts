// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { KVector } from '../../../../core/math/KVector.js';
import type { Cell } from './Cell.js';
import { ContainerArea } from './ContainerArea.js';
import { ContainerCell } from './ContainerCell.js';

/** Number of rows in the grid. */
const ROWS = ContainerArea.values().length;
/** Number of columns in the grid. */
const COLUMNS = ROWS;

/**
 * A container that lays out its child cells in three rows. It's basically not much more than an extension of
 * {@link StripContainerCell} into another dimension, which is as awesome as it sounds. Anyway, cells can be added to
 * the container as usual. The grid container can operate in two modes: tabular and non-tabular. Non-tabular mode works
 * similar to three {@link StripContainerCell} instances in that the columns of the three rows don't influence each
 * other in terms of their size. Tabular mode locks the columns of all rows, making them end up with the same widths.
 *
 * One special feature is that its center cell can be assigned a custom minimal size which will be used regardless of
 * the actual center cell's minimal size. This grid container can even be configured to only use that custom size as
 * its minimal size. As a final goodie, the grid allows you to retrieve the actual rectangle in the center that is not
 * overlapped by any of the outer grid cells. This may not be equal to the cell rectangle computed for the center
 * cell, which always has at least the cell's minimum size.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/GridContainerCell.java
 */
export class GridContainerCell extends ContainerCell {
  /** A container cell can include gaps between its children when calculating its preferred size. */
  readonly #gap: number;
  /** Whether the container works in tabular mode or not. */
  readonly #tabular: boolean;
  /** Whether the outer columns should be the same width and the outer rows be the same height. */
  readonly #symmetrical: boolean;
  /** A container cell consists of a table of cells that make up its content. */
  readonly #cells: (Cell | null)[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => null));
  /**
   * The center cell of the grid may have a custom minimum size (used to impose a minimum size on the node's client
   * area).
   */
  #centerCellMinimumSize: KVector | null = null;
  /**
   * Whether only the center cell contributes to the minimum size of this cell. If this is true, we actually use the
   * custom center cell minimum size instead of the center cell's actual minimum size, if set.
   */
  #onlyCenterCellContributesToMinimumSize = false;
  /** Rectangle that describes the part of the grid free of outer grid cells. May be empty. */
  readonly #centerCellRect: ElkRectangle = new ElkRectangle();

  /**
   * Creates a new instance with the given settings.
   *
   * @param tabular whether the width of columns should be locked across the three rows.
   * @param symmetrical whether the outer columns should be the same width and the outer rows be the same height.
   * @param gap the gap inserted between each pair of consecutive cells.
   */
  constructor(tabular: boolean, symmetrical: boolean, gap: number) {
    super();
    this.#tabular = tabular;
    this.#symmetrical = symmetrical;
    this.#gap = gap;
  }

  /** Returns the gap inserted between each pair of consecutive children. */
  getGap(): number {
    return this.#gap;
  }

  /**
   * Returns the cell placed at the container's given area.
   *
   * @param row the row.
   * @param col the column.
   * @returns the cell, which may be `null`.
   */
  getCell(row: ContainerArea, col: ContainerArea): Cell | null {
    return this.#at(row.ordinal(), col.ordinal());
  }

  /**
   * Sets the cell in the container's given area.
   *
   * @param row the row.
   * @param col the column.
   * @param cell the new cell to be placed in the area.
   */
  setCell(row: ContainerArea, col: ContainerArea, cell: Cell | null): void {
    this.#cells[row.ordinal()]![col.ordinal()] = cell;
  }

  /**
   * Sets the center cell's minimum size. Regardless of the actual cell in the grid's center, this minimum size
   * imposes a lower bound on the center cell size.
   */
  setCenterCellMinimumSize(minimumSize: KVector): void {
    this.#centerCellMinimumSize = new KVector(minimumSize);
  }

  /**
   * Sets whether when this container is queried for its minimum size, only the center cell will be included in the
   * calculations. If the center cell has a minimum size set and this mode is active, that minimum size will be used
   * regardless of the actual center cell.
   */
  setOnlyCenterCellContributesToMinimumSize(contribution: boolean): void {
    this.#onlyCenterCellContributesToMinimumSize = contribution;
  }

  /**
   * Returns a rectangle that describes the space left free by the outer rows and columns. May well be an empty
   * rectangle. The rectangle's information have only been computed once both {@link layoutChildrenHorizontally} and
   * {@link layoutChildrenVertically} have been called.
   */
  getCenterCellRectangle(): ElkRectangle {
    return new ElkRectangle(this.#centerCellRect);
  }

  override getMinimumWidth(): number {
    let width = 0;

    if (this.#onlyCenterCellContributesToMinimumSize) {
      // Check if an explicit minimum size for the center cell was set
      const centerCell = this.#at(1, 1);
      if (this.#centerCellMinimumSize !== null) {
        width = this.#centerCellMinimumSize.x;
      } else if (centerCell !== null) {
        width = centerCell.getMinimumWidth();
      }
    } else if (this.#tabular) {
      // Use aggregated widths
      width = this.#sumWithGaps(this.#minColumnWidths(null, true));
    } else {
      // Use maximum width over each row
      for (const area of ContainerArea.values()) {
        width = Math.max(width, this.#sumWithGaps(this.#minColumnWidths(area, true)));
      }
    }

    // If we don't have cells, we don't have width
    return width > 0 ? width + this.getPadding().left + this.getPadding().right : 0;
  }

  override getMinimumHeight(): number {
    let height = 0;

    if (this.#onlyCenterCellContributesToMinimumSize) {
      // Check if an explicit minimum size for the center cell was set
      const centerCell = this.#at(1, 1);
      if (this.#centerCellMinimumSize !== null) {
        height = this.#centerCellMinimumSize.y;
      } else if (centerCell !== null) {
        height = centerCell.getMinimumHeight();
      }
    } else {
      // Minimum height of the different rows (this is independent of whether we are in tabular mode or not)
      height = this.#sumWithGaps(this.#minRowHeights(true));
    }

    // If we don't have cells, we don't have height
    return height > 0 ? height + this.getPadding().top + this.getPadding().bottom : 0;
  }

  override layoutChildrenHorizontally(): void {
    // How we're going to do this depends on whether we're in tabular mode or not. If so, the column widths across
    // all rows are locked
    if (this.#tabular) {
      const colWidths = this.#minColumnWidths(null, false);
      for (const row of ContainerArea.values()) {
        this.#applyWidthsToRow(row, colWidths);
      }
    } else {
      for (const row of ContainerArea.values()) {
        const colWidths = this.#minColumnWidths(row, false);
        this.#applyWidthsToRow(row, colWidths);
      }
    }
  }

  override layoutChildrenVertically(): void {
    // Note that the code in this method does not depend on whether we're in tabular mode or not, that's why it
    // looks significantly different from its horizontal counterpart
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();
    const rowHeights = this.#minRowHeights(false);

    // Top row is top-aligned with our content area, bottom row is bottom-aligned
    this.#applyHeightToRow(ContainerArea.BEGIN, cellRectangle.y + cellPadding.top, rowHeights);
    this.#applyHeightToRow(
      ContainerArea.END,
      cellRectangle.y + cellRectangle.height - cellPadding.bottom - rowHeights[2]!,
      rowHeights,
    );

    // Size of the content area and size of the available space in the content area
    let freeContentAreaHeight = cellRectangle.height - cellPadding.top - cellPadding.bottom;
    if (rowHeights[0]! > 0) {
      rowHeights[0]! += this.#gap;
      freeContentAreaHeight -= rowHeights[0]!;
    }
    if (rowHeights[2]! > 0) {
      rowHeights[2]! += this.#gap;
      freeContentAreaHeight -= rowHeights[2]!;
    }

    // Compute the center cell rectangle
    this.#centerCellRect.height = Math.max(0, freeContentAreaHeight);
    this.#centerCellRect.y =
      cellRectangle.y + cellPadding.top + (this.#centerCellRect.height - freeContentAreaHeight) / 2;

    // If the available space is larger than the current size of the center cell, enlarge that thing
    rowHeights[1] = Math.max(rowHeights[1]!, freeContentAreaHeight);

    // Place the center cell, possibly enlarging it in the process
    this.#applyHeightToRow(
      ContainerArea.CENTER,
      cellRectangle.y + cellPadding.top + rowHeights[0]! - (rowHeights[1] - freeContentAreaHeight) / 2,
      rowHeights,
    );
  }

  /** TS accessor for `cells[row][column]` (the checked-index access of the `3x3` table cannot be out of range). */
  #at(row: number, column: number): Cell | null {
    return this.#cells[row]?.[column] ?? null;
  }

  /**
   * Returns an array containing the width of each column for either the whole table or only a specific row. In the
   * former case, the maximum width of the respective column in each row is used. Symmetry is applied if activated.
   *
   * @param row only return the column widths of the given row. Return the aggregated width for the whole table if
   *            `row == null`.
   */
  #minColumnWidths(row: ContainerArea | null, respectContributionFlag: boolean): number[] {
    const colWidths = [
      this.#minWidthOfColumn(ContainerArea.BEGIN, row, respectContributionFlag),
      this.#minWidthOfColumn(ContainerArea.CENTER, row, respectContributionFlag),
      this.#minWidthOfColumn(ContainerArea.END, row, respectContributionFlag),
    ];

    // If we are to be symmetrical, the outer cells need to be the same size
    if (this.#symmetrical) {
      colWidths[0] = Math.max(colWidths[0]!, colWidths[2]!);
      colWidths[2] = colWidths[0];
    }

    return colWidths;
  }

  /**
   * Returns the minimum width of the given column. If `row == null`, the maximum of the minimum width of that column
   * across all rows is returned. Otherwise, we concentrate only on the column of the given row.
   */
  #minWidthOfColumn(column: ContainerArea, row: ContainerArea | null, respectContributionFlag: boolean): number {
    let maxMinWidth = 0;

    if (row === null) {
      // Aggregate values for all rows
      for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
        maxMinWidth = Math.max(
          maxMinWidth,
          ContainerCell.minWidthOfCell(this.#at(rowIndex, column.ordinal()), respectContributionFlag),
        );
      }
    } else {
      // Only concentrate on the specified row
      maxMinWidth = ContainerCell.minWidthOfCell(this.#at(row.ordinal(), column.ordinal()), respectContributionFlag);
    }

    // If this is the center column, we might have an explicit minimal width for that
    if (column === ContainerArea.CENTER && this.#centerCellMinimumSize !== null) {
      maxMinWidth = Math.max(maxMinWidth, this.#centerCellMinimumSize.x);
    }

    return maxMinWidth;
  }

  /** Returns an array containing the height of each row. Symmetry is applied if activated. */
  #minRowHeights(respectContributionFlag: boolean): number[] {
    const rowHeights = [
      this.#minHeightOfRow(ContainerArea.BEGIN, respectContributionFlag),
      this.#minHeightOfRow(ContainerArea.CENTER, respectContributionFlag),
      this.#minHeightOfRow(ContainerArea.END, respectContributionFlag),
    ];

    // If we are to be symmetrical, the outer cells need to be the same size
    if (this.#symmetrical) {
      rowHeights[0] = Math.max(rowHeights[0]!, rowHeights[2]!);
      rowHeights[2] = rowHeights[0];
    }

    return rowHeights;
  }

  /** Returns the minimum height of the given row. */
  #minHeightOfRow(row: ContainerArea, respectContributionFlag: boolean): number {
    let maxMinHeight = 0;

    for (let column = 0; column < COLUMNS; column++) {
      maxMinHeight = Math.max(
        maxMinHeight,
        ContainerCell.minHeightOfCell(this.#at(row.ordinal(), column), respectContributionFlag),
      );
    }

    // If this is the center row, we might have an explicit minimal height for that
    if (row === ContainerArea.CENTER && this.#centerCellMinimumSize !== null) {
      maxMinHeight = Math.max(maxMinHeight, this.#centerCellMinimumSize.y);
    }

    return maxMinHeight;
  }

  /** Takes an array of values and sums them up, inserting gaps between each pair of values bigger than zero. */
  #sumWithGaps(values: readonly number[]): number {
    let sum = 0;

    // Keep track of how many components > 0 we have
    let activeComponents = 0;
    for (const val of values) {
      if (val > 0) {
        sum += val;
        activeComponents++;
      }
    }

    // If there is more than a single value, add necessary gaps
    if (activeComponents > 1) {
      sum += this.#gap * (activeComponents - 1);
    }

    return sum;
  }

  /**
   * Computes horizontal coordinates for all cells in the given row, based on the given array of column widths. The
   * array can either be one computed for all rows (tabular mode) or for each row individually. If the row is the
   * center row, this method also updates the X coordinate and the width of the center cell rectangle.
   */
  #applyWidthsToRow(row: ContainerArea, colWidths: number[]): void {
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();

    // Left column is left-aligned with our content area, right column is right-aligned
    this.#applyWidthToColumn(ContainerArea.BEGIN, cellRectangle.x + cellPadding.left, colWidths);
    this.#applyWidthToColumn(
      ContainerArea.END,
      cellRectangle.x + cellRectangle.width - cellPadding.right - colWidths[2]!,
      colWidths,
    );

    // Size of the content area and size of the available space in the content area
    let freeContentAreaWidth = cellRectangle.width - cellPadding.left - cellPadding.right;
    if (colWidths[0]! > 0) {
      colWidths[0]! += this.#gap;
      freeContentAreaWidth -= colWidths[0]!;
    }
    if (colWidths[2]! > 0) {
      colWidths[2]! += this.#gap;
      freeContentAreaWidth -= colWidths[2]!;
    }

    // Compute how wide the center cell can be
    const centerWidth = Math.max(0, freeContentAreaWidth);

    // If the available space is larger than the current size of the center cell, enlarge that thing
    colWidths[1] = Math.max(colWidths[1]!, freeContentAreaWidth);

    // Place the center cell, possibly enlarging it in the process
    this.#applyWidthToColumn(
      ContainerArea.CENTER,
      cellRectangle.x + cellPadding.left + colWidths[0]! - (colWidths[1] - freeContentAreaWidth) / 2,
      colWidths,
    );

    // If this is the center row, remember the center cell's data for the center cell rectangle
    if (row === ContainerArea.CENTER) {
      this.#centerCellRect.width = centerWidth;
      this.#centerCellRect.x = cellRectangle.x + cellPadding.left + (centerWidth - freeContentAreaWidth) / 2;
    }
  }

  /** Applies the horizontal layout information to all cells in the given column. */
  #applyWidthToColumn(column: ContainerArea, x: number, colWidths: readonly number[]): void {
    for (let row = 0; row < ROWS; row++) {
      this.applyHorizontalLayout(this.#at(row, column.ordinal()), x, colWidths[column.ordinal()]!);
    }
  }

  /** Applies the vertical layout information to all cells in the given row. */
  #applyHeightToRow(row: ContainerArea, y: number, rowHeights: readonly number[]): void {
    for (let column = 0; column < COLUMNS; column++) {
      this.applyVerticalLayout(this.#at(row.ordinal(), column), y, rowHeights[row.ordinal()]!);
    }
  }
}
