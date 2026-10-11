// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';
import { JavaHashSet } from '../java/util/JavaHashSet.js';
import { Chain, ChainedMultimap, ListKeyView, type LinkedBucket, type ListMultimap, type ValueList } from './Multimap.js';

/**
 * Every put appends an occurrence, duplicates kept; `entries()`, `keys()` and `values()` follow the
 * global insertion order across keys, `get(k)` lists one key's values in insertion order. Observed
 * behavior of `guava.json` `linkedListMultimap` (48 scripts): `keySet()` lists each key at its first
 * *remaining* occurrence, so removing a key's first value can move the key behind others (the Javadoc
 * example: `remove(key1, foo)` turns keySet `[key1, key2]` into `[key2, key1]`, script `order`); a key
 * with no occurrence left is gone and reappears last.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/LinkedListMultimap.html
 */
export class LinkedListMultimap<K, V> extends ChainedMultimap<K, V> implements ListMultimap<K, V> {
  private constructor(
    private readonly keyStrategy: HashStrategy<K>,
    valueStrategy: HashStrategy<V>,
  ) {
    super(new JavaHashMap<K, LinkedBucket<K, V>>(keyStrategy), new Chain<K, V>(), false, (a, b) => valueStrategy.equals(a, b));
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/LinkedListMultimap.html#create() */
  static create<K, V>(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>): LinkedListMultimap<K, V> {
    return new LinkedListMultimap(keyStrategy, valueStrategy);
  }

  override get(k: K): ValueList<V> {
    return new ListKeyView(this, k);
  }

  override keySet(): K[] {
    const seen = new JavaHashSet(this.keyStrategy);
    return this.keys().filter((k) => seen.add(k));
  }
}
