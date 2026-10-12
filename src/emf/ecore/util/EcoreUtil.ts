// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { InternalEObject } from '../InternalEObject.js';

/** EMF restarts a container walk from the current container after this many steps. */
const MAX_CONTAINER_STEPS = 100000;

/**
 * Whether `ancestorEObject` is `eObject` or one of its transitive containers. A walk that comes
 * back to `eObject` stops; one stuck in a cycle above `eObject` restarts inside the cycle.
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#isAncestor(org.eclipse.emf.ecore.EObject, org.eclipse.emf.ecore.EObject)
 */
function isAncestor(ancestorEObject: InternalEObject | null, eObject: InternalEObject | null): boolean {
  if (eObject !== null) {
    if (eObject === ancestorEObject) {
      return true;
    }
    let count = 0;
    for (
      let eContainer = eObject.eInternalContainer();
      eContainer !== null && eContainer !== eObject;
      eContainer = eContainer.eInternalContainer()
    ) {
      if (++count > MAX_CONTAINER_STEPS) {
        return isAncestor(ancestorEObject, eContainer);
      }
      if (eContainer === ancestorEObject) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The topmost container of `eObject` (itself when uncontained).
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#getRootContainer(org.eclipse.emf.ecore.EObject)
 */
function getRootContainer(eObject: InternalEObject): InternalEObject;
function getRootContainer(eObject: InternalEObject | null): InternalEObject | null;
function getRootContainer(eObject: InternalEObject | null): InternalEObject | null {
  let result = eObject;
  if (eObject !== null) {
    let count = 0;
    for (let parent = eObject.eContainer(); parent !== null; parent = parent.eContainer()) {
      if (++count > MAX_CONTAINER_STEPS) {
        return getRootContainer(parent);
      }
      result = parent;
      if (parent === eObject) {
        throw new IllegalStateException(`There is a cycle in the containment hierarchy of ${eObject.toString()}`);
      }
    }
  }
  return result;
}

/**
 * The `EcoreUtil` operations the port needs. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil
 */
export const EcoreUtil = { isAncestor, getRootContainer } as const;
