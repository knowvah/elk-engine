// SPDX-License-Identifier: EPL-2.0
import type { Resource } from '../../util/IResourceScopeCache.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { IGlobalScopeProvider } from '../IGlobalScopeProvider.js';
import { NULLSCOPE, type IScope } from '../IScope.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';

/**
 * Port-local (no Xtext class): the global scope of a lone resource that has no other resources
 * and no container manager. Xtext binds `DefaultGlobalScopeProvider`, whose scope would only
 * re-expose this resource's own exported objects; the resource-level `SelectableBasedScope` of
 * `ImportedNamespaceAwareLocalScopeProvider` holds exactly those and is the inner scope, so the
 * global scope can neither add a candidate nor change which duplicate wins. The `.elkt` scoping
 * scenarios (`graph-text-parse.json` `scope-*`) are the proof.
 */
export class SingleResourceGlobalScopeProvider implements IGlobalScopeProvider {
  getScope(
    _context: Resource,
    _reference: EReferenceInfo,
    _filter: ((d: IEObjectDescription) => boolean) | null,
  ): IScope {
    return NULLSCOPE;
  }
}
