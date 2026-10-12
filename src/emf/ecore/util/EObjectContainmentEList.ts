// SPDX-License-Identifier: EPL-2.0
import { EObjectEList } from './EObjectEList.js';
import type { InternalEObject } from '../InternalEObject.js';

/**
 * A containment list without an opposite reference (e.g. `bendPoints`, a property map's entries):
 * each element is told `EOPPOSITE_FEATURE_BASE - featureID`, which `BasicEObjectImpl.eInverseAdd`
 * turns into "leave the old container, take the owner". EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectContainmentEList
 */
export class EObjectContainmentEList<E extends InternalEObject> extends EObjectEList<E> {
  protected override hasInverse(): boolean {
    return true;
  }

  protected override isContainment(): boolean {
    return true;
  }
}
