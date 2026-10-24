// SPDX-License-Identifier: EPL-2.0
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import type { IDataProvider } from './IDataProvider.js';

/**
 * Knows how to retrieve the position and size of comments and attachment targets. Call {@link cached} to obtain a
 * caching proxy. (Java interface with default methods; an abstract class here, R5.)
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IBoundsProvider.java
 */
export abstract class IBoundsProvider<C, T> {
  /**
   * Returns the position and size to be used for the given comment during comment attachment.
   *
   * @param comment - the comment whose bounds to retrieve.
   * @returns the comment's bounds, or `null` if the provider was unable to retrieve them.
   */
  abstract boundsForComment(comment: C): Rectangle2D.Double | null;

  /**
   * Returns the position and size to be used for the given attachment target during comment attachment.
   *
   * @param target - the target whose bounds to retrieve.
   * @returns the target's bounds, or `null` if the provider was unable to retrieve them.
   */
  abstract boundsForTarget(target: T): Rectangle2D.Double | null;

  /**
   * Does any preprocessing necessary. The default implementation does nothing.
   *
   * @param _dataProvider - the data set provider.
   * @param _includeHierarchy - whether preprocessing also covers all sub levels.
   */
  preprocess(_dataProvider: IDataProvider<C, T>, _includeHierarchy: boolean): void {
    // default: do nothing
  }

  /** Does any cleaning necessary to get the implementation ready for the next run. The default does nothing. */
  cleanup(): void {
    // default: do nothing
  }

  /**
   * Returns a bounds provider that acts as a cache around this bounds provider.
   *
   * @returns a caching bounds provider around this bounds provider.
   */
  cached(): IBoundsProvider<C, T> {
    return new CachedBoundsProvider<C, T>(this);
  }
}

/**
 * The anonymous subclass returned by Java's `IBoundsProvider.cached()`; `IBoundsProvider.this` is the `wrapped`
 * field. The caches are identity-keyed `HashMap`s in Java (no `equals`/`hashCode` override on the keys), JS `Map`s
 * here (AD-10).
 */
class CachedBoundsProvider<C, T> extends IBoundsProvider<C, T> {
  /** Cache for comment bounds. */
  private readonly commentBoundsCache: Map<C, Rectangle2D.Double | null> = new Map();
  /** Cache for target bounds. */
  private readonly targetBoundsCache: Map<T, Rectangle2D.Double | null> = new Map();

  constructor(private readonly wrapped: IBoundsProvider<C, T>) {
    super();
  }

  override boundsForComment(comment: C): Rectangle2D.Double | null {
    // The cache may actually map a comment to null if the bounds provider was unable to retrieve bounds
    if (this.commentBoundsCache.has(comment)) {
      return this.commentBoundsCache.get(comment) ?? null;
    }
    const bounds = this.wrapped.boundsForComment(comment);
    this.commentBoundsCache.set(comment, bounds);
    return bounds;
  }

  override boundsForTarget(target: T): Rectangle2D.Double | null {
    // The cache may actually map a target to null if the bounds provider was unable to retrieve bounds
    if (this.targetBoundsCache.has(target)) {
      return this.targetBoundsCache.get(target) ?? null;
    }
    const bounds = this.wrapped.boundsForTarget(target);
    this.targetBoundsCache.set(target, bounds);
    return bounds;
  }

  override preprocess(dataProvider: IDataProvider<C, T>, includeHierarchy: boolean): void {
    // Forward to wrapped provider
    this.wrapped.preprocess(dataProvider, includeHierarchy);
  }

  override cleanup(): void {
    this.commentBoundsCache.clear();
    this.targetBoundsCache.clear();

    // Forward to wrapped provider
    this.wrapped.cleanup();
  }
}
