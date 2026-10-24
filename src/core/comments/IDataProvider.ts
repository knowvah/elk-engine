// SPDX-License-Identifier: EPL-2.0

/**
 * Provides access to the objects that represent comments and the objects that represent possible attachment targets.
 * If the data structure comments and targets rely in can have sub-hierarchies, access to those is granted through
 * providing further data providers.
 *
 * By default, all targets are returned as possible attachment targets for all comments. Clients may restrict the set
 * of possible targets for any given comment by overriding {@link provideTargetsFor}. Call {@link cached} to obtain a
 * cached version. (Java interface with default methods; an abstract class here, R5.)
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IDataProvider.java
 */
export abstract class IDataProvider<C, T> {
  /**
   * Provides the set of comments that the comment attachment code should run on.
   *
   * @returns all comments.
   */
  abstract provideComments(): Iterable<C>;

  /**
   * Provides the set of all possible attachment targets that comments might be attached to.
   *
   * @returns all possible attachment targets.
   */
  abstract provideTargets(): Iterable<T>;

  /**
   * Provides all attachment targets the given comment can be attached to. The default implementation simply delegates
   * to {@link provideTargets}.
   *
   * @param _comment - the comment to provide valid attachment targets for.
   * @returns the valid attachment targets for the given comment.
   */
  provideTargetsFor(_comment: C): Iterable<T> {
    return this.provideTargets();
  }

  /**
   * Provides access to sub-levels in a hierarchy. Each level is represented by a data provider.
   *
   * @returns data providers for sub-levels in the hierarchy.
   */
  abstract provideSubHierarchies(): Iterable<IDataProvider<C, T>>;

  /**
   * Tells the data provider to do whatever it feels necessary to attach the given comment to the given target.
   *
   * @param comment - the comment to attach to the target.
   * @param target - the target to attach the comment to.
   */
  abstract attach(comment: C, target: T): void;

  /**
   * Returns a data provider that acts as a cache around this provider.
   *
   * @returns a cached data provider around this data provider.
   */
  cached(): IDataProvider<C, T> {
    return new CachedDataProvider<C, T>(this);
  }
}

/**
 * The anonymous subclass returned by Java's `IDataProvider.cached()`; `IDataProvider.this` is the `wrapped` field.
 *
 * `commentTargetsCache` is a `HashMultimap` with identity-hashed keys and values in Java; here a `Map<C, Set<T>>`
 * in insertion order (P2, AD-10). Quirks kept: the first `provideTargetsFor` call returns the uncached collection,
 * later calls return the multimap's set; an empty result never becomes a key, so it is recomputed on every call.
 */
class CachedDataProvider<C, T> extends IDataProvider<C, T> {
  /** Cache for comments. */
  private commentsCache: C[] | null = null;
  /** Cache for targets. */
  private targetsCache: T[] | null = null;
  /** Cache for comment-specific targets. */
  private readonly commentTargetsCache: Map<C, Set<T>> = new Map();
  /** Cache for sub-level data providers. */
  private subProviderCache: IDataProvider<C, T>[] | null = null;

  constructor(private readonly wrapped: IDataProvider<C, T>) {
    super();
  }

  override provideComments(): C[] {
    this.commentsCache ??= [...this.wrapped.provideComments()];
    return this.commentsCache;
  }

  override provideTargets(): T[] {
    this.targetsCache ??= [...this.wrapped.provideTargets()];
    return this.targetsCache;
  }

  override provideTargetsFor(comment: C): Iterable<T> {
    const cached = this.commentTargetsCache.get(comment);
    if (cached !== undefined) {
      return cached;
    }
    const targets = this.wrapped.provideTargetsFor(comment);
    // Multimap.putAll: an empty collection creates no key; duplicates collapse (set-valued)
    for (const target of targets) {
      let values = this.commentTargetsCache.get(comment);
      if (values === undefined) {
        values = new Set();
        this.commentTargetsCache.set(comment, values);
      }
      values.add(target);
    }
    return targets;
  }

  override provideSubHierarchies(): IDataProvider<C, T>[] {
    if (this.subProviderCache === null) {
      // Add cached versions of the providers
      this.subProviderCache = [...this.wrapped.provideSubHierarchies()].map((provider) => provider.cached());
    }
    return this.subProviderCache;
  }

  override attach(comment: C, target: T): void {
    this.wrapped.attach(comment, target);
  }
}
