// SPDX-License-Identifier: EPL-2.0
// Edge-specific branches of JsonImporterEdges.ts that the `import` rows (driven in JsonImporter.test.ts, which owns the
// canonical-tree helper and the row driver) do not pin down: expected values are the Xtend source's (JsonImporter.xtend:
// 148-425) and the HashMultimap iteration order documented in src/guava/HashMultimap.ts.
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { readElement } from '../../gson/internal/JsonElementReader.js';
import { JsonReader } from '../../gson/stream/JsonReader.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkNode } from '../ElkNode.js';
import { JsonImportException } from './JsonImportException.js';
import { JsonImporter } from './JsonImporter.js';
import { transformEdges } from './JsonImporterEdges.js';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function parse(text: string): JsonObject {
  return readElement(new JsonReader(text)) as JsonObject;
}

function importJson(text: string): ElkNode {
  return new JsonImporter().transform(parse(text));
}

function firstEdge(root: ElkNode): ElkEdge {
  return [...root.getContainedEdges()][0] as ElkEdge;
}

function ids(sections: Iterable<ElkEdgeSection>): (string | null)[] {
  return [...sections].map((s) => s.getIdentifier());
}

function captured(f: () => unknown): Error {
  try {
    f();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}

const POINTS = '"startPoint":{"x":0,"y":0},"endPoint":{"x":1,"y":1}';
const NODES = '"children":[{"id":"a"},{"id":"b"}]';

function section(id: string | number, extra = ''): string {
  return `{"id":${JSON.stringify(id)},${POINTS}${extra}}`;
}

function withSections(...sections: string[]): string {
  return `{"id":"r",${NODES},"edges":[{"id":"e","sources":["a"],"targets":["b"],"sections":[${sections.join(',')}]}]}`;
}

describe('transformEdges', () => {
  it('rejects a json object that is not registered as a node, naming its id', () => {
    const importer = new JsonImporter();
    importer.transform(parse('{"id":"r"}'));
    const error = captured(() => {
      transformEdges(importer, parse('{"id":"stranger"}'));
    });
    expect(error).toBeInstanceOf(JsonImportException);
    expect(error.message).toBe("Unable to find elk node for json object 'stranger' Panic!");
    expect(
      captured(() => {
        transformEdges(importer, parse('{}'));
      }).message,
    ).toBe("Unable to find elk node for json object 'null' Panic!");
  });

  it('transforms the edges of child levels and contains each edge in its lowest common ancestor', () => {
    const root = importJson(
      '{"id":"r","children":[{"id":"p","children":[{"id":"a"},{"id":"b"}],"edges":[{"id":"inner","source":"a","target":"b"}]}],' +
        '"edges":[{"id":"top","source":"p","target":"p"}]}',
    );
    const parent = [...root.getChildren()][0] as ElkNode;
    expect([...root.getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['top']);
    expect([...parent.getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['inner']);
  });
});

describe('edge sections', () => {
  it('orders resolved incoming sections by the HashMultimap value set, not by the json order', () => {
    // value hashes in a 4-slot table: "a" (97) slot 1, 5 slot 1 (after "a"), "b" (98) slot 2
    const root = importJson(
      withSections(section('b'), section('a'), section(5), section('c', ',"incomingSections":["b","a",5]')),
    );
    const c = [...firstEdge(root).getSections()][3] as ElkEdgeSection;
    expect(ids(c.getIncomingSections())).toEqual(['a', '5', 'b']);
  });

  it('tells apart ids that share a String.hashCode ("Aa" and "BB") and keeps their insertion order', () => {
    const root = importJson(
      withSections(section('Aa'), section('BB'), section('c', ',"incomingSections":["BB","Aa"]')),
    );
    const c = [...firstEdge(root).getSections()][2] as ElkEdgeSection;
    expect(ids(c.getIncomingSections())).toEqual(['BB', 'Aa']);
  });

  it('adds a repeated reference once, whether the id repeats or two ids name one section', () => {
    const root = importJson(
      withSections(
        section('x'),
        section(7),
        section('y', ',"incomingSections":["x","x"]'),
        section('z', ',"incomingSections":["x",7.0,7]'),
      ),
    );
    const [x, , y, z] = [...firstEdge(root).getSections()] as ElkEdgeSection[];
    expect(ids(y?.getIncomingSections() ?? [])).toEqual(['x']);
    expect(ids(z?.getIncomingSections() ?? [])).toEqual(['x', '7']);
    expect(ids(x?.getOutgoingSections() ?? [])).toEqual(['y', 'z']);
  });

  it('resolves a reference to a section of an earlier edge but not of a later one', () => {
    const edge = (id: string, source: string, target: string, sec: string): string =>
      `{"id":"${id}","sources":["${source}"],"targets":["${target}"],"sections":[${sec}]}`;
    const text = (first: string, second: string): string => `{"id":"r",${NODES},"edges":[${first},${second}]}`;
    const early = edge('e1', 'a', 'b', section('s1'));
    const later = edge('e2', 'b', 'a', section('s2', ',"incomingSections":["s1"]'));
    const root = importJson(text(early, later));
    const s2 = [...([...root.getContainedEdges()][1]?.getSections() ?? [])][0] as ElkEdgeSection;
    expect(ids(s2.getIncomingSections())).toEqual(['s1']);

    const forward = edge('e1', 'a', 'b', section('s1', ',"incomingSections":["s2"]'));
    const error = captured(() => importJson(text(forward, edge('e2', 'b', 'a', section('s2')))));
    expect(error).toBeInstanceOf(JsonImportException);
    expect(error.message).toBe("Referenced edge section does not exist: s2 (edge id: 'e1').");
  });

  it('keeps explicit shapes: a single section with one shape set is not defaulted', () => {
    const root = importJson(withSections(section('s', ',"incomingShape":"b"')));
    const only = [...firstEdge(root).getSections()][0] as ElkEdgeSection;
    expect(only.getIncomingShape()).toBe([...root.getChildren()][1]);
    expect(only.getOutgoingShape()).toBeNull();
  });

  it('defaults a single section to the edge source and target, but not on a hyperedge or with two sections', () => {
    const single = [...firstEdge(importJson(withSections(section('s')))).getSections()][0] as ElkEdgeSection;
    expect(single.getIncomingShape()).not.toBeNull();
    expect(single.getOutgoingShape()).not.toBeNull();

    const two = [...firstEdge(importJson(withSections(section('s'), section('t')))).getSections()];
    expect(two.map((s) => s.getIncomingShape())).toEqual([null, null]);

    const hyper = importJson(
      '{"id":"r","children":[{"id":"a"},{"id":"b"},{"id":"c"}],"edges":[{"id":"e","sources":["a"],' +
        `"targets":["b","c"],"sections":[${section('s')}]}]}`,
    );
    expect([...firstEdge(hyper).getSections()][0]?.getIncomingShape()).toBeNull();
  });
});

describe('primitive edges', () => {
  it('requires a start and end point of a section, and reports a missing source node by edge id', () => {
    const missingEnd = captured(() =>
      importJson(
        '{"id":"r","children":[{"id":"a"}],"edges":[{"id":"e","source":"a","target":"a","sourcePoint":{"x":1}}]}',
      ),
    );
    expect(missingEnd).toBeInstanceOf(TypeError);
    const noNode = captured(() => importJson('{"id":"r","edges":[{"id":"e7","source":"zz","target":"zz"}]}'));
    expect(noNode.message).toBe("An edge must have a source node (edge id: 'e7').");
  });
});
