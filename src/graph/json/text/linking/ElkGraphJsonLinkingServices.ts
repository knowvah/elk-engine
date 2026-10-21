// SPDX-License-Identifier: EPL-2.0
import { URI } from '../../../../emf/common/util/URI.js';
import type { ResourceDiagnostic } from '../../../../emf/ecore/resource/Resource.js';
import { ResourceSetImpl } from '../../../../emf/ecore/resource/impl/ResourceSetImpl.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import type { Diagnostic } from '../../../../xtext/diagnostics/Diagnostic.js';
import type { IDiagnosticConsumer } from '../../../../xtext/diagnostics/IDiagnosticConsumer.js';
import { Severity } from '../../../../xtext/diagnostics/Severity.js';
import { LazyLinkingResource } from '../../../../xtext/linking/lazy/LazyLinkingResource.js';
import { LazyURIEncoder } from '../../../../xtext/linking/lazy/LazyURIEncoder.js';
import { DefaultLinkingService } from '../../../../xtext/linking/impl/DefaultLinkingService.js';
import { LinkingDiagnosticMessageProvider } from '../../../../xtext/linking/impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../../../../xtext/linking/impl/LinkingHelper.js';
import type { IQualifiedNameConverter } from '../../../../xtext/naming/IQualifiedNameConverter.js';
import type { INodeModel } from '../../../../xtext/nodemodel/INodeModel.js';
import type { IScopeProvider } from '../../../../xtext/scoping/IScopeProvider.js';
import { CaseInsensitivityHelper } from '../../../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../../../xtext/util/ResourceScopeCache.js';
import { ElkGraphJsonQualifiedNameProvider } from '../naming/ElkGraphJsonQualifiedNameProvider.js';
import type { ParseResult } from '../parser/ElkGraphJsonRecords.js';
import { ElkGraphJsonScopeProvider } from '../scoping/ElkGraphJsonScopeProvider.js';
import { DefaultQualifiedNameConverter } from './DefaultQualifiedNameConverter.js';
import { ElkGraphJsonLazyLinker } from './ElkGraphJsonLazyLinker.js';
import { ElkGraphJsonReferences } from './ElkGraphJsonReferences.js';

/** The URI a parsed text is loaded under when the caller names none (the extension is the language's, as for Xtext). */
export const DEFAULT_DOCUMENT_URI = 'file:/document.elkj';

/** A syntax or value-conversion diagnostic of the parser as the `Resource.Diagnostic` Xtext adds to the errors. */
export class ParseResourceDiagnostic implements ResourceDiagnostic {
  constructor(
    readonly kind: 'syntax' | 'conversion',
    private readonly message: string,
    private readonly line: number,
  ) {}

  getMessage(): string {
    return this.message;
  }

  getLine(): number {
    return this.line;
  }
}

/** The scope bindings of `.elkj`: the `IScopeProvider` binding and the name converter its names go through. */
export interface ElkGraphJsonScoping {
  /** `IScopeProvider` bound to `ElkGraphJsonScopeProvider` over the imported-namespace-aware local scope. */
  readonly scopeProvider: IScopeProvider;
  /** `IQualifiedNameConverter` bound to the default converter, shared with the name provider of the scope. */
  readonly nameConverter: IQualifiedNameConverter;
}

/** The bindings the lazy `.elkj` load needs, constructed by {@link createElkGraphJsonLinking}. */
export interface ElkGraphJsonLinking {
  /** `ILinker` bound to `LazyLinker`: installs the proxies of a model whose node model is `nodeModel`. */
  createLinker(nodeModel: INodeModel): ElkGraphJsonLazyLinker;
  /** A `LazyLinkingResource` (the `XtextResource` binding) under `uri`, not yet in a resource set. */
  createResource(uri: URI): LazyLinkingResource;
  /**
   * A new scope provider with its own resource scope cache. A factory and not one shared instance: Java's singleton
   * `OnChangeEvictingCache` drops a resource's names and scopes when its model changes, this port's
   * {@link ResourceScopeCache} never evicts, so a provider that outlived the load would serve the pre-edit scope to a
   * later serialize of an edited graph. One cache per load and one per serialize keeps the lifetime the port had.
   */
  createScoping(): ElkGraphJsonScoping;
}

/** The encoder never reads its metamodel in index form (`USE_INDEXED_FRAGMENTS_BINDING` is true). */
const INDEX_FORM_ONLY: ConstructorParameters<typeof LazyURIEncoder>[0] = new Proxy({} as never, {
  get: (_target, property) => {
    throw new IllegalStateException(`LazyURIEncoder long form (${String(property)}) is unreachable in index form`);
  },
});

/**
 * The `IScopeProvider` binding of the generated module (`ElkGraphJsonScopeProvider`, delegating to
 * `ImportedNamespaceAwareLocalScopeProvider` over the single-resource global scope, case-sensitive) with the default
 * qualified name converter and the flat name provider. The load and the serializer's cross reference serializer both
 * take their scope from here (Java injects the one binding into both). Each call has its own scope cache.
 *
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/AbstractElkGraphJsonRuntimeModule.java:166-173
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/OnChangeEvictingCache.java (`@Singleton`)
 */
export function createScoping(): ElkGraphJsonScoping {
  const nameConverter = new DefaultQualifiedNameConverter();
  const cache = new ResourceScopeCache();
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    new ElkGraphJsonQualifiedNameProvider(nameConverter, cache),
    nameConverter,
    new CaseInsensitivityHelper(),
    cache,
  );
  return { scopeProvider: new ElkGraphJsonScopeProvider(local), nameConverter };
}

/**
 * Plain construction of the bindings of `ElkGraphJsonRuntimeModule` and the generated
 * `AbstractElkGraphJsonRuntimeModule` the lazy load needs: the default qualified name converter, the flat name
 * provider, the imported-namespace-aware local scope under `ElkGraphJsonScopeProvider` (single-resource global
 * scope, case-sensitive), the default linking service, and Xtext's own `DefaultRuntimeModule` choices
 * `LazyLinker`, `LazyLinkingResource` and `LazyURIEncoder` with indexed fragments. The resource scope cache holds
 * names and scopes for the life of one resource, so every call builds its own (no module-level state).
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJsonRuntimeModule.xtend
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/AbstractElkGraphJsonRuntimeModule.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/DefaultRuntimeModule.java:174-175,198-199,247-248
 */
export function createElkGraphJsonLinking(valueConverters: IValueConverterService): ElkGraphJsonLinking {
  const scoping = createScoping();
  const helper = new LinkingHelper(valueConverters);
  const linkingService = new DefaultLinkingService(scoping.scopeProvider, helper, scoping.nameConverter);
  const references = new ElkGraphJsonReferences();
  const encoder = new LazyURIEncoder(INDEX_FORM_ONLY, true);
  const messages = new LinkingDiagnosticMessageProvider();
  return {
    createScoping,
    createLinker: (nodeModel) => new ElkGraphJsonLazyLinker(references, nodeModel, encoder),
    createResource: (uri) =>
      new LazyLinkingResource(uri, references, {
        linkingService,
        encoder,
        diagnosticMessageProvider: messages,
        linkingHelper: helper,
      }),
  };
}

/** Adds what the linker reports to the resource's errors and warnings, as Xtext's `ListBasedDiagnosticConsumer`. */
class ResourceDiagnosticConsumer implements IDiagnosticConsumer {
  constructor(private readonly resource: LazyLinkingResource) {}

  consume(diagnostic: Diagnostic, severity: Severity): void {
    const list = severity === Severity.WARNING ? this.resource.getWarnings() : this.resource.getErrors();
    list.add(diagnostic as ResourceDiagnostic);
  }

  hasConsumedDiagnostics(severity: Severity): boolean {
    return (severity === Severity.WARNING ? this.resource.getWarnings() : this.resource.getErrors()).size() > 0;
  }
}

/**
 * `XtextResource.load` for a parse result: the resource joins a fresh resource set, the root becomes its content
 * (which marks it loaded), the syntax and conversion diagnostics are its first errors, and `LazyLinker` installs
 * the proxies. No linking diagnostic exists afterwards: the resource appends one to its live `getErrors()` each time
 * a reference that cannot be resolved is first read (an access of `sources`/`targets`, or
 * `resolveLazyCrossReferences`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/XtextResource.java (`doLoad`, `updateInternalState`, `doLinking`)
 */
export function loadParsedModel(
  result: ParseResult,
  linking: ElkGraphJsonLinking,
  uri: URI = URI.createURI(DEFAULT_DOCUMENT_URI),
): LazyLinkingResource {
  const resource = linking.createResource(uri);
  new ResourceSetImpl().getResources().add(resource);
  for (const d of result.diagnostics) {
    resource.getErrors().add(new ParseResourceDiagnostic(d.kind, d.message, d.line));
  }
  if (result.root !== null) {
    resource.getContents().add(result.root);
    linking.createLinker(result.nodeModel).linkModel(result.root, new ResourceDiagnosticConsumer(resource));
  }
  return resource;
}
