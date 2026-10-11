// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';
import { expectedSizeCapacity } from './Maps.js';
import {
  BucketMultimap,
  ListKeyView,
  type KeyTable,
  type ListBucket,
  type ListMultimap,
  type ValueList,
} from './Multimap.js';

/** A key's values in insertion order, duplicates kept. */
class ArrayBucket<V> implements ListBucket<V> {
  private readonly items: V[] = [];

  constructor(private readonly equals: (a: V, b: V) => boolean) {}

  get size(): number {
    return this.items.length;
  }

  contains(v: V): boolean {
    return this.items.some((item) => this.equals(item, v));
  }

  add(v: V): boolean {
    this.items.push(v);
    return true;
  }

  remove(v: V): boolean {
    const at = this.items.findIndex((item) => this.equals(item, v));
    if (at < 0) {
      return false;
    }
    this.items.splice(at, 1);
    return true;
  }

  clear(): void {
    this.items.length = 0;
  }

  get(index: number): V {
    return this.items[index] as V;
  }

  set(index: number, v: V): V {
    const previous = this.items[index] as V;
    this.items[index] = v;
    return previous;
  }

  [Symbol.iterator](): Iterator<V> {
    return this.items[Symbol.iterator]();
  }
}

/**
 * Keys in a hash table, each key's values in an `ArrayList` (duplicates kept, insertion order,
 * `remove(k, v)` drops the first occurrence). Iteration lists keys in table order and each key's
 * values together. Observed behavior of `guava.json` `arrayListMultimap` (171 scripts):
 * - `create()`: the key table behaves like a default `HashMap` (16 slots); a table sized for 17 or more
 *   keys fails 38 of the 48 scripts (`ArrayListMultimap-<kind>-seq-small`, `-seq-mid`, `-removes`).
 * - `create(expectedKeys, expectedValuesPerKey)`: the key table is sized `ceil(expectedKeys / 0.75)`
 *   as for `Maps.newHashMapWithExpectedSize` (`<kind>-create-0`…`-40` after 8, 24, n and n + 1 keys;
 *   a `floor(n / 0.75) + 1` rule fails 9 of the 123). `expectedValuesPerKey` is only validated:
 *   list capacity is not observable.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ArrayListMultimap.html
 */
export class ArrayListMultimap<K, V> extends BucketMultimap<K, V, ArrayBucket<V>> implements ListMultimap<K, V> {
  private constructor(table: KeyTable<K, ArrayBucket<V>>, valueStrategy: HashStrategy<V>) {
    super(table, () => new ArrayBucket((a, b) => valueStrategy.equals(a, b)));
  }

  /**
   * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ArrayListMultimap.html#create()
   * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ArrayListMultimap.html#create(int,int)
   */
  static create<K, V>(
    keyStrategy: HashStrategy<K>,
    valueStrategy: HashStrategy<V>,
    expectedKeys?: number,
    expectedValuesPerKey?: number,
  ): ArrayListMultimap<K, V> {
    const capacity = expectedKeys === undefined ? undefined : expectedSizeCapacity(expectedKeys);
    if (expectedValuesPerKey !== undefined && expectedValuesPerKey < 0) {
      throw new IllegalArgumentException(`expectedValuesPerKey cannot be negative but was: ${expectedValuesPerKey}`);
    }
    return new ArrayListMultimap(new JavaHashMap<K, ArrayBucket<V>>(keyStrategy, capacity), valueStrategy);
  }

  override get(k: K): ValueList<V> {
    return new ListKeyView(this, k);
  }
}
