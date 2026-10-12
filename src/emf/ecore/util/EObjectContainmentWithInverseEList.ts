// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../InternalEObject.js';
import { EObjectWithInverseEList } from './EObjectWithInverseEList.js';

/**
 * A containment list whose elements point back through `inverseFeatureID` (e.g. `children` ↔
 * `parent`). Adding calls the element's `eInverseAdd(owner, inverseFeatureID)`, whose generated
 * case leaves the old container and sets the new one; there is no recursive-containment check
 * (only the generated setters have one). EMF derives this class from `EObjectContainmentEList`;
 * with the inverse arms already in `EObjectWithInverseEList` the port derives it from there and
 * adds `isContainment()`. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectContainmentWithInverseEList
 * @see org.eclipse.emf.ecore.util.EObjectContainmentEList
 */
export class EObjectContainmentWithInverseEList<E extends InternalEObject> extends EObjectWithInverseEList<E> {
  protected override isContainment(): boolean {
    return true;
  }
}
