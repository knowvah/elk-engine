// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { RectRow } from './RectRow.js';

/**
 * Class that offers different methods related to coordinates. The two Java overloads of `calculateDimensions` are
 * `calculateDimensions` (rows) and `calculateDimensionsOfRectangles` (rectangles): both parameters are lists, which
 * TypeScript cannot tell apart at run time (translation-rules 6.5).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingUtil.java
 */
export class DrawingUtil {
  /** Private constructor (Java `private DrawingUtil()`). */
  private constructor() {}

  /**
   * Computes the altered scale measure for a given height and width according to the desired aspect ratio.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingUtil.java
   */
  static computeScaleMeasure(width: number, height: number, dar: number): number {
    return Math.min(dar / width, 1 / height);
  }

  /**
   * Resets coordinates of every element to (0,0).
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingUtil.java
   */
  static resetCoordinates(graph: Iterable<ElkNode>): void {
    for (const node of graph) {
      node.setLocation(0, 0);
    }
  }

  /**
   * Calculates the maximum width and height for the given list of {@link RectRow}s. Java `calculateDimensions(List<RectRow>,
   * double)`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingUtil.java
   */
  static calculateDimensions(rows: Iterable<RectRow>, nodeNodeSpacing: number): KVector {
    let maxWidth = 0;
    let newHeight = 0;
    let index = 0;
    for (const row of rows) {
      maxWidth = Math.max(maxWidth, row.getWidth());
      newHeight += row.getHeight() + (index > 0 ? nodeNodeSpacing : 0);
      index++;
    }
    return new KVector(maxWidth, newHeight);
  }

  /**
   * Calculates the maximum width and height for the given list of rectangles. Java `calculateDimensions(List<ElkNode>)`.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingUtil.java
   */
  static calculateDimensionsOfRectangles(rectangles: Iterable<ElkNode>): KVector {
    let maxWidth = 0;
    let maxHeight = 0;
    for (const node of rectangles) {
      maxWidth = Math.max(node.getWidth() + node.getX(), maxWidth);
      maxHeight = Math.max(node.getHeight() + node.getY(), maxHeight);
    }
    return new KVector(maxWidth, maxHeight);
  }
}
