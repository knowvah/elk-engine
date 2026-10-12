// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../emf/ecore/InternalEObject.js';
import type { EcoreEMap } from '../emf/ecore/util/EcoreEMap.js';
import { isInstance } from './ElkGraphPackage.js';
import type { IProperty } from './properties/IProperty.js';
import type { IPropertyHolder } from './properties/IPropertyHolder.js';

/**
 * A property holder whose properties live in an EMF map of contained entries. Java extends
 * `EObject`; the port extends `InternalEObject`, which every generated object is at run time (the
 * generated code casts to it unconditionally) and which the `src/emf` lists require of their
 * elements.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/EMapPropertyHolder.java
 */
export interface EMapPropertyHolder extends InternalEObject, IPropertyHolder {
  /**
   * The '<em>Properties</em>' map: `IProperty` keys (equal by id, D5) to their values.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/EMapPropertyHolder.java
   */
  getProperties(): EcoreEMap<IProperty<unknown>, unknown>;
}

/**
 * Java `o instanceof EMapPropertyHolder` (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/EMapPropertyHolder.java
 */
export function isEMapPropertyHolder(o: unknown): o is EMapPropertyHolder {
  return isInstance('EMapPropertyHolder', o);
}
