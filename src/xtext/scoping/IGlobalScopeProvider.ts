// SPDX-License-Identifier: EPL-2.0
import type { IEObjectDescription } from '../resource/IEObjectDescription.js';
import type { Resource } from '../util/IResourceScopeCache.js';
import type { EReferenceInfo } from './EReferenceInfo.js';
import type { IScope } from './IScope.js';

/**
 * Computes the scope of everything visible from outside a resource.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/IGlobalScopeProvider.java
 */
export interface IGlobalScopeProvider {
  getScope(context: Resource, reference: EReferenceInfo, filter: ((d: IEObjectDescription) => boolean) | null): IScope;
}
