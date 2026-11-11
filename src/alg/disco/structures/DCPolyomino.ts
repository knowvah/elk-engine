// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../common/polyomino/structures/Direction.js';
import { Polyomino } from '../../common/polyomino/structures/Polyomino.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import type { DCComponent } from '../graph/DCComponent.js';
import { DCDirection } from '../graph/DCDirection.js';
import type { DCElement } from '../graph/DCElement.js';
import type { DCExtension } from '../graph/DCExtension.js';

/**
 * This class provides a low resolution binary grid for representing {@link DCComponent DCComponents}.
 *
 * Deviations forced by the complexity limits (30 NLOC): the body of `addExtensionsToPoly`'s extension loop is the private
 * `addExtensionToPoly`, and its `switch (dir)` is the private static `toPolyDirection`; the statements and their order
 * are the Java's.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
 */
export class DCPolyomino extends Polyomino {
  /** {@link DCComponent} represented by this polyomino. */
  private representee: DCComponent;
  /** The width of this polyomino. */
  private pWidth: number;
  /** The height of this polyomino. */
  private pHeight: number;
  /** Width of one polyomino cell in the {@link DCComponent DCComponent's} coordinate system. */
  private cellSizeX: number;
  /** Height of one polyomino cell in the {@link DCComponent DCComponent's} coordinate system. */
  private cellSizeY: number;

  /**
   * Constructs a Polyomino out of a given {@link DCComponent}.
   *
   * @param comp {@link DCComponent} to be transformed
   * @param csX Step size for rasterizing the {@link DCComponent}
   * @param csY Step size for rasterizing the {@link DCComponent}
   */
  constructor(comp: DCComponent, csX: number, csY: number) {
    super();
    this.cellSizeX = csX;
    this.cellSizeY = csY;
    this.representee = comp;
    const compDims = comp.getDimensionsOfBoundingRectangle();

    this.pWidth = this.computeLowResDimension(compDims.x, this.cellSizeX);
    this.pHeight = this.computeLowResDimension(compDims.y, this.cellSizeY);

    this.reinitialize(this.pWidth, this.pHeight);

    this.fillCells();

    for (const elem of this.representee.getElements()) {
      if (elem.getExtensions().length > 0) {
        this.addExtensionsToPoly(elem);
      }
    }
  }

  /**
   * Gets the offset of the upper left corner this polyomino relative to the upper left corner of the
   * {@link DCComponent} it represents.
   *
   * @returns The offset
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getOffset(): KVector {
    const halfNeg = -0.5;
    return this.representee
      .getDimensionsOfBoundingRectangle()
      .clone()
      .sub(this.pWidth * this.cellSizeX, this.pHeight * this.cellSizeY)
      .scale(halfNeg);
  }

  // The following public methods are intended for DEBUGGING PURPOSES (s. DisCoDebugView).

  /**
   * Computes the supposed position of the upper left corner of the polyomino, if it where drawn in the same
   * coordinate system as the {@link DCComponent} it represents.
   *
   * @returns Position the polyomino would have, if it were drawn to scale on the same canvas as its associated
   *     {@link DCComponent}
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getMinCornerOnCanvas(): KVector {
    return this.representee.getMinCorner().clone().sub(this.getOffset());
  }

  /**
   * Gets the length of a side of a grid cell of the polyomino if translated to the original coordinate system of its
   * respective {@link DCComponent}.
   *
   * @returns the cellSize
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getCellSizeX(): number {
    return this.cellSizeX;
  }

  /**
   * Gets the length of a side of a grid cell of the polyomino if translated to the original coordinate system of its
   * respective {@link DCComponent}.
   *
   * @returns the cellSize
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getCellSizeY(): number {
    return this.cellSizeY;
  }

  /**
   * Gets the id of this polyomino.
   *
   * @returns The id
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getId(): number {
    return this.representee.getId();
  }

  /**
   * Sets the id of this polyomino.
   *
   * @param id The id
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  setId(id: number): void {
    this.representee.setId(id);
  }

  /**
   * Gets the {@link DCComponent} associated with this polyomino.
   *
   * @returns The associated component
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  getRepresentee(): DCComponent {
    return this.representee;
  }

  /**
   * Computes one dimension of the polyomino if given the width or height of its associated component. `(int) cellFit`
   * is the saturating `d2i` cast; `fitTruncated++` is int arithmetic.
   *
   * @param dim Width oder height of this polyomino {@link DCComponent}.
   * @returns Integral low resolution width or height of this polyomino
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  private computeLowResDimension(dim: number, cellSize: number): number {
    const cellFit = dim / cellSize;
    let fitTruncated = d2i(cellFit);
    if (cellFit > fitTruncated) {
      fitTruncated = Int32.add(fitTruncated, 1);
    }
    return fitTruncated;
  }

  /**
   * Fills the (assumedly) empty Polyomino grid cells, if they intersect with the associated {@link DCComponent}.
   *
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  private fillCells(): void {
    const compCorner = this.representee.getMinCorner();
    const polyoOffset = this.getOffset();

    const baseX = compCorner.x - polyoOffset.x;
    let curX: number;
    let curY = compCorner.y - polyoOffset.y;

    // TODO Option for filling enclosed spaces, rectilinear convex/concave hull

    for (let y = 0; y < this.pHeight; y++) {
      curX = baseX;
      for (let x = 0; x < this.pWidth; x++) {
        if (this.representee.intersects(new ElkRectangle(curX, curY, this.cellSizeX, this.cellSizeY))) {
          this.setBlocked(x, y);
        }
        curX += this.cellSizeX;
      }
      curY += this.cellSizeY;
    }
  }

  /**
   * Adds extenstions to this polyomino taken from a {@link DCElement} of the component it represents.
   *
   * @param elem an element of the component this polyomino represents
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  private addExtensionsToPoly(elem: DCElement): void {
    const extensions = elem.getExtensions();

    const compCorner = this.representee.getMinCorner();
    const polyoOffset = this.getOffset();

    let baseX = compCorner.x - polyoOffset.x;
    let baseY = compCorner.y - polyoOffset.y;

    const elemPos = elem.getBounds();

    baseX = elemPos.x - baseX;
    baseY = elemPos.y - baseY;

    for (const extension of extensions) {
      this.addExtensionToPoly(extension, baseX, baseY);
    }
  }

  /**
   * The body of the extension loop of `addExtensionsToPoly` (split out for the NLOC limit).
   *
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  private addExtensionToPoly(extension: DCExtension, baseX: number, baseY: number): void {
    const pos = extension.getOffset();
    const xe = baseX + pos.x;
    const ye = baseY + pos.y;

    const xp = d2i(xe / this.cellSizeX);
    const yp = d2i(ye / this.cellSizeY);

    const dir = extension.getDirection();
    const polyDir = DCPolyomino.toPolyDirection(dir);

    if (dir.isHorizontal()) {
      const ypPlusWidth = d2i((ye + extension.getWidth()) / this.cellSizeY);
      this.addExtension(polyDir, yp, ypPlusWidth);
      if (dir === DCDirection.WEST) {
        this.weaklyBlockArea(0, yp, xp, ypPlusWidth);
      } else {
        // direction is EAST
        this.weaklyBlockArea(xp, yp, Int32.sub(this.pWidth, 1), ypPlusWidth);
      }
    } else {
      // direction is vertical
      const xpPlusWidth = d2i((xe + extension.getWidth()) / this.cellSizeX);
      this.addExtension(polyDir, xp, xpPlusWidth);
      if (dir === DCDirection.NORTH) {
        this.weaklyBlockArea(xp, 0, xpPlusWidth, yp);
      } else {
        // direction is SOUTH
        this.weaklyBlockArea(xp, yp, xpPlusWidth, Int32.sub(this.pHeight, 1));
      }
    }
  }

  /**
   * The `switch (dir)` of `addExtensionsToPoly`: maps a {@link DCDirection} to the polyomino {@link Direction}; the
   * `default` arm is WEST.
   *
   * @see alg.disco/src/org/eclipse/elk/alg/disco/structures/DCPolyomino.java
   */
  private static toPolyDirection(dir: DCDirection): Direction {
    switch (dir) {
      case DCDirection.NORTH:
        return Direction.NORTH;
      case DCDirection.EAST:
        return Direction.EAST;
      case DCDirection.SOUTH:
        return Direction.SOUTH;
      default:
        return Direction.WEST;
    }
  }
}
