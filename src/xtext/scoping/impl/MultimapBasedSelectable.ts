// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import * as Iterables from '../../../guava/Iterables.js';
import { LinkedHashMultimap } from '../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../guava/Multimap.js';
import { hashable, identity } from '../../../java/util/HashStrategy.js';
import { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { ISelectable } from '../../resource/ISelectable.js';
import type { EClassRef } from '../EReferenceInfo.js';

/**
 * Descriptions indexed by lower-case name. The multimap keeps document (insertion) order, which
 * decides which of several descriptions with the same name is found first. The Java
 * `EcoreUtil2.isAssignableFrom(type, eClass)` is `type.isAssignableFrom(eClass.getName())`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/MultimapBasedSelectable.java
 */
export class MultimapBasedSelectable implements ISelectable {
  private nameToObjects: Multimap<QualifiedName, IEObjectDescription> = newIndex();
  private allDescriptions: IEObjectDescription[] = [];

  constructor(allDescriptions: Iterable<IEObjectDescription>) {
    this.setExportedObjects(allDescriptions);
  }

  isEmpty(): boolean {
    return this.allDescriptions.length === 0;
  }

  getExportedObjectsByType(type: EClassRef): Iterable<IEObjectDescription> {
    if (this.allDescriptions.length === 0) {
      return [];
    }
    return Iterables.filter(this.allDescriptions, (input) => type.isAssignableFrom(input.getEClass().getName()));
  }

  /** Identity stands in for the Java identity-or-URI test, see {@link AbstractScope}. */
  getExportedObjectsByObject(object: EObject): Iterable<IEObjectDescription> {
    if (this.allDescriptions.length === 0) {
      return [];
    }
    return Iterables.filter(this.allDescriptions, (input) => input.getEObjectOrProxy() === object);
  }

  getExportedObjectsByName(type: EClassRef, name: QualifiedName, ignoreCase: boolean): Iterable<IEObjectDescription> {
    if (this.allDescriptions.length === 0) {
      return [];
    }
    const lowerCase = name.toLowerCase();
    if (this.nameToObjects.containsKey(lowerCase)) {
      const predicate = ignoreCase
        ? (input: IEObjectDescription): boolean => type.isAssignableFrom(input.getEClass().getName())
        : (input: IEObjectDescription): boolean =>
            name.equals(input.getName()) && type.isAssignableFrom(input.getEClass().getName());
      return Iterables.filter(this.nameToObjects.get(lowerCase), predicate);
    }
    return [];
  }

  getExportedObjects(): Iterable<IEObjectDescription> {
    return this.allDescriptions;
  }

  setExportedObjects(allDescriptions: Iterable<IEObjectDescription>): void {
    this.allDescriptions = [];
    this.nameToObjects = newIndex();
    for (const description of allDescriptions) {
      this.allDescriptions.push(description);
      this.nameToObjects.put(description.getName().toLowerCase(), description);
    }
  }
}

/** `LinkedHashMultimap.create()`: names hash by value, descriptions have no `equals` (identity). */
function newIndex(): Multimap<QualifiedName, IEObjectDescription> {
  return LinkedHashMultimap.create<QualifiedName, IEObjectDescription>(
    hashable<QualifiedName>(),
    identity<IEObjectDescription>(),
  );
}
