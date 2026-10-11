// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from './HashStrategy.js';
import { JavaHashMap } from './JavaHashMap.js';

const PRESENT = true;
const COPY_LOAD_FACTOR = 0.75;
const COPY_MIN_EXPECTED = 12;

/**
 * `HashSet`: "backed by a hash table (actually a HashMap instance)"; iteration order is the backing
 * {@link JavaHashMap}'s key order. Observed behavior (JDK 21 vectors, `collections.json` `hashSet`):
 * `new HashSet(collection)` sizes its map for `max(collection.size(), 12)` elements, i.e. capacity
 * `ceil(max(n, 12) / 0.75)` rounded up to a power of two, counting duplicates
 * (`ctor-collection-dups-*`, `ctor-copy-*-12-*`), then adds the elements in source order.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashSet.html
 */
export class JavaHashSet<E> implements Iterable<E> {
  private readonly map: JavaHashMap<E, boolean>;

  constructor(strategy: HashStrategy<E>, initialCapacity?: number, loadFactor?: number) {
    this.map = new JavaHashMap(strategy, initialCapacity, loadFactor);
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashSet.html#%3Cinit%3E(java.util.Collection) */
  static copyOf<E>(strategy: HashStrategy<E>, source: Iterable<E>): JavaHashSet<E> {
    const elements = [...source];
    const capacity = Math.ceil(Math.max(elements.length, COPY_MIN_EXPECTED) / COPY_LOAD_FACTOR);
    const set = new JavaHashSet(strategy, capacity);
    set.addAll(elements);
    return set;
  }

  get size(): number {
    return this.map.size;
  }

  isEmpty(): boolean {
    return this.map.isEmpty();
  }

  add(e: E): boolean {
    return this.map.put(e, PRESENT) === undefined;
  }

  remove(e: E): boolean {
    return this.map.remove(e) !== undefined;
  }

  contains(e: E): boolean {
    return this.map.containsKey(e);
  }

  clear(): void {
    this.map.clear();
  }

  addAll(source: Iterable<E>): boolean {
    let modified = false;
    for (const e of source) {
      if (this.add(e)) {
        modified = true;
      }
    }
    return modified;
  }

  [Symbol.iterator](): Iterator<E> {
    return this.map.keys()[Symbol.iterator]();
  }
}
