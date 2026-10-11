// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';
import { Chain, ChainedMultimap, type KeyTable, type LinkedBucket } from './Multimap.js';

/** A key's bucket and the id that fixes the key's place in the key order. */
interface Slot<B> {
  readonly id: number;
  readonly bucket: B;
}

/** Key table whose `keys()` follow the order in which keys received their bucket. */
class InsertionTable<K, B> implements KeyTable<K, B> {
  private readonly slots: JavaHashMap<K, Slot<B>>;
  private readonly order = new Map<number, K>();
  private next = 0;

  constructor(keyStrategy: HashStrategy<K>) {
    this.slots = new JavaHashMap(keyStrategy);
  }

  get(k: K): B | undefined {
    return this.slots.get(k)?.bucket;
  }

  put(k: K, bucket: B): void {
    this.slots.put(k, { id: this.next, bucket });
    this.order.set(this.next++, k);
  }

  remove(k: K): void {
    this.order.delete((this.slots.remove(k) as Slot<B>).id);
  }

  keys(): Iterable<K> {
    return this.order.values();
  }

  clear(): void {
    this.slots.clear();
    this.order.clear();
  }
}

/**
 * No duplicate pairs (`put` of a present pair returns false and moves nothing); `entries()`, `keys()`
 * and `values()` follow the global insertion order across keys. Observed behavior of `guava.json`
 * `linkedHashMultimap` (48 scripts): `keySet()` lists keys in the order they first received a value and
 * is unchanged while a key keeps at least one value, even if its first value is removed; once all of a
 * key's values are removed the key reappears last (script `order`).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/LinkedHashMultimap.html
 */
export class LinkedHashMultimap<K, V> extends ChainedMultimap<K, V> {
  private constructor(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>) {
    super(new InsertionTable<K, LinkedBucket<K, V>>(keyStrategy), new Chain<K, V>(), true, (a, b) => valueStrategy.equals(a, b));
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/LinkedHashMultimap.html#create() */
  static create<K, V>(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>): LinkedHashMultimap<K, V> {
    return new LinkedHashMultimap(keyStrategy, valueStrategy);
  }
}
