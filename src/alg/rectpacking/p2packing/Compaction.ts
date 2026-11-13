// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { BlockStack } from '../util/BlockStack.js';
import type { Block } from '../util/Block.js';
import type { RectRow } from '../util/RectRow.js';
import {
  BREAK,
  CONTINUE,
  PROCEED,
  removeRowObject,
  stackOf,
  type CompactContext,
  type Step,
} from './CompactionContext.js';
import { placeBelow, placeBeside } from './CompactionPlacement.js';
import { InitialPlacement } from './InitialPlacement.js';

/**
 * Class that offers methods that help calculating the compaction phase of {@link RowFillingAndCompaction}.
 *
 * `compact` is `protected static` in Java (called by the package's `RowFillingAndCompaction`); TypeScript has no
 * package visibility, so it is public here.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
 */
export class Compaction {
  /** Private constructor (Java `private Compaction()`). */
  private constructor() {}

  /**
   * Compacts the given {@link RectRow} by putting its children beneath each other. Calculates the drawing's width and
   * height accordingly and executes needed shifts.
   *
   * @param rowIdx index of the row to improve.
   * @param rows given {@link RectRow}s with placed rectangles.
   * @param boundingWidth width of a bounding box that is not be be exceeded.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @return returns (something was changed, compact the row again).
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
   */
  static compact(
    rowIdx: number,
    rows: RectRow[],
    boundingWidth: number,
    nodeNodeSpacing: number,
    rowHeightReevaluation: boolean,
  ): Pair<boolean, boolean> {
    const ctx: CompactContext = {
      rows,
      row: rows[rowIdx] as RectRow,
      boundingWidth,
      nodeNodeSpacing,
      rowHeightReevaluation,
      nextRowIndex: rowIdx + 1,
      somethingWasChanged: false,
      compactRowAgain: false,
      currentStack: null,
      blockId: 0,
    };

    // Check for each block whether:
    // Part of the next block can be added to the current block,
    // the next (or part of the next) block can be put on top of it,
    // the next block can be put next to it,
    // or the current block can be drawn higher.
    for (ctx.blockId = 0; ctx.blockId < ctx.row.getNumberOfAssignedBlocks(); ctx.blockId++) {
      if (Compaction.processBlock(ctx) === BREAK) {
        break;
      }
    }

    return new Pair<boolean, boolean>(ctx.somethingWasChanged, ctx.compactRowAgain);
  }

  /** The body of the block loop of `compact` (Compaction.java:62-163). */
  private static processBlock(ctx: CompactContext): Step {
    const block = ctx.row.getChildren()[ctx.blockId] as Block;
    if (block.isFixed()) {
      return CONTINUE;
    }
    if (block.getChildren().length === 0) {
      Compaction.removeEmptyBlock(ctx, block);
      return CONTINUE;
    }

    Compaction.moveBlock(ctx, block);

    // Optimization 1: Does the next block fit on top of me?
    // This includes removing element from the next block and putting them in a new block.
    // A block can also be taken from the next row.
    const nextBlock = Compaction.getNextBlock(ctx.rows, ctx.row, ctx.blockId, ctx.nextRowIndex);
    if (nextBlock !== null) {
      const step = Compaction.handleNextBlock(ctx, block, nextBlock);
      if (step !== PROCEED) {
        return step;
      }
    }

    // Optimization 2: Let blocks use the row width if they can
    if (Compaction.useRowHeight(ctx.row, block)) {
      block.setFixed(true);
      ctx.somethingWasChanged = true;
      if (nextBlock !== null) {
        nextBlock.setPositionFixed(false);
      }
    } else {
      stackOf(block).updateDimension();
    }
    return CONTINUE;
  }

  /** The empty-block arm of the block loop of `compact` (Compaction.java:70-76), up to its `continue`. */
  private static removeEmptyBlock(ctx: CompactContext, block: Block): void {
    console.error('There should not be an empty block. Empty blocks are directly removed.');
    ctx.row.removeBlock(block);
    ctx.blockId--;
    ctx.somethingWasChanged = true;
  }

  /** "Move the block to its new position if something before it was changed and it is moveable." (Compaction.java:78-90). */
  private static moveBlock(ctx: CompactContext, block: Block): void {
    if (!block.isPositionFixed()) {
      if (ctx.currentStack !== null) {
        ctx.currentStack.updateDimension();
      }
      const spacing = ctx.nodeNodeSpacing;
      ctx.currentStack = new BlockStack(
        ctx.currentStack === null ? 0 : ctx.currentStack.getX() + ctx.currentStack.getWidth() + spacing,
        ctx.row.getY(),
        spacing,
      );
      block.setLocation(ctx.currentStack.getX() + ctx.currentStack.getWidth(), ctx.row.getY());
      ctx.row.getStacks().push(ctx.currentStack);
      ctx.currentStack.addBlock(block);
      block.setPositionFixed(true);
    }
  }

  /**
   * The `if (nextBlock != null) { ... }` section of `compact` (Compaction.java:101-157): `continue`, `break`, or fall
   * through to "Optimization 2".
   */
  private static handleNextBlock(ctx: CompactContext, block: Block, nextBlock: Block): Step {
    // Identity: `RectRow` has no `equals`, so `.equals(row)` is `===` (stop 13).
    const wasFromNextRow = nextBlock.getParentRow() !== ctx.row;

    // Decide whether the block can be merged with the previous block

    // Try to move as many rects as possible from the next block in this block.
    // First flatten the current block.
    const first = nextBlock.getChildren()[0];
    if (first !== undefined && !first.getProperty(RectPackingOptions.IN_NEW_ROW)) {
      Compaction.useRowWidth(block, ctx.boundingWidth);
      // Absorb all rectangles that fit in the current block form the next block if they fit the row.
      const absorbed = Compaction.absorbBlocks(ctx.row, block, nextBlock, ctx.boundingWidth, ctx.nodeNodeSpacing);
      ctx.somethingWasChanged = ctx.somethingWasChanged || absorbed;
    } else {
      // Delete empty nextBlock
      ctx.row.removeBlock(nextBlock);
      return BREAK;
    }
    // Check whether whole next block or part of the whole next block can be added to this row.
    // This involves flattening the current block if possible to maintain the left to right reading direction.
    // if the current block is too high to fit the next block on top of it, try placing it next to it.

    // From the previous step the next block and the next row might be empty.
    // Delete all empty blocks and rows.
    if (nextBlock.getChildren().length === 0) {
      Compaction.deleteEmptyNextBlock(ctx, nextBlock);
      ctx.blockId--;
      return CONTINUE;
    }
    return Compaction.placeNextBlock(ctx, block, nextBlock, wasFromNextRow);
  }

  /** The `nextBlock.getChildren().isEmpty()` cleanup of `compact` (Compaction.java:122-130), up to `nextBlock = null`. */
  private static deleteEmptyNextBlock(ctx: CompactContext, nextBlock: Block): void {
    const { rows, nextRowIndex } = ctx;
    if (rows.length > nextRowIndex) {
      (rows[nextRowIndex] as RectRow).removeBlock(nextBlock);
    }
    while (rows.length > nextRowIndex && (rows[nextRowIndex] as RectRow).getChildren().length === 0) {
      removeRowObject(rows, rows[nextRowIndex] as RectRow);
    }
  }

  /** From "Try to fit next block on top of the current block" to the end of the `nextBlock != null` section (:135-157). */
  private static placeNextBlock(ctx: CompactContext, block: Block, nextBlock: Block, wasFromNextRow: boolean): Step {
    const { row } = ctx;
    // Get height of block if it uses the
    // Try to use the whole remaining width of the row and try to put the block on top of it.
    // If it does not work (because the block is too high) check the minimum height of the block and check whether
    // it can fit at all.
    // If it could compact the width of the current block and try to fit as much as possible in there

    // Try to fit next block on top of the current block.
    if (
      !(nextBlock.getChildren()[0] as ElkNode).getProperty(RectPackingOptions.IN_NEW_ROW) &&
      placeBelow(ctx, block, nextBlock, wasFromNextRow)
    ) {
      ctx.somethingWasChanged = true;
      return CONTINUE;
    }

    if (wasFromNextRow) {
      const step = Compaction.tryBesideOrRowHeight(ctx, block, nextBlock);
      if (step !== PROCEED) {
        return step;
      }
    } else if (Compaction.useRowHeight(row, block)) {
      block.setFixed(true);
      ctx.somethingWasChanged = true;
      return CONTINUE;
    }

    // Case only parts of the next block where added, but no full next block could be added.
    return ctx.somethingWasChanged ? CONTINUE : PROCEED;
  }

  /** The `if (wasFromNextRow) { ... }` arm of `compact` (Compaction.java:140-155): `PROCEED` when no branch ended the step. */
  private static tryBesideOrRowHeight(ctx: CompactContext, block: Block, nextBlock: Block): Step {
    const { row } = ctx;
    // Try to place the next block next to the current one.
    // Draw the current block as slim as possible.
    const oldRowHeight = row.getHeight();
    const nextBlockMinHeight = nextBlock.getMinHeight();
    if (
      !(nextBlock.getChildren()[0] as ElkNode).getProperty(RectPackingOptions.IN_NEW_ROW) &&
      placeBeside(ctx, block, nextBlock)
    ) {
      ctx.somethingWasChanged = true;
      // The next block was inserted and it dominates the current row height.
      // Therefore, the current node has to be repacked to fit the row height better.
      if (oldRowHeight < nextBlockMinHeight) {
        ctx.compactRowAgain = true;
        nextBlock.setParentRow(row);
        return BREAK;
      }
      return CONTINUE;
    } else if (Compaction.useRowHeight(row, block)) {
      block.setFixed(true);
      ctx.somethingWasChanged = true;
      return CONTINUE;
    }
    return PROCEED;
  }

  /**
   * Returns the next block if any.
   *
   * @param rows The rows.
   * @param row The current row.
   * @param blockId The id of the current block in the current row.
   * @param nextRowIndex The id of the next row.
   * @return The next block.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
   */
  private static getNextBlock(rows: RectRow[], row: RectRow, blockId: number, nextRowIndex: number): Block | null {
    let nextBlock: Block | null = null;
    if (blockId < row.getNumberOfAssignedBlocks() - 1) {
      // Get block from this row.
      nextBlock = row.getChildren()[blockId + 1] as Block;
    } else if (nextRowIndex < rows.length && (rows[nextRowIndex] as RectRow).getChildren().length !== 0) {
      // Get block from next row.
      nextBlock = (rows[nextRowIndex] as RectRow).getChildren()[0] as Block;
    }
    return nextBlock;
  }

  /**
   * Check whether the width of the block can be reduced by using the whole height, since the preceding block does not
   * exist or is too big to be put on top of it.
   *
   * @param row The row the block is in
   * @param block The block to be slimed.
   * @return If changes to the block were made.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
   */
  private static useRowHeight(row: RectRow, block: Block): boolean {
    let somethingWasChanged = false;
    const previousWidth = stackOf(block).getWidth();
    if (block.getHeight() < row.getHeight()) {
      const targetWidth = stackOf(block).getWidthForFixedHeight(row.getHeight());
      if (stackOf(block).getWidth() > targetWidth) {
        stackOf(block).placeRectsIn(targetWidth);
        somethingWasChanged = previousWidth !== stackOf(block).getWidth();
      }
    }
    return somethingWasChanged;
  }

  /**
   * Updates a block such that it uses the whole available width.
   *
   * @param block The block.
   * @param boundingWidth The maximum width that shall not be exceeded.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
   */
  private static useRowWidth(block: Block, boundingWidth: number): void {
    block.placeRectsIn(boundingWidth - block.getX());
    stackOf(block).updateDimension();
  }

  /**
   * Moves rectangles from the next block to the current if they fit.
   *
   * @param row The current row.
   * @param block The current block.
   * @param nextBlock the next block.
   * @param boundingWidth The bounding width of the row.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @return true if something was changed in either block.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
   */
  private static absorbBlocks(
    row: RectRow,
    block: Block,
    nextBlock: Block,
    boundingWidth: number,
    nodeNodeSpacing: number,
  ): boolean {
    let somethingWasChanged = false;
    let rect = nextBlock.getChildren()[0] as ElkNode;
    while (InitialPlacement.placeRectInBlock(row, block, rect, boundingWidth, nodeNodeSpacing)) {
      // The rectangle was added to this block.
      somethingWasChanged = true;
      nextBlock.removeChild(rect);
      if (nextBlock.getChildren().length === 0) {
        break;
      }
      rect = nextBlock.getChildren()[0] as ElkNode;
    }

    // Cleanup.
    if (nextBlock.getChildren().length === 0) {
      nextBlock.getParentRow().removeBlock(nextBlock);
    }
    if (somethingWasChanged) {
      stackOf(block).updateDimension();
    }

    return somethingWasChanged;
  }
}
