// SPDX-License-Identifier: EPL-2.0
import { CaseInsensitivityHelper } from '../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../xtext/util/ResourceScopeCache.js';
import { ElkGraphQualifiedNameConverter } from './naming/ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from './naming/ElkGraphQualifiedNameProvider.js';
import { tokenize } from './parser/ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS } from './parser/ElkGraphTokenType.js';
import { ElkGraphScopeProvider } from './scoping/ElkGraphScopeProvider.js';

/** The scoping bindings shared by loading and serializing: the name converter and the cross-reference scope. */
export interface ElkGraphScoping {
  readonly nameConverter: ElkGraphQualifiedNameConverter;
  readonly scopeProvider: ElkGraphScopeProvider;
}

/**
 * Plain construction of the scoping bindings of `ElkGraphRuntimeModule` and the generated
 * `AbstractElkGraphRuntimeModule`: the qualified name converter and provider, the `ElkGraphScopeProvider` over the
 * imported-namespace-aware local scope provider and the single-resource global scope provider. The resource scope
 * cache holds names and scopes for the life of one resource, so every call builds its own (no module-level state).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphRuntimeModule.xtend
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/AbstractElkGraphRuntimeModule.java
 */
export function createElkGraphScoping(): ElkGraphScoping {
  const nameConverter = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);
  const cache = new ResourceScopeCache();
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    new ElkGraphQualifiedNameProvider(nameConverter, cache),
    nameConverter,
    new CaseInsensitivityHelper(),
    cache,
  );
  return { nameConverter, scopeProvider: new ElkGraphScopeProvider(local) };
}
