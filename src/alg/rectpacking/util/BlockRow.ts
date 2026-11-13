// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

/**
 * This class corresponds to a row in a block of rectangles.
 * It introduces one abstraction layer for better handling of rows in a block.
 *
 * `removeRectangle` removes by identity (`ElkNode` has no `equals`, so `List.remove(Object)` is `indexOf`).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
 */
export class BlockRow {
  /** x-coordinate of the row. */
  private x: number;
  /** y-coordinate of the row. */
  private y: number;
  /** Width of the row + nodeNodeSpacing */
  private width = 0;
  /** Height of the row. Corresponds to the height of the biggest node + nodeNodeSpacing */
  private height = 0;
  /** Spacing between two nodes. */
  private readonly nodeNodeSpacing: number;
  /** Rectangles assigned to the row. */
  private rects: ElkNode[] = [];

  /**
   * Create a new BlockRow.
   *
   * @param x The x-coordinate of the row.
   * @param y The y-coordinate of the row.
   * @param nodeNodeSpacing Spacing between two rectangles.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
   */
  constructor(x: number, y: number, nodeNodeSpacing: number) {
    this.x = x;
    this.y = y;
    this.nodeNodeSpacing = nodeNodeSpacing;
  }

  /**
   * Adds a rectangle to the row.
   *
   * @returns true if the rectangle fits in this row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
   */
  addRectangle(rect: ElkNode): boolean {
    rect.setX(this.x + this.width + (this.rects.length === 0 ? 0 : this.nodeNodeSpacing));
    rect.setY(this.y);
    this.height = Math.max(this.height, rect.getHeight());
    this.width += rect.getWidth() + (this.rects.length === 0 ? 0 : this.nodeNodeSpacing);
    this.rects.push(rect);
    return true;
  }

  /**
   * Removes a rectangle from the row. Updates the height and width of the row.
   *
   * @param update If enabled the x and y coordinate of the containing rectangles and the width and height of the row
   *   are updated.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
   */
  removeRectangle(rect: ElkNode, update: boolean): void {
    const at = this.rects.indexOf(rect);
    if (at >= 0) {
      this.rects.splice(at, 1);
    }
    if (update) {
      this.updateRow();
    }
  }

  /**
   * Updates the coordinates of all rectangles and the height and width of the row.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
   */
  updateRow(): void {
    let width = 0;
    let height = 0;
    for (const rect of this.rects) {
      rect.setX(this.x + width);
      rect.setY(this.y);
      width += rect.getWidth() + this.nodeNodeSpacing;
      height = Math.max(height, rect.getHeight() + this.nodeNodeSpacing);
    }
    this.width = width - this.nodeNodeSpacing;
    this.height = height - this.nodeNodeSpacing;
  }

  /**
   * Expands the row to the given width and by the given additional height.
   *
   * @param widthForRow The desired width for this row.
   * @param additionalHeightForRow The additional height for this row.
   * @param index Index of the row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java
   */
  expand(widthForRow: number, additionalHeightForRow: number, index: number): void {
    const additionalWidthForRect = (widthForRow - this.width) / this.rects.length;
    let i = 0;
    this.height += additionalHeightForRow;
    this.width = widthForRow;
    for (const rect of this.rects) {
      const oldWidth = rect.getWidth();
      const oldHeight = rect.getHeight();
      rect.setX(rect.getX() + i * additionalWidthForRect);
      rect.setY(rect.getY() + index * additionalHeightForRow);
      rect.setWidth(rect.getWidth() + additionalWidthForRect);
      rect.setHeight(this.height);
      i++;
      const newWidth = rect.getWidth();
      const newHeight = rect.getHeight();
      ElkUtil.translate(rect, new KVector(newWidth, newHeight), new KVector(oldWidth, oldHeight));
    }
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  getY(): number {
    return this.y;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  setY(y: number): void {
    this.y = y;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  getWidth(): number {
    return this.width;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  getHeight(): number {
    return this.height;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  getNodes(): ElkNode[] {
    return this.rects;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  getX(): number {
    return this.x;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockRow.java */
  setX(x: number): void {
    this.x = x;
  }
}
