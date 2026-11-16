// SPDX-License-Identifier: EPL-2.0
import type { Block } from '../util/Block.js';
import type { RectRow } from '../util/RectRow.js';
import { stackOf, type CompactContext } from './CompactionContext.js';

/**
 * Checks if it is possible and places the next block in the same stack as the current block (Java
 * `Compaction.placeBelow`, split from `Compaction.ts` for the file-size limit).
 *
 * @param ctx rows, current row, bounding width, next row index and spacing (Java passes them as parameters).
 * @param block The current block.
 * @param nextBlock The next block.
 * @param wasFromNextRow Whether the next block was taken from the next row.
 * @return true if the next block was placed below the current block in the same stack.
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
 */
export function placeBelow(ctx: CompactContext, block: Block, nextBlock: Block, wasFromNextRow: boolean): boolean {
  const { row, boundingWidth, nodeNodeSpacing } = ctx;
  let somethingWasChanged = false;
  // Flatten both blocks and check whether they fit on top of each other.
  const remainingWidth = boundingWidth - block.getX();
  const currentBlockMinHeight = block.getY() - row.getY() + block.getHeightForTargetWidth(remainingWidth);
  // Case that the next block cannot fit in any case.
  if (nextBlock.getMinWidth() + nodeNodeSpacing > remainingWidth) {
    return false;
  }
  const nextBlockMinHeight = nextBlock.getHeightForTargetWidth(remainingWidth);

  if (currentBlockMinHeight + nodeNodeSpacing + nextBlockMinHeight <= row.getHeight()) {
    // Case they fit on top of each other.
    block.placeRectsIn(boundingWidth - block.getX());
    block.setFixed(true);
    nextBlock.placeRectsIn(boundingWidth - block.getX());
    nextBlock.setLocation(block.getX(), block.getY() + block.getHeight() + nodeNodeSpacing);
    nextBlock.setPositionFixed(true);
    stackOf(block).addBlock(nextBlock);
    somethingWasChanged = true;

    // Remove next block from next row if it is from there.
    if (wasFromNextRow) {
      row.addBlock(nextBlock);
      nextBlock.setParentRow(row);
      removeFromNextRow(ctx, nextBlock);
    }
  }
  return somethingWasChanged;
}

/**
 * `if (rows.size() > nextRowIndex) { rows.get(nextRowIndex).removeBlock(nextBlock); if (...isEmpty()) rows.remove(
 * nextRowIndex); }`, which `placeBelow` and `placeBeside` both contain (index removal, `List.remove(int)`).
 */
function removeFromNextRow(ctx: CompactContext, nextBlock: Block): void {
  const { rows, nextRowIndex } = ctx;
  if (rows.length > nextRowIndex) {
    (rows[nextRowIndex] as RectRow).removeBlock(nextBlock);
    if ((rows[nextRowIndex] as RectRow).getChildren().length === 0) {
      rows.splice(nextRowIndex, 1);
    }
  }
}

/** The loop of `placeBeside` that sums the stack widths for the minimum height of the next block, in stack order. */
function potentialWidth(row: RectRow, nextBlock: Block, nodeNodeSpacing: number): number {
  let potentialWidth = 0.0;
  for (const stack of row.getStacks()) {
    potentialWidth += stack.getWidthForFixedHeight(nextBlock.getMinHeight()) + nodeNodeSpacing;
  }
  return potentialWidth;
}

/**
 * The two closing `if`s of `placeBeside`: the early `return false` for a next block that exceeds the row height, and the
 * condition that guards the placement. True when the placement runs.
 */
function placementAllowed(
  shouldRowHeigthBeReevalauted: boolean,
  nextBlockHeight: number,
  rowHeight: number,
  lastRowOptimization: boolean,
): boolean {
  // If the next block does not contain a node that would dominate the row height and it would otherwise exceed
  // the row height if drawn in the available width, it cannot be placed in this row (if it is not the last row).
  if (!shouldRowHeigthBeReevalauted && nextBlockHeight > rowHeight && !lastRowOptimization) {
    return false;
  }
  return lastRowOptimization || shouldRowHeigthBeReevalauted || nextBlockHeight <= rowHeight;
}

/**
 * Checks if it is possible and places the next block beside the current block. This involves trying to make the
 * current block as slim as possible (Java `Compaction.placeBeside`).
 *
 * @param ctx rows, current row, bounding width, next row index, spacing and the row height reevaluation flag (Java
 *   passes them as parameters).
 * @param block The current block.
 * @param nextBlock The next block.
 * @return true if the next block was placed beside the current block.
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compaction.java
 */
export function placeBeside(ctx: CompactContext, block: Block, nextBlock: Block): boolean {
  const { rows, row, boundingWidth, nextRowIndex, nodeNodeSpacing } = ctx;
  // Get minimum width for current stack that would fit the height.
  const currentBlockMinWidth = stackOf(block).getWidthForFixedHeight(
    row.getY() + row.getHeight() - stackOf(block).getY(),
  );
  // Row height is reevaluated if the next block will dominate the current row in height.
  const shouldRowHeigthBeReevalauted = nextBlock.getMinHeight() > row.getHeight() && ctx.rowHeightReevaluation;

  // Get total width of the current stack.
  let targetWidthOfNextBlock = boundingWidth - (stackOf(block).getX() + currentBlockMinWidth - nodeNodeSpacing);

  // Get height of next block.
  const nextBlockHeight = nextBlock.getHeightForTargetWidth(targetWidthOfNextBlock);
  // If the height to fit in the current row is bigger than the minimum height the next block does not provide
  // a node that will define the row height by its height.
  if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) {
    return false;
  }

  // If the row height is increased the current row height must be increased to evaluate whether it could potentially
  // fit. The following might be wrong since it does not for different stacks that might have formed if the row height
  // was higher. It does, however, check whether it is possible to draw each stack less wide.
  if (shouldRowHeigthBeReevalauted) {
    // Calculate available width for next block.
    targetWidthOfNextBlock = boundingWidth - potentialWidth(row, nextBlock, nodeNodeSpacing);
  }

  // Check width of next block.
  if (targetWidthOfNextBlock < nextBlock.getMinWidth()) {
    return false;
  }
  // Handle last layer case
  // Place beside is allowed, if all blocks from last row fit in this row in width and height is maybe to much
  // This assumption helps to eliminate obvious bad placements where the last row is not absorbed.
  // If we are sure we can absorb every block we change your row height to a higher one what is normally
  // forbidden. The next block is a big one and will define the new row height. Because of performance reasons
  // we do not recalculate the last row to fit the new row height (but we could).
  const lastRowOptimization =
    nextRowIndex === rows.length - 1 && targetWidthOfNextBlock >= (rows[nextRowIndex] as RectRow).getWidth();

  if (!placementAllowed(shouldRowHeigthBeReevalauted, nextBlockHeight, row.getHeight(), lastRowOptimization)) {
    return false;
  }
  const exceededHeight = lastRowOptimization && nextBlockHeight > row.getHeight() ? nextBlockHeight : null;
  placeNextBeside(ctx, block, nextBlock, currentBlockMinWidth, exceededHeight);
  return true;
}

/**
 * The body of the last `if` of `placeBeside`, run when its condition held.
 *
 * @param exceededHeight `nextBlockHeight` when `lastRowOptimization && nextBlockHeight > row.getHeight()` (the first arm of
 *   the Java `if`), else `null`.
 */
function placeNextBeside(
  ctx: CompactContext,
  block: Block,
  nextBlock: Block,
  currentBlockMinWidth: number,
  exceededHeight: number | null,
): void {
  const { row, boundingWidth } = ctx;
  if (exceededHeight !== null) {
    block.setHeight(exceededHeight);
    block.placeRectsIn(block.getWidthForTargetHeight(exceededHeight));
  } else {
    stackOf(block).placeRectsIn(currentBlockMinWidth);
    block.setFixed(true);
  }

  // Place next block in remaining width.
  nextBlock.placeRectsIn(boundingWidth - (block.getX() + block.getWidth()));
  nextBlock.setLocation(stackOf(block).getX() + stackOf(block).getWidth(), row.getY());
  row.addBlock(nextBlock);

  // Delete empty rows if needed.
  removeFromNextRow(ctx, nextBlock);
}
