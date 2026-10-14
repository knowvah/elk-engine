// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { QualifiedName } from './QualifiedName.js';

/**
 * Provides qualified names for EObjects. Java's `Function<EObject, QualifiedName>` supertype is
 * `apply`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/IQualifiedNameProvider.java
 */
export interface IQualifiedNameProvider {
  /** The qualified name, `null` when the provider is not responsible or the object has none. */
  getFullyQualifiedName(obj: EObject): QualifiedName | null;
  apply(from: EObject): QualifiedName | null;
}
