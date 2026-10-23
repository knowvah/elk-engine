// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionValidator } from '../../../core/validation/LayoutOptionValidator.js';
import { BasicEList } from '../../../emf/common/util/BasicEList.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { Severity } from '../../../xtext/diagnostics/Severity.js';
import { DefaultLinkingService } from '../../../xtext/linking/impl/DefaultLinkingService.js';
import { LinkingDiagnosticMessageProvider } from '../../../xtext/linking/impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../../../xtext/linking/impl/LinkingHelper.js';
import { CaseInsensitivityHelper } from '../../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../../xtext/util/ResourceScopeCache.js';
import { CheckMode } from '../../../xtext/validation/CheckMode.js';
import { CompositeEValidator } from '../../../xtext/validation/CompositeEValidator.js';
import { Diagnostician } from '../../../xtext/validation/Diagnostician.js';
import { DiagnosticConverterImpl } from '../../../xtext/validation/DiagnosticConverterImpl.js';
import { EObjectValidator } from '../../../xtext/validation/EObjectValidator.js';
import { EValidatorRegistrar } from '../../../xtext/validation/EValidatorRegistrar.js';
import type { Issue, ResourceDiagnostic } from '../../../xtext/validation/Issue.js';
import type { IssueLocator } from '../../../xtext/validation/IssueLocator.js';
import { ResourceValidatorImpl } from '../../../xtext/validation/ResourceValidatorImpl.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IProperty } from '../../properties/IProperty.js';
import type { IPropertyValueProxy } from '../../properties/IPropertyValueProxy.js';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import { LinkingCollector } from '../ElkGraphText.js';
import { ElkGraphLinker } from '../linking/ElkGraphLinker.js';
import { ElkGraphReferences } from '../linking/ElkGraphReferences.js';
import { ElkGraphQualifiedNameConverter } from '../naming/ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from '../naming/ElkGraphQualifiedNameProvider.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { parse } from '../parser/ElkGraphParser.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphScopeProvider } from '../scoping/ElkGraphScopeProvider.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphValidator, elkGraphMapEntryFeatures } from './ElkGraphValidator.js';
import {
  type MutationRow,
  type RegisteredAfterLoad,
  mutations,
  registerAfterLoad,
  snapshotEntries,
} from '../../../../test/helpers/elkt-validate-mutations.js';

const VALIDATE_REF = fileURLToPath(
  new URL('../../../../test/golden/refs/java/graph-text-validate.json', import.meta.url),
);
const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';
const CODE_RANGE = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range';
const CODE_LINKING = 'org.eclipse.xtext.diagnostics.Diagnostic.Linking';

interface IssueRow {
  readonly severity: string;
  readonly message: string;
  readonly line: number;
  readonly code: string | null;
}

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly deferred?: string;
  readonly registeredAfterLoad?: RegisteredAfterLoad;
  readonly issues: readonly IssueRow[];
  readonly mutations: readonly MutationRow[];
}

const cases = (JSON.parse(readFileSync(VALIDATE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const formerlyDeferred = cases.filter((c) => c.deferred !== undefined);

/** The bindings `ElkGraphText.load` constructs (its factory is private), needed here for the node positions. */
function linkerFor(
  valueConverters: ElkGraphValueConverterService,
  nodeModel: ConstructorParameters<typeof ElkGraphLinker>[4],
): ElkGraphLinker {
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
  return new ElkGraphLinker(
    linkingService,
    new LinkingDiagnosticMessageProvider(),
    helper,
    new ElkGraphReferences(),
    nodeModel,
  );
}

/** `IResourceValidator.validate` over an already built model: the composition T22 wires into `validate`. */
function validateModel(
  root: ElkNode | null,
  resourceErrors: readonly ResourceDiagnostic[],
  locator: IssueLocator,
): { issues: IssueRow[]; logged: string[] } {
  const logged: string[] = [];
  const log = (message: string): void => {
    logged.push(message);
  };
  const maps = elkGraphMapEntryFeatures;
  const registrar = new EValidatorRegistrar(new EObjectValidator(maps), () => new CompositeEValidator(maps, log));
  const composite = registrar.register(new ElkGraphValidator(new LayoutOptionValidator()));
  const resourceValidator = new ResourceValidatorImpl(new Diagnostician(composite), new DiagnosticConverterImpl(), log);
  const issues = resourceValidator.validate(
    root === null ? [] : [root],
    { errors: resourceErrors, warnings: [] },
    CheckMode.ALL,
    locator,
  );
  return { issues: sortRows(issues.map(toRow)), logged };
}

function toRow(issue: Issue): IssueRow {
  return {
    severity: issue.severity === Severity.ERROR ? 'error' : 'warning',
    message: issue.message,
    line: issue.lineNumber,
    code: issue.code,
  };
}

/** The recorder's order: line, severity, code (null as ''), message, by UTF-16 string comparison. */
function sortRows(rows: IssueRow[]): IssueRow[] {
  const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return [...rows].sort(
    (a, b) =>
      a.line - b.line || text(a.severity, b.severity) || text(a.code ?? '', b.code ?? '') || text(a.message, b.message),
  );
}

/**
 * Parses, links and validates `text` as the recorder does; `lateOption` is registered between loading and
 * validating (`@register-after-load`). `mutations` are the entries validation replaced.
 */
function validateText(
  text: string,
  lateOption?: RegisteredAfterLoad,
): { issues: IssueRow[]; logged: string[]; hasSyntaxError: boolean; mutations: MutationRow[] } {
  const valueConverters = new ElkGraphValueConverterService();
  const parsed = parse(text, valueConverters);
  const resourceErrors: ResourceDiagnostic[] = parsed.diagnostics.map((d) => ({
    message: d.message,
    line: d.line,
    syntax: true,
    code: d.kind === 'syntax' ? CODE_SYNTAX : CODE_RANGE,
  }));
  if (parsed.root !== null) {
    const collector = new LinkingCollector();
    linkerFor(valueConverters, parsed.nodeModel).linkModel(parsed.root, collector);
    for (const d of collector.diagnostics) {
      resourceErrors.push({ message: d.message, line: d.line, syntax: false, code: CODE_LINKING });
    }
  }
  const before = parsed.root === null ? [] : snapshotEntries(parsed.root);
  if (lateOption !== undefined) {
    registerAfterLoad(lateOption);
  }
  const result = validateModel(parsed.root, resourceErrors, parsed.positions);
  const after = parsed.root === null ? [] : snapshotEntries(parsed.root);
  return {
    ...result,
    hasSyntaxError: parsed.diagnostics.some((d) => d.kind === 'syntax'),
    mutations: mutations(before, after),
  };
}

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('ElkGraphValidator replay of graph-text-validate.json', () => {
  it.each(cases.map((c) => [c.id, c] as const))('%s', (_id, recorded) => {
    const {
      issues,
      logged,
      hasSyntaxError,
      mutations: changed,
    } = validateText(recorded.input, recorded.registeredAfterLoad);
    expect(logged).toEqual([]);
    expect(changed).toEqual(recorded.mutations);
    const expectsSyntaxError = recorded.issues.some((i) => i.code === CODE_SYNTAX);
    expect(hasSyntaxError).toBe(expectsSyntaxError);
    if (!expectsSyntaxError) {
      expect(issues).toEqual(recorded.issues);
    }
  });

  it('replays the 11 rows formerly deferred through the same path', () => {
    expect(formerlyDeferred).toHaveLength(11);
  });
});

/** A proxy standing for text that resolves for the option it is asked about. */
class ResolvingProxy implements IPropertyValueProxy {
  resolveValue<T>(_property: IProperty<T>): T | null {
    return 3 as T;
  }
}

describe('ElkGraphValidator', () => {
  it('replaces a resolvable proxy value by the resolved one and validates it', () => {
    const root = ElkGraphUtil.createGraph();
    const entries = root.getProperties();
    entries.put(CoreOptions.SPACING_NODE_NODE, new ResolvingProxy());
    const locator: IssueLocator = {
      objectStartLine: () => 1,
      featureStartLines: () => [],
      containingSlot: () => {
        throw new Error('no containment lookups expected');
      },
    };
    const { issues } = validateModel(root, [], locator);
    expect(entries.get(CoreOptions.SPACING_NODE_NODE)).toBe(3);
    expect(issues).toEqual([]);
  });

  it('reports the type error of an unresolvable proxy and keeps the proxy', () => {
    const root = ElkGraphUtil.createGraph();
    const proxy: IPropertyValueProxy = { resolveValue: () => null };
    root.getProperties().put(CoreOptions.SPACING_NODE_NODE, proxy);
    const locator: IssueLocator = {
      objectStartLine: () => 7,
      featureStartLines: () => [],
      containingSlot: () => {
        throw new Error('no containment lookups expected');
      },
    };
    const { issues } = validateModel(root, [], locator);
    expect(issues).toEqual([{ severity: 'error', message: 'Expected value of type Double.', line: 7, code: null }]);
    expect(root.getProperties().get(CoreOptions.SPACING_NODE_NODE)).toBe(proxy);
  });

  it('exposes the map-typed features only for property holders', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(CoreOptions.DIRECTION, null);
    const [features] = elkGraphMapEntryFeatures(root);
    expect(features?.feature.getName()).toBe('properties');
    expect(features?.size()).toBe(1);
    expect(features?.indexOfKey(CoreOptions.DIRECTION)).toBe(0);
    expect(features?.indexOfKey(CoreOptions.ALGORITHM)).toBe(-1);
    expect(elkGraphMapEntryFeatures(new BasicEList<EObject>() as unknown as EObject)).toEqual([]);
  });
});
