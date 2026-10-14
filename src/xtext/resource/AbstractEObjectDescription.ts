// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import type { QualifiedName } from '../naming/QualifiedName.js';
import type { IEObjectDescription } from './IEObjectDescription.js';

/**
 * Base of the descriptions: no user data, `toString` is the name.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/AbstractEObjectDescription.java
 */
export abstract class AbstractEObjectDescription implements IEObjectDescription {
  abstract getName(): QualifiedName;
  abstract getQualifiedName(): QualifiedName;
  abstract getEObjectOrProxy(): EObject;
  abstract getEClass(): EClass;

  toString(): string {
    return this.getName().toString();
  }

  getUserData(_name: string): string | null {
    return null;
  }

  getUserDataKeys(): readonly string[] {
    return [];
  }
}
