// SPDX-License-Identifier: EPL-2.0
import type { Block } from './Block.js';

/**
 * Inside of a row blocks are stacked in the compaction step.
 * This class represents a stack of blocks. All blocks in this stack are placed below each other.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
 */
export class BlockStack {
  /** The blocks assigned to this stack. */
  private blocks: Block[];
  /** x-coordinate of this stack. */
  private x: number;
  /** y-coordinate of this stack. */
  private y: number;
  /** Width of this stack. */
  private width = 0;
  /** Height of this stack. */
  private height = 0;
  /** Spacing between two nodes. */
  private nodeNodeSpacing: number;

  /**
   * Creates a new stack at a specific location. The y-coordinate should correspond to the y-coordinate of the row.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  constructor(x: number, y: number, nodeNodeSpacing: number) {
    this.blocks = [];
    this.x = x;
    this.y = y;
    this.nodeNodeSpacing = nodeNodeSpacing;
  }

  /**
   * Adds a block to this stack.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  addBlock(block: Block): void {
    block.setStack(this);
    this.width = Math.max(this.width, block.getWidth());
    this.height += block.getHeight() + (this.blocks.length === 0 ? 0 : this.nodeNodeSpacing);
    this.blocks.push(block);
  }

  /**
   * Recalculates the dimension (width and height) of the stack.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  updateDimension(): void {
    let height = 0;
    let width = 0;
    let index = 0;
    for (const block of this.blocks) {
      width = Math.max(width, block.getWidth());
      height += block.getHeight() + (index > 0 ? this.nodeNodeSpacing : 0);
      index++;
    }
    this.height = height;
    this.width = width;
  }

  /**
   * Updates the location of this stack including all of its blocks.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  setLocation(x: number, y: number): void {
    const xDiff = x - this.x;
    const yDiff = y - this.y;
    for (const block of this.blocks) {
      block.setLocation(block.getX() + xDiff, block.getY() + yDiff);
    }
    this.x = x;
    this.y = y;
  }

  /**
   * Returns the minimal width for this stack that would still fit the given height.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  getWidthForFixedHeight(height: number): number {
    // One element special case.
    if (this.blocks.length === 1) {
      return (this.blocks[0] as Block).getWidthForTargetHeight(height);
    }
    // Try some kind of binary search between the widest block length and the minWidth.
    const minWidth = this.getMinimumWidth();
    let totalHeight = 0;
    let upperBound = this.width;
    let lowerBound = minWidth;
    let viableWidth = this.width;
    let newWidth = (upperBound - lowerBound) / 2 + lowerBound;
    while (lowerBound + 1 < upperBound) {
      totalHeight = 0;
      for (const block of this.blocks) {
        totalHeight += block.getHeightForTargetWidth(newWidth);
      }
      if (totalHeight < height) {
        viableWidth = newWidth;
        upperBound = newWidth;
      } else {
        lowerBound = newWidth;
      }
      newWidth = (upperBound - lowerBound) / 2 + lowerBound;
    }
    return viableWidth;
  }

  /**
   * Places all blocks in this stack in the specified target width. Also updates the width and height of the stack.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  placeRectsIn(targetWidth: number): void {
    let currentY = this.getY();
    let currentHeight = 0;
    let currentWidth = 0;
    for (const block of this.blocks) {
      block.setLocation(this.x, currentY);
      block.placeRectsIn(targetWidth);
      currentWidth = Math.max(currentWidth, block.getWidth());
      currentY += block.getHeight() + this.nodeNodeSpacing;
      currentHeight = currentY;
    }
    this.width = currentWidth;
    this.height = currentHeight;
  }

  /**
   * Expands this stack by the given additional width and height. The components of this stack are enlarged rather than
   * recalculating the layout.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  expand(additionalWidth: number, additionalHeight: number): void {
    let index = 0;
    const additionalHeightPerBlock = additionalHeight / this.blocks.length;
    for (const block of this.blocks) {
      block.setLocation(block.getX(), block.getY() + index * additionalHeightPerBlock);
      block.expand(this.getWidth() - block.getWidth() + additionalWidth, additionalHeightPerBlock);
      index++;
    }
  }

  /**
   * Returns the minimum width of this stack.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java
   */
  private getMinimumWidth(): number {
    let minWidth = 0;
    for (const block of this.blocks) {
      minWidth = Math.max(minWidth, block.getMinWidth());
    }
    return minWidth;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  getBlocks(): Block[] {
    return this.blocks;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  getX(): number {
    return this.x;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  getY(): number {
    return this.y;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  getWidth(): number {
    return this.width;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  setWidth(width: number): void {
    this.width = width;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  getHeight(): number {
    return this.height;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/BlockStack.java */
  setHeight(height: number): void {
    this.height = height;
  }
}
