// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { Block } from '../util/Block.js';
import { RectRow } from '../util/RectRow.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';

/** Java `List.get(index)` on an `ArrayList`: an index outside `[0, size)` throws `IndexOutOfBoundsException`. */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index] as T;
}

/** `rect.getParent()` where Java dereferences it: a node without parent is a `NullPointerException` (`TypeError`, D10). */
function parentOf(rect: ElkNode): ElkNode {
  const parent = rect.getParent();
  if (parent === null) {
    throw new TypeError(
      'Cannot invoke "org.eclipse.elk.graph.ElkNode.getProperty(org.eclipse.elk.graph.properties.IProperty)" because the return value of "org.eclipse.elk.graph.ElkNode.getParent()" is null',
    );
  }
  return parent;
}

/**
 * Class that offers methods that calculate the initial placement of rectangles in {@link RowFillingAndCompaction}.
 *
 * `place` is `protected static` in Java (called by the package's `RowFillingAndCompaction` and `SimplePlacement`);
 * TypeScript has no package visibility, so it is public here.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/InitialPlacement.java
 */
export class InitialPlacement {
  /** Private constructor (Java `private InitialPlacement()`). */
  private constructor() {}

  /**
   * Simply places the rectangles as {@link RectRow}s onto the drawing area, bounded by the calculated bounding box
   * width.
   *
   * @param rectangles The rectangles to be placed.
   * @param boundingWidth The width of the bounding box.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @return returns the rows in which the rectangles were placed.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/InitialPlacement.java
   */
  static place(rectangles: Iterable<ElkNode>, boundingWidth: number, nodeNodeSpacing: number): RectRow[] {
    const rows: RectRow[] = [];
    let row = new RectRow(0, nodeNodeSpacing);
    let drawingHeight = 0;
    row.addBlock(new Block(0, 0, row, nodeNodeSpacing));
    let currentWidth = 0;

    for (const rect of rectangles) {
      // Check whether current rectangle can be added to the last block
      let block = row.getLastBlock();
      const potentialRowWidth =
        currentWidth +
        rect.getWidth() +
        (listGet(row.getChildren(), 0).getChildren().length === 0 ? 0 : nodeNodeSpacing);
      if (potentialRowWidth > boundingWidth || rect.getProperty(RectPackingOptions.IN_NEW_ROW)) {
        // Add rect in new block in new row.
        currentWidth = 0;
        drawingHeight += row.getHeight() + nodeNodeSpacing;
        rows.push(row);
        row = new RectRow(drawingHeight, nodeNodeSpacing);
        block = new Block(0, row.getY(), row, nodeNodeSpacing);
        row.addBlock(block);
        currentWidth = 0;
      }

      InitialPlacement.addRect(row, block, rect, nodeNodeSpacing);
      currentWidth = rect.getX() + rect.getWidth();
    }
    rows.push(row);
    return rows;
  }

  /** The block-or-new-block decision at the end of the rectangle loop of `place` (InitialPlacement.java:68-77). */
  private static addRect(row: RectRow, block: Block, rect: ElkNode, nodeNodeSpacing: number): void {
    if (
      block.getChildren().length === 0 ||
      (!parentOf(rect).getProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION) &&
        InitialPlacement.isSimilarHeight(block, rect, nodeNodeSpacing))
    ) {
      // Every rect is in its own block before comapction.
      block.addChild(rect);
    } else {
      // Case rect does not fit in block. Add new block to the right of it.
      const newBlock = new Block(block.getX() + block.getWidth() + nodeNodeSpacing, row.getY(), row, nodeNodeSpacing);
      row.addBlock(newBlock);
      newBlock.addChild(rect);
    }
  }

  /**
   * Check whether a rectangle has a similar height as the other rectangles in the block and add it too it depending on
   * the available space.
   *
   * @param row The row.
   * @param block The block.
   * @param rect The rectangle.
   * @param boundingWidth The bounding width of the row.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @return true, if the rectangle was successfully added.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/InitialPlacement.java
   */
  static placeRectInBlock(
    row: RectRow,
    block: Block,
    rect: ElkNode,
    boundingWidth: number,
    nodeNodeSpacing: number,
  ): boolean {
    if (InitialPlacement.isSimilarHeight(block, rect, nodeNodeSpacing)) {
      if (
        block.getLastRowNewX() + rect.getWidth() + nodeNodeSpacing <= boundingWidth &&
        (block.getLastRowY() - row.getY() + rect.getHeight() <= row.getHeight() || row.getChildren().length === 1)
      ) {
        // Case it fits in a row in the same block
        block.addChild(rect);
        return true;
      } else if (
        block.getX() + rect.getWidth() <= boundingWidth &&
        block.getY() + block.getHeight() + rect.getHeight() + nodeNodeSpacing <= row.getY() + row.getHeight()
      ) {
        // Case a new row in the block can be opened
        block.addChildInNewRow(rect);
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether a rectangle has a similar height as the other rectangles in a block.
   *
   * @param block The block.
   * @param rect The rectangle.
   * @param nodeNodeSpacing The spacing between two nodes (unused, as in Java).
   * @return true if the height of the rectangle is similar to the rectangles in the block.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/InitialPlacement.java
   */
  static isSimilarHeight(block: Block, rect: ElkNode, nodeNodeSpacing: number): boolean {
    void nodeNodeSpacing;
    if (rect.getHeight() >= block.getSmallestRectHeight() && rect.getHeight() <= block.getMinHeight()) {
      return true;
    } else {
      return block.getAverageHeight() * 0.5 <= rect.getHeight() && block.getAverageHeight() * 1.5 >= rect.getHeight();
    }
  }
}
