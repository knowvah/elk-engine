// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { compare } from '../../../java/lang/DoubleCompare.js';
import { GreedyRectangleStripOverlapRemover } from './GreedyRectangleStripOverlapRemover.js';
import type { IRectangleStripOverlapRemovalStrategy } from './IRectangleStripOverlapRemovalStrategy.js';
import { OverlapRemovalDirection } from './RectangleStripOverlapRemoverOverlapRemovalDirection.js';
import { RectangleNode } from './RectangleStripOverlapRemoverRectangleNode.js';

export { OverlapRemovalDirection, RectangleNode };

/** The default gap to be left between labels. */
const DEFAULT_GAP = 5;

/**
 * Main class for removing overlaps between rectangles that have a fixed position along one of the two dimensions. A
 * typical use case is to place labels of northern ports that might not be placed such that there is enough space for
 * labels, which can result in overlaps. This is resolved by choosing y positions that avoid overlaps.
 *
 * This class can be used to remove horizontal or vertical overlaps. The first case will move labels along the vertical
 * axis to remove overlaps, the second case will move labels along the horizontal axis. The way in which labels are
 * moved is specified by the {@link OverlapRemovalDirection}; the gap is a lower bound on the distance between labels
 * after overlap removal; the start coordinate is the coordinate of the first label encountered when moving along the
 * overlap removal direction.
 *
 * Obtain an instance with {@link createForDirection}, configure it with the `withX(...)` methods, add rectangles with
 * {@link addRectangle} and call {@link removeOverlaps}. This class builds the overlap graph; the actual overlap removal
 * is performed by an overlap removal strategy working in a coordinate system where horizontal overlaps are removed by
 * increasing the y coordinate of labels, with the first row at y coordinate zero. All cases are transformed to this
 * coordinate system, and the results are transformed back by this class.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/overlaps/RectangleStripOverlapRemover.java
 */
export class RectangleStripOverlapRemover {
  /** The direction in which to move rectangles to remove overlaps. */
  #overlapRemovalDirection!: OverlapRemovalDirection;
  /** Vertical gap to be left between labels for them to not be considered overlapping. */
  #gapVertical: number = DEFAULT_GAP;
  /** Horizontal gap to be left between labels for them to not be considered overlapping. */
  #gapHorizontal: number = DEFAULT_GAP;
  /** The coordinate where the first rectangles, viewed along the overlap removal direction, are placed. */
  #startCoordinate = 0;
  /** The overlap strategy to use to actually remove overlaps. */
  #overlapRemovalStrategy: IRectangleStripOverlapRemovalStrategy | null = null;
  /** Rectangle nodes sorted by the x coordinate of their rectangle. */
  readonly #rectangleNodes: RectangleNode[] = [];

  private constructor() {}

  // Creation

  /**
   * Create a new remover that removes overlaps between rectangles by moving them in the given direction.
   *
   * @param direction the direction to move rectangles in.
   * @returns the new remover.
   */
  static createForDirection(direction: OverlapRemovalDirection): RectangleStripOverlapRemover {
    const remover = new RectangleStripOverlapRemover();
    remover.#overlapRemovalDirection = direction;
    return remover;
  }

  // Configuration

  /** Configures the gap to be left between rectangles. Returns this instance to enable method chaining. */
  withGap(theHorizontalGap: number, theVerticalGap: number): this {
    this.#gapHorizontal = theHorizontalGap;
    this.#gapVertical = theVerticalGap;
    return this;
  }

  /** Configures the start coordinate. Returns this instance to enable method chaining. */
  withStartCoordinate(coordinate: number): this {
    this.#startCoordinate = coordinate;
    return this;
  }

  /**
   * Sets the overlap removal strategy to be used to actually remove overlaps. Returns this instance to enable method
   * chaining.
   */
  withOverlapRemovalStrategy(strategy: IRectangleStripOverlapRemovalStrategy): this {
    this.#overlapRemovalStrategy = strategy;
    return this;
  }

  /**
   * Adds the given rectangle to the list of rectangles to remove overlaps between. Returns this instance to enable
   * method chaining.
   */
  addRectangle(rectangle: ElkRectangle): this {
    this.#rectangleNodes.push(new RectangleNode(rectangle, this.#importRectangle(rectangle)));
    return this;
  }

  // Getters

  /** Returns the horizontal gap to be left between rectangles. */
  getHorizontalGap(): number {
    return this.#gapHorizontal;
  }

  /** Returns the vertical gap to be left between rectangles (Java's Javadoc says "horizontal" here). */
  getVerticalGap(): number {
    return this.#gapVertical;
  }

  /** Returns the set of rectangle nodes in the rectangle overlap graph, sorted by their rectangle's x coordinate. */
  getRectangleNodes(): RectangleNode[] {
    return this.#rectangleNodes;
  }

  // Coordinate Transformation

  /**
   * Returns a rectangle which represents the given rectangle when transformed into the coordinate space we will be
   * working in.
   */
  #importRectangle(rectangle: ElkRectangle): ElkRectangle {
    switch (this.#overlapRemovalDirection) {
      case OverlapRemovalDirection.UP:
      case OverlapRemovalDirection.DOWN:
        return rectangle;

      case OverlapRemovalDirection.LEFT:
      case OverlapRemovalDirection.RIGHT:
        return new ElkRectangle(rectangle.y, 0, rectangle.height, rectangle.width);

      default:
        // Java: `assert false; return null;` (RectangleStripOverlapRemover.java, importRectangle). Unreachable (the
        // enum is closed); assertions are omitted (KVector.ts precedent, no devAssert helper) and `null` is not
        // representable in the return type, so the input rectangle is returned. Uncoverable.
        return rectangle;
    }
  }

  /**
   * Applies the movement computed for the given rectangle node's rectangle to its original rectangle, paying
   * attention to the overlap removal direction. (`stripSize` is unused, as in Java.)
   */
  #exportRectangle(rectangleNode: RectangleNode, _stripSize: number): void {
    const rectangle = rectangleNode.rectangle;
    const originalRectangle = rectangleNode.originalRectangle;

    switch (this.#overlapRemovalDirection) {
      case OverlapRemovalDirection.UP:
        originalRectangle.y = this.#startCoordinate - rectangle.height - rectangle.y;
        break;
      case OverlapRemovalDirection.DOWN:
        originalRectangle.y += this.#startCoordinate;
        break;
      case OverlapRemovalDirection.LEFT:
        originalRectangle.x = this.#startCoordinate - rectangle.height - rectangle.y;
        break;
      case OverlapRemovalDirection.RIGHT:
        originalRectangle.x = this.#startCoordinate + rectangle.y;
        break;
    }
  }

  // Actual Algorithm

  /**
   * Triggers the overlap removal algorithm.
   *
   * @returns the height of the resulting label strip when removing horizontal overlaps, or the width of the resulting
   *          label strip when removing vertical overlaps.
   */
  removeOverlaps(): number {
    // Check if an overlap removal strategy is used; if not, fall back on the greedy strategy
    this.#overlapRemovalStrategy ??= new GreedyRectangleStripOverlapRemover();

    // Sort the list of rectangles (Array.prototype.sort is stable, like List.sort)
    this.#rectangleNodes.sort(RectangleStripOverlapRemover.#compareLeftRectangleBorders);

    // Compute and remove overlaps
    this.#computeOverlaps();
    const stripSize = this.#overlapRemovalStrategy.removeOverlaps(this);

    // Apply the results
    for (const node of this.#rectangleNodes) {
      this.#exportRectangle(node, stripSize);
    }

    return stripSize;
  }

  /**
   * Populates the {@link RectangleNode.overlappingNodes} lists. This method uses a scanline algorithm that remembers
   * which rectangles currently intersect the scanline. As it encounters a new rectangle, it first removes rectangles
   * that do not intersect the scanline anymore and then adds overlaps between all currently intersecting rectangles.
   */
  #computeOverlaps(): void {
    // Java: `Sets.newTreeSet(compareRightRectangleBorders)`. Kept as an array sorted by right border; like a TreeSet,
    // an element that compares 0 against a present one is not added (pinned by the oracle's tie-* rows).
    const intersectingNodes: RectangleNode[] = [];

    // We iterate over the nodes according to their x coordinate
    for (const currNode of this.#rectangleNodes) {
      // Move the scanline to the new node's left border
      const scanlinePos = currNode.rectangle.x;

      // Remove intersecting node which do not intersect the scanline anymore
      while (intersectingNodes.length > 0) {
        const intersectingRectangle = intersectingNodes[0]!;

        if (intersectingRectangle.rectangle.x + intersectingRectangle.rectangle.width < scanlinePos) {
          intersectingNodes.shift();
        } else {
          // Since we iterate over intersecting nodes by the coordinate of their right border, once we have found a
          // node the scanline has not moved past, we can stop looking
          break;
        }
      }

      // Add overlaps between the currently intersecting nodes and the new node
      for (const intersectingNode of intersectingNodes) {
        intersectingNode.overlappingNodes.push(currNode);
        currNode.overlappingNodes.push(intersectingNode);
      }

      // The new node is now part of the set of rectangles that intersect the scanline
      RectangleStripOverlapRemover.#addSorted(intersectingNodes, currNode);
    }
  }

  // Utility Methods

  /** TreeSet.add semantics over a sorted array: no insertion when an element compares equal. */
  static #addSorted(sorted: RectangleNode[], node: RectangleNode): void {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const cmp = RectangleStripOverlapRemover.#compareRightRectangleBorders(sorted[mid]!, node);
      if (cmp === 0) {
        return;
      }
      if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    sorted.splice(low, 0, node);
  }

  /** Compares two rectangles by the coordinates of their left borders. */
  static #compareLeftRectangleBorders(rn1: RectangleNode, rn2: RectangleNode): number {
    return compare(rn1.rectangle.x, rn2.rectangle.x);
  }

  /** Compares two rectangles by the coordinates of their right borders. */
  static #compareRightRectangleBorders(rn1: RectangleNode, rn2: RectangleNode): number {
    return compare(rn1.rectangle.x + rn1.rectangle.width, rn2.rectangle.x + rn2.rectangle.width);
  }
}
