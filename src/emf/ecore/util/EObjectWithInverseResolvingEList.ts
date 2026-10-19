// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../InternalEObject.js';
import { EObjectWithInverseEList } from './EObjectWithInverseEList.js';

/**
 * An `EObjectWithInverseEList` whose elements may be proxies: `get` (and so iteration and
 * `toArray`), `contains` and `indexOf` resolve them, replacing the slot of a proxy that resolves
 * without touching either object's inverse list; `basicGet` does not resolve. EMF's `Unsettable`
 * variants only add the unset state, which the port has no use for. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectWithInverseResolvingEList
 */
export class EObjectWithInverseResolvingEList<E extends InternalEObject> extends EObjectWithInverseEList<E> {
  protected override hasProxies(): boolean {
    return true;
  }

  protected override resolve(index: number, object: E): E {
    return this.resolveEObject(index, object);
  }
}

/**
 * The opposite is many-valued too. EMF's only use of `hasManyInverse()` is to skip the
 * `eGet`-based `contains` shortcut that `EObjectEList` does not port (D4), so the class adds no
 * behaviour here.
 *
 * @see org.eclipse.emf.ecore.util.EObjectWithInverseResolvingEList.ManyInverse
 */
export class ManyInverse<E extends InternalEObject> extends EObjectWithInverseResolvingEList<E> {}
