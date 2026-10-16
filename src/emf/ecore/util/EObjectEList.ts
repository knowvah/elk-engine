// SPDX-License-Identifier: EPL-2.0
import { BasicEList } from '../../common/util/BasicEList.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';

/**
 * A unique, non-null list of `EObject`s owned by `owner` under `featureID`. EMF's hierarchy
 * `NotifyingListImpl` → `EcoreEList` → `EObjectEList` is collapsed here: the inverse hooks of
 * `NotifyingListImpl` (only its no-notification branches; the port has no notifications), the
 * `inverseAdd`/`inverseRemove`/`contains` of `EcoreEList`, and `EObjectEList`'s flags. EMF picks
 * the inverse call with `hasNavigableInverse()`; here this class makes the opposite-less call and
 * `EObjectWithInverseEList` overrides it with the navigable one. Overloads: `addUnique(int, E)` →
 * `addUniqueAt`, `basicAdd(E, msgs)` → `basicAdd`, `basicRemove(Object, msgs)` → `basicRemove`,
 * `resolve(int, EObject)` → `resolveEObject`.
 *
 * Proxies: `hasProxies()` is false here and true in `EObjectResolvingEList` and
 * `EObjectWithInverseResolvingEList`. A resolving list resolves in `get` (and so in `iterator`,
 * `listIterator` and `toArray`), `contains` and `indexOf`; `basicGet` and `basicAdd`/`basicRemove`
 * never do. `indexOf` scans for proxies only when `hasProxies()`: EMF scans always, but a list
 * without proxies finds none, so the result is the same. Not ported: the proxy scan inside the
 * containment arm of `contains` (no containment list here resolves; `resolveEObject` keeps its
 * containment arm); `lastIndexOf` and `removeAll` (`resolve(E)`) have no caller; the
 * `isInstance` test of `contains` (the type system); notifications. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectEList
 * @see org.eclipse.emf.ecore.util.EcoreEList
 * @see org.eclipse.emf.common.notify.impl.NotifyingListImpl
 */
export class EObjectEList<E extends InternalEObject> extends BasicEList<E> {
  constructor(
    protected readonly owner: InternalEObject,
    protected readonly featureID: number,
  ) {
    super();
  }

  protected override isUnique(): boolean {
    return true;
  }

  protected override canContainNull(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#hasInverse() */
  protected hasInverse(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#isContainment() */
  protected isContainment(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#hasProxies() */
  protected hasProxies(): boolean {
    return false;
  }

  /**
   * `isEObject()` is always true here.
   *
   * @see org.eclipse.emf.ecore.util.EcoreEList#resolve(int, Object)
   */
  protected override resolve(index: number, object: E): E {
    return this.hasProxies() ? this.resolveEObject(index, object) : object;
  }

  /**
   * Replaces the slot with the resolved object when `eObject` is a proxy that resolves. No inverse
   * is added on the resolved object and none removed from the proxy (a containment list moves it).
   *
   * @see org.eclipse.emf.ecore.util.EcoreEList#resolve(int, EObject)
   */
  protected resolveEObject(index: number, eObject: E): E {
    const resolved = this.resolveProxy(eObject);
    if (resolved === eObject) {
      return eObject;
    }
    const oldObject = (this.data as Array<E | null>)[index] as E;
    this.assign(index, this.validate(index, resolved));
    this.didSet(index, resolved, oldObject);
    if (this.isContainment()) {
      this.inverseRemove(eObject);
      if (resolved.eInternalContainer() === null) {
        this.inverseAdd(resolved);
      }
    }
    return resolved;
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#resolveProxy(EObject) */
  protected resolveProxy(eObject: E): E {
    return eObject.eIsProxy() ? (this.owner.eResolveProxy(eObject) as E) : eObject;
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(Object) */
  override addUnique(object: E): void {
    super.addUnique(object);
    if (this.hasInverse()) {
      this.inverseAdd(object);
    }
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(int, Object) */
  override addUniqueAt(index: number, object: E): void {
    super.addUniqueAt(index, object);
    if (this.hasInverse()) {
      this.inverseAdd(object);
    }
  }

  /**
   * EMF delegates to `addAllUnique(size, collection)`, which appends exactly like the
   * index-free form used here.
   *
   * @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addAllUnique(int, java.util.Collection)
   */
  override addAllUnique(collection: readonly E[]): boolean {
    const collectionSize = collection.length;
    if (collectionSize === 0) {
      return false;
    }
    const index = this.listSize;
    super.addAllUnique(collection);
    if (this.hasInverse()) {
      const lastIndex = index + collectionSize;
      for (let i = index; i < lastIndex; ++i) {
        this.inverseAdd((this.data as E[])[i] as E);
      }
    }
    return true;
  }

  /** Adds without the inverse. @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#basicAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicAdd(object: E): void {
    super.addUniqueAt(this.listSize, object);
  }

  /**
   * EMF also checks `oldObject != null`; a removed element of this non-null list never is.
   *
   * @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#remove(int)
   */
  override removeAt(index: number): E {
    const oldObject = super.removeAt(index);
    if (this.hasInverse()) {
      this.inverseRemove(oldObject);
    }
    return oldObject;
  }

  /** Removes without the inverse. @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#basicRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicRemove(object: E): void {
    const index = this.indexOf(object);
    if (index !== -1) {
      super.removeAt(index);
    }
  }

  /**
   * Clears, then removes the inverse of each old element in order (a no-op for an empty list, the
   * branch EMF spells out separately).
   *
   * @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#clear()
   */
  override clear(): void {
    const oldData = this.data;
    const oldSize = this.listSize;
    super.clear();
    if (this.hasInverse()) {
      for (let i = 0; i < oldSize; ++i) {
        this.inverseRemove((oldData as E[])[i] as E);
      }
    }
  }

  /**
   * `setUnique` past the size (inside the capacity) finds no old element, so only the inverse add
   * runs.
   *
   * @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#setUnique(int, Object)
   */
  override setUnique(index: number, object: E): E {
    const oldObject = super.setUnique(index, object);
    if (this.hasInverse() && oldObject !== object) {
      if (oldObject !== null) {
        this.inverseRemove(oldObject);
      }
      this.inverseAdd(object);
    }
    return oldObject;
  }

  /**
   * More than four elements of a containment list: membership is read from the element's container
   * and container feature id. Otherwise a miss is retried against the resolved elements of a
   * resolving list, without replacing any slot. EMF also short-cuts single-valued navigable inverses via `eGet`,
   * which the port does not have (D4); the scan gives the same answer for a consistent model.
   *
   * @see org.eclipse.emf.ecore.util.EcoreEList#contains(Object)
   */
  override contains(object: E): boolean {
    if (this.listSize > 4 && this.isContainment()) {
      return object.eContainer() === this.owner && this.isContainerFeatureID(object.eContainerFeatureID());
    }
    const result = super.contains(object);
    return result || (this.hasProxies() && this.resolvedIndexOf(object) !== -1);
  }

  /** Resolving first, then by resolved element, without replacing any slot. @see org.eclipse.emf.ecore.util.EcoreEList#indexOf(Object) */
  override indexOf(object: E): number {
    const index = super.indexOf(object);
    return index >= 0 || !this.hasProxies() ? index : this.resolvedIndexOf(object);
  }

  /** The position whose element resolves to `object`, or -1. */
  private resolvedIndexOf(object: E): number {
    for (let i = 0; i < this.listSize; ++i) {
      if (this.resolveProxy((this.data as E[])[i] as E) === object) {
        return i;
      }
    }
    return -1;
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#toArray() */
  override toArray(): E[] {
    if (this.hasProxies()) {
      for (let i = this.listSize - 1; i >= 0; --i) {
        this.get(i);
      }
    }
    return super.toArray();
  }

  /** The `!hasNavigableInverse()` arm of `EcoreEList.contains`. */
  protected isContainerFeatureID(eContainerFeatureID: number): boolean {
    return EOPPOSITE_FEATURE_BASE - eContainerFeatureID === this.featureID;
  }

  /** The `!hasNavigableInverse()` arm. @see org.eclipse.emf.ecore.util.EcoreEList#inverseAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  protected inverseAdd(object: E): void {
    object.eInverseAdd(this.owner, EOPPOSITE_FEATURE_BASE - this.featureID);
  }

  /** The `!hasNavigableInverse()` arm. @see org.eclipse.emf.ecore.util.EcoreEList#inverseRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  protected inverseRemove(object: E): void {
    object.eInverseRemove(this.owner, EOPPOSITE_FEATURE_BASE - this.featureID);
  }
}
