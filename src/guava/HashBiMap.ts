// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/BiMap.html */
export interface BiMap<K, V> {
  readonly size: number;
  isEmpty(): boolean;
  get(k: K): V | undefined;
  containsKey(k: K): boolean;
  put(k: K, v: V): V | undefined;
  forcePut(k: K, v: V): V | undefined;
  remove(k: K): V | undefined;
  clear(): void;
  keys(): K[];
  values(): V[];
  entries(): Array<[K, V]>;
  inverse(): BiMap<V, K>;
}

type Side = 0 | 1;

/** One key-value binding; `ends` holds [key, value] and `id` fixes its place in iteration order. */
class Binding {
  constructor(
    readonly id: number,
    readonly ends: [unknown, unknown],
  ) {}
}

type Index = JavaHashMap<unknown, Binding>;

/** State shared by a bimap and its inverse: the bindings in insertion order and the two lookup indexes. */
interface Shared {
  readonly order: Map<number, Binding>;
  readonly indexes: readonly [Index, Index];
  next: number;
}

/**
 * A bimap iterating in insertion order. The vectors in `guava.json` (`biMap`, 36 scripts) show:
 * - keys, values and the inverse's keys all iterate in one order, the order the bindings were created
 *   (`seq`, `remove-reinsert`); removing a binding and putting it again appends it.
 * - `put` of an existing key with a new value rebinds in place (position kept) and returns the old
 *   value; `put` of the identical binding is a no-op returning the value (`duplicate-value`).
 * - `put` of a value bound to another key throws `IllegalArgumentException("value already present: v")`
 *   and changes nothing; on the inverse view the message reads `key already present: k`.
 * - `forcePut` evicts the binding holding the value, then binds as `put` does.
 * - the new binding takes the place of the binding that held its *forward key*: in the forward view
 *   the existing key, in the inverse view the evicted holder of that key (`string-rand-0` step 25:
 *   `inverse().forcePut(7, '0cruoz')` puts '0cruoz' back where it was); with none it is appended. So
 *   `inverse().put(v, k)` of an existing `v` removes that binding and appends the new one; keeping the
 *   old binding's place fails 13 random scripts (`string-rand-1`, `-2`, `-3`, `-6`, `-7`, `integer-rand-0`,
 *   `-4`, `-7`, `kvector-rand-3`…`-7`).
 * - `inverse()` is a live view sharing the same bindings; its `inverse()` is the original.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/HashBiMap.html
 */
export class HashBiMap<K, V> implements BiMap<K, V> {
  private mirror: HashBiMap<V, K> | undefined;

  private constructor(
    private readonly shared: Shared,
    private readonly side: Side,
    mirror?: HashBiMap<V, K>,
  ) {
    this.mirror = mirror;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/HashBiMap.html#create() */
  static create<K, V>(keyStrategy: HashStrategy<K>, valueStrategy: HashStrategy<V>): HashBiMap<K, V> {
    const indexes: [Index, Index] = [
      new JavaHashMap(keyStrategy as HashStrategy<unknown>),
      new JavaHashMap(valueStrategy as HashStrategy<unknown>),
    ];
    return new HashBiMap<K, V>({ order: new Map(), indexes, next: 0 }, 0);
  }

  private get near(): Index {
    return this.shared.indexes[this.side];
  }

  private get far(): Index {
    return this.shared.indexes[this.farSide];
  }

  private get farSide(): Side {
    return this.side === 0 ? 1 : 0;
  }

  get size(): number {
    return this.shared.order.size;
  }

  isEmpty(): boolean {
    return this.shared.order.size === 0;
  }

  get(k: K): V | undefined {
    return this.near.get(k)?.ends[this.farSide] as V | undefined;
  }

  containsKey(k: K): boolean {
    return this.near.containsKey(k);
  }

  put(k: K, v: V): V | undefined {
    return this.write(k, v, false);
  }

  forcePut(k: K, v: V): V | undefined {
    return this.write(k, v, true);
  }

  remove(k: K): V | undefined {
    const binding = this.near.get(k);
    if (binding === undefined) {
      return undefined;
    }
    this.unbind(binding, false);
    return binding.ends[this.farSide] as V;
  }

  clear(): void {
    this.shared.indexes.forEach((index) => index.clear());
    this.shared.order.clear();
  }

  keys(): K[] {
    return [...this.shared.order.values()].map((b) => b.ends[this.side] as K);
  }

  values(): V[] {
    return [...this.shared.order.values()].map((b) => b.ends[this.farSide] as V);
  }

  entries(): Array<[K, V]> {
    return [...this.shared.order.values()].map((b) => [b.ends[this.side] as K, b.ends[this.farSide] as V]);
  }

  inverse(): HashBiMap<V, K> {
    this.mirror ??= new HashBiMap<V, K>(this.shared, this.farSide, this);
    return this.mirror;
  }

  /** Drops the binding from both indexes and, unless `keepPlace`, from the iteration order. */
  private unbind(binding: Binding, keepPlace: boolean): void {
    this.near.remove(binding.ends[this.side]);
    this.far.remove(binding.ends[this.farSide]);
    if (!keepPlace) {
      this.shared.order.delete(binding.id);
    }
  }

  private write(k: K, v: V, force: boolean): V | undefined {
    const existing = this.near.get(k);
    const holder = this.far.get(v);
    if (holder !== undefined && holder === existing) {
      return v;
    }
    if (holder !== undefined && !force) {
      throw new IllegalArgumentException(`${this.side === 0 ? 'value' : 'key'} already present: ${String(v)}`);
    }
    const anchor = this.side === 0 ? existing : holder;
    for (const replaced of [existing, holder]) {
      if (replaced !== undefined) {
        this.unbind(replaced, replaced === anchor);
      }
    }
    this.bind(k, v, anchor?.id);
    return existing?.ends[this.farSide] as V | undefined;
  }

  /** Re-using the anchor's id keeps its place in the order; a new id appends. */
  private bind(k: K, v: V, placeId: number | undefined): void {
    const ends: [unknown, unknown] = this.side === 0 ? [k, v] : [v, k];
    const binding = new Binding(placeId ?? this.shared.next++, ends);
    this.near.put(k, binding);
    this.far.put(v, binding);
    this.shared.order.set(binding.id, binding);
  }
}
