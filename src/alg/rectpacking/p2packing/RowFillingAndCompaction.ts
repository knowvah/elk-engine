// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { DrawingData } from '../util/DrawingData.js';
import { DrawingDataDescriptor } from '../util/DrawingDataDescriptor.js';
import { DrawingUtil } from '../util/DrawingUtil.js';
import type { Block } from '../util/Block.js';
import type { RectRow } from '../util/RectRow.js';
import { Compaction } from './Compaction.js';
import { InitialPlacement } from './InitialPlacement.js';

/** Java `List.get(index)` on an `ArrayList`: an index outside `[0, size)` throws `IndexOutOfBoundsException`. */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index] as T;
}

/** Java auto-unboxing of a `Double` property that may be unset (`NullPointerException` is a `TypeError`, D10). */
const unboxProperty = (value: number | null | undefined): number =>
  unboxDouble(value, PROPERTY_RETURN_VALUE('ElkNode'));

/**
 * Second iteration of the algorithm. Actual placement of the boxes inside the approximated bounding box. Rectangles are
 * placed in rows, which are compacted and then filled with elements from the subsequent row.
 *
 * `start` retries a row with `rowIdx--` whenever `Compaction.compact` answers "compact again", without a guard, as the
 * Java does (RowFillingAndCompaction.java:117).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/RowFillingAndCompaction.java
 */
export class RowFillingAndCompaction {
  /** Desired aspect ratio. */
  private aspectRatio: number;
  /** Spacing between two nodes. */
  private nodeNodeSpacing: number;

  /** The minimum width that has to be removed from the target width not allow the last element of a row in it. */
  potentialRowWidthDecreaseMin: number = Number.POSITIVE_INFINITY;
  /** The maximum width that has to be removed from the target width not allow the last element of a row in it. */
  potentialRowWidthDecreaseMax = 0;
  /**
   * The minimum width that has to be added to the target width to allow an element from the next row to be placed the
   * previous one.
   */
  potentialRowWidthIncreaseMin: number = Number.POSITIVE_INFINITY;
  /**
   * The maximum width that has to be added to the target width to allow an element from the next row to be placed the
   * previous one.
   */
  potentialRowWidthIncreaseMax = 0;

  /**
   * Creates an {@link RowFillingAndCompaction} object to execute the second iteration on.
   *
   * @param aspectRatio The desired aspect ratio.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/RowFillingAndCompaction.java
   */
  constructor(aspectRatio: number, nodeNodeSpacing: number) {
    this.aspectRatio = aspectRatio;
    this.nodeNodeSpacing = nodeNodeSpacing;
  }

  /**
   * Placement of the rectangles given by {@link ElkNode} inside the given bounding box.
   *
   * @param rectangles The set of rectangles to be placed inside the bounding box (unused, as in Java).
   * @return Drawing data for a produced drawing.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/RowFillingAndCompaction.java
   */
  start(
    rectangles: Iterable<ElkNode>,
    progressMonitor: IElkProgressMonitor,
    layoutGraph: ElkNode,
    padding: ElkPadding,
  ): DrawingData {
    void rectangles;
    const targetWidth = unboxProperty(layoutGraph.getProperty(InternalProperties.TARGET_WIDTH));
    const minWidth = unboxProperty(layoutGraph.getProperty(InternalProperties.MIN_WIDTH));
    const minHeight = unboxProperty(layoutGraph.getProperty(InternalProperties.MIN_HEIGHT));
    // Reset coordinates potentially set by width approximation.
    DrawingUtil.resetCoordinates(layoutGraph.getChildren());

    // Initial placement for rectangles in blocks in each row.
    const rows = InitialPlacement.place(layoutGraph.getChildren(), targetWidth, this.nodeNodeSpacing);

    // Compaction of blocks.
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      rowIdx = this.compactRow(rowIdx, rows, targetWidth, layoutGraph, progressMonitor);
    }

    const size = DrawingUtil.calculateDimensions(rows, this.nodeNodeSpacing);

    const totalWidth = Math.max(size.x, minWidth - padding.getHorizontal());
    const height = Math.max(size.y, minHeight - padding.getVertical());
    const additionalHeight = height - size.y;
    layoutGraph.setProperty(InternalProperties.ADDITIONAL_HEIGHT, additionalHeight);
    layoutGraph.setProperty(InternalProperties.ROWS, rows);

    return new DrawingData(
      this.aspectRatio,
      totalWidth,
      size.y + additionalHeight,
      DrawingDataDescriptor.WHOLE_DRAWING,
    );
  }

  /**
   * The body of the row loop of `start` (RowFillingAndCompaction.java:94-153); returns the loop variable `rowIdx` as the
   * body leaves it (decremented when the row is compacted again).
   */
  private compactRow(
    rowIdx: number,
    rows: RectRow[],
    targetWidth: number,
    layoutGraph: ElkNode,
    progressMonitor: IElkProgressMonitor,
  ): number {
    const currentRow = listGet(rows, rowIdx);
    this.placeBelowPreviousRow(rows, rowIdx, currentRow);
    const result = Compaction.compact(
      rowIdx,
      rows,
      targetWidth,
      this.nodeNodeSpacing,
      layoutGraph.getProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION),
    );
    if (result.getSecond() === true) {
      this.resetRow(currentRow, targetWidth);
      return rowIdx - 1;
    }
    this.adjustWidthAndHeight(currentRow);
    // Check how much space would be needed in the current row to add the first block from the next one.
    // And how much space could be removed from each row by removing the last block.
    if (rowIdx + 1 < rows.length) {
      this.updatePotentialWidthsForNextRow(currentRow, listGet(rows, rowIdx + 1), targetWidth);
    }
    // Special case the graph has only one row with one block with several subrows
    if (rows.length === 1) {
      this.updatePotentialWidthsForSubrows(currentRow);
    }
    this.logRow(progressMonitor, layoutGraph, rowIdx);
    return rowIdx;
  }

  /** `if (rowIdx != 0) { currentRow.setY(previousRow.getY() + previousRow.getHeight() + nodeNodeSpacing); }` (:96-99). */
  private placeBelowPreviousRow(rows: RectRow[], rowIdx: number, currentRow: RectRow): void {
    if (rowIdx !== 0) {
      const previousRow = listGet(rows, rowIdx - 1);
      currentRow.setY(previousRow.getY() + previousRow.getHeight() + this.nodeNodeSpacing);
    }
  }

  /** "Log graph after first row compaction." (RowFillingAndCompaction.java:148-152). */
  private logRow(progressMonitor: IElkProgressMonitor, layoutGraph: ElkNode, rowIdx: number): void {
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(layoutGraph, `Compacted row ${String(rowIdx)}`);
    }
    // elkjs-exclude-end
  }

  /** The reset of a row that is compacted again (RowFillingAndCompaction.java:103-112). */
  private resetRow(currentRow: RectRow, targetWidth: number): void {
    // Reset the row such that stacks are removed, blocks are not fixed.
    for (const block of currentRow.getChildren()) {
      block.setFixed(false);
      block.setPositionFixed(false);
      // Reset precalculated min/max width/heights.
      block.resetBlock();
    }
    currentRow.resetStacks();
    currentRow.setWidth(targetWidth);
  }

  /** The `rowIdx + 1 < rows.size()` block of `start` (RowFillingAndCompaction.java:111-132). */
  private updatePotentialWidthsForNextRow(currentRow: RectRow, nextRow: RectRow, targetWidth: number): void {
    this.potentialRowWidthIncreaseMax = Math.max(
      currentRow.getWidth() + this.nodeNodeSpacing + nextRow.getFirstBlock().getWidth() - targetWidth,
      this.potentialRowWidthDecreaseMax,
    );
    this.potentialRowWidthIncreaseMin = Math.min(
      currentRow.getWidth() + this.nodeNodeSpacing + nextRow.getFirstBlock().getWidth() - targetWidth,
      this.potentialRowWidthDecreaseMin,
    );
    const stacks = currentRow.getStacks();
    if (stacks.length !== 0) {
      this.potentialRowWidthDecreaseMax = Math.max(
        this.potentialRowWidthDecreaseMax,
        listGet(stacks, stacks.length - 1).getWidth() + (stacks.length <= 1 ? 0 : this.nodeNodeSpacing),
      );
      this.potentialRowWidthDecreaseMin = Math.min(
        this.potentialRowWidthDecreaseMax,
        listGet(stacks, stacks.length - 1).getWidth() + (stacks.length <= 1 ? 0 : this.nodeNodeSpacing),
      );
    }
  }

  /** The `rows.size() == 1` block of `start` (RowFillingAndCompaction.java:134-146). */
  private updatePotentialWidthsForSubrows(currentRow: RectRow): void {
    const stacks = currentRow.getStacks();
    const lastStack = listGet(stacks, stacks.length - 1);
    const lastBlock: Block = listGet(lastStack.getBlocks(), lastStack.getBlocks().length - 1);
    for (const blockRow of lastBlock.getRows()) {
      this.potentialRowWidthDecreaseMax = Math.max(
        this.potentialRowWidthDecreaseMax,
        lastBlock.getWidth() - blockRow.getWidth(),
      );
      this.potentialRowWidthDecreaseMin = Math.min(
        this.potentialRowWidthDecreaseMin,
        lastBlock.getWidth() - blockRow.getWidth(),
      );
      this.potentialRowWidthIncreaseMax = Math.max(
        this.potentialRowWidthIncreaseMax,
        blockRow.getWidth() + this.nodeNodeSpacing,
      );
      this.potentialRowWidthIncreaseMin = Math.min(
        this.potentialRowWidthIncreaseMin,
        blockRow.getWidth() + this.nodeNodeSpacing,
      );
    }
  }

  /**
   * Recalculates the width and height of the row.
   *
   * @param row The row.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/RowFillingAndCompaction.java
   */
  private adjustWidthAndHeight(row: RectRow): void {
    let maxHeight = 0;
    let maxWidth = 0;
    let index = 0;
    for (const stack of row.getStacks()) {
      stack.updateDimension();
      maxHeight = Math.max(maxHeight, stack.getHeight());
      maxWidth += stack.getWidth() + (index > 0 ? this.nodeNodeSpacing : 0);
      index++;
    }
    row.setHeight(maxHeight);
    row.setWidth(maxWidth);
  }
}
