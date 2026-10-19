// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../InternalEObject.js';
import { EObjectEList } from './EObjectEList.js';

/**
 * A reference list without an opposite whose elements may be proxies: `get` (and so iteration and
 * `toArray`), `contains` and `indexOf` resolve them; `basicGet` does not. EMF is EPL-2.0
 * (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EObjectResolvingEList
 */
export class EObjectResolvingEList<E extends InternalEObject> extends EObjectEList<E> {
  protected override hasProxies(): boolean {
    return true;
  }

  protected override resolve(index: number, object: E): E {
    return this.resolveEObject(index, object);
  }
}
