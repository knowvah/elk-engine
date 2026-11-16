// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { DrawingData } from '../util/DrawingData.js';

/**
 * Class that offers methods for small operations in the first iteration. The `protected static` methods of Java are
 * public static here (TypeScript has no package visibility; `AreaApproximation` is the only caller).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
 */
export class Calculations {
  /** Private constructor (Java `private Calculations()`). */
  private constructor() {}

  /**
   * Calculates the drawing width for placement options LPR and LPB.
   *
   * @param drawingWidth The width of drawing before placement of new rectangle.
   * @param x The potential x-coordinate of new rectangle.
   * @param width The width of new rectangle.
   * @returns The width of drawing including new rectangle in case LPR and LPB.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static getWidthLPRorLPB(drawingWidth: number, x: number, width: number): number {
    return Math.max(drawingWidth, x + width);
  }

  /**
   * Calculates the drawing height for placement options LPR and LPB.
   *
   * @param drawingHeight The height of drawing before placement of new rectangle.
   * @param y The potential y-coordinate of new rectangle.
   * @param height The height of new rectangle.
   * @returns The height of drawing including new rectangle in case LPR and LPB.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static getHeightLPRorLPB(drawingHeight: number, y: number, height: number): number {
    return Math.max(drawingHeight, y + height);
  }

  /**
   * Calculates the y-coordinate after the shift of the rectangle to be placed right of lastPlaced.
   *
   * @param x The x-coordinate of the rectangle to be placed.
   * @param placedRects A list of already placed rectangles.
   * @param lastPlaced The rectangle that was placed most recently.
   * @returns The y-coordinate after the shift of the rectangle to be placed right of lastPlaced
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static calculateYforLPR(
    x: number,
    placedRects: readonly ElkNode[],
    lastPlaced: ElkNode,
    nodeNodeSpacing: number,
  ): number {
    let closestUpperNeighbor: ElkNode | null = null;
    let closestNeighborBottomBorder = 0;

    // find neighbors that lay between the upper and lower border of the rectangle to be placed.
    for (const placedRect of placedRects) {
      const placedRectBottomBorder = placedRect.getY() + placedRect.getHeight();
      if (Calculations.verticalOrderConstraint(placedRect, x, nodeNodeSpacing)) {
        // is closest neighbor?
        if (closestUpperNeighbor === null) {
          closestUpperNeighbor = placedRect;
        } else if (lastPlaced.getY() - placedRectBottomBorder < lastPlaced.getY() - closestNeighborBottomBorder) {
          closestUpperNeighbor = placedRect;
        }
        closestNeighborBottomBorder = closestUpperNeighbor.getY() + closestUpperNeighbor.getHeight();
      }
    }

    // no neighbor yet
    if (closestUpperNeighbor === null) {
      return 0;
    }
    // else, choose closest neighbors bottom border
    return closestNeighborBottomBorder + nodeNodeSpacing;
  }

  /**
   * Calculates the x-coordinate after shift of the rectangle to be placed below the last placed rectangle.
   *
   * @param placedRects A list of already placed rectangles.
   * @param y The y-coordinate of the rectangle to be placed.
   * @param lastPlaced The most recently placed rectangle.
   * @returns The x-coordinate after shift of the rectangle to be placed below lastPlaced.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static calculateXforLPB(
    y: number,
    placedRects: readonly ElkNode[],
    lastPlaced: ElkNode,
    nodeNodeSpacing: number,
  ): number {
    let closestLeftNeighbour: ElkNode | null = null;
    let closestNeighborRightBorder = 0;

    // Find neighbors that lay in between the height of the rectangle to be placed.
    for (const placedRect of placedRects) {
      const placedRectRightBorder = placedRect.getX() + placedRect.getWidth();
      if (Calculations.horizontalOrderConstraint(placedRect, y, nodeNodeSpacing)) {
        // Is closest neighbor?
        if (closestLeftNeighbour === null) {
          closestLeftNeighbour = placedRect;
        } else if (lastPlaced.getX() - placedRectRightBorder < lastPlaced.getX() - closestNeighborRightBorder) {
          closestLeftNeighbour = placedRect;
        }
        closestNeighborRightBorder = closestLeftNeighbour.getX() + closestLeftNeighbour.getWidth();
      }
    }

    // No neighbor yet.
    if (closestLeftNeighbour === null) {
      return 0;
    }
    // Else, choose closest neighbors right border
    return closestNeighborRightBorder + nodeNodeSpacing;
  }

  /**
   * Calculates the area taken up by the last placed rectangle and the rectangle to place for the
   * {@link DrawingDataDescriptor} last placed right.
   *
   * @param lastPlaced The last placed rectangle.
   * @param toPlace The rectangle to be placed.
   * @param lprOpt The drawing data containing the coordinates of the rectangle to be placed.
   * @returns The area taken up by the two given rectangles.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static calculateAreaLPR(lastPlaced: ElkNode, toPlace: ElkNode, lprOpt: DrawingData): number {
    const lastPlacedBottomBorder = lastPlaced.getY() + lastPlaced.getHeight();
    const toPlaceBottomBorder = lprOpt.getNextYcoordinate() + toPlace.getHeight();
    const maxYLPR = Math.max(lastPlacedBottomBorder, toPlaceBottomBorder);
    const heightLPR = maxYLPR - Math.min(lastPlaced.getY(), lprOpt.getNextYcoordinate());
    const widthLPR = lprOpt.getNextXcoordinate() + toPlace.getWidth() - lastPlaced.getX();
    return widthLPR * heightLPR;
  }

  /**
   * Calculates the area taken up by the last placed rectangle and the rectangle to place for the
   * {@link DrawingDataDescriptor} last placed below.
   *
   * @param lastPlaced The last placed rectangle.
   * @param toPlace The rectangle to be placed.
   * @param lpbOpt The drawing data containing the coordinates of the rectangle to be placed.
   * @returns The area taken up by the two given rectangles.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  static calculateAreaLPB(lastPlaced: ElkNode, toPlace: ElkNode, lpbOpt: DrawingData): number {
    const lastPlacedRightBorder = lastPlaced.getX() + lastPlaced.getWidth();
    const toPlaceRightBorder = lpbOpt.getNextXcoordinate() + toPlace.getWidth();
    const maxXLPB = Math.max(lastPlacedRightBorder, toPlaceRightBorder);
    const widthLPB = maxXLPB - Math.min(lastPlaced.getX(), lpbOpt.getNextXcoordinate());
    const heightLPB = lpbOpt.getNextYcoordinate() + toPlace.getHeight() - lastPlaced.getY();
    return widthLPB * heightLPB;
  }

  /**
   * Checks whether the placedRect produces an vertical order constraint regarding the order. If toPlace is placed
   * left of placedRect, toPlace can at most be placed at the bottom border of placedRect.
   *
   * @param placedRect The already placed rectangle.
   * @param x The x-coordinate of the rectangle to be placed.
   * @returns True, if the placedRect produces a constraint. False otherwise.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  private static verticalOrderConstraint(placedRect: ElkNode, x: number, nodeNodeSpacing: number): boolean {
    return x < placedRect.getX() + placedRect.getWidth() + nodeNodeSpacing;
  }

  /**
   * Checks whether the placedRect produces an horizontal order constraint regarding the order. If toPlace is placed
   * above of placedRect, toPlace can at most be placed at the right border of placedRect.
   *
   * @param placedRect The already placed rectangle.
   * @param yCoordRectToPlace The y-coordinate of the rectangle to be placed.
   * @returns True, if the placedRect produces a constraint. False otherwise.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/Calculations.java
   */
  private static horizontalOrderConstraint(
    placedRect: ElkNode,
    yCoordRectToPlace: number,
    nodeNodeSpacing: number,
  ): boolean {
    return yCoordRectToPlace < placedRect.getY() + placedRect.getHeight() + nodeNodeSpacing;
  }
}
