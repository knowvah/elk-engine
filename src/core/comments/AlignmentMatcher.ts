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

/**
 * Matcher that computes how well a comment is aligned with an attachment target. The maximum alignment offset is the
 * worst raw value, an offset of 0 the best one.
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/AlignmentMatcher.java
 */
export class AlignmentMatcher<C, T> extends AbstractNormalizedMatcher<C, T> {
  private boundsProvider: IBoundsProvider<C, T> | null = null;

  // ---- Configuration ----

  /**
   * Sets the maximum alignment offset.
   *
   * @param offset - the maximum alignment offset, greater than 0.
   * @returns this object for method chaining.
   * @throws IllegalArgumentException if the offset is not positive.
   */
  withMaximumAlignmentOffset(offset: number): this {
    if (offset <= 0) {
      throw new IllegalArgumentException('Maximum alignment offset must be > 0.');
    }

    super.withBounds(offset, 0);
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

    const alignment = AlignmentMatcher.alignment(commentBounds, nodeBounds);
    return alignment === -1 ? this.getWorstRawValue() : alignment;
  }

  // ---- Alignment Calculation ----

  /**
   * Computes the alignment offset between two rectangles.
   *
   * @param bounds1 - the first rectangle (the comment).
   * @param bounds2 - the second rectangle (the target).
   * @returns the alignment offset, or -1 if the shapes are cater-cornered or the offset could not be determined.
   */
  static alignment(bounds1: Rectangle2D.Double, bounds2: Rectangle2D.Double): number {
    // Calculate where the top left and bottom right points of bounds1 lie with regard to bounds2
    const topLeftOutcode = bounds2.outcode(bounds1.x, bounds1.y);
    const bottomRightOutcode = bounds2.outcode(bounds1.x + bounds1.width, bounds1.y + bounds1.height);

    // Do not compute the alignment if the shapes are cater-cornered
    const common = bottomRightOutcode & topLeftOutcode;
    if (
      (common & TOP_LEFT) === TOP_LEFT ||
      (common & TOP_RIGHT) === TOP_RIGHT ||
      (common & BOTTOM_LEFT) === BOTTOM_LEFT ||
      (common & BOTTOM_RIGHT) === BOTTOM_RIGHT
    ) {
      return -1;
    } else {
      // The shapes relate in some way, so we'll compute the horizontal and vertical alignment
      const horizontalAlignmentOffset = AlignmentMatcher.horizontalOffset(bounds1, bounds2);
      const verticalAlignmentOffset = AlignmentMatcher.verticalOffset(bounds1, bounds2);

      if (bounds2.intersects(bounds1)) {
        // The shapes intersect, so use the minimum of the horizontal and vertical alignment
        return Math.min(horizontalAlignmentOffset, verticalAlignmentOffset);
      } else {
        return AlignmentMatcher.disjointAlignment(bounds1, bounds2, topLeftOutcode, bottomRightOutcode);
      }
    }
  }

  /** Java's local `horizontalAlignmentOffset`. */
  private static horizontalOffset(bounds1: Rectangle2D.Double, bounds2: Rectangle2D.Double): number {
    return Math.min(Math.abs(bounds2.x - bounds1.x), Math.abs(bounds2.x + bounds2.width - bounds1.x - bounds1.width));
  }

  /** Java's local `verticalAlignmentOffset`. */
  private static verticalOffset(bounds1: Rectangle2D.Double, bounds2: Rectangle2D.Double): number {
    return Math.min(Math.abs(bounds2.y - bounds1.y), Math.abs(bounds2.y + bounds2.height - bounds1.y - bounds1.height));
  }

  /** The non-intersecting `else` branch of Java's `alignment`; -1 when no case applies. */
  private static disjointAlignment(
    bounds1: Rectangle2D.Double,
    bounds2: Rectangle2D.Double,
    topLeftOutcode: number,
    bottomRightOutcode: number,
  ): number {
    const horizontalAlignmentOffset = AlignmentMatcher.horizontalOffset(bounds1, bounds2);
    const verticalAlignmentOffset = AlignmentMatcher.verticalOffset(bounds1, bounds2);

    // There are more cases here than we'd expect. The first two cover the cases where the
    // two bounds are not touching. Once that is out of the way, we check if they in fact
    // do touch

    if ((bottomRightOutcode & TOP) !== 0 || (topLeftOutcode & BOTTOM) !== 0) {
      // The shapes are above / below, so use the vertical alignment
      return horizontalAlignmentOffset;
    } else if ((bottomRightOutcode & LEFT) !== 0 || (topLeftOutcode & RIGHT) !== 0) {
      // The shapes are left / right, so use the vertical alignment
      return verticalAlignmentOffset;
    } else if (bounds1.y === bounds2.y + bounds2.height || bounds1.y + bounds1.height === bounds2.y) {
      // The shapes are top / bottom, so use the vertical alignment
      return horizontalAlignmentOffset;
    } else if (bounds1.x === bounds2.x + bounds2.width || bounds1.x + bounds1.width === bounds2.x) {
      // The shapes are left / right, so use the vertical alignment
      return verticalAlignmentOffset;
    }

    // Actually, this case shouldn't happen, but well... better be safe.
    return -1;
  }
}
