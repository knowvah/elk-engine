// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { BlockStack } from './BlockStack.js';
import type { Block } from './Block.js';

/**
 * A row of rectangles inside a given bounding box. Tracks the blocks inside the row and the row's width and height.
 * A might have stacks of blocks for ordering them after the compaction step.
 *
 * `notifyAboutNodeChange` is `protected` in Java (called by `Block` of the same package); TypeScript has no package
 * visibility, so it is public here. The fields stay `private` as in Java (the replay helpers reach them by reflection, as
 * the recorder does). `Double.MIN_VALUE` of `removeBlock` is `Number.MIN_VALUE` (PK11); `List.remove(Object)` is identity.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
 */
export class RectRow {
  /** Height of row, given by the highest stack. */
  private height = 0;
  /** Sum of this row's stack's widths. */
  private width = 0;
  /** Y-coordinate of this row. */
  private y: number;
  /** Spacing between two nodes (used for block and stack spacing) */
  private nodeNodeSpacing: number;
  /** This row's blocks. */
  private readonly children: Block[] = [];
  /** This row's stacks of blocks. Used during the compaction step and during the stuffing (expansion) process. */
  private stacks: BlockStack[] = [];
  /** The width that was missing to add the first block of the next row into this one. */
  private potentialAdditionalWidthToGetLastBlock = 0;

  /**
   * Creates a row.
   *
   * @param y The y-coordinate of the row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  constructor(y: number, nodeNodeSpacing: number) {
    this.y = y;
    this.nodeNodeSpacing = nodeNodeSpacing;
  }

  /**
   * Called by one of its assigned blocks when a change was made to respective block like removing or adding a
   * rectangle. This method recalculates its dimensions.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  notifyAboutNodeChange(): void {
    let totalStackWidth = 0;
    let newMaxHeight = Number.NEGATIVE_INFINITY;
    let index = 0;
    for (const child of this.children) {
      totalStackWidth += child.getWidth() + (index > 0 ? this.nodeNodeSpacing : 0);
      newMaxHeight = Math.max(newMaxHeight, child.getHeight());
      index++;
    }
    this.width = totalStackWidth;
    this.height = newMaxHeight;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  expand(width: number, additionalHeight: number): void {
    const additionalWidth = width - this.width;
    const additionalWidthPerStack = additionalWidth / this.stacks.length;
    let index = 0;
    for (const stack of this.stacks) {
      const additionalHeightForStack = this.getHeight() - stack.getHeight() + additionalHeight;
      stack.setLocation(stack.getX() + index * additionalWidthPerStack, stack.getY());
      stack.expand(additionalWidthPerStack, additionalHeightForStack);
      index++;
    }
  }

  /**
   * Puts blocks with the same x coordinate in stacks for better expansion calculation.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  calculateBlockStacks(): void {
    let currentX = -1;
    for (const block of this.children) {
      if (block.getX() !== currentX) {
        this.stacks.push(new BlockStack(block.getX(), this.y, this.nodeNodeSpacing));
        this.lastStack().addBlock(block);
        currentX = block.getX();
      } else {
        this.lastStack().addBlock(block);
      }
    }
  }

  /** `stacks.get(stacks.size() - 1)`, reached only after a stack was pushed. */
  private lastStack(): BlockStack {
    return this.stacks[this.stacks.length - 1] as BlockStack;
  }

  /**
   * Gets the first block of this row.
   *
   * @throws IndexOutOfBoundsException (Java `ArrayList.get`) when the row has no block.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  getFirstBlock(): Block {
    return this.blockAt(0);
  }

  /**
   * Gets the last block of this row.
   *
   * @throws IndexOutOfBoundsException (Java `ArrayList.get`) when the row has no block.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  getLastBlock(): Block {
    return this.blockAt(this.children.length - 1);
  }

  /** Java `children.get(index)` with the `IndexOutOfBoundsException` of `ArrayList`. */
  private blockAt(index: number): Block {
    const block = this.children[index];
    if (index < 0 || block === undefined) {
      throw new IndexOutOfBoundsException(
        `Index ${String(index)} out of bounds for length ${String(this.children.length)}`,
      );
    }
    return block;
  }

  /**
   * Amount of stacks assigned to this row.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  getNumberOfAssignedBlocks(): number {
    return this.children.length;
  }

  /**
   * Assigns stack to the row. Adjusts height and width of the row. Does not adjust the stack's coordinates.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  addBlock(block: Block): void {
    this.height = Math.max(this.height, block.getHeight());
    this.width += block.getWidth() + (this.children.length === 0 ? 0 : this.nodeNodeSpacing);
    this.children.push(block);
  }

  /**
   * Removes specified stack from this row (by identity: `Block` has no `equals`, so `List.remove(Object)` is `indexOf`).
   * Adjusts width and height.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  removeBlock(block: Block): void {
    const at = this.children.indexOf(block);
    if (at >= 0) {
      this.children.splice(at, 1);
    }
    this.width -= block.getWidth() + (this.children.length === 0 ? 0 : this.nodeNodeSpacing);
    let newMaxHeight = Number.MIN_VALUE;
    for (const child of this.children) {
      newMaxHeight = Math.max(newMaxHeight, child.getHeight());
    }
    this.height = newMaxHeight;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getHeight(): number {
    return this.height;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  setHeight(height: number): void {
    this.height = height;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getWidth(): number {
    return this.width;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  setWidth(width: number): void {
    this.width = width;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getY(): number {
    return this.y;
  }

  /**
   * Sets y-coordinate of this row, moving its stacks by the change.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  setY(y: number): void {
    const yChange = y - this.y;
    for (const stack of this.stacks) {
      stack.setLocation(stack.getX(), stack.getY() + yChange);
    }
    this.y = y;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getChildren(): Block[] {
    return this.children;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getStacks(): BlockStack[] {
    return this.stacks;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  getPotentialAdditionalWidthToGetLastBlock(): number {
    return this.potentialAdditionalWidthToGetLastBlock;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java */
  setPotentialAdditionalWidthToGetLastBlock(potentialAdditionalWidthToGetLastBlock: number): void {
    this.potentialAdditionalWidthToGetLastBlock = potentialAdditionalWidthToGetLastBlock;
  }

  /**
   * Removes all created stacks. Should only be used when reevaluating the packing in a row.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/RectRow.java
   */
  resetStacks(): void {
    this.stacks = [];
  }
}
