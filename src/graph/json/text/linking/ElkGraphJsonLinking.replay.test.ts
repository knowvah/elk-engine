// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../../ElkNode.js';
import {
  edgeItems,
  describeRef,
  fragmentOf,
  modelItems,
  pathIndex,
  rawSources,
  rawTargets,
  readParseCases,
  recordedDiagnostics,
  withoutJavaClass,
  type RecordedEdgeLinks,
  type RecordedParseCase,
  type RecordedProxies,
} from '../../../../../test/helpers/graph-json-text-linking.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from '../parser/ElkGraphJsonParser.js';
import { createElkGraphJsonLinking, loadParsedModel } from './ElkGraphJsonLinkingServices.js';
import type { LazyLinkingResource } from '../../../../xtext/linking/lazy/LazyLinkingResource.js';

const SERVICES = new ElkGraphJsonValueConverterService();
const LINKING = createElkGraphJsonLinking(SERVICES);
const SYNTAX = 'syntax';
const LINKING_KIND = 'linking';
const UNRESOLVED = /^Couldn't resolve reference to ElkConnectableShape '.*'\.$/;

const cases = readParseCases();
const hasSyntaxError = (c: RecordedParseCase): boolean => c.diagnosticsAtLoad.some((d) => d.kind === SYNTAX);
const exactCases = cases.filter((c) => !hasSyntaxError(c));
const syntaxCases = cases.filter(hasSyntaxError);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

interface Loaded {
  readonly resource: LazyLinkingResource;
  readonly root: ElkNode | null;
}

function load(text: string): Loaded {
  const resource = loadParsedModel(parse(text, SERVICES), LINKING);
  return { resource, root: resource.getContents().isEmpty() ? null : (resource.getContents().get(0) as ElkNode) };
}

function proxiesAtLoad(root: ElkNode): RecordedProxies[] {
  return edgeItems(modelItems(root)).map(({ path, edge }) => ({
    path,
    sources: rawSources(edge).map(fragmentOf),
    targets: rawTargets(edge).map(fragmentOf),
  }));
}

/** Every edge's sources, then targets, read through `get(i)` in model order, as `ElkjParseVectors.links` does. */
function links(root: ElkNode): RecordedEdgeLinks[] {
  const items = modelItems(root);
  const paths = pathIndex(items);
  return edgeItems(items).map(({ path, edge }) => {
    const sources = Array.from({ length: edge.getSources().size() }, (_, i) =>
      describeRef(edge.getSources().get(i), paths),
    );
    const targets = Array.from({ length: edge.getTargets().size() }, (_, i) =>
      describeRef(edge.getTargets().get(i), paths),
    );
    return { path, sources, targets };
  });
}

function expected(
  c: RecordedParseCase,
  field: 'diagnosticsAfterLinks' | 'diagnosticsAfterResolveOnly' | 'diagnosticsAfterResolve',
) {
  return c[field].map(withoutJavaClass);
}

describe('ElkGraphJsonLinking: replay of the recorded JVM parse cases (lazy linking)', () => {
  it('replays 439 recorded cases, 157 of them with syntax errors', () => {
    expect(cases).toHaveLength(439);
    expect(syntaxCases).toHaveLength(157);
  });

  describe.each(exactCases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it('installs the recorded proxy fragments and no linking diagnostic at load', () => {
      const { resource, root } = load(c.input);
      expect(proxiesAtLoad(root as ElkNode)).toEqual(c.proxiesAtLoad);
      expect(recordedDiagnostics(resource)).toEqual(c.diagnosticsAtLoad.map(withoutJavaClass));
    });

    it('resolves on access to the recorded links, diagnostics, and again on resolveLazyCrossReferences', () => {
      const { resource, root } = load(c.input);
      expect(links(root as ElkNode)).toEqual(c.links);
      expect(recordedDiagnostics(resource)).toEqual(expected(c, 'diagnosticsAfterLinks'));
      resource.resolveLazyCrossReferences(null);
      expect(recordedDiagnostics(resource)).toEqual(expected(c, 'diagnosticsAfterResolve'));
    });

    it('resolves a fresh load by resolveLazyCrossReferences alone to the recorded diagnostics', () => {
      const { resource } = load(c.input);
      resource.resolveLazyCrossReferences(null);
      expect(recordedDiagnostics(resource)).toEqual(expected(c, 'diagnosticsAfterResolveOnly'));
    });
  });

  // presence policy (D6): after a syntax error the port stops at the first error while ANTLR recovers, so the
  // graph (hence proxies and links) is only comparable when both parsed the same references
  it.each(syntaxCases.map((c) => [c.id, c] as const))(
    'keeps the syntax error and links without failing: %s',
    (_id, c) => {
      const { resource, root } = load(c.input);
      expect(recordedDiagnostics(resource).some((d) => d.kind === SYNTAX)).toBe(true);
      if (root !== null) links(root);
      resource.resolveLazyCrossReferences(null);
      const linking = recordedDiagnostics(resource).filter((d) => d.kind === LINKING_KIND);
      expect(linking.every((d) => UNRESOLVED.test(d.message))).toBe(true);
    },
  );
});
