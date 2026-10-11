// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';
import { JavaHashSet } from '../java/util/JavaHashSet.js';
import { BucketMultimap } from './Multimap.js';

/** Initial table of each key's value set: 4 slots, see the class comment. */
const VALUE_SET_CAPACITY = 4;

/**
 * Keys in a hash table, each key's values in a hash set; no duplicate pairs (`put` of a present pair
 * returns false). Iteration follows both tables: keys in table order, then that key's values in its
 * set's order. Observed behavior of `guava.json` `hashMultimap` (48 scripts, JDK 21 + Guava 33.3.0):
 * - the key table behaves like a default `HashMap` (16 slots, growing at 12, 24, 48 …): a table
 *   sized for 17 or more keys (32 slots) fails 38 of the 48 scripts (`HashMultimap-<kind>-seq-small`).
 * - each key's value set starts with a 4-slot table: a default 16-slot set fails 34 scripts and
 *   5- or 8-slot sets fail 32 (`HashMultimap-<kind>-growth`, `-seq-mid`); capacities 2, 3 and 4 all
 *   round to 4 slots and pass every script.
 * - removing the last value of a key removes the key, and a later put starts a fresh set (`removes`).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/HashMultimap.html
 */
export class HashMultimap<K, V> extends BucketMultimap<K, V, JavaHashSet<V>> {
  private constructor(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>) {
    super(new JavaHashMap<K, JavaHashSet<V>>(keyStrategy), () => new JavaHashSet(valueStrategy, VALUE_SET_CAPACITY));
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/HashMultimap.html#create() */
  static create<K, V>(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>): HashMultimap<K, V> {
    return new HashMultimap(keyStrategy, valueStrategy);
  }
}
