// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../common/util/EList.js';
import type { EObject } from './EObject.js';

/**
 * Container feature ids below this base encode a containment without an opposite:
 * `EOPPOSITE_FEATURE_BASE - featureID` of the containing list.
 *
 * @see org.eclipse.emf.ecore.InternalEObject#EOPPOSITE_FEATURE_BASE
 */
export const EOPPOSITE_FEATURE_BASE = -1;

/**
 * The internal `EObject` protocol the lists and `BasicEObjectImpl` call (decision D4). EMF's
 * `NotificationChain` arguments and `Class<?> baseClass` arguments are dropped. EMF is EPL-2.0
 * (decision D1).
 *
 * @see org.eclipse.emf.ecore.InternalEObject
 */
export interface InternalEObject extends EObject {
  eContainer(): InternalEObject | null;
  eContents(): EList<InternalEObject>;
  eAllContents(): IterableIterator<InternalEObject>;
  eInternalContainer(): InternalEObject | null;
  eContainerFeatureID(): number;
  eBasicSetContainer(newContainer: InternalEObject | null, newContainerFeatureID: number): void;
  eBasicRemoveFromContainer(): void;
  eInverseAdd(otherEnd: InternalEObject, featureID: number): void;
  eInverseRemove(otherEnd: InternalEObject, featureID: number): void;
}
