// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { BlockRow } from './BlockRow.js';
import type { BlockStack } from './BlockStack.js';
import type { RectRow } from './RectRow.js';

/** The locals of the Java `placeRectsIn(double, boolean)` that its new-row branch shares with the loop. */
class PlacementState {
  currentX = 0;
  currentWidth = 0;
  currentHeight = 0;
  maxHeightInRow = 0;
  widthInRow = 0;
  row = 0;
  index = 0;
  constructor(public currentY: number) {}
}

/**
 * A block is a ordered set of rectangles that shall be layouted left to right; its size bounds are kept up to date on
 * add and remove of rectangles. Java overloads of `placeRectsIn`: public `(width)` / `(width, height)` stay one method; the
 * private ones are `placeRectsInBounds` / `placeRectsInFits` (translation-rules 6.5). `remove`, `contains` and
 * `removeAll` are identity (no `equals` on `ElkNode`, `BlockRow`). `spacingBefore`, `spacingIfNotFirst`,
 * `computeAverageHeight`, `placeRectsInNewRow` and `adjustRectBoundsAfterRemove` are extractions for the complexity limit.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java
 */
export class Block {
  private smallestRectWidth = Number.POSITIVE_INFINITY;
  /** Minimal width + spacing. All rectangles are in one column. */
  private minWidth = 0;
  /** Current width + spacing. This is corresponds to the maxWidth if no other value is set by the algorithm. */
  private width: number;
  /** Minimal height + spacing. All rectangles are in one row. */
  private minHeight = 0;
  /** Smallest rect height + spacing */
  private smallestRectHeight = Number.POSITIVE_INFINITY;
  /** Average block height */
  private averageHeight = 0;
  /** Maximum height + spacing. All rectangles are in one column. */
  private maxHeight = 0;
  /** Current height + spacing. This is corresponds to the minHeight if no other value is set by the algorithm. */
  private height: number;
  /** Rectangles contained in this block. */
  private readonly children: ElkNode[] = [];
  /** The rectangles in children assigned to rows. */
  private rows: BlockRow[] = [];
  /** X coordinate of this block. */
  private x: number;
  /** Y coordinate of this block. */
  private y: number;
  /** The row this block is assigned to. */
  private parentRow: RectRow;
  /** The stack the block belongs to. */
  private stack: BlockStack | null = null;
  /** Spacing between two nodes */
  private nodeNodeSpacing: number;
  /** Whether the current block has a fixed position and size. */
  private fixed = false;
  /** Whether the current block has a fixed position. */
  private positionFixed = false;

  /** Creates a new block. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  constructor(xCoord: number, yCoord: number, parentRow: RectRow, nodeNodeSpacing: number) {
    this.nodeNodeSpacing = nodeNodeSpacing;
    this.parentRow = parentRow;
    this.x = xCoord;
    this.y = yCoord;

    this.width = 0;
    this.height = 0;
  }

  /** Adds given rectangle to this stack. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  addChild(rect: ElkNode): void {
    if (this.rows.length === 0) {
      this.rows.push(new BlockRow(this.x, this.y, this.nodeNodeSpacing));
    }
    this.children.push(rect);
    this.getLastRow().addRectangle(rect);
    this.adjustSizeAdd(rect);
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  addChildInNewRow(rect: ElkNode): void {
    this.children.push(rect);
    const lastRow = this.getLastRow();
    this.rows.push(
      new BlockRow(this.x, lastRow.getY() + lastRow.getHeight() + this.nodeNodeSpacing, this.nodeNodeSpacing),
    );
    this.getLastRow().addRectangle(rect);
    this.adjustSizeAdd(rect);
  }

  /** Removes element from bottom of the abstract stack. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  removeChild(rect: ElkNode): void {
    const childAt = this.children.indexOf(rect);
    if (childAt >= 0) {
      this.children.splice(childAt, 1);
    }
    for (const row of this.rows) {
      if (row.getNodes().includes(rect)) {
        row.removeRectangle(rect, true);
        if (row.getNodes().length === 0) {
          this.rows.splice(this.rows.indexOf(row), 1);
        }
        break;
      }
    }
    this.adjustSizeAfterRemove();
  }

  /** Relocates this block by adjusting its x- and y-coordinate. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  setLocation(xCoord: number, yCoord: number): void {
    this.adjustChildrensXandY(xCoord - this.x, yCoord - this.y);
    for (const row of this.rows) {
      row.setX(row.getX() + xCoord - this.x);
      row.setY(row.getY() + yCoord - this.y);
    }
    this.x = xCoord;
    this.y = yCoord;
  }

  /** Shifts rectangles by the given vector. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private adjustChildrensXandY(xChange: number, yChange: number): void {
    for (const rect of this.children) {
      rect.setLocation(rect.getX() + xChange, rect.getY() + yChange);
    }
  }

  /** Adjusts size of block after the addition of a rectangle. Notifies parent row. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private adjustSizeAdd(rect: ElkNode): void {
    const widthOflastRow = this.getLastRow().getWidth();
    this.smallestRectWidth = Math.min(this.smallestRectWidth, rect.getWidth());
    this.width = Math.max(this.width, widthOflastRow);
    this.minWidth = Math.max(this.minWidth, rect.getWidth() + this.spacingIfNotFirst());

    this.smallestRectHeight = Math.min(this.smallestRectHeight, rect.getHeight());
    this.maxHeight += rect.getHeight() + this.spacingIfNotFirst();
    this.minHeight = Math.max(this.minHeight, rect.getHeight());
    let totalHeight = this.rows.length > 0 ? (this.rows.length - 1) * this.nodeNodeSpacing : 0;
    for (const row of this.rows) {
      totalHeight += row.getHeight();
    }
    this.height = totalHeight;
    this.averageHeight = this.computeAverageHeight();
    this.parentRow.notifyAboutNodeChange();
  }

  /** `(this.children.size() == 1 ? 0 : nodeNodeSpacing)` of `adjustSizeAdd`. */
  private spacingIfNotFirst(): number {
    return this.children.length === 1 ? 0 : this.nodeNodeSpacing;
  }

  /** `maxHeight / children.size() - nodeNodeSpacing * ((double) (size - 1) / (double) size)` (twice in Java). */
  private computeAverageHeight(): number {
    return (
      this.maxHeight / this.children.length - this.nodeNodeSpacing * ((this.children.length - 1) / this.children.length)
    );
  }

  /** `(index > 0 ? nodeNodeSpacing : 0)` of `placeRectsIn`. */
  private spacingBefore(index: number): number {
    return index > 0 ? this.nodeNodeSpacing : 0;
  }

  /** Smallest width in which the rectangles fit without exceeding the given height. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  getWidthForTargetHeight(height: number): number {
    // Check whether the block would just fit if all rectangles are drawn below each other.
    if (this.maxHeight <= height) {
      return this.minWidth;
    }

    // Check if the minimal width of the block is enough. This can be the case if some rows have more than one rectangle.
    if (this.placeRectsInFits(this.minWidth, height, false)) {
      return this.minWidth;
    }

    // Binary search between minWidth and width.
    let upperBound = this.width;
    let lowerBound = this.minWidth;
    let viableWidth = this.width;
    let newWidth = (upperBound - lowerBound) / 2 + lowerBound;

    while (lowerBound + 1 < upperBound) {
      if (this.placeRectsInFits(newWidth, height, false)) {
        viableWidth = newWidth;
        upperBound = newWidth;
      } else {
        lowerBound = newWidth;
      }
      newWidth = (upperBound - lowerBound) / 2 + lowerBound;
    }
    return viableWidth;
  }

  /** Returns the height of this block if you would place it in the given width. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  getHeightForTargetWidth(width: number): number {
    const bounds = this.placeRectsInBounds(width, false);
    return bounds.height;
  }

  /** Checks whether rectangles can fit in a given width. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private placeRectsInBounds(width: number, placeRects: boolean): ElkRectangle {
    // Locals of the Java method: next x / y of a rect in a blockrow, widths, heights, row and current index in row.
    const s = new PlacementState(this.y);

    if (placeRects) {
      this.rows.length = 0;
      this.rows.push(new BlockRow(this.x, this.y, this.nodeNodeSpacing));
    }

    for (const rect of this.children) {
      if (s.currentX + rect.getWidth() + this.spacingBefore(s.index) > width && s.maxHeightInRow > 0) {
        this.placeRectsInNewRow(s, placeRects);
      }
      s.widthInRow += rect.getWidth() + this.spacingBefore(s.index);
      s.maxHeightInRow = Math.max(s.maxHeightInRow, rect.getHeight());
      if (placeRects) {
        this.rowAt(s.row).addRectangle(rect);
      }
      s.currentX += rect.getWidth() + this.spacingBefore(s.index);
      s.index++;
    }
    s.currentWidth = Math.max(s.currentWidth, s.widthInRow);
    s.currentHeight += s.maxHeightInRow;

    if (placeRects) {
      this.width = s.currentWidth;
      this.height = s.currentHeight;
      this.parentRow.notifyAboutNodeChange();
    }

    return new ElkRectangle(this.x, this.y, s.currentWidth, s.currentHeight);
  }

  /** The "Case new row" branch of the Java `placeRectsIn(double, boolean)` (extracted for the complexity limit). @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private placeRectsInNewRow(s: PlacementState, placeRects: boolean): void {
    s.currentX = 0;
    s.currentY += s.maxHeightInRow + this.nodeNodeSpacing;
    s.currentWidth = Math.max(s.currentWidth, s.widthInRow);
    s.currentHeight += s.maxHeightInRow + this.nodeNodeSpacing;
    s.maxHeightInRow = 0;
    s.widthInRow = 0;
    if (placeRects) {
      s.row++;
      this.rows.push(new BlockRow(this.x, s.currentY, this.nodeNodeSpacing));
    }
    // Reset current index in row
    s.index = 0;
  }

  /** Checks whether the rectangles of this block can be placed width a given width and height. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private placeRectsInFits(width: number, height: number, placeRects: boolean): boolean {
    const bounds = this.placeRectsInBounds(width, placeRects);
    return bounds.width <= width && bounds.height <= height;
  }

  /** Places the rectangles in `width` and `height` (true if neither is exceeded) or in `width` only (true if the size changed). @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  placeRectsIn(width: number, height?: number): boolean {
    if (height !== undefined) {
      return this.placeRectsInFits(width, height, true);
    }
    const oldWidth = this.width;
    const oldHeight = this.height;
    const bounds = this.placeRectsInBounds(width, true);
    return bounds.width !== oldWidth || bounds.height !== oldHeight;
  }

  /** Adjusts size of stack after the removal of a rectangle. Notifies parent. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private adjustSizeAfterRemove(): void {
    // Calculate new width and height
    let newWidth = 0;
    let newHeight = 0;

    // Delete empty rows and calculate new width and height.
    const rowsToDelete = new LinkedList<BlockRow>();
    let index = 0;
    for (const row of this.rows) {
      if (row.getNodes().length === 0) {
        rowsToDelete.add(row);
      } else {
        newWidth = Math.max(newWidth, row.getWidth());
        newHeight += row.getHeight() + this.spacingBefore(index);
      }
      index++;
    }
    this.removeAllRows(rowsToDelete);
    this.height = newHeight;
    this.width = newWidth;

    this.adjustRectBoundsAfterRemove();
  }

  /** The second half of the Java `adjustSizeAfterRemove` (extracted for the complexity limit). @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  private adjustRectBoundsAfterRemove(): void {
    // Calculate new smallest/biggest rectangle, minimum/maximum width/height.
    this.minWidth = 0;
    this.minHeight = 0;
    this.maxHeight = 0;
    this.smallestRectHeight = Number.POSITIVE_INFINITY;
    this.smallestRectWidth = Number.POSITIVE_INFINITY;
    for (const rect of this.children) {
      this.smallestRectWidth = Math.min(this.smallestRectWidth, rect.getWidth());
      this.minWidth = Math.max(this.minWidth, rect.getWidth());
      this.minHeight = Math.max(this.minHeight, rect.getHeight());
      this.smallestRectHeight = Math.min(this.smallestRectHeight, rect.getHeight());
      this.maxHeight += rect.getHeight() + this.nodeNodeSpacing;
    }
    this.averageHeight = this.computeAverageHeight();

    this.parentRow.notifyAboutNodeChange();
  }

  /** `rows.removeAll(rowsToDelete)`: in place, by identity (`BlockRow` has no `equals`). */
  private removeAllRows(rowsToDelete: LinkedList<BlockRow>): void {
    const kept = this.rows.filter((row) => !rowsToDelete.contains(row));
    this.rows.length = 0;
    this.rows.push(...kept);
  }

  /** Stuff the empty space by distributing it to all rows if resizes the block by the given additional width and height. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  expand(additionalWidthPerBlock: number, additionalHeightForBlock: number): void {
    const widthForRow = this.width + additionalWidthPerBlock;
    this.width += additionalWidthPerBlock;
    this.height += additionalHeightForBlock;
    const additionalHeightForRow = additionalHeightForBlock / this.rows.length;
    let index = 0;
    for (const row of this.rows) {
      row.expand(widthForRow, additionalHeightForRow, index);
      index++;
    }
  }

  // Accessors: one per Java accessor of the "Getters and setters" section of
  // alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java (a per-accessor @see would exceed the file limit).
  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): void {
    this.width = width;
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    this.height = height;
  }

  getChildren(): ElkNode[] {
    return this.children;
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  getParentRow(): RectRow {
    return this.parentRow;
  }

  setParentRow(parentRow: RectRow): void {
    this.parentRow = parentRow;
  }

  getMinWidth(): number {
    return this.minWidth;
  }

  getMinHeight(): number {
    return this.minHeight;
  }

  getMaxHeight(): number {
    return this.maxHeight;
  }

  getSmallestRectHeight(): number {
    return this.smallestRectHeight;
  }

  getAverageHeight(): number {
    return this.averageHeight;
  }

  isFixed(): boolean {
    return this.fixed;
  }

  setFixed(fixed: boolean): void {
    this.fixed = fixed;
  }

  isPositionFixed(): boolean {
    return this.positionFixed;
  }

  setPositionFixed(positionFixed: boolean): void {
    this.positionFixed = positionFixed;
  }

  getRows(): BlockRow[] {
    return this.rows;
  }

  /**
   * @returns The x position at which the next rect would be added to the last row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java
   */
  getLastRowNewX(): number {
    const lastRow = this.getLastRow();
    return lastRow.getX() + lastRow.getWidth();
  }

  /**
   * @returns The y position at which the rectangles of the last row are placed.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java
   */
  getLastRowY(): number {
    const lastRow = this.getLastRow();
    return lastRow.getY();
  }

  /**
   * @throws IndexOutOfBoundsException (Java `ArrayList.get`) when the block has no row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java
   */
  getLastRow(): BlockRow {
    return this.rowAt(this.rows.length - 1);
  }

  /** Java `rows.get(index)` with the `IndexOutOfBoundsException` of `ArrayList`. */
  private rowAt(index: number): BlockRow {
    const row = this.rows[index];
    if (index < 0 || row === undefined) {
      throw new IndexOutOfBoundsException(
        `Index ${String(index)} out of bounds for length ${String(this.rows.length)}`,
      );
    }
    return row;
  }

  getStack(): BlockStack | null {
    return this.stack;
  }

  setStack(stack: BlockStack | null): void {
    this.stack = stack;
  }

  getSmallestRectWidth(): number {
    return this.smallestRectWidth;
  }

  setSmallestRectWidth(smallestRectWidth: number): void {
    this.smallestRectWidth = smallestRectWidth;
  }

  /** Recalculates the size of this block. @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/Block.java */
  resetBlock(): void {
    this.adjustSizeAfterRemove();
  }
}
