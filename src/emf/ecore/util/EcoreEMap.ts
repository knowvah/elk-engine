// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../../../java/util/HashStrategy.js';
import type { InternalEObject } from '../InternalEObject.js';
import { EObjectContainmentEList } from './EObjectContainmentEList.js';

/**
 * A map entry `EObject` (EMF `BasicEMap.Entry`; the hash cache is the index's business here).
 * `setValue` returns the old value.
 *
 * @see org.eclipse.emf.common.util.BasicEMap.Entry
 */
export interface BasicEMapEntry<K, V> extends InternalEObject {
  getKey(): K;
  getValue(): V;
  setValue(value: V): V;
}

/** The read-only `java.util.Map` view of an {@link EcoreEMap} (`EMap.map()`). */
export interface EMapView<K, V> extends Iterable<[K, V]> {
  get(key: K | null): V | undefined;
  containsKey(key: K | null): boolean;
  isEmpty(): boolean;
  size(): number;
}

/** The index callbacks of {@link DelegateEObjectContainmentEList} (`BasicEMap.doPut`/`doRemove`/`doClear`). */
interface EntryIndex<E> {
  doPut(entry: E): void;
  doRemove(entry: E): void;
  doClear(): void;
}

/**
 * The entry list: an opposite-less containment list whose `did*` hooks keep the key index in step,
 * whichever way the list is edited.
 *
 * @see org.eclipse.emf.ecore.util.EcoreEMap.DelegateEObjectContainmentEList
 */
class DelegateEObjectContainmentEList<E extends InternalEObject> extends EObjectContainmentEList<E> {
  constructor(
    owner: InternalEObject,
    featureID: number,
    private readonly index: EntryIndex<E>,
  ) {
    super(owner, featureID);
  }

  protected override didAdd(_index: number, newObject: E): void {
    this.index.doPut(newObject);
  }

  /** EMF re-caches the hash when the same entry is set again; the index re-keys it here. */
  protected override didSet(index: number, newObject: E, oldObject: E): void {
    this.didRemove(index, oldObject);
    this.didAdd(index, newObject);
  }

  protected override didRemove(_index: number, oldObject: E): void {
    this.index.doRemove(oldObject);
  }

  protected override didClear(): void {
    this.index.doClear();
  }
}

/**
 * EMF's `EcoreEMap`: a map whose entries are `EObject`s contained by `owner` under `featureID`
 * (no opposite), kept in a delegate list in insertion order, and indexed by key through the
 * owner's {@link HashStrategy} (Java `hashCode`/`equals`) in `BasicEMap`'s hash buckets
 * (`entryData`): created lazily, capacity `2 * size + 1`, grown to `2 * capacity + 4` with the
 * buckets rehashed in order. `map()` iterates the buckets (bucket index
 * `(hash & 0x7FFFFFFF) % capacity`, then bucket order), not the list. `put` on a present key
 * calls `entry.setValue` in place; a new key appends a new entry through the list, which makes the
 * owner its container; `removeKey`/`clear` remove entries through the list, which releases them.
 * Java's `null` for "absent" is `undefined`. A lookup finds the first bucket entry per key, as in
 * EMF; EMF removes the first bucket entry with the removed entry's key, which gets out of step
 * when the shadowed duplicate of a key is removed, the bucket here removes the entry itself. The
 * Java `modCount` (fail-fast iterators) is not ported. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EcoreEMap
 * @see org.eclipse.emf.common.util.BasicEMap
 */
export class EcoreEMap<K, V, E extends BasicEMapEntry<K, V> = BasicEMapEntry<K, V>> implements Iterable<[K, V]> {
  readonly #strategy: HashStrategy<K>;
  readonly #newEntry: (key: K, value: V) => E;
  readonly #delegateEList: DelegateEObjectContainmentEList<E>;
  /** `BasicEMap.entryData`: the hash buckets; `null` until first needed, and again after a clear. */
  #entryData: Array<E[] | undefined> | null = null;
  /** `BasicEMap.size`: kept in step with the delegate list. */
  #size = 0;

  constructor(strategy: HashStrategy<K>, owner: InternalEObject, featureID: number, newEntry: (key: K, value: V) => E) {
    this.#strategy = strategy;
    this.#newEntry = newEntry;
    this.#delegateEList = new DelegateEObjectContainmentEList<E>(owner, featureID, {
      doPut: (entry) => this.#doPut(entry),
      doRemove: (entry) => this.#doRemove(entry),
      doClear: () => this.#doClear(),
    });
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#put(Object, Object) */
  put(key: K | null, value: V): V | undefined {
    const data = this.#ensureEntryDataExists();
    if (this.#size > 0) {
      const entry = this.#entryForKey(data, key);
      if (entry !== undefined) {
        return entry.setValue(value);
      }
    }
    this.#delegateEList.add(this.#newEntry(key as K, value));
    return undefined;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#get(Object) */
  get(key: K | null): V | undefined {
    if (this.#size > 0) {
      return this.#entryForKey(this.#ensureEntryDataExists(), key)?.getValue();
    }
    return undefined;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#removeKey(Object) */
  removeKey(key: K | null): V | undefined {
    const entry = this.#entryForKey(this.#ensureEntryDataExists(), key);
    if (entry === undefined) {
      return undefined;
    }
    this.#delegateEList.remove(entry);
    return entry.getValue();
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#containsKey(Object) */
  containsKey(key: K | null): boolean {
    if (this.#size > 0) {
      return this.#entryForKey(this.#ensureEntryDataExists(), key) !== undefined;
    }
    return false;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#clear() */
  clear(): void {
    this.#delegateEList.clear();
  }

  size(): number {
    return this.#delegateEList.size();
  }

  isEmpty(): boolean {
    return this.#delegateEList.isEmpty();
  }

  /** The live delegate list: what the owner reports as this containment feature. */
  entryList(): EObjectContainmentEList<E> {
    return this.#delegateEList;
  }

  /** The entries in list order (`BasicEMap.iterator()`). */
  *entries(): Generator<[K, V], void, undefined> {
    for (const entry of this.#delegateEList) {
      yield [entry.getKey(), entry.getValue()];
    }
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries();
  }

  /**
   * The `java.util.Map` view. Its iteration order is the hash-bucket order of `entrySet()`, not the
   * list order.
   *
   * @see org.eclipse.emf.common.util.BasicEMap#map()
   */
  map(): EMapView<K, V> {
    return {
      get: (key) => this.get(key),
      containsKey: (key) => this.containsKey(key),
      isEmpty: () => this.isEmpty(),
      size: () => this.size(),
      [Symbol.iterator]: () => this.#entrySetIterator(),
    };
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#newEntryData(int) */
  #newEntryData(capacity: number): Array<E[] | undefined> {
    return Array.from<E[] | undefined>({ length: capacity });
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#ensureEntryDataExists() */
  #ensureEntryDataExists(): Array<E[] | undefined> {
    if (this.#entryData === null) {
      this.#entryData = this.#newEntryData(2 * this.#size + 1);
      this.#size = 0;
      for (const entry of this.#delegateEList) {
        this.#doPut(entry);
      }
    }
    return this.#entryData;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#hashOf(Object) */
  #hashOf(key: K | null): number {
    return key === null ? 0 : this.#strategy.hash(key);
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#indexOf(int) */
  #indexOf(hash: number, capacity: number): number {
    return (hash & 0x7fffffff) % capacity;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#entryForKey(int, int, Object) */
  #entryForKey(data: ReadonlyArray<E[] | undefined>, key: K | null): E | undefined {
    const hash = this.#hashOf(key);
    return data[this.#indexOf(hash, data.length)]?.find((entry) => this.#keyMatches(entry, hash, key));
  }

  /** The key test of `entryForKey`: hash and `equals` for a key, identity for a `null` key. */
  #keyMatches(entry: E, hash: number, key: K | null): boolean {
    const entryKey = entry.getKey();
    if (key === null) {
      return entryKey === null;
    }
    return this.#hashOf(entryKey) === hash && entryKey !== null && this.#strategy.equals(key, entryKey);
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#grow(int) */
  #grow(data: Array<E[] | undefined>, minimumCapacity: number): Array<E[] | undefined> {
    if (minimumCapacity <= data.length) {
      return data;
    }
    const grown = this.#newEntryData(2 * data.length + 4);
    for (const bucket of data) {
      for (const entry of bucket ?? []) {
        const index = this.#indexOf(this.#hashOf(entry.getKey()), grown.length);
        (grown[index] ??= []).push(entry);
      }
    }
    return grown;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#doPut(org.eclipse.emf.common.util.BasicEMap.Entry) */
  #doPut(entry: E): void {
    if (this.#entryData !== null) {
      const data = this.#grow(this.#entryData, this.#size + 1);
      this.#entryData = data;
      (data[this.#indexOf(this.#hashOf(entry.getKey()), data.length)] ??= []).push(entry);
    }
    ++this.#size;
  }

  /**
   * @see org.eclipse.emf.common.util.BasicEMap#doRemove(org.eclipse.emf.common.util.BasicEMap.Entry)
   * @see org.eclipse.emf.common.util.BasicEMap#removeEntry(int, int)
   */
  #doRemove(entry: E): void {
    if (this.#entryData !== null) {
      // The bucket exists and holds the entry: `ensureEntryDataExists` puts every list entry in it.
      const bucket = this.#entryData[this.#indexOf(this.#hashOf(entry.getKey()), this.#entryData.length)] as E[];
      bucket.splice(bucket.indexOf(entry), 1);
    }
    --this.#size;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#doClear() */
  #doClear(): void {
    this.#entryData = null;
    this.#size = 0;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap.BasicEMapIterator#scan() */
  #entrySetIterator(): Iterator<[K, V]> {
    const data = this.#size > 0 ? this.#ensureEntryDataExists() : [];
    return scanBuckets(data);
  }
}

/** Entries in bucket order: ascending bucket index, then position in the bucket. */
function* scanBuckets<K, V>(
  data: ReadonlyArray<ReadonlyArray<BasicEMapEntry<K, V>> | undefined>,
): Generator<[K, V], void, undefined> {
  for (const bucket of data) {
    for (const entry of bucket ?? []) {
      yield [entry.getKey(), entry.getValue()];
    }
  }
}
