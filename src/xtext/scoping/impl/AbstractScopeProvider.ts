// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { IScope } from '../IScope.js';
import type { IScopeProvider } from '../IScopeProvider.js';

/**
 * Marker base of the scope providers.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/AbstractScopeProvider.java
 */
export abstract class AbstractScopeProvider implements IScopeProvider {
  abstract getScope(context: EObject, reference: EReferenceInfo): IScope;
}
