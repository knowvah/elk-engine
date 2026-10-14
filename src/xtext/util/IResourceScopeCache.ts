// SPDX-License-Identifier: EPL-2.0

/**
 * Opaque handle of the unit a cache scopes its values to (Java `Resource`). The `.elkt` flow
 * uses the root container of the model as the handle (T8 resource handle rule).
 */
export type Resource = object;

/**
 * Caches values per resource and key. `NullImpl` and the Guice default `OnChangeEvictingCache`
 * are not ported; {@link ResourceScopeCache} is the implementation.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/IResourceScopeCache.java
 */
export interface IResourceScopeCache {
  /**
   * The value cached for `key` in `res`, or what `provider` returns (cached afterwards, also
   * when `null`). A `null` resource skips the cache.
   */
  get<T>(key: unknown, res: Resource | null, provider: () => T): T;
  clear(res: Resource): void;
}
