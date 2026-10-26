// SPDX-License-Identifier: EPL-2.0
import type { Cell } from './Cell.js';
import { ContainerArea } from './ContainerArea.js';
import { ContainerCell } from './ContainerCell.js';
import { StripContainerCellStrip } from './StripContainerCellStrip.js';

/**
 * Java's `DoubleStream.max().orElse(0)`: the largest value, or zero if there is none.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/StripContainerCell.java
 */
function maxOrElseZero(values: readonly number[]): number {
  let result = 0;
  let first = true;
  for (const value of values) {
    result = first ? value : Math.max(result, value);
    first = false;
  }
  return result;
}

/**
 * A container cell that lays its children out along a strip. The strip can be horizontal (in which case the children
 * can be interpreted as columns) or vertical (in which case the children can be interpreted as rows). A strip
 * container will always make its outer cells the larger of their minimum sizes and left/right- or top/bottom-align
 * them. Whatever remains of its content area after that will be given to the center cell, but the center cell will
 * always be at least its minimum size, even if that causes it to overlap with the outer cells.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/StripContainerCell.java
 */
export class StripContainerCell extends ContainerCell {
  /** Whether we lay children out in rows or columns. */
  readonly #containerMode: StripContainerCellStrip;
  /** Whether the outer cells should be the same width or height. */
  readonly #symmetrical: boolean;
  /** A container cell can include gaps between its children when calculating its preferred size. */
  readonly #gap: number;
  /** A container cell consists of a number of cells that make up its content. */
  readonly #cells: (Cell | null)[] = ContainerArea.values().map(() => null);

  /**
   * Creates a new instance with the given settings.
   *
   * @param mode whether to lay out children as rows or as columns.
   * @param symmetrical whether the outer columns should be the same width and the outer rows be the same height.
   * @param gap the gap inserted between each pair of consecutive cells.
   */
  constructor(mode: StripContainerCellStrip, symmetrical: boolean, gap: number) {
    super();
    this.#containerMode = mode;
    this.#symmetrical = symmetrical;
    this.#gap = gap;
  }

  /** Whether this container lays out its children as rows or as columns. */
  getContainerMode(): StripContainerCellStrip {
    return this.#containerMode;
  }

  /** Returns the gap inserted between each pair of consecutive children. */
  getGap(): number {
    return this.#gap;
  }

  /**
   * Returns the cell placed at the container's given area.
   *
   * @param area the area whose cell to retrieve.
   * @returns the cell, which may be `null`.
   */
  getCell(area: ContainerArea): Cell | null {
    return this.#cells[area.ordinal()] ?? null;
  }

  /**
   * Sets the cell in the container's given area.
   *
   * @param area the container's area.
   * @param cell the new cell to be placed in the area.
   */
  setCell(area: ContainerArea, cell: Cell | null): void {
    this.#cells[area.ordinal()] = cell;
  }

  override getMinimumWidth(): number {
    let width = 0;

    if (this.#containerMode === StripContainerCellStrip.VERTICAL) {
      // Take the maximum of the child cells
      width = maxOrElseZero(
        this.#contributingCells((cell) => cell.isContributingToMinimumWidth()).map((cell) => cell.getMinimumWidth()),
      );
    } else {
      // Minimum widths of the different cells
      const cellWidths = this.#minCellWidths(true);

      // Keep track of how many cells we have
      let activeCells = 0;
      for (const cellWidth of cellWidths) {
        if (cellWidth > 0) {
          width += cellWidth;
          activeCells++;
        }
      }

      // If there is more than a single cell, add necessary gaps
      if (activeCells > 1) {
        width += this.#gap * (activeCells - 1);
      }
    }

    // If we don't have cells, we don't have width
    return width > 0 ? width + this.getPadding().left + this.getPadding().right : 0;
  }

  override getMinimumHeight(): number {
    let height = 0;

    if (this.#containerMode === StripContainerCellStrip.VERTICAL) {
      // Minimum heights of the different cells
      const cellHeights = this.#minCellHeights(true);

      // Keep track of how many cells we have
      let activeCells = 0;
      for (const cellHeight of cellHeights) {
        if (cellHeight > 0) {
          height += cellHeight;
          activeCells++;
        }
      }

      // If there is more than a single cell, add necessary gaps
      if (activeCells > 1) {
        height += this.#gap * (activeCells - 1);
      }
    } else {
      // Take the maximum of the child cells
      height = maxOrElseZero(
        this.#contributingCells((cell) => cell.isContributingToMinimumHeight()).map((cell) => cell.getMinimumHeight()),
      );
    }

    // If we don't have cells, we don't have height
    return height > 0 ? height + this.getPadding().top + this.getPadding().bottom : 0;
  }

  override layoutChildrenHorizontally(): void {
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();

    if (this.#containerMode === StripContainerCellStrip.VERTICAL) {
      // Each child cell begins at our left border (plus padding) and is as large as our content area
      const xPos = cellRectangle.x + cellPadding.left;
      const width = cellRectangle.width - cellPadding.left - cellPadding.right;

      for (const childCell of this.#cells) {
        this.applyHorizontalLayout(childCell, xPos, width);
      }
    } else {
      this.#layoutColumns(this.#minCellWidths(false));
    }

    // Layout container cells recursively
    for (const childCell of this.#cells) {
      if (childCell instanceof ContainerCell) {
        childCell.layoutChildrenHorizontally();
      }
    }
  }

  override layoutChildrenVertically(): void {
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();

    if (this.#containerMode === StripContainerCellStrip.VERTICAL) {
      this.#layoutRows(this.#minCellHeights(false));
    } else {
      // Each child cell begins at our top border (plus padding) and is as large as our content area
      const yPos = cellRectangle.y + cellPadding.top;
      const height = cellRectangle.height - cellPadding.top - cellPadding.bottom;

      for (const childCell of this.#cells) {
        this.applyVerticalLayout(childCell, yPos, height);
      }
    }

    // Layout container cells recursively
    for (const childCell of this.#cells) {
      if (childCell instanceof ContainerCell) {
        childCell.layoutChildrenVertically();
      }
    }
  }

  /**
   * The `else` arm of Java's `layoutChildrenHorizontally()`, split out to respect the function size limit.
   */
  #layoutColumns(cellWidths: number[]): void {
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();

    // Left cell is left-aligned with our content area, right cell is right-aligned
    this.applyHorizontalLayout(this.#cells[0] ?? null, cellRectangle.x + cellPadding.left, cellWidths[0]!);
    this.applyHorizontalLayout(
      this.#cells[2] ?? null,
      cellRectangle.x + cellRectangle.width - cellPadding.right - cellWidths[2]!,
      cellWidths[2]!,
    );

    // Size of the content area and size of the available space in the content area
    let freeContentAreaWidth = cellRectangle.width - cellPadding.left - cellPadding.right;
    if (cellWidths[0]! > 0) {
      freeContentAreaWidth -= cellWidths[0]! + this.#gap;
      // We add the gap here because that will spare us to check if cellWidths[0] is zero later on
      cellWidths[0]! += this.#gap;
    }
    if (cellWidths[2]! > 0) {
      freeContentAreaWidth -= cellWidths[2]! + this.#gap;
    }

    // If the available space is larger than the current size of the center cell, enlarge that thing
    cellWidths[1] = Math.max(cellWidths[1]!, freeContentAreaWidth);

    // Place the center cell, possibly enlarging it in the process
    this.applyHorizontalLayout(
      this.#cells[1] ?? null,
      cellRectangle.x + cellPadding.left + cellWidths[0]! - (cellWidths[1] - freeContentAreaWidth) / 2,
      cellWidths[1],
    );
  }

  /**
   * The `if` arm of Java's `layoutChildrenVertically()`, split out to respect the function size limit.
   */
  #layoutRows(cellHeights: number[]): void {
    const cellRectangle = this.getCellRectangle();
    const cellPadding = this.getPadding();

    // Top cell is top-aligned with our content area, bottom cell is bottom-aligned
    this.applyVerticalLayout(this.#cells[0] ?? null, cellRectangle.y + cellPadding.top, cellHeights[0]!);
    this.applyVerticalLayout(
      this.#cells[2] ?? null,
      cellRectangle.y + cellRectangle.height - cellPadding.bottom - cellHeights[2]!,
      cellHeights[2]!,
    );

    // Size of the content area and size of the available space in the content area
    const contentAreaHeight = cellRectangle.height - cellPadding.top - cellPadding.bottom;
    let contentAreaFreeHeight = contentAreaHeight;
    if (cellHeights[0]! > 0) {
      // We add the gap here because that will spare us to check if cellHeights[0] is zero later on
      cellHeights[0]! += this.#gap;
      contentAreaFreeHeight -= cellHeights[0]!;
    }
    if (cellHeights[2]! > 0) {
      contentAreaFreeHeight -= cellHeights[2]! + this.#gap;
    }

    // If the available space is larger than the current size of the center cell, enlarge that thing
    cellHeights[1] = Math.max(cellHeights[1]!, contentAreaFreeHeight);

    // Place the center cell, possibly enlarging it in the process
    this.applyVerticalLayout(
      this.#cells[1] ?? null,
      cellRectangle.y + cellPadding.top + cellHeights[0]! - (cellHeights[1] - contentAreaFreeHeight) / 2,
      cellHeights[1],
    );
  }

  /** The non-null cells passing the given contribution test (Java: the stream `filter` of the min size methods). */
  #contributingCells(contributes: (cell: Cell) => boolean): Cell[] {
    const result: Cell[] = [];
    for (const cell of this.#cells) {
      if (cell !== null && contributes(cell)) {
        result.push(cell);
      }
    }
    return result;
  }

  /** Returns an array containing the width of each cell, with symmetry applied if activated. */
  #minCellWidths(respectContributionFlag: boolean): number[] {
    const cellWidths = [
      ContainerCell.minWidthOfCell(this.#cells[0] ?? null, respectContributionFlag),
      ContainerCell.minWidthOfCell(this.#cells[1] ?? null, respectContributionFlag),
      ContainerCell.minWidthOfCell(this.#cells[2] ?? null, respectContributionFlag),
    ];

    // If we are to be symmetrical, the outer cells need to be the same size
    if (this.#symmetrical) {
      cellWidths[0] = Math.max(cellWidths[0]!, cellWidths[2]!);
      cellWidths[2] = cellWidths[0];
    }

    return cellWidths;
  }

  /** Returns an array containing the height of each cell, with symmetry applied if activated. */
  #minCellHeights(respectContributionFlag: boolean): number[] {
    const cellHeights = [
      ContainerCell.minHeightOfCell(this.#cells[0] ?? null, respectContributionFlag),
      ContainerCell.minHeightOfCell(this.#cells[1] ?? null, respectContributionFlag),
      ContainerCell.minHeightOfCell(this.#cells[2] ?? null, respectContributionFlag),
    ];

    // If we are to be symmetrical, the outer cells need to be the same size
    if (this.#symmetrical) {
      cellHeights[0] = Math.max(cellHeights[0]!, cellHeights[2]!);
      cellHeights[2] = cellHeights[0];
    }

    return cellHeights;
  }
}
