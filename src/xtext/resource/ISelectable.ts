// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { QualifiedName } from '../naming/QualifiedName.js';
import type { EClassRef } from '../scoping/EReferenceInfo.js';
import type { IEObjectDescription } from './IEObjectDescription.js';

/**
 * Something that exports descriptions.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/ISelectable.java
 */
export interface ISelectable {
  isEmpty(): boolean;
  getExportedObjects(): Iterable<IEObjectDescription>;
  /** Overload `getExportedObjects(EClass, QualifiedName, boolean)`. */
  getExportedObjectsByName(type: EClassRef, name: QualifiedName, ignoreCase: boolean): Iterable<IEObjectDescription>;
  getExportedObjectsByType(type: EClassRef): Iterable<IEObjectDescription>;
  getExportedObjectsByObject(object: EObject): Iterable<IEObjectDescription>;
}
