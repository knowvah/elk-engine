// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from '../../xtext/diagnostics/Diagnostic.js';
import type { IDiagnosticConsumer } from '../../xtext/diagnostics/IDiagnosticConsumer.js';
import { Severity } from '../../xtext/diagnostics/Severity.js';
import { DefaultLinkingService } from '../../xtext/linking/impl/DefaultLinkingService.js';
import { LinkingDiagnosticMessageProvider } from '../../xtext/linking/impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../../xtext/linking/impl/LinkingHelper.js';
import type { INodeModel } from '../../xtext/nodemodel/INodeModel.js';
import { CaseInsensitivityHelper } from '../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../xtext/util/ResourceScopeCache.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphValueConverterService } from './conversion/ElkGraphValueConverterService.js';
import { ElkGraphLinker } from './linking/ElkGraphLinker.js';
import { ElkGraphReferences } from './linking/ElkGraphReferences.js';
import { ElkGraphQualifiedNameConverter } from './naming/ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from './naming/ElkGraphQualifiedNameProvider.js';
import { tokenize } from './parser/ElkGraphLexer.js';
import { parse } from './parser/ElkGraphParser.js';
import { ELK_GRAPH_KEYWORDS } from './parser/ElkGraphTokenType.js';
import { ElkGraphScopeProvider } from './scoping/ElkGraphScopeProvider.js';

/** Where a diagnostic of {@link ElkGraphText.load} came from (G4). */
export type ElkTextDiagnosticKind = 'syntax' | 'linking' | 'conversion';

/** A diagnostic of a loaded resource: the port of `Resource.Diagnostic` in `resource.getErrors()` (G4, G5). */
export interface ElkTextDiagnostic {
  readonly kind: ElkTextDiagnosticKind;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** 1-based line of the offending token or node. */
  readonly line: number;
}

/** An `IResourceValidator` issue (declared for the validation entry point, which does not produce it yet). */
export interface ElkTextIssue {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly line: number;
  readonly code: string | null;
}

/** The result of {@link ElkGraphText.load}: the model, if there is one, and the diagnostics. */
export interface ElkTextLoadResult {
  readonly root: ElkNode | null;
  readonly errors: readonly ElkTextDiagnostic[];
}

/** The language services of `.elkt` that `load` uses, constructed per call (no module-level state, AD-8). */
interface ElkGraphServices {
  readonly valueConverters: ElkGraphValueConverterService;
  readonly createLinker: (nodeModel: INodeModel) => ElkGraphLinker;
}

/**
 * Plain construction of the bindings of `ElkGraphRuntimeModule` and the generated
 * `AbstractElkGraphRuntimeModule` that the loading subset needs: the value converter service, the qualified
 * name provider and converter, the `ElkGraphScopeProvider` over the imported-namespace-aware local scope
 * provider and the single-resource global scope provider (with its resource scope cache), the default
 * linking service and the `ElkGraphLinker`. Not constructed here, by design: `ElkGraphTransientValueService`
 * (serializer only), the generated serializer, formatter and validator bindings (separate entry points),
 * the Antlr parser/lexer bindings (replaced by the hand-written parser), the content-assist, index, builder
 * and resource-set bindings (no workspace), and `EValidator` registration.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphRuntimeModule.xtend
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphStandaloneSetup.xtend
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/AbstractElkGraphRuntimeModule.java
 */
function createServices(): ElkGraphServices {
  const valueConverters = new ElkGraphValueConverterService();
  const converter = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);
  const cache = new ResourceScopeCache();
  const names = new ElkGraphQualifiedNameProvider(converter, cache);
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    names,
    converter,
    new CaseInsensitivityHelper(),
    cache,
  );
  const helper = new LinkingHelper(valueConverters);
  const linkingService = new DefaultLinkingService(new ElkGraphScopeProvider(local), helper, converter);
  return {
    valueConverters,
    createLinker: (nodeModel) =>
      new ElkGraphLinker(
        linkingService,
        new LinkingDiagnosticMessageProvider(),
        helper,
        new ElkGraphReferences(),
        nodeModel,
      ),
  };
}

function severityText(severity: Severity): 'error' | 'warning' {
  return severity === Severity.WARNING ? 'warning' : 'error';
}

/** Collects the linking diagnostics in consumer order (ELK's linker reports errors only). */
export class LinkingCollector implements IDiagnosticConsumer {
  readonly diagnostics: ElkTextDiagnostic[] = [];

  consume(diagnostic: Diagnostic, severity: Severity): void {
    this.diagnostics.push({
      kind: 'linking',
      severity: severityText(severity),
      message: String(diagnostic.getMessage()),
      line: diagnostic.getLine(),
    });
  }

  hasConsumedDiagnostics(severity: Severity): boolean {
    return this.diagnostics.some((d) => d.severity === severityText(severity));
  }
}

/**
 * The entry point of the ELK textual format, internal (G4, AD-14): the port of reading an `.elkt` through
 * `ElkGraphStandaloneSetup` and a `ResourceSetImpl` (`ElkModelReader`).
 */
export const ElkGraphText = {
  /**
   * Parses and links `text` and collects the diagnostics, never validating (as the Java reader does) and
   * never throwing on bad input.
   *
   * `errors` follows Xtext's `resource.getErrors()`: the syntax errors and value-converter errors of the
   * parse in node order (`XtextResource.updateInternalState` adds the parser's syntax errors), then the
   * linking diagnostics (`doLinking`) in the linker's order (object pre-order, then node order). The
   * recorded rows of `graph-text-parse.json` with both kinds put the parse diagnostics first. The first
   * entry is the one the oracle's `ElkTextException` carries. Syntax errors are presence-only (G5); with
   * one, `root` is the partial model of the parse, `null` if it produced none.
   *
   * @param text the `.elkt` source
   * @returns the root and the diagnostics
   */
  load(text: string): ElkTextLoadResult {
    const services = createServices();
    const result = parse(text, services.valueConverters);
    const errors: ElkTextDiagnostic[] = result.diagnostics.map((d) => ({
      kind: d.kind,
      severity: 'error',
      message: d.message,
      line: d.line,
    }));
    if (result.root !== null) {
      const collector = new LinkingCollector();
      services.createLinker(result.nodeModel).linkModel(result.root, collector);
      errors.push(...collector.diagnostics);
    }
    return { root: result.root, errors };
  },
};
