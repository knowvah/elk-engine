// SPDX-License-Identifier: EPL-2.0
import { LinkedList } from '../../../java/util/LinkedList.js';

/**
 * This is a special data structure made to efficiently move nodes between layers and still be able to efficiently get
 * all nodes of a layer. Moreover, it is order preserving. It consists of a `LinkedHashMap` with a list of nodes to have
 * a ordered list for each layer id and a `HashMap` to get the layer of a node.
 *
 * Java declares `K extends Comparable<K>`; its only instantiation is `Integer` (`NodePromotion`), so `K` is a `number`
 * here and `compareTo` becomes the numeric comparison. The values are identity-hashed (`LNode`) and both maps are
 * `LinkedHashMap`s, so `Map` in insertion order is exact (AD-10).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/BiLinkedHashMultiMap.java
 */
export class BiLinkedHashMultiMap<K extends number, V> {
  private readonly multiMapKeyToValues = new Map<K, LinkedList<V>>();
  private readonly hashMapValuesToKey = new Map<V, K>();
  /** The key set of `multiMapKeyToValues` (Java returns its live view), kept in the same insertion order. */
  private readonly keys = new Set<K>();

  /**
   * Adds all values to the respective key.
   *
   * @param key The key.
   * @param values A set of values
   * @see BiLinkedHashMultiMap.java:40
   */
  putAll(key: K, values: Iterable<V>): void {
    for (const value of values) {
      this.put(key, value);
    }
  }

  /**
   * Adds a new value linked to the given key and update prior occurrences of the value.
   *
   * @param key The key.
   * @param value The value.
   * @see BiLinkedHashMultiMap.java:52
   */
  put(key: K, value: V): void {
    // Remove old value.
    const oldKey = this.hashMapValuesToKey.get(value);
    if (oldKey !== undefined) {
      const oldValues = this.multiMapKeyToValues.get(oldKey)!;
      oldValues.remove(value);
    }
    // Add new value
    let values = this.multiMapKeyToValues.get(key);
    if (values === undefined) {
      values = new LinkedList<V>();
      this.multiMapKeyToValues.set(key, values);
      this.keys.add(key);
    }
    values.add(value);

    this.hashMapValuesToKey.set(value, key);
  }

  /**
   * Returns the key associated with the given value.
   *
   * @param value The value.
   * @returns The key, `undefined` (Java `null`) if the value is unknown.
   * @see BiLinkedHashMultiMap.java:76
   */
  getKey(value: V): K | undefined {
    return this.hashMapValuesToKey.get(value);
  }

  /**
   * Returns the values associated with the given key.
   *
   * @param key The key.
   * @returns The set of values for the given key; a new empty list, not stored, if there is none.
   * @see BiLinkedHashMultiMap.java:86
   */
  getValues(key: K): LinkedList<V> {
    return this.multiMapKeyToValues.get(key) ?? new LinkedList<V>();
  }

  /**
   * Returns a set of all key (a live read-only view, as in Java).
   *
   * @returns The keys.
   * @see BiLinkedHashMultiMap.java:99
   */
  keySet(): ReadonlySet<K> {
    return this.keys;
  }

  /** @see BiLinkedHashMultiMap.java:103 */
  isMaximalKey(key: K): boolean {
    for (const otherKey of this.keys) {
      if (key < otherKey) {
        return false;
      }
    }
    return true;
  }

  /** @see BiLinkedHashMultiMap.java:112 */
  isMinimalKey(key: K): boolean {
    for (const otherKey of this.keys) {
      if (key > otherKey) {
        return false;
      }
    }
    return true;
  }
}
