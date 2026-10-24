// SPDX-License-Identifier: EPL-2.0
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractNormalizedMatcher } from './AbstractNormalizedMatcher.js';
import type { AbstractNormalizedMatcherNormalizationFunction } from './AbstractNormalizedMatcherNormalizationFunction.js';
import type { IBoundsProvider } from './IBoundsProvider.js';
import type { IDataProvider } from './IDataProvider.js';

// Constants to easily check where points lie with respect to a rectangle
const TOP = Rectangle2D.OUT_TOP;
const LEFT = Rectangle2D.OUT_LEFT;
const RIGHT = Rectangle2D.OUT_RIGHT;
const BOTTOM = Rectangle2D.OUT_BOTTOM;
const TOP_LEFT = Rectangle2D.OUT_TOP | Rectangle2D.OUT_LEFT;
const BOTTOM_LEFT = Rectangle2D.OUT_BOTTOM | Rectangle2D.OUT_LEFT;
const TOP_RIGHT = Rectangle2D.OUT_TOP | Rectangle2D.OUT_RIGHT;
const BOTTOM_RIGHT = Rectangle2D.OUT_BOTTOM | Rectangle2D.OUT_RIGHT;

/** Whether both outcodes contain every bit of the (combined) mask. */
function bothContain(topLeftOutcode: number, bottomRightOutcode: number, mask: number): boolean {
  return (topLeftOutcode & mask) === mask && (bottomRightOutcode & mask) === mask;
}

/** Whether both outcodes contain at least one bit of the (single-bit) mask. */
function bothHave(topLeftOutcode: number, bottomRightOutcode: number, mask: number): boolean {
  return (topLeftOutcode & mask) !== 0 && (bottomRightOutcode & mask) !== 0;
}

/**
 * Matcher that computes the distance between a comment and an attachment target. The maximum attachment distance
 * is the worst raw value, a distance of 0 the best one.
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/DistanceMatcher.java
 */
export class DistanceMatcher<C, T> extends AbstractNormalizedMatcher<C, T> {
  private boundsProvider: IBoundsProvider<C, T> | null = null;

  // ---- Configuration ----

  /**
   * Sets the maximum distance a comment may have to a target.
   *
   * @param distance - the maximum attachment distance, at least 0.
   * @returns this object for method chaining.
   * @throws IllegalArgumentException if the distance is negative.
   */
  withMaximumAttachmentDistance(distance: number): this {
    if (distance < 0) {
      throw new IllegalArgumentException('Maximum attachment distance must be >= 0.');
    }

    super.withBounds(distance, 0);
    return this;
  }

  /**
   * Sets the bounds provider.
   *
   * @param provider - the bounds provider.
   * @returns this object for method chaining.
   * @throws TypeError if the provider is null (Java: `Objects.requireNonNull` NPE).
   */
  withBoundsProvider(provider: IBoundsProvider<C, T> | null): this {
    if (provider === null || provider === undefined) {
      throw new TypeError('Bounds provider must not be null.');
    }

    this.boundsProvider = provider;
    return this;
  }

  override withNormalizationFunction(
    normalizationFunction: AbstractNormalizedMatcherNormalizationFunction | null,
  ): this {
    super.withNormalizationFunction(normalizationFunction);
    return this;
  }

  private checkConfiguration(): void {
    if (this.boundsProvider === null) {
      throw new IllegalStateException('A bounds provider is required.');
    }
  }

  // ---- IMatcher ----

  override preprocess(dataProvider: IDataProvider<C, T>, includeHierarchy: boolean): void {
    super.preprocess(dataProvider, includeHierarchy);
    this.checkConfiguration();
  }

  // ---- AbstractNormalizedMatcher ----

  override raw(comment: C, target: T): number {
    // Java NPEs on a missing provider or unretrievable bounds; the TypeError here is the same unrecoverable failure.
    const provider = this.boundsProvider as IBoundsProvider<C, T>;
    const commentBounds = provider.boundsForComment(comment) as Rectangle2D.Double;
    const nodeBounds = provider.boundsForTarget(target) as Rectangle2D.Double;

    const distance = DistanceMatcher.distance(commentBounds, nodeBounds);
    return distance === -1 ? this.getWorstRawValue() : distance;
  }

  // ---- Distance Calculation ----

  /**
   * Computes the distance between two rectangles. Note the formulas for the four side-by-side cases are kept verbatim
   * from Java, including their asymmetry.
   *
   * @param bounds1 - the first rectangle (the comment).
   * @param bounds2 - the second rectangle (the target).
   * @returns the distance, 0 if they intersect or touch, or -1 if it could not be determined.
   */
  static distance(bounds1: Rectangle2D.Double, bounds2: Rectangle2D.Double): number {
    // Check if the bounds intersect
    if (bounds1.intersects(bounds2)) {
      return 0;
    }

    // Check where the top left and bottom right corners of shape 1 lie with respect to shape 2
    const topLeftOutcode = bounds2.outcode(bounds1.x, bounds1.y);
    const bottomRightOutcode = bounds2.outcode(bounds1.x + bounds1.width, bounds1.y + bounds1.height);

    // How exactly we compute the distance depends on where the two corners of bounds1 lie with
    // respect to bounds2
    const diagonal = DistanceMatcher.diagonalDistance(bounds1, bounds2, topLeftOutcode, bottomRightOutcode);
    if (diagonal !== null) {
      return diagonal;
    }
    const side = DistanceMatcher.sideDistance(bounds1, bounds2, topLeftOutcode, bottomRightOutcode);
    if (side !== null) {
      return side;
    }

    // At this point we know that the outcodes are not what we expect and that the two bounds don't
    // intersect. They may be touching...
    return DistanceMatcher.touchingDistance(bounds1, bounds2);
  }

  /** The first four branches of Java's `distance`: both corners lie in the same diagonal region; `null` if none. */
  private static diagonalDistance(
    bounds1: Rectangle2D.Double,
    bounds2: Rectangle2D.Double,
    topLeftOutcode: number,
    bottomRightOutcode: number,
  ): number | null {
    if (bothContain(topLeftOutcode, bottomRightOutcode, TOP_LEFT)) {
      // Return distance between shape1.bottomRight and shape2.topLeft
      return DistanceMatcher.pointDistance(bounds1.x + bounds1.width, bounds1.y + bounds1.height, bounds2.x, bounds2.y);
    } else if (bothContain(topLeftOutcode, bottomRightOutcode, BOTTOM_LEFT)) {
      // Return distance between shape1.topRight and shape2.bottomLeft
      return DistanceMatcher.pointDistance(bounds1.x + bounds1.width, bounds1.y, bounds2.x, bounds2.y + bounds2.height);
    } else if (bothContain(topLeftOutcode, bottomRightOutcode, TOP_RIGHT)) {
      // Return distance between shape1.bottomLeft and shape2.topRight
      return DistanceMatcher.pointDistance(bounds1.x, bounds1.y + bounds1.height, bounds2.x + bounds2.width, bounds2.y);
    } else if (bothContain(topLeftOutcode, bottomRightOutcode, BOTTOM_RIGHT)) {
      // Return distance between shape1.topLeft and shape2.bottomRight
      return DistanceMatcher.pointDistance(bounds1.x, bounds1.y, bounds2.x + bounds2.width, bounds2.y + bounds2.height);
    }
    return null;
  }

  /** The last four branches of the outcode ladder in Java's `distance`: both corners on the same side; `null` if none. */
  private static sideDistance(
    bounds1: Rectangle2D.Double,
    bounds2: Rectangle2D.Double,
    topLeftOutcode: number,
    bottomRightOutcode: number,
  ): number | null {
    if (bothHave(topLeftOutcode, bottomRightOutcode, LEFT)) {
      // Return distance between shape1.right and shape2.left
      return bounds2.x - bounds1.x + bounds1.width;
    } else if (bothHave(topLeftOutcode, bottomRightOutcode, RIGHT)) {
      // Return distance between shape1.left and shape2.right
      return bounds1.x - bounds2.x - bounds2.width;
    } else if (bothHave(topLeftOutcode, bottomRightOutcode, TOP)) {
      // Return distance between shape1.bottom and shape2.top
      return bounds2.y - bounds1.y + bounds1.height;
    } else if (bothHave(topLeftOutcode, bottomRightOutcode, BOTTOM)) {
      // Return distance between shape1.top and shape2.bottom
      return bounds1.y - bounds2.y - bounds2.height;
    }
    return null;
  }

  /** The tail of Java's `distance`: 0 if the borders touch, -1 ("all hope is lost") otherwise. */
  private static touchingDistance(bounds1: Rectangle2D.Double, bounds2: Rectangle2D.Double): number {
    if (bounds2.x <= bounds1.x + bounds1.width && bounds2.x + bounds2.width >= bounds1.x) {
      // They overlap horizontally, check if their borders touch
      if (bounds2.y + bounds2.height === bounds1.y || bounds2.y === bounds1.y + bounds1.height) {
        return 0;
      }
    } else if (bounds2.y <= bounds1.y + bounds1.height && bounds2.y + bounds2.height >= bounds1.y) {
      // They overlap vertically, check if their borders touch
      if (bounds2.x + bounds2.width === bounds1.x || bounds2.x === bounds1.x + bounds1.width) {
        return 0;
      }
    }

    // At this point, all hope is lost...
    return -1;
  }

  /** Java's private overload `distance(x1, y1, x2, y2)`: the Euclidean distance between two points. */
  private static pointDistance(x1: number, y1: number, x2: number, y2: number): number {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }
}
