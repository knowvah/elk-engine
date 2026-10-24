// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import type { IBoundsProvider } from './IBoundsProvider.js';
import type { IDataProvider } from './IDataProvider.js';
import { IFilter } from './IFilter.js';

/**
 * A filter that considers only comments whose area is at most a configured maximum eligible for attachment. A bounds
 * provider and a maximum area must be configured.
 *
 * @typeParam C - type of comments.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/SizeFilter.java
 */
export class SizeFilter<C> extends IFilter<C> {
  private boundsProvider: IBoundsProvider<C, unknown> | null = null;
  private maxArea = -1;

  // ---- Configuration ----

  /**
   * Sets the maximum area a comment may have to be eligible.
   *
   * @param area - the maximum area, at least 0.
   * @returns this object for method chaining.
   * @throws IllegalArgumentException if the area is negative.
   */
  withMaximumArea(area: number): this {
    if (area < 0) {
      throw new IllegalArgumentException('Maximum area must be >= 0.');
    }

    this.maxArea = area;
    return this;
  }

  /**
   * Sets the bounds provider used to retrieve comment bounds.
   *
   * @param provider - the bounds provider.
   * @returns this object for method chaining.
   * @throws TypeError if the provider is null (Java: `Objects.requireNonNull` NPE).
   */
  withBoundsProvider(provider: IBoundsProvider<C, unknown> | null): this {
    if (provider === null || provider === undefined) {
      throw new TypeError('Bounds provider must not be null.');
    }

    this.boundsProvider = provider;
    return this;
  }

  private checkConfiguration(): void {
    if (this.boundsProvider === null) {
      throw new IllegalStateException('A bounds provider is required.');
    }
  }

  // ---- IFilter ----

  override preprocess(_dataProvider: IDataProvider<C, unknown>, _includeHierarchy: boolean): void {
    this.checkConfiguration();
  }

  override eligibleForAttachment(comment: C): boolean {
    // Java NPEs on a missing provider or unretrievable bounds; the TypeError here is the same unrecoverable failure.
    const bounds = (this.boundsProvider as IBoundsProvider<C, unknown>).boundsForComment(comment);
    const { height, width } = bounds as NonNullable<typeof bounds>;
    return height * width <= this.maxArea;
  }
}
