// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { QualifiedName } from '../naming/QualifiedName.js';
import { AbstractEObjectDescription } from './AbstractEObjectDescription.js';
import type { IEObjectDescription } from './IEObjectDescription.js';

const NULL_NAME_MESSAGE = 'qualified name may not be null';
const EMPTY_USER_DATA: ReadonlyMap<string, string> = new Map<string, string>();

/**
 * A description of a plain element under a qualified name, with optional user data. The Java
 * `NullPointerException` for a null name is a `TypeError` (decision D10).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/EObjectDescription.java
 */
export class EObjectDescription extends AbstractEObjectDescription {
  private readonly userData: ReadonlyMap<string, string> | null;
  private readonly qualifiedName: QualifiedName;
  private readonly element: EObject;

  constructor(qualifiedName: QualifiedName, element: EObject, userData: ReadonlyMap<string, string> | null) {
    super();
    // the Java null check; the type excludes null, JS callers may not
    if ((qualifiedName as QualifiedName | null) === null) {
      throw new TypeError(NULL_NAME_MESSAGE);
    }
    this.qualifiedName = qualifiedName;
    this.element = element;
    this.userData = userData;
  }

  /**
   * The four `create` overloads: a simple name or a qualified name, with the given user data
   * (possibly `null`) or, by default, an empty map.
   */
  static create(
    name: string | QualifiedName,
    element: EObject,
    userData: ReadonlyMap<string, string> | null = EMPTY_USER_DATA,
  ): IEObjectDescription {
    const qualifiedName = typeof name === 'string' ? QualifiedName.create(name) : name;
    return new EObjectDescription(qualifiedName, element, userData);
  }

  override getEObjectOrProxy(): EObject {
    return this.element;
  }

  override getName(): QualifiedName {
    return this.qualifiedName;
  }

  override getQualifiedName(): QualifiedName {
    return this.qualifiedName;
  }

  override getUserData(name: string): string | null {
    if (this.userData === null) {
      return null;
    }
    return this.userData.get(name) ?? null;
  }

  override getUserDataKeys(): readonly string[] {
    if (this.userData === null) {
      return [];
    }
    return [...this.userData.keys()];
  }

  override getEClass(): EClass {
    return this.element.eClass();
  }
}
