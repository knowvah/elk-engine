// SPDX-License-Identifier: EPL-2.0
import { LayoutOptionValidator } from '../../core/validation/LayoutOptionValidator.js';
import type { Diagnostic } from '../../xtext/diagnostics/Diagnostic.js';
import type { IDiagnosticConsumer } from '../../xtext/diagnostics/IDiagnosticConsumer.js';
import { Severity } from '../../xtext/diagnostics/Severity.js';
import { DefaultLinkingService } from '../../xtext/linking/impl/DefaultLinkingService.js';
import { LinkingDiagnosticMessageProvider } from '../../xtext/linking/impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../../xtext/linking/impl/LinkingHelper.js';
import type { INodeModel } from '../../xtext/nodemodel/INodeModel.js';
import { ExceptionAcceptor } from '../../xtext/formatting2/ExceptionAcceptor.js';
import { FormatterRequest } from '../../xtext/formatting2/FormatterRequest.js';
import { CheckMode } from '../../xtext/validation/CheckMode.js';
import { CompositeEValidator } from '../../xtext/validation/CompositeEValidator.js';
import { Diagnostician } from '../../xtext/validation/Diagnostician.js';
import { DiagnosticConverterImpl } from '../../xtext/validation/DiagnosticConverterImpl.js';
import { EObjectValidator } from '../../xtext/validation/EObjectValidator.js';
import { EValidatorRegistrar } from '../../xtext/validation/EValidatorRegistrar.js';
import type { Issue, ResourceDiagnostic } from '../../xtext/validation/Issue.js';
import type { ContainmentSlot, IssueLocator } from '../../xtext/validation/IssueLocator.js';
import { ResourceValidatorImpl } from '../../xtext/validation/ResourceValidatorImpl.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphFactory } from '../ElkGraphFactory.js';
import { isEMapPropertyHolder } from '../EMapPropertyHolder.js';
import type { EMapPropertyHolder } from '../EMapPropertyHolder.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphValueConverterService } from './conversion/ElkGraphValueConverterService.js';
import { ElkGraphLinker } from './linking/ElkGraphLinker.js';
import { ElkGraphReferences } from './linking/ElkGraphReferences.js';
import { parse } from './parser/ElkGraphParser.js';
import { ElkGraphFormatter } from './formatting2/ElkGraphFormatter.js';
import { ElkGraphSerializationError } from './serializer/ElkGraphSerializationError.js';
import { ElkGraphSerializer } from './serializer/ElkGraphSerializer.js';
import { createElkGraphScoping } from './ElkGraphTextServices.js';
import { ElkGraphValidator, elkGraphMapEntryFeatures } from './validation/ElkGraphValidator.js';

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

/** An `IResourceValidator` issue: the result of {@link ElkGraphText.validate}. */
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
 * `AbstractElkGraphRuntimeModule` that the loading subset needs: the value converter service, the shared scoping
 * (see {@link createElkGraphScoping}), the default linking service and the `ElkGraphLinker`. Not constructed
 * here, by design: `ElkGraphTransientValueService` (serializer only), the generated serializer, formatter and
 * validator bindings (separate entry points), the Antlr parser/lexer bindings (replaced by the hand-written
 * parser), the content-assist, index, builder and resource-set bindings (no workspace), and `EValidator`
 * registration.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphRuntimeModule.xtend
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphStandaloneSetup.xtend
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/AbstractElkGraphRuntimeModule.java
 */
function createServices(): ElkGraphServices {
  const valueConverters = new ElkGraphValueConverterService();
  const { nameConverter, scopeProvider } = createElkGraphScoping();
  const helper = new LinkingHelper(valueConverters);
  const linkingService = new DefaultLinkingService(scopeProvider, helper, nameConverter);
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

/** The failure of serializing an ElkGraph (G4 `throws like ISerializer`). */
export { ElkGraphSerializationError as SerializationException };

const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';
const CODE_CONVERSION = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range';
const CODE_LINKING = 'org.eclipse.xtext.diagnostics.Diagnostic.Linking';

/** What `load` keeps for `validate`: the node-model lookups and the resource errors of the parse. */
interface LoadedResource {
  readonly positions: IssueLocator;
  readonly errors: readonly ElkTextDiagnostic[];
}

/** Written once per `load`, never mutated afterwards; keyed by the root so the graph can be collected. */
const LOADED = new WeakMap<ElkNode, LoadedResource>();

const NO_SLOT: ContainmentSlot = { feature: { getName: () => '' }, index: -1 };

/** The locator of a graph without node model: nothing has a line, so every issue falls back to line 0. */
const UNLOCATED: IssueLocator = {
  objectStartLine: () => null,
  featureStartLines: () => [],
  containingSlot: () => NO_SLOT,
};

const RESOURCE_CODES: Readonly<Record<ElkTextDiagnosticKind, string>> = {
  syntax: CODE_SYNTAX,
  conversion: CODE_CONVERSION,
  linking: CODE_LINKING,
};

function toResourceDiagnostic(d: ElkTextDiagnostic): ResourceDiagnostic {
  return { message: d.message, line: d.line, syntax: d.kind !== 'linking', code: RESOURCE_CODES[d.kind] };
}

function toIssue(issue: Issue): ElkTextIssue {
  return {
    severity: severityText(issue.severity),
    message: issue.message,
    line: issue.lineNumber,
    code: issue.code,
  };
}

function logValidationFailure(message: string, error: unknown): void {
  console.error(JSON.stringify({ level: 'error', msg: message, service: 'elk-engine', error: String(error) }));
}

/**
 * `ElkGraphStandaloneSetup`'s validator wiring: `EValidatorRegistrar` registers `ElkGraphValidator` next to the
 * EMF `EObjectValidator`, `ResourceValidatorImpl` drives them (T11, T20).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphRuntimeModule.xtend
 */
function createResourceValidator(): ResourceValidatorImpl {
  const maps = elkGraphMapEntryFeatures;
  const registrar = new EValidatorRegistrar(
    new EObjectValidator(maps),
    () => new CompositeEValidator(maps, logValidationFailure),
  );
  const composite = registrar.register(new ElkGraphValidator(new LayoutOptionValidator()));
  return new ResourceValidatorImpl(new Diagnostician(composite), new DiagnosticConverterImpl(), logValidationFailure);
}

// ---- EcoreUtil.copy

/** A set double: the `eIsSet` of an attribute whose default is `0.0` (`-0.0 == 0.0`, `NaN != 0.0`). */
const isSetDouble = (v: number): boolean => v !== 0;

/** The old-to-new map of a copy, with the lookups that drop references leaving the copied tree. */
type Copies = Map<object, object>;

function copyProperties(from: EMapPropertyHolder, to: EMapPropertyHolder): void {
  for (const entry of from.getProperties().entryList()) {
    // keys and values are shared with the original (EMF copies a map entry's attributes by reference)
    to.getProperties().put(entry.getKey(), entry.getValue());
  }
}

function copyElement(from: ElkGraphElement, to: ElkGraphElement, copies: Copies): void {
  copies.set(from, to);
  to.setIdentifier(from.getIdentifier());
  if (isEMapPropertyHolder(from) && isEMapPropertyHolder(to)) {
    copyProperties(from, to);
  }
  for (const label of from.getLabels()) {
    const copy = ElkGraphUtil.createLabel(to);
    copy.setText(label.getText());
    copyShapeFeatures(label, copy);
    copyElement(label, copy, copies);
  }
}

function copyShapeFeatures(
  from: { getX(): number; getY(): number; getWidth(): number; getHeight(): number },
  to: { setX(v: number): void; setY(v: number): void; setWidth(v: number): void; setHeight(v: number): void },
): void {
  if (isSetDouble(from.getX())) to.setX(from.getX());
  if (isSetDouble(from.getY())) to.setY(from.getY());
  if (isSetDouble(from.getWidth())) to.setWidth(from.getWidth());
  if (isSetDouble(from.getHeight())) to.setHeight(from.getHeight());
}

function copyNode(from: ElkNode, to: ElkNode, copies: Copies): void {
  copyElement(from, to, copies);
  copyShapeFeatures(from, to);
  for (const port of from.getPorts()) {
    const copy = ElkGraphUtil.createPort(to);
    copyElement(port, copy, copies);
    copyShapeFeatures(port, copy);
  }
  for (const child of from.getChildren()) {
    copyNode(child, ElkGraphUtil.createNode(to), copies);
  }
  for (const edge of from.getContainedEdges()) {
    const copy = ElkGraphUtil.createEdge(to);
    copyElement(edge, copy, copies);
    copySections(edge, copy, copies);
  }
}

function copySections(from: ElkEdge, to: ElkEdge, copies: Copies): void {
  for (const section of from.getSections()) {
    const copy = ElkGraphUtil.createEdgeSection(to);
    copies.set(section, copy);
    copy.setIdentifier(section.getIdentifier());
    if (isEMapPropertyHolder(section) && isEMapPropertyHolder(copy)) {
      copyProperties(section, copy);
    }
    copySectionLocations(section, copy);
  }
}

function copySectionLocations(from: ElkEdgeSection, to: ElkEdgeSection): void {
  if (isSetDouble(from.getStartX())) to.setStartX(from.getStartX());
  if (isSetDouble(from.getStartY())) to.setStartY(from.getStartY());
  if (isSetDouble(from.getEndX())) to.setEndX(from.getEndX());
  if (isSetDouble(from.getEndY())) to.setEndY(from.getEndY());
  for (const bend of from.getBendPoints()) {
    const bendCopy = ElkGraphFactory.eINSTANCE.createElkBendPoint();
    if (isSetDouble(bend.getX())) bendCopy.setX(bend.getX());
    if (isSetDouble(bend.getY())) bendCopy.setY(bend.getY());
    to.getBendPoints().add(bendCopy);
  }
}

/** The copy of a referenced shape, `null` when the target is outside the copied tree (it has an `eOpposite`). */
function copied<T extends object>(copies: Copies, original: T | null): T | null {
  return original === null ? null : ((copies.get(original) as T | undefined) ?? null);
}

function copyEdgeReferences(node: ElkNode, copies: Copies): void {
  for (const edge of node.getContainedEdges()) {
    const copy = copies.get(edge) as ElkEdge;
    for (const source of edge.getSources()) addCopied(copy.getSources(), copied<ElkConnectableShape>(copies, source));
    for (const target of edge.getTargets()) addCopied(copy.getTargets(), copied<ElkConnectableShape>(copies, target));
    for (const section of edge.getSections()) copySectionLinks(section, copies);
  }
  for (const child of node.getChildren()) {
    copyEdgeReferences(child, copies);
  }
}

function addCopied<T>(list: { add(o: T): boolean }, target: T | null): void {
  if (target !== null) list.add(target);
}

function copySectionLinks(section: ElkEdgeSection, copies: Copies): void {
  const copy = copies.get(section) as ElkEdgeSection;
  copy.setIncomingShape(copied(copies, section.getIncomingShape()));
  copy.setOutgoingShape(copied(copies, section.getOutgoingShape()));
  for (const next of section.getOutgoingSections()) {
    // the opposite (`incomingSections`) is maintained by the model
    addCopied(copy.getOutgoingSections(), copied(copies, next));
  }
}

/**
 * `EcoreUtil.copy(root)`: containment is copied (nodes, ports, labels, edges, sections, bend points, property
 * entries), attributes are copied when set, cross references are remapped into the copy, and a reference to an
 * object outside the copied tree is dropped (`Copier.copyReference` keeps original targets only for references
 * without an `eOpposite`, and every ElkGraph reference has one). Property keys and values are shared.
 *
 * @see org.eclipse.emf.ecore/src/org/eclipse/emf/ecore/util/EcoreUtil.java (Copier)
 */
function copyGraph(root: ElkNode): ElkNode {
  const copies: Copies = new Map();
  const copy = ElkGraphUtil.createGraph();
  copyNode(root, copy, copies);
  copyEdgeReferences(root, copies);
  return copy;
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
      LOADED.set(result.root, { positions: result.positions, errors });
    }
    return { root: result.root, errors };
  },

  /**
   * The port of `IResourceValidator.validate(resource, CheckMode.ALL, ...)`: the load diagnostics of the resource
   * (syntax, value conversion and linking errors, with the Xtext issue codes), then the EMF and `ElkGraphValidator`
   * checks of every object of the tree in `eAllContents` order. Issues come in emission order; sort them to
   * compare (the recorded vectors sort by line, severity, code, message).
   *
   * `line` is the 1-based start line of the object's node in the text `root` was loaded from; an object is located
   * through its nearest container with a node (`DiagnosticConverterImpl`). A graph that was not produced by
   * {@link load} has no node model (AD-11): every issue has line `0` and there are no load diagnostics. Validating
   * resolves proxy property values in place, as the Java validator does.
   *
   * @param root the root returned by {@link load}, or any ElkGraph
   * @returns the issues
   */
  validate(root: ElkNode): readonly ElkTextIssue[] {
    const loaded = LOADED.get(root) ?? { positions: UNLOCATED, errors: [] };
    const resourceErrors: ResourceDiagnostic[] = loaded.errors.map(toResourceDiagnostic);
    return createResourceValidator()
      .validate([root], { errors: resourceErrors, warnings: [] }, CheckMode.ALL, loaded.positions)
      .map(toIssue);
  },

  /**
   * The port of `ISerializer.serialize(EcoreUtil.copy(root), SaveOptions.newBuilder().format().getOptions())`
   * (G2): the grammar-specific serializer's token sequence, rendered through the grammar's formatter. The graph is
   * copied first (the serializer resolves proxy property values in place), so `root` is never modified. Output
   * carries no trailing text beyond what the formatter writes.
   *
   * @param root the graph to write
   * @returns the `.elkt` text
   * @throws ElkGraphSerializationError (alias {@link SerializationException}) when the graph cannot be written
   */
  serialize(root: ElkNode): string {
    const access = new ElkGraphSerializer().sequence(copyGraph(root)).regionAccess;
    const request = new FormatterRequest().setTextRegionAccess(access).setExceptionHandler(ExceptionAcceptor.THROWING);
    return access.getRewriter().renderToString(new ElkGraphFormatter().formatRequest(request));
  },
};
