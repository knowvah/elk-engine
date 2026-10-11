// SPDX-License-Identifier: EPL-2.0
import { BucketMultimap, type Bucket, type KeyTable } from './Multimap.js';

/** Sorted array; a probe that compares 0 to an item *is* that item (`TreeSet` semantics). */
class SortedArray<T> {
  private readonly items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get length(): number {
    return this.items.length;
  }

  at(index: number): T {
    return this.items[index] as T;
  }

  /** The first position whose item is not less than `probe`, and whether that item equals it. */
  search(probe: T): { readonly index: number; readonly found: boolean } {
    let low = 0;
    let high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.compare(this.at(mid), probe) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return { index: low, found: low < this.items.length && this.compare(this.at(low), probe) === 0 };
  }

  insert(index: number, item: T): void {
    this.items.splice(index, 0, item);
  }

  removeAt(index: number): void {
    this.items.splice(index, 1);
  }

  clear(): void {
    this.items.length = 0;
  }

  toArray(): T[] {
    return [...this.items];
  }
}

/** A key's values in comparator order, without comparator-equal duplicates (first one wins). */
class SortedBucket<V> implements Bucket<V> {
  private readonly values: SortedArray<V>;

  constructor(compare: (a: V, b: V) => number) {
    this.values = new SortedArray(compare);
  }

  get size(): number {
    return this.values.length;
  }

  contains(v: V): boolean {
    return this.values.search(v).found;
  }

  add(v: V): boolean {
    const { index, found } = this.values.search(v);
    if (!found) {
      this.values.insert(index, v);
    }
    return !found;
  }

  remove(v: V): boolean {
    const { index, found } = this.values.search(v);
    if (found) {
      this.values.removeAt(index);
    }
    return found;
  }

  clear(): void {
    this.values.clear();
  }

  [Symbol.iterator](): Iterator<V> {
    return this.values.toArray()[Symbol.iterator]();
  }
}

/** A key and its bucket; a probe has no bucket. */
class Slot<K, B> {
  constructor(
    readonly key: K,
    readonly bucket?: B,
  ) {}
}

/** Key table in comparator order; the first key that compares equal stays as the stored key. */
class SortedTable<K, B> implements KeyTable<K, B> {
  private readonly slots: SortedArray<Slot<K, B>>;

  constructor(compare: (a: K, b: K) => number) {
    this.slots = new SortedArray((a, b) => compare(a.key, b.key));
  }

  get(k: K): B | undefined {
    const { index, found } = this.slots.search(new Slot(k));
    return found ? this.slots.at(index).bucket : undefined;
  }

  put(k: K, bucket: B): void {
    this.slots.insert(this.slots.search(new Slot(k)).index, new Slot(k, bucket));
  }

  remove(k: K): void {
    this.slots.removeAt(this.slots.search(new Slot(k)).index);
  }

  keys(): Iterable<K> {
    return this.slots.toArray().map((slot) => slot.key);
  }

  clear(): void {
    this.slots.clear();
  }
}

/**
 * Keys and each key's values in the order of their comparators; a comparator result of 0 means
 * "same": a second comparator-equal value is rejected (`put` returns false) and a comparator-equal key
 * joins the existing key, whose first instance is kept. Observed behavior of `guava.json`
 * `treeMultimap` (288 scripts: nine natural/reverse/coarse comparator pairs, string and integer keys):
 * `keySet`, `entries`, `keys`, `values` and `get(k)` are all in comparator order, with `coarse`
 * comparators exercising the equal-compare cases.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/TreeMultimap.html
 */
export class TreeMultimap<K, V> extends BucketMultimap<K, V, SortedBucket<V>> {
  private constructor(keyComparator: (a: K, b: K) => number, valueComparator: (a: V, b: V) => number) {
    super(new SortedTable<K, SortedBucket<V>>(keyComparator), () => new SortedBucket(valueComparator));
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/TreeMultimap.html#create(java.util.Comparator,java.util.Comparator) */
  static create<K, V>(keyComparator: (a: K, b: K) => number, valueComparator: (a: V, b: V) => number): TreeMultimap<K, V> {
    return new TreeMultimap(keyComparator, valueComparator);
  }
}
