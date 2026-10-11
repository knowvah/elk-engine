// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";

const REJECT_MESSAGE = "ImmutableMap is read-only";

function requireNonNull(value: unknown, what: string): void {
  if (value === null || value === undefined) {
    throw new TypeError(`null ${what}`);
  }
}

/**
 * An insertion-ordered map whose mutators throw `TypeError` (as JS does for frozen objects).
 * Entries are filled through the prototype `set`, so the `Map` constructor never reaches
 * the throwing overrides. Duplicate keys, null keys and null values are rejected.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ImmutableMap.html
 */
export class ImmutableMap<K, V> extends Map<K, V> {
  constructor(entries: Iterable<readonly [K, V]>) {
    super();
    for (const [key, value] of entries) {
      requireNonNull(key, "key");
      requireNonNull(value, "value");
      if (this.has(key)) {
        throw new IllegalArgumentException(`Multiple entries with same key: ${String(key)}`);
      }
      Map.prototype.set.call(this, key, value);
    }
  }

  override set(_key: K, _value: V): never {
    throw new TypeError(REJECT_MESSAGE);
  }

  override delete(_key: K): never {
    throw new TypeError(REJECT_MESSAGE);
  }

  override clear(): never {
    throw new TypeError(REJECT_MESSAGE);
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ImmutableMap.html#of(K,V,K,V) */
export function of<K, V>(k1: K, v1: V, k2: K, v2: V): ImmutableMap<K, V> {
  return new ImmutableMap([
    [k1, v1],
    [k2, v2],
  ]);
}

/**
 * `copyOf(map)` and `copyOf(entries)`: iterates in the source's entry order.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ImmutableMap.html#copyOf(java.util.Map)
 */
export function copyOf<K, V>(source: ReadonlyMap<K, V> | Iterable<readonly [K, V]>): ImmutableMap<K, V> {
  return new ImmutableMap(source);
}
