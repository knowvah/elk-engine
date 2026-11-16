// SPDX-License-Identifier: EPL-2.0
import type { RectRow } from '../util/RectRow.js';

/**
 * Offer method to expand rectangles after the calculations of the second iteration. The `RowFillingAndCompaction` of
 * the Java `@see` is Javadoc only. `expand` is `protected static` in Java (package access for the two eliminators);
 * TypeScript has no package visibility, so it is public here.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/RectangleExpansion.java
 */
export class RectangleExpansion {
  /** Private constructor (Java `private RectangleExpansion()`). */
  private constructor() {}

  /**
   * Expands rectangles after the calculations of the second iteration, so that the bounding box is filled without
   * whitespace. First, every {@link RectRow} is enlarged to fit the drawings dimensions. Then, {@link RectStack} are
   * enlarged to fit their respective {@link RectRow}. Lastly, {@link ElkNode}s are enlarged to fill their respective
   * {@link RectStack}.
   *
   * @param rows rows containing the rectangles given by {@link RectStack}s.
   * @param drawingWidth the desired width of the drawing
   * @param additionalHeight The height that is added and has to be distributed to the different rows.
   * @param nodeNodeSpacing The spacing between two nodes.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p3whitespaceelimination/RectangleExpansion.java
   */
  static expand(
    rows: readonly RectRow[],
    drawingWidth: number,
    additionalHeight: number,
    _nodeNodeSpacing: number,
  ): void {
    const heightPerRow = additionalHeight / rows.length;
    let index = 0;
    for (const row of rows) {
      row.setY(row.getY() + heightPerRow * index);
      row.expand(drawingWidth, heightPerRow);
      index++;
    }
  }
}
