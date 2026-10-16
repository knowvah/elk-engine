// SPDX-License-Identifier: EPL-2.0
import type { ResourceDiagnostic } from '../../../emf/ecore/resource/Resource.js';
import type { LazyLinkingResource } from '../../../xtext/linking/lazy/LazyLinkingResource.js';
import { XtextLinkingDiagnostic } from '../../../xtext/linking/impl/XtextLinkingDiagnostic.js';
import type { IssueLocator } from '../../../xtext/validation/IssueLocator.js';
import type { ElkNode } from '../../ElkNode.js';
import { ParseResourceDiagnostic, loadParsedModel } from './linking/ElkGraphJsonLinkingServices.js';
import { parse } from './parser/ElkGraphJsonParser.js';
import { createElkGraphJsonServices } from './ElkGraphJsonTextServices.js';

/** Where a diagnostic of {@link ElkGraphJsonText.load} came from. */
export type ElkJsonTextDiagnosticKind = 'syntax' | 'linking' | 'conversion';

/** A diagnostic of a loaded resource: the port of `Resource.Diagnostic` in `resource.getErrors()`. */
export interface ElkJsonTextDiagnostic {
  readonly kind: ElkJsonTextDiagnosticKind;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** 1-based line of the offending token or node. */
  readonly line: number;
}

/**
 * The result of {@link ElkGraphJsonText.load}: the model, if there is one, and the diagnostics.
 *
 * The load is lazy (D13): `errors` is the snapshot of `resource.getErrors()` right after the load, so it holds the
 * syntax and value-conversion errors and never a linking error. Reading an unresolved `sources`/`targets` entry, or
 * `resource.resolveLazyCrossReferences(null)`, appends a linking error to the live `resource.getErrors()`; `errors`
 * does not change. `validate` and `serialize` work on `resource` and `positions`.
 */
export interface ElkJsonTextLoadResult {
  readonly root: ElkNode | null;
  readonly errors: readonly ElkJsonTextDiagnostic[];
  /** The live resource the model was loaded into (its contents are `root`); owns the lazy cross references. */
  readonly resource: LazyLinkingResource;
  /** Node-model lookups of the parse, for locating issues by line. */
  readonly positions: IssueLocator;
}

/** The Java `Resource.Diagnostic` classes of the load, as the kinds of the recorded rows. */
function kindOf(diagnostic: ResourceDiagnostic): ElkJsonTextDiagnosticKind {
  if (diagnostic instanceof XtextLinkingDiagnostic) return 'linking';
  return diagnostic instanceof ParseResourceDiagnostic ? diagnostic.kind : 'syntax';
}

/** The diagnostics of a resource: its errors, then its warnings, in list order. */
export function diagnosticsOf(resource: LazyLinkingResource): ElkJsonTextDiagnostic[] {
  const row = (d: ResourceDiagnostic, severity: 'error' | 'warning'): ElkJsonTextDiagnostic => ({
    kind: kindOf(d),
    severity,
    message: d.getMessage() ?? '',
    line: d.getLine(),
  });
  return [
    ...[...resource.getErrors()].map((d) => row(d, 'error')),
    ...[...resource.getWarnings()].map((d) => row(d, 'warning')),
  ];
}

/**
 * The entry point of the ELK JSON textual format (`.elkj`), internal (D5): the port of reading an `.elkj` through
 * `ElkGraphJsonStandaloneSetup` and a `ResourceSetImpl`.
 */
export const ElkGraphJsonText = {
  /**
   * Parses `text` into a lazy linking resource and installs the cross-reference proxies, never throwing on bad input.
   * Each call builds its own language services, so the scope cache belongs to this load alone.
   *
   * `errors` follows Xtext's `resource.getErrors()` right after `resource.load`: the syntax and value-converter
   * errors of the parse in node order. Linking is deferred, so no linking error is among them (see
   * {@link ElkJsonTextLoadResult}). Syntax errors are presence-only (D6); with one, `root` is the partial model of
   * the parse, `null` if it produced none.
   *
   * @param text the `.elkj` source
   * @returns the root, the load diagnostics, and the live resource
   */
  load(text: string): ElkJsonTextLoadResult {
    const services = createElkGraphJsonServices();
    const result = parse(text, services.valueConverters);
    const resource = loadParsedModel(result, services.linking);
    return { root: result.root, errors: diagnosticsOf(resource), resource, positions: result.positions };
  },
};
