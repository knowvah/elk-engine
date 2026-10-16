// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import {
  edgeItems,
  describeRef,
  fragmentOf,
  modelItems,
  pathIndex,
  rawSources,
  rawTargets,
  readParseCases,
  withoutJavaClass,
  type RecordedEdgeLinks,
  type RecordedParseCase,
  type RecordedProxies,
} from '../../../../test/helpers/graph-json-text-linking.js';
import {
  nodeShape,
  propertyRows,
  recordedShape,
  valueMatches,
  type RecordedElement,
  type RecordedProperty,
} from '../../../../test/helpers/graph-json-text-shapes.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText, diagnosticsOf, type ElkJsonTextLoadResult } from './ElkGraphJsonText.js';

const SYNTAX = 'syntax';
const LINKING_KIND = 'linking';
const UNRESOLVED = /^Couldn't resolve reference to ElkConnectableShape '.*'\.$/;

interface GraphCase extends RecordedParseCase {
  readonly graph: RecordedElement;
  readonly properties: readonly RecordedProperty[];
}

const cases = readParseCases() as GraphCase[];
const hasSyntaxError = (c: RecordedParseCase): boolean => c.diagnosticsAtLoad.some((d) => d.kind === SYNTAX);
const exactCases = cases.filter((c) => !hasSyntaxError(c));
const syntaxCases = cases.filter(hasSyntaxError);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function rootOf(loaded: ElkJsonTextLoadResult): ElkNode {
  return loaded.root as ElkNode;
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
  const paths = pathIndex(modelItems(root));
  return edgeItems(modelItems(root)).map(({ path, edge }) => ({
    path,
    sources: Array.from({ length: edge.getSources().size() }, (_, i) => describeRef(edge.getSources().get(i), paths)),
    targets: Array.from({ length: edge.getTargets().size() }, (_, i) => describeRef(edge.getTargets().get(i), paths)),
  }));
}

describe('ElkGraphJsonText.load: replay of the recorded JVM parse cases', () => {
  it('replays 439 recorded cases, 157 of them with syntax errors', () => {
    expect(cases).toHaveLength(439);
    expect(syntaxCases).toHaveLength(157);
  });

  describe.each(exactCases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it('loads the recorded diagnostics, graph, properties and proxies', () => {
      const loaded = ElkGraphJsonText.load(c.input);
      expect(loaded.errors).toEqual(c.diagnosticsAtLoad.map(withoutJavaClass));
      expect(nodeShape(rootOf(loaded))).toEqual(recordedShape(c.graph));
      const entries = propertyRows(rootOf(loaded), c.properties) as Array<{
        getKey(): { getId(): string };
        getValue(): unknown;
      }>;
      expect(entries.map((e) => ({ key: e.getKey().getId(), data: e.getKey() instanceof LayoutOptionData }))).toEqual(
        c.properties.map((p) => ({ key: p.key, data: p.keyClass === 'LayoutOptionData' })),
      );
      c.properties.forEach((recorded, i) => {
        expect(valueMatches(entries[i]?.getValue(), recorded), `${recorded.key} = ${recorded.value}`).toBe(true);
      });
      expect(proxiesAtLoad(rootOf(loaded))).toEqual(c.proxiesAtLoad);
    });

    it('resolves on access to the recorded links, diagnostics, and again on resolveLazyCrossReferences', () => {
      const loaded = ElkGraphJsonText.load(c.input);
      expect(links(rootOf(loaded))).toEqual(c.links);
      expect(diagnosticsOf(loaded.resource)).toEqual(c.diagnosticsAfterLinks.map(withoutJavaClass));
      loaded.resource.resolveLazyCrossReferences(null);
      expect(diagnosticsOf(loaded.resource)).toEqual(c.diagnosticsAfterResolve.map(withoutJavaClass));
    });

    it('resolves a fresh load by resolveLazyCrossReferences alone to the recorded diagnostics', () => {
      const loaded = ElkGraphJsonText.load(c.input);
      loaded.resource.resolveLazyCrossReferences(null);
      expect(diagnosticsOf(loaded.resource)).toEqual(c.diagnosticsAfterResolveOnly.map(withoutJavaClass));
    });
  });

  // presence policy (D6): after a syntax error the port stops at the first error while ANTLR recovers, so the
  // graph and the diagnostics after it are only comparable in presence and kind
  describe.each(syntaxCases.map((c) => [c.id, c] as const))('%s (syntax error)', (_id, c) => {
    it('keeps a syntax error among the load diagnostics and the first one the recorded kind', () => {
      const { errors } = ElkGraphJsonText.load(c.input);
      expect(errors.some((d) => d.kind === SYNTAX)).toBe(true);
      expect(errors.every((d) => d.kind !== LINKING_KIND)).toBe(true);
    });

    it('links without failing and reports only unresolved-reference linking errors', () => {
      const loaded = ElkGraphJsonText.load(c.input);
      if (loaded.root !== null) links(loaded.root);
      loaded.resource.resolveLazyCrossReferences(null);
      const linking = diagnosticsOf(loaded.resource).filter((d) => d.kind === LINKING_KIND);
      expect(linking.every((d) => UNRESOLVED.test(d.message))).toBe(true);
    });
  });
});
