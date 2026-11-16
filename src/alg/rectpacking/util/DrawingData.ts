// SPDX-License-Identifier: EPL-2.0
import { DrawingUtil } from './DrawingUtil.js';
import type { DrawingDataDescriptor } from './DrawingDataDescriptor.js';

/**
 * Class that offers instances to save information about a possible drawing. Can be used to return multiple values that
 * are calculated for a possible drawing in a method for example. The two Java constructors are one constructor whose
 * trailing `(nextXcoord, nextYcoord)` pair is optional (both 0.0 when absent; a rest tuple keeps the parameter count
 * within the repository limit).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java
 */
export class DrawingData {
  /** Scale measure of the given drawing. */
  private scaleMeasure = 0;
  /** Width of the drawing. */
  private drawingWidth: number;
  /** Height of the drawing. */
  private drawingHeight: number;
  /** Drawing area. */
  private area = 0;
  /** Aspect ratio of the drawing. */
  private aspectRatio = 0;
  /** Desired aspect ratio. */
  private dar: number;
  /** Indicates what placement option this data belongs to or whether it belongs to a whole drawing. */
  private placementOption: DrawingDataDescriptor;
  /** If this object contains information about a possible drawing, the potential x-coordinate for the new rectangle. */
  private nextXcoordinate: number;
  /** If this object contains information about a possible drawing, the potential y-coordinate for the new rectangle. */
  private nextYcoordinate: number;

  /**
   * Creates a new object saving parameters of a drawing.
   *
   * @param dar desired aspect ratio.
   * @param drawingWidth drawing width.
   * @param drawingHeight drawing height.
   * @param placementOption placement option.
   * @param nextXcoord x-coordinate for rectangle to place.
   * @param nextYcoord y-coordinate for rectangle to place.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java
   */
  constructor(dar: number, drawingWidth: number, drawingHeight: number, placementOption: DrawingDataDescriptor);
  constructor(
    dar: number,
    drawingWidth: number,
    drawingHeight: number,
    placementOption: DrawingDataDescriptor,
    nextXcoord: number,
    nextYcoord: number,
  );
  constructor(
    dar: number,
    drawingWidth: number,
    drawingHeight: number,
    placementOption: DrawingDataDescriptor,
    ...next: number[]
  ) {
    this.dar = dar;
    this.drawingWidth = drawingWidth;
    this.drawingHeight = drawingHeight;
    this.placementOption = placementOption;
    this.nextXcoordinate = next[0] ?? 0.0;
    this.nextYcoordinate = next[1] ?? 0.0;
    this.calcAreaAspectRatioScaleMeasure();
  }

  /**
   * Calculates the area, aspect ratio, and scale measure. Sets the respective fields accordingly.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java
   */
  private calcAreaAspectRatioScaleMeasure(): void {
    if (this.drawingWidth > 0 && this.drawingHeight > 0) {
      this.area = this.drawingWidth * this.drawingHeight;
      this.aspectRatio = this.drawingWidth / this.drawingHeight;
      this.scaleMeasure = DrawingUtil.computeScaleMeasure(this.drawingWidth, this.drawingHeight, this.dar);
    }
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getDrawingWidth(): number {
    return this.drawingWidth;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  setDrawingWidth(drawingWidth: number): void {
    this.drawingWidth = drawingWidth;
    this.calcAreaAspectRatioScaleMeasure();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getDrawingHeight(): number {
    return this.drawingHeight;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  setDrawingHeight(drawingHeight: number): void {
    this.drawingHeight = drawingHeight;
    this.calcAreaAspectRatioScaleMeasure();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getScaleMeasure(): number {
    return this.scaleMeasure;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getArea(): number {
    return this.area;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getAspectRatio(): number {
    return this.aspectRatio;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getPlacementOption(): DrawingDataDescriptor {
    return this.placementOption;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  setPlacementOption(placementOption: DrawingDataDescriptor): void {
    this.placementOption = placementOption;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getNextXcoordinate(): number {
    return this.nextXcoordinate;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  setNextXcoordinate(potentialX: number): void {
    this.nextXcoordinate = potentialX;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getNextYcoordinate(): number {
    return this.nextYcoordinate;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  setNextYcoordinate(potentialY: number): void {
    this.nextYcoordinate = potentialY;
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingData.java */
  getDesiredAspectRatio(): number {
    return this.dar;
  }
}
