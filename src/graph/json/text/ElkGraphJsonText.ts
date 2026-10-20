// SPDX-License-Identifier: EPL-2.0
import type { ResourceDiagnostic } from '../../../emf/ecore/resource/Resource.js';
import { Severity } from '../../../xtext/diagnostics/Severity.js';
import { LazyLinkingResource } from '../../../xtext/linking/lazy/LazyLinkingResource.js';
import { XtextLinkingDiagnostic } from '../../../xtext/linking/impl/XtextLinkingDiagnostic.js';
import { CheckMode } from '../../../xtext/validation/CheckMode.js';
import { CompositeEValidator } from '../../../xtext/validation/CompositeEValidator.js';
import { Diagnostician } from '../../../xtext/validation/Diagnostician.js';
import { DiagnosticConverterImpl } from '../../../xtext/validation/DiagnosticConverterImpl.js';
import { EValidatorRegistrar } from '../../../xtext/validation/EValidatorRegistrar.js';
import type {
  Issue,
  ResourceDiagnostic as ValidatorResourceDiagnostic,
  ResourceDiagnostics,
} from '../../../xtext/validation/Issue.js';
import type { ContainmentSlot, IssueLocator } from '../../../xtext/validation/IssueLocator.js';
import { ResourceValidatorImpl } from '../../../xtext/validation/ResourceValidatorImpl.js';
import type { ElkNode } from '../../ElkNode.js';
import { writeFormatted } from './formatting2/ElkGraphJsonWriter.js';
import { ParseResourceDiagnostic, loadParsedModel } from './linking/ElkGraphJsonLinkingServices.js';
import { parse } from './parser/ElkGraphJsonParser.js';
import { createElkGraphJsonServices } from './ElkGraphJsonTextServices.js';
import { elkGraphJsonMapEntryFeatures } from './validation/ElkGraphJsonMapEntryFeatures.js';
import { ElkGraphJsonValidator } from './validation/ElkGraphJsonValidator.js';

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

/** An `IResourceValidator` issue: the result of {@link ElkGraphJsonText.validate}. */
export interface ElkJsonTextIssue {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly line: number;
  readonly code: string | null;
}

const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';
const CODE_CONVERSION = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range';
const CODE_LINKING = 'org.eclipse.xtext.diagnostics.Diagnostic.Linking';

const RESOURCE_CODES: Readonly<Record<ElkJsonTextDiagnosticKind, string>> = {
  syntax: CODE_SYNTAX,
  conversion: CODE_CONVERSION,
  linking: CODE_LINKING,
};

/** What `load` keeps for `validate`; keyed by the root so the graph can be collected, written once per load. */
interface LoadedResource {
  readonly resource: LazyLinkingResource;
  readonly positions: IssueLocator;
}

const LOADED = new WeakMap<ElkNode, LoadedResource>();

const NO_SLOT: ContainmentSlot = { feature: { getName: () => '' }, index: -1 };

/** The locator of a graph without node model: nothing has a line, so every issue falls back to line 0. */
const UNLOCATED: IssueLocator = {
  objectStartLine: () => null,
  featureStartLines: () => [],
  containingSlot: () => NO_SLOT,
};

/** The validator's view of a resource diagnostic, converted at the moment it is read (the lists are live). */
function toValidatorDiagnostic(d: ResourceDiagnostic): ValidatorResourceDiagnostic {
  const kind = kindOf(d);
  return {
    message: d.getMessage() ?? '',
    line: d.getLine(),
    syntax: kind !== 'linking',
    code: RESOURCE_CODES[kind],
  };
}

/** `Resource.getErrors()` and `getWarnings()` as the validator reads them: live, after the proxies are resolved. */
function liveDiagnostics(resource: LazyLinkingResource): ResourceDiagnostics {
  return {
    get errors() {
      return [...resource.getErrors()].map(toValidatorDiagnostic);
    },
    get warnings() {
      return [...resource.getWarnings()].map(toValidatorDiagnostic);
    },
  };
}

function toIssue(issue: Issue): ElkJsonTextIssue {
  return {
    severity: issue.severity === Severity.WARNING ? 'warning' : 'error',
    message: issue.message,
    line: issue.lineNumber,
    code: issue.code,
  };
}

function logValidationFailure(message: string, error: unknown): void {
  console.error(JSON.stringify({ level: 'error', msg: message, service: 'elk-engine', error: String(error) }));
}

/**
 * `ElkGraphJsonStandaloneSetup`'s validator wiring: `EValidatorRegistrar` registers the (empty)
 * `ElkGraphJsonValidator` for the ElkGraph package, for which the registry holds no validator (the `.elkj` setup
 * never registers one; the recorded output reports each EMF constraint once), so the registrar's `null` branch starts
 * a fresh `CompositeEValidator` whose own defaults hold EMF's `EObjectValidator` — unlike `.elkt`, whose registry
 * default adds a second, plain one.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJsonRuntimeModule.xtend
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/EValidatorRegistrar.java
 */
function createResourceValidator(): ResourceValidatorImpl {
  const registrar = new EValidatorRegistrar(
    null,
    () => new CompositeEValidator(elkGraphJsonMapEntryFeatures, logValidationFailure),
  );
  const composite = registrar.register(new ElkGraphJsonValidator());
  return new ResourceValidatorImpl(new Diagnostician(composite), new DiagnosticConverterImpl(), logValidationFailure);
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
    if (result.root !== null) {
      LOADED.set(result.root, { resource, positions: result.positions });
    }
    return { root: result.root, errors: diagnosticsOf(resource), resource, positions: result.positions };
  },

  /**
   * The port of `IResourceValidator.validate(resource, CheckMode.ALL, ...)`: Xtext first resolves the lazy cross
   * references of the resource (`ResourceValidatorImpl.resolveProxies`), which appends the linking errors to the live
   * `resource.getErrors()`; then it reports the load diagnostics (errors, then warnings: syntax, value conversion,
   * linking, with the Xtext issue codes) and the EMF `EObjectValidator` checks of every object of the tree in
   * `eAllContents` order. The `.elkj` validator has no checks of its own (no `LayoutOptionValidator`). Issues come in
   * emission order; sort them to compare (the recorded vectors sort by line, severity, code, message).
   *
   * Validating mutates the resource as the Java validator does: it resolves the lazy references in place. Calling it
   * again returns the same issues, because the resolved references and the recorded linking errors are not added twice.
   *
   * `line` is the 1-based start line of the object's node in the text `root` was loaded from. A graph that was not
   * produced by {@link load} has no node model: every issue has line `0`, and the load diagnostics are those of its
   * resource, if it has a lazy linking one, else none.
   *
   * @param root the root returned by {@link load}, or any ElkGraph
   * @returns the issues
   */
  validate(root: ElkNode): readonly ElkJsonTextIssue[] {
    const loaded = LOADED.get(root);
    const eResource = root.eResource();
    const resource = loaded?.resource ?? (eResource instanceof LazyLinkingResource ? eResource : null);
    const diagnostics: ResourceDiagnostics =
      resource === null ? { errors: [], warnings: [] } : liveDiagnostics(resource);
    return createResourceValidator()
      .validate([root], diagnostics, CheckMode.ALL, loaded?.positions ?? UNLOCATED, resource)
      .map(toIssue);
  },

  /**
   * The port of `ISerializer.serialize(EcoreUtil.copy(root), SaveOptions.newBuilder().format().getOptions())` (D3):
   * the grammar-specific serializer's token sequence, rendered through the grammar's formatter. The graph is copied
   * first (a copy keeps references that resolve inside the tree, so the unresolved ones of a loaded graph are
   * dropped, as `EcoreUtil.copy` does), so `root` keeps its content. The output is Xtext's own and often does not
   * reload cleanly: it writes known option keys as bare dotted suffixes, `null` values as `null`, NaN, hex and
   * `4.9E-324` numbers, unescaped quotes and the empty port, label or edge as `{ "" : }`, none of which the `.elkj`
   * grammar accepts (T5).
   *
   * @param root the graph to write
   * @returns the `.elkj` text
   * @throws ElkGraphJsonSerializationError when the graph cannot be written: an edge with sections, a property without
   *   key or with a list value, a reference that is not in scope, or a value no converter can print
   * @throws IndexOutOfBoundsException from the copy when an edge repeats an endpoint or a section repeats an outgoing
   *   section (`EcoreUtil.copy`, T16b)
   */
  serialize(root: ElkNode): string {
    return writeFormatted(root);
  },
};
