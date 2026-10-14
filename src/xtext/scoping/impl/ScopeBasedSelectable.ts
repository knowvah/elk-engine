// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import type { EClassRef } from '../EReferenceInfo.js';
import type { IScope } from '../IScope.js';

/**
 * Views a scope as a selectable: the scope answers every request, the type is not consulted.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/ScopeBasedSelectable.java
 */
export class ScopeBasedSelectable implements ISelectable {
  constructor(private readonly scope: IScope) {}

  isEmpty(): boolean {
    return false;
  }

  getExportedObjects(): Iterable<IEObjectDescription> {
    return this.scope.getAllElements();
  }

  getExportedObjectsByName(_type: EClassRef, name: QualifiedName, _ignoreCase: boolean): Iterable<IEObjectDescription> {
    return this.scope.getElements(name);
  }

  getExportedObjectsByType(_type: EClassRef): Iterable<IEObjectDescription> {
    return this.scope.getAllElements();
  }

  getExportedObjectsByObject(object: EObject): Iterable<IEObjectDescription> {
    return this.scope.getElements(object);
  }

  toString(): string {
    return this.scope.toString();
  }
}
