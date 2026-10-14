// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';
import type { IResourceScopeCache, Resource } from './IResourceScopeCache.js';

/** Keys follow `Object.equals`/`hashCode` (`Tuples.pair` keys are value keys, strings too). */
const KEY_STRATEGY: HashStrategy<unknown> = {
  hash: (k) => JavaObjects.hashCode(k),
  equals: (a, b) => JavaObjects.equals(a, b),
};

/**
 * A per-resource map of values. The Java default, `OnChangeEvictingCache`, drops every value of a
 * resource on any model change (a notification adapter). This port never evicts: in the `.elkt`
 * flow no mutation changes identifiers, containment or descriptions (the validator's
 * `checkPropertyValue` rewrites `entry.value` only), so cached names and scopes stay valid for the
 * life of the resource. Lookups are O(1) amortised. Not safe for concurrent writers (single
 * threaded JS); a provider may re-enter `get` for other keys.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/OnChangeEvictingCache.java
 */
export class ResourceScopeCache implements IResourceScopeCache {
  private readonly values = new WeakMap<Resource, JavaHashMap<unknown, unknown>>();

  get<T>(key: unknown, res: Resource | null, provider: () => T): T {
    if (res === null) {
      return provider();
    }
    let map = this.values.get(res);
    if (map === undefined) {
      map = new JavaHashMap<unknown, unknown>(KEY_STRATEGY);
      this.values.set(res, map);
    }
    if (map.containsKey(key)) {
      return map.get(key) as T;
    }
    const element = provider();
    // the provider may have re-entered get() and filled the map; put never evicts
    map.put(key, element);
    return element;
  }

  clear(res: Resource): void {
    this.values.delete(res);
  }
}
