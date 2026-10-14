// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { IQualifiedNameProvider } from './IQualifiedNameProvider.js';
import type { QualifiedName } from './QualifiedName.js';

/**
 * Base of the name providers: `apply` delegates to `getFullyQualifiedName`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/IQualifiedNameProvider.java
 */
export abstract class AbstractImpl implements IQualifiedNameProvider {
  abstract getFullyQualifiedName(obj: EObject): QualifiedName | null;

  apply(from: EObject): QualifiedName | null {
    return this.getFullyQualifiedName(from);
  }
}
