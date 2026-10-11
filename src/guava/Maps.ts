// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import type { HashStrategy } from '../java/util/HashStrategy.js';
import { JavaHashMap } from '../java/util/JavaHashMap.js';
import type { Ordinal } from './Sets.js';

const LOAD_FACTOR = 0.75;

/**
 * The initial table capacity Guava's `…WithExpectedSize(n)` factories ask the JVM for: `ceil(n / 0.75)`
 * (`JavaHashMap` rounds it up to a power of two). Observed behavior, not a statement about Guava
 * internals: in `guava.json` (`maps` and `sets`, `*-expected-<n>`, n = 0…100, three key kinds) the key
 * order after the first 8, 24 and n puts is the order of a table that is the smallest power of two
 * holding n entries, e.g. 16 for n = 12, 32 for n = 13…24, 64 for n = 25…48, 128 for n = 49…96 and 256
 * for n = 97…100. A rule of `n / 0.75 + 1` would size n = 12 at 32 and n = 24 at 64; the vectors reject
 * both. Sizes below 13 only show an upper bound of 16 (growth reaches the same table).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Maps.html#newHashMapWithExpectedSize(int)
 */
export function expectedSizeCapacity(expectedSize: number): number {
  if (expectedSize < 0) {
    throw new IllegalArgumentException(`expectedSize cannot be negative but was: ${expectedSize}`);
  }
  return Math.ceil(expectedSize / LOAD_FACTOR);
}

/**
 * A `HashMap` with JVM iteration order; `strategy` is the key's `hashCode`/`equals` (decision M2).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Maps.html#newHashMap()
 */
export function newHashMap<K, V>(strategy: HashStrategy<K>): JavaHashMap<K, V> {
  return new JavaHashMap<K, V>(strategy);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Maps.html#newHashMapWithExpectedSize(int) */
export function newHashMapWithExpectedSize<K, V>(strategy: HashStrategy<K>, expectedSize: number): JavaHashMap<K, V> {
  return new JavaHashMap<K, V>(strategy, expectedSizeCapacity(expectedSize));
}

/**
 * Insertion-ordered map; a JS `Map` already keeps the position of a re-put key (AD-10).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Maps.html#newLinkedHashMap()
 */
export function newLinkedHashMap<K, V>(): Map<K, V> {
  return new Map<K, V>();
}

/**
 * `EnumMap`: iterates in key ordinal order whatever the insertion order (AD-10; `EnumMap` Javadoc).
 * Keys expose their declaration index as `ordinal()`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumMap.html
 */
export class EnumMap<K extends Ordinal, V> implements Iterable<[K, V]> {
  private readonly slots: Array<[K, V] | undefined> = [];
  private count = 0;

  get size(): number {
    return this.count;
  }

  get(k: K): V | undefined {
    return this.slots[k.ordinal()]?.[1];
  }

  containsKey(k: K): boolean {
    return this.slots[k.ordinal()] !== undefined;
  }

  put(k: K, v: V): V | undefined {
    const previous = this.slots[k.ordinal()];
    this.slots[k.ordinal()] = [k, v];
    if (previous === undefined) {
      this.count++;
    }
    return previous?.[1];
  }

  remove(k: K): V | undefined {
    const previous = this.slots[k.ordinal()];
    if (previous !== undefined) {
      this.slots[k.ordinal()] = undefined;
      this.count--;
    }
    return previous?.[1];
  }

  clear(): void {
    this.slots.length = 0;
    this.count = 0;
  }

  entries(): Array<[K, V]> {
    return this.slots.filter((slot): slot is [K, V] => slot !== undefined);
  }

  keys(): K[] {
    return this.entries().map(([k]) => k);
  }

  values(): V[] {
    return this.entries().map(([, v]) => v);
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries()[Symbol.iterator]();
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Maps.html#newEnumMap(java.lang.Class) */
export function newEnumMap<K extends Ordinal, V>(): EnumMap<K, V> {
  return new EnumMap<K, V>();
}
