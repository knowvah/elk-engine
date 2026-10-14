// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import { QualifiedName } from '../naming/QualifiedName.js';
import type { IEObjectDescription } from '../resource/IEObjectDescription.js';

/**
 * A scope: the descriptions visible at a place. The Java overloads by parameter type are one
 * method each here: a {@link QualifiedName} looks up by name, an `EObject` by element (the reverse
 * lookup the serializer needs for the text of a cross reference).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/IScope.java
 */
export interface IScope {
  getSingleElement(name: QualifiedName): IEObjectDescription | null;
  getSingleElement(object: EObject): IEObjectDescription | null;
  getElements(name: QualifiedName): Iterable<IEObjectDescription>;
  getElements(object: EObject): Iterable<IEObjectDescription>;
  getAllElements(): Iterable<IEObjectDescription>;
}

class NullScope implements IScope {
  getSingleElement(_nameOrObject: QualifiedName | EObject): IEObjectDescription | null {
    return null;
  }

  getElements(_nameOrObject: QualifiedName | EObject): Iterable<IEObjectDescription> {
    return [];
  }

  getAllElements(): Iterable<IEObjectDescription> {
    return [];
  }

  toString(): string {
    return 'NULLSCOPE';
  }
}

/** The scope that never finds anything (`IScope.NULLSCOPE`). */
export const NULLSCOPE: IScope = new NullScope();
