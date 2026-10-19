// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../InternalEObject.js';
import { EObjectEList } from './EObjectEList.js';

/**
 * An `EObject` list with a navigable opposite: every add and remove calls the element's
 * `eInverseAdd`/`eInverseRemove` with `inverseFeatureID` (the `hasNavigableInverse()` arm of
 * `EcoreEList`, with `hasInstanceClass()` true). EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectWithInverseEList
 */
export class EObjectWithInverseEList<E extends InternalEObject> extends EObjectEList<E> {
  constructor(
    owner: InternalEObject,
    featureID: number,
    protected readonly inverseFeatureID: number,
  ) {
    super(owner, featureID);
  }

  protected override hasInverse(): boolean {
    return true;
  }

  protected override isContainerFeatureID(eContainerFeatureID: number): boolean {
    return eContainerFeatureID === this.inverseFeatureID;
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#inverseAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  protected override inverseAdd(object: E): void {
    object.eInverseAdd(this.owner, this.inverseFeatureID);
  }

  /** @see org.eclipse.emf.ecore.util.EcoreEList#inverseRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  protected override inverseRemove(object: E): void {
    object.eInverseRemove(this.owner, this.inverseFeatureID);
  }
}

/**
 * The opposite is many-valued too. EMF's only use of `hasManyInverse()` is to skip the
 * `eGet`-based `contains` shortcut that `EObjectEList` does not port (D4), so the class adds no
 * behaviour here. The proxy-resolving counterpart is `EObjectWithInverseResolvingEList.ManyInverse`.
 *
 * @see org.eclipse.emf.ecore.util.EObjectWithInverseEList.ManyInverse
 */
export class ManyInverse<E extends InternalEObject> extends EObjectWithInverseEList<E> {}
