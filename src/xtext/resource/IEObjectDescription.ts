// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import type { QualifiedName } from '../naming/QualifiedName.js';

/**
 * The description of an element for scoping. `getEObjectURI()` is not ported: within one resource
 * tree URIs are unique, so every URI comparison of the scoping classes is the identity test
 * `getEObjectOrProxy() === other` and no caller needs the URI.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/IEObjectDescription.java
 */
export interface IEObjectDescription {
  /** The name under which the element is visible in the scope that produced this description. */
  getName(): QualifiedName;
  /** The fully qualified name of the element. */
  getQualifiedName(): QualifiedName;
  getEObjectOrProxy(): EObject;
  getEClass(): EClass;
  getUserData(key: string): string | null;
  getUserDataKeys(): readonly string[];
}
