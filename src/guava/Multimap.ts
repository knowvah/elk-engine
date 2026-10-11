// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';

/**
 * The live collection returned by `Multimap.get(k)`: never null, and always reflecting (and writing
 * through to) the multimap's current values for `k`.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Multimap.html#get(K)
 */
export interface ValueCollection<V> extends Iterable<V> {
  readonly size: number;
  isEmpty(): boolean;
  contains(v: V): boolean;
  add(v: V): boolean;
  remove(v: V): boolean;
  clear(): void;
}

/** The `List` returned by `ListMultimap.get(k)`; `set` writes through, as `Collections.reverse` needs. */
export interface ValueList<V> extends ValueCollection<V> {
  get(index: number): V;
  set(index: number, v: V): V;
}

/**
 * Keys and values are held per the Javadoc of each implementation; `keySet`, `keys`, `values` and
 * `entries` are snapshots in the implementation's iteration order, only `get(k)` is live (decision M6).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Multimap.html
 */
export interface Multimap<K, V> {
  readonly size: number;
  isEmpty(): boolean;
  containsKey(k: K): boolean;
  get(k: K): ValueCollection<V>;
  put(k: K, v: V): boolean;
  putAll(k: K, values: Iterable<V>): boolean;
  remove(k: K, v: V): boolean;
  removeAll(k: K): V[];
  clear(): void;
  keySet(): K[];
  keys(): K[];
  values(): V[];
  entries(): Array<[K, V]>;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ListMultimap.html */
export interface ListMultimap<K, V> extends Multimap<K, V> {
  get(k: K): ValueList<V>;
}

/** The values of one key; a bucket exists in its multimap only while it is non-empty. */
export interface Bucket<V> extends Iterable<V> {
  readonly size: number;
  contains(v: V): boolean;
  add(v: V): boolean;
  remove(v: V): boolean;
  clear(): void;
}

export interface ListBucket<V> extends Bucket<V> {
  get(index: number): V;
  set(index: number, v: V): V;
}

/** Key to bucket lookup whose `keys()` order is the multimap's key order. Callers `remove` only present keys. */
export interface KeyTable<K, B> {
  get(k: K): B | undefined;
  put(k: K, bucket: B): unknown;
  remove(k: K): unknown;
  keys(): Iterable<K>;
  clear(): void;
}

/** What a live view needs from its multimap. */
interface ViewOwner<K, V, B> {
  bucketOf(k: K): B | undefined;
  put(k: K, v: V): boolean;
  remove(k: K, v: V): boolean;
  removeAll(k: K): V[];
}

const NO_VALUES: readonly never[] = [];

/** `get(k)`: re-reads the multimap's bucket for `k` on every call, so it follows later puts and removes. */
export class KeyView<K, V, B extends Bucket<V>> implements ValueCollection<V> {
  constructor(
    private readonly owner: ViewOwner<K, V, B>,
    protected readonly key: K,
  ) {}

  protected get bucket(): B | undefined {
    return this.owner.bucketOf(this.key);
  }

  get size(): number {
    return this.bucket?.size ?? 0;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  contains(v: V): boolean {
    return this.bucket?.contains(v) ?? false;
  }

  add(v: V): boolean {
    return this.owner.put(this.key, v);
  }

  remove(v: V): boolean {
    return this.owner.remove(this.key, v);
  }

  clear(): void {
    this.owner.removeAll(this.key);
  }

  [Symbol.iterator](): Iterator<V> {
    return (this.bucket ?? NO_VALUES)[Symbol.iterator]();
  }
}

/** `ListMultimap.get(k)`. */
export class ListKeyView<K, V> extends KeyView<K, V, ListBucket<V>> implements ValueList<V> {
  get(index: number): V {
    return this.within(index).get(index);
  }

  set(index: number, v: V): V {
    return this.within(index).set(index, v);
  }

  private within(index: number): ListBucket<V> {
    const size = this.size;
    if (index < 0 || index >= size) {
      throw new IndexOutOfBoundsException(`Index ${index} out of bounds for length ${size}`);
    }
    return this.bucket as ListBucket<V>;
  }
}

/**
 * A multimap of per-key buckets in a key table; the key table and the bucket kind fix the iteration
 * order, so each implementation only chooses those (`entries` lists keys in table order, each key's
 * bucket in bucket order; `keys()` and `values()` follow `entries`).
 */
export class BucketMultimap<K, V, B extends Bucket<V>> implements Multimap<K, V> {
  private count = 0;

  constructor(
    private readonly table: KeyTable<K, B>,
    private readonly newBucket: (k: K) => B,
  ) {}

  get size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  bucketOf(k: K): B | undefined {
    return this.table.get(k);
  }

  containsKey(k: K): boolean {
    return this.table.get(k) !== undefined;
  }

  get(k: K): ValueCollection<V> {
    return new KeyView<K, V, B>(this, k);
  }

  put(k: K, v: V): boolean {
    const bucket = this.bucketOf(k) ?? this.open(k);
    const added = bucket.add(v);
    if (added) {
      this.count++;
    }
    return added;
  }

  putAll(k: K, values: Iterable<V>): boolean {
    let changed = false;
    for (const v of values) {
      if (this.put(k, v)) {
        changed = true;
      }
    }
    return changed;
  }

  remove(k: K, v: V): boolean {
    const bucket = this.bucketOf(k);
    if (bucket === undefined || !bucket.remove(v)) {
      return false;
    }
    this.count--;
    if (bucket.size === 0) {
      this.table.remove(k);
    }
    return true;
  }

  removeAll(k: K): V[] {
    const bucket = this.bucketOf(k);
    if (bucket === undefined) {
      return [];
    }
    const removed = [...bucket];
    bucket.clear();
    this.table.remove(k);
    this.count -= removed.length;
    return removed;
  }

  clear(): void {
    this.table.clear();
    this.count = 0;
  }

  keySet(): K[] {
    return [...this.table.keys()];
  }

  keys(): K[] {
    return this.entries().map(([k]) => k);
  }

  values(): V[] {
    return this.entries().map(([, v]) => v);
  }

  entries(): Array<[K, V]> {
    const out: Array<[K, V]> = [];
    for (const k of this.table.keys()) {
      for (const v of this.bucketOf(k) as B) {
        out.push([k, v]);
      }
    }
    return out;
  }

  private open(k: K): B {
    const bucket = this.newBucket(k);
    this.table.put(k, bucket);
    return bucket;
  }
}

/** One value occurrence in the global insertion order of a linked multimap. */
class Link<K, V> {
  constructor(
    readonly id: number,
    readonly key: K,
    public value: V,
  ) {}
}

/** The occurrences of every key in global insertion order, shared by the buckets of one linked multimap. */
export class Chain<K, V> {
  readonly links = new Map<number, Link<K, V>>();
  private next = 0;

  append(key: K, value: V): Link<K, V> {
    const link = new Link(this.next++, key, value);
    this.links.set(link.id, link);
    return link;
  }
}

/** Values of one key in insertion order; with `unique` an equal value is not added twice. */
export class LinkedBucket<K, V> implements ListBucket<V> {
  private readonly mine: Array<Link<K, V>> = [];

  constructor(
    private readonly key: K,
    private readonly chain: Chain<K, V>,
    private readonly equals: (a: V, b: V) => boolean,
    private readonly unique: boolean,
  ) {}

  get size(): number {
    return this.mine.length;
  }

  contains(v: V): boolean {
    return this.mine.some((link) => this.equals(link.value, v));
  }

  add(v: V): boolean {
    if (this.unique && this.contains(v)) {
      return false;
    }
    this.mine.push(this.chain.append(this.key, v));
    return true;
  }

  remove(v: V): boolean {
    const at = this.mine.findIndex((link) => this.equals(link.value, v));
    if (at < 0) {
      return false;
    }
    this.chain.links.delete((this.mine[at] as Link<K, V>).id);
    this.mine.splice(at, 1);
    return true;
  }

  clear(): void {
    this.mine.forEach((link) => this.chain.links.delete(link.id));
    this.mine.length = 0;
  }

  get(index: number): V {
    return (this.mine[index] as Link<K, V>).value;
  }

  set(index: number, v: V): V {
    const link = this.mine[index] as Link<K, V>;
    const previous = link.value;
    link.value = v;
    return previous;
  }

  [Symbol.iterator](): Iterator<V> {
    return this.mine.map((link) => link.value)[Symbol.iterator]();
  }
}

/** Base of the two linked multimaps: `entries` (hence `keys` and `values`) follow the global insertion order. */
export class ChainedMultimap<K, V> extends BucketMultimap<K, V, LinkedBucket<K, V>> {
  protected constructor(
    table: KeyTable<K, LinkedBucket<K, V>>,
    private readonly chain: Chain<K, V>,
    unique: boolean,
    valueEquals: (a: V, b: V) => boolean,
  ) {
    super(table, (k) => new LinkedBucket(k, chain, valueEquals, unique));
  }

  override entries(): Array<[K, V]> {
    return [...this.chain.links.values()].map((link) => [link.key, link.value]);
  }

  override clear(): void {
    super.clear();
    this.chain.links.clear();
  }
}
