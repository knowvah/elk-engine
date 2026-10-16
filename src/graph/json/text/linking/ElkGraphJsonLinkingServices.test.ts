// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { URI } from '../../../../emf/common/util/URI.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import type { ResourceDiagnostic } from '../../../../emf/ecore/resource/Resource.js';
import type { IDiagnosticConsumer } from '../../../../xtext/diagnostics/IDiagnosticConsumer.js';
import { Severity } from '../../../../xtext/diagnostics/Severity.js';
import { XtextLinkingDiagnostic } from '../../../../xtext/linking/impl/XtextLinkingDiagnostic.js';
import type { INodeModel } from '../../../../xtext/nodemodel/INodeModel.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from '../parser/ElkGraphJsonParser.js';
import {
  createElkGraphJsonLinking,
  DEFAULT_DOCUMENT_URI,
  loadParsedModel,
  ParseResourceDiagnostic,
  type ElkGraphJsonLinking,
} from './ElkGraphJsonLinkingServices.js';
import { ElkGraphJsonLazyLinker } from './ElkGraphJsonLazyLinker.js';
import { ElkGraphJsonReferences } from './ElkGraphJsonReferences.js';
import { LazyURIEncoder } from '../../../../xtext/linking/lazy/LazyURIEncoder.js';

const SERVICES = new ElkGraphJsonValueConverterService();
const LINKING = createElkGraphJsonLinking(SERVICES);
const TWO_NODES_ONE_BAD_EDGE = '{"children":[{"id":"a"}],"edges":[{"id":"e","sources":["a"],"targets":["missing"]}]}';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('loadParsedModel', () => {
  it('loads the root under the default document URI, as the content of a loaded resource', () => {
    const resource = loadParsedModel(parse(TWO_NODES_ONE_BAD_EDGE, SERVICES), LINKING);
    expect(resource.getURI()?.toString()).toBe(DEFAULT_DOCUMENT_URI);
    expect(resource.isLoaded()).toBe(true);
    expect(resource.getContents().size()).toBe(1);
    expect(resource.getResourceSet()?.getResources().size()).toBe(1);
  });

  it('uses the URI it is given', () => {
    const uri = URI.createURI('file:/other/graph.elkj');
    expect(loadParsedModel(parse('{}', SERVICES), LINKING, uri).getURI()).toBe(uri);
  });

  it('adds no linking diagnostic at load; one appears in the live errors when the unresolved edge end is read', () => {
    const resource = loadParsedModel(parse(TWO_NODES_ONE_BAD_EDGE, SERVICES), LINKING);
    expect(resource.getErrors().size()).toBe(0);
    const edge = (resource.getContents().get(0) as ElkNode).getContainedEdges().get(0) as ElkEdge;
    expect((edge.getTargets().get(0) as unknown as InternalEObject).eIsProxy()).toBe(true);
    const errors = [...resource.getErrors()];
    expect(errors.map((d) => d.getMessage())).toEqual(["Couldn't resolve reference to ElkConnectableShape 'missing'."]);
    expect(errors[0]).toBeInstanceOf(XtextLinkingDiagnostic);
    expect(edge.getSources().get(0).eIsProxy()).toBe(false);
  });

  it('puts the parser diagnostics first among the errors, as syntax or conversion diagnostics', () => {
    const resource = loadParsedModel(parse('{"id": }', SERVICES), LINKING);
    const first = [...resource.getErrors()][0] as ParseResourceDiagnostic;
    expect(first).toBeInstanceOf(ParseResourceDiagnostic);
    const parsed = parse('{"id": }', SERVICES).diagnostics[0];
    expect([first.kind, first.getLine(), first.getMessage()]).toEqual(['syntax', parsed?.line, parsed?.message]);
  });

  it('adds nothing but the diagnostics when there is no root', () => {
    const result = parse('', SERVICES);
    const resource = loadParsedModel({ ...result, root: null }, LINKING);
    expect(resource.getContents().isEmpty()).toBe(true);
  });
});

describe('ParseResourceDiagnostic', () => {
  it('carries kind, message and line', () => {
    const d = new ParseResourceDiagnostic('conversion', 'bad value', 7);
    expect([d.kind, d.getMessage(), d.getLine()]).toEqual(['conversion', 'bad value', 7]);
  });
});

describe('the diagnostic consumer handed to the linker', () => {
  /** A linker that reports an error and a warning, then asks what the consumer has seen. */
  class Reporting extends ElkGraphJsonLazyLinker {
    readonly seen: boolean[] = [];

    protected override doLinkModel(_model: unknown, consumer: IDiagnosticConsumer): void {
      const diagnostic = { getMessage: () => 'm', getLine: () => 3, getOffset: () => 0, getLength: () => 0 };
      this.seen.push(
        consumer.hasConsumedDiagnostics(Severity.ERROR),
        consumer.hasConsumedDiagnostics(Severity.WARNING),
      );
      consumer.consume(diagnostic, Severity.ERROR);
      consumer.consume(diagnostic, Severity.WARNING);
      this.seen.push(
        consumer.hasConsumedDiagnostics(Severity.ERROR),
        consumer.hasConsumedDiagnostics(Severity.WARNING),
      );
    }
  }

  it('files errors and warnings in the matching resource list', () => {
    let linker: Reporting | undefined;
    const reporting: ElkGraphJsonLinking = {
      createResource: (uri) => LINKING.createResource(uri),
      createLinker: (nodeModel: INodeModel) =>
        (linker = new Reporting(new ElkGraphJsonReferences(), nodeModel, new LazyURIEncoder({} as never, true))),
    };
    const resource = loadParsedModel(parse('{}', SERVICES), reporting);
    const messages = (list: Iterable<ResourceDiagnostic>): (string | null)[] => [...list].map((d) => d.getMessage());
    expect([messages(resource.getErrors()), messages(resource.getWarnings())]).toEqual([['m'], ['m']]);
    expect(linker?.seen).toEqual([false, false, true, true]);
  });
});
