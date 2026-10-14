// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { EReferenceInfo } from './EReferenceInfo.js';
import type { IScope } from './IScope.js';

/**
 * Computes the scope of a cross reference.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/IScopeProvider.java
 */
export interface IScopeProvider {
  /** The scope for `reference` of `context`; never `null`. */
  getScope(context: EObject, reference: EReferenceInfo): IScope;
}
