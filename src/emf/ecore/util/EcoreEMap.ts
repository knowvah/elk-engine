// SPDX-License-Identifier: EPL-2.0
import type { HashStrategy } from '../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../java/util/JavaHashMap.js';
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
  get(key: K): V | undefined;
  containsKey(key: K): boolean;
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
 * owner's {@link HashStrategy} (Java `hashCode`/`equals`). `put` on a present key calls
 * `entry.setValue` in place; a new key appends a new entry through the list, which makes the owner
 * its container; `removeKey`/`clear` remove entries through the list, which releases them. Java's
 * `null` for "absent" is `undefined`. The index keeps the first list entry per key, as EMF's hash
 * bucket does; EMF's bucket gets out of step when the shadowed duplicate of a key is removed, the
 * index here does not. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EcoreEMap
 * @see org.eclipse.emf.common.util.BasicEMap
 */
export class EcoreEMap<K, V, E extends BasicEMapEntry<K, V> = BasicEMapEntry<K, V>> implements Iterable<[K, V]> {
  readonly #strategy: HashStrategy<K>;
  readonly #index: JavaHashMap<K, E>;
  readonly #newEntry: (key: K, value: V) => E;
  readonly #delegateEList: DelegateEObjectContainmentEList<E>;

  constructor(strategy: HashStrategy<K>, owner: InternalEObject, featureID: number, newEntry: (key: K, value: V) => E) {
    this.#strategy = strategy;
    this.#index = new JavaHashMap<K, E>(strategy);
    this.#newEntry = newEntry;
    this.#delegateEList = new DelegateEObjectContainmentEList<E>(owner, featureID, {
      doPut: (entry) => this.#doPut(entry),
      doRemove: (entry) => this.#doRemove(entry),
      doClear: () => this.#index.clear(),
    });
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#put(Object, Object) */
  put(key: K, value: V): V | undefined {
    const entry = this.#index.get(key);
    if (entry !== undefined) {
      return entry.setValue(value);
    }
    this.#delegateEList.add(this.#newEntry(key, value));
    return undefined;
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#get(Object) */
  get(key: K): V | undefined {
    return this.#index.get(key)?.getValue();
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#removeKey(Object) */
  removeKey(key: K): V | undefined {
    const entry = this.#index.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.#delegateEList.remove(entry);
    return entry.getValue();
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#containsKey(Object) */
  containsKey(key: K): boolean {
    return this.#index.containsKey(key);
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

  /** The entries in list order. */
  *entries(): Generator<[K, V], void, undefined> {
    for (const entry of this.#delegateEList) {
      yield [entry.getKey(), entry.getValue()];
    }
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries();
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#map() */
  map(): EMapView<K, V> {
    return {
      get: (key) => this.get(key),
      containsKey: (key) => this.containsKey(key),
      isEmpty: () => this.isEmpty(),
      size: () => this.size(),
      [Symbol.iterator]: () => this.entries(),
    };
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#doPut(org.eclipse.emf.common.util.BasicEMap.Entry) */
  #doPut(entry: E): void {
    if (!this.#index.containsKey(entry.getKey())) {
      this.#index.put(entry.getKey(), entry);
    }
  }

  /** @see org.eclipse.emf.common.util.BasicEMap#doRemove(org.eclipse.emf.common.util.BasicEMap.Entry) */
  #doRemove(entry: E): void {
    const key = entry.getKey();
    if (this.#index.get(key) === entry) {
      this.#index.remove(key);
      const next = this.#delegateEList.toArray().find((e) => this.#strategy.equals(e.getKey(), key));
      if (next !== undefined) {
        this.#index.put(key, next);
      }
    }
  }
}
