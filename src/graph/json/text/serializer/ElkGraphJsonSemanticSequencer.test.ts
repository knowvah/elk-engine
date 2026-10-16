// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import type { ElkNode } from '../../../ElkNode.js';
import { Property } from '../../../properties/Property.js';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';
import { ElkGraphJsonText } from '../ElkGraphJsonText.js';
import { ElkGraphJsonGrammarAccess } from './ElkGraphJsonGrammarAccess.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';
import { ElkGraphJsonSerializer } from './ElkGraphJsonSerializer.js';

const A = ElkGraphJsonGrammarAccess;
const EMPTY_MEMBER = '"" :';

function sequence(root: ElkNode) {
  return new ElkGraphJsonSerializer().sequence(root);
}

function texts(root: ElkNode): string[] {
  return sequence(root).tokens.map((t) => t.text);
}

function graph(): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('g');
  return root;
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkNode rule: the order of the elements', () => {
  it('writes identifier, children, ports, edges, labels, properties, then the shape, each entry under its own key', () => {
    const root = graph();
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const b = ElkGraphUtil.createNode(root);
    b.setIdentifier('b');
    ElkGraphUtil.createPort(a).setIdentifier('p');
    ElkGraphUtil.createLabelWithText('l', root);
    ElkGraphUtil.createLabelWithText('m', root);
    const edge = ElkGraphUtil.createEdge(root);
    edge.getSources().add(a);
    edge.getTargets().add(b);
    root.getProperties().put(CoreOptions.PRIORITY, 1);
    root.setHeight(4);
    root.setX(1);
    expect(texts(root)).toEqual([
      ...['{', '"id"', ':', '"g"', ','],
      ...[
        '"children"',
        ':',
        '[',
        '{',
        '"id"',
        ':',
        '"a"',
        ',',
        '"ports"',
        ':',
        '[',
        '{',
        '"id"',
        ':',
        '"p"',
        '}',
        ']',
        '}',
        ']',
        ',',
      ],
      ...['"children"', ':', '[', '{', '"id"', ':', '"b"', '}', ']', ','],
      ...[
        '"edges"',
        ':',
        '[',
        '{',
        '"sources"',
        ':',
        '[',
        '"a"',
        ']',
        ',',
        '"targets"',
        ':',
        '[',
        '"b"',
        ']',
        '}',
        ']',
        ',',
      ],
      ...['"labels"', ':', '[', '{', '"text"', ':', '"l"', '}', ']', ','],
      ...['"labels"', ':', '[', '{', '"text"', ':', '"m"', '}', ']', ','],
      ...['"layoutOptions"', ':', '{', 'priority', ':', '1', '}', ','],
      ...['"x"', ':', '1', ',', '"height"', ':', '4', '}'],
    ]);
  });

  it('writes an object without elements as an empty pair of braces', () => {
    expect(texts(ElkGraphUtil.createGraph())).toEqual(['{', '}']);
  });

  it('writes an empty identifier but skips a null one, a zero coordinate and an empty list', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('');
    root.setX(-0);
    expect(texts(root)).toEqual(['{', '"id"', ':', '""', '}']);
  });
});

describe('ElkPort, ElkLabel and ElkEdge rules', () => {
  it('writes a port as identifier, labels, properties, shape', () => {
    const node = ElkGraphUtil.createNode(null);
    const port = ElkGraphUtil.createPort(node);
    port.setIdentifier('p');
    port.setWidth(2);
    port.getProperties().put(CoreOptions.PRIORITY, 2);
    ElkGraphUtil.createLabelWithText('t', port);
    const portTexts = sequence(node)
      .tokens.filter((t) => t.owner === port)
      .map((t) => t.text);
    // the entered label and property regions belong to their own objects: only the port's brackets show here
    expect(portTexts).toEqual([
      ...['{', '"id"', ':', '"p"', ',', '"labels"', ':', '[', ']', ','],
      ...['"layoutOptions"', ':', '{', '}', ',', '"width"', ':', '2', '}'],
    ]);
  });

  it('writes a label as text, identifier, labels, properties, shape', () => {
    const root = graph();
    const label = ElkGraphUtil.createLabelWithText('t', root);
    label.setIdentifier('l');
    label.setY(3);
    ElkGraphUtil.createLabelWithText('u', label);
    label.getProperties().put(CoreOptions.PRIORITY, 1);
    const labelTexts = sequence(root)
      .tokens.filter((t) => t.owner === label)
      .map((t) => t.text);
    expect(labelTexts).toEqual([
      ...['{', '"text"', ':', '"t"', ',', '"id"', ':', '"l"', ',', '"labels"', ':', '[', ']', ','],
      ...['"layoutOptions"', ':', '{', '}', ',', '"y"', ':', '3', '}'],
    ]);
  });

  it('writes the JsonMember filler for a port, a label and an edge without any element', () => {
    const root = graph();
    const node = ElkGraphUtil.createNode(root);
    const port = ElkGraphUtil.createPort(node);
    const label = ElkGraphUtil.createLabel(root);
    const edge = ElkGraphUtil.createEdge(root);
    const stream = sequence(root);
    for (const owner of [port, label, edge]) {
      expect(stream.tokens.filter((t) => t.owner === owner).map((t) => t.text)).toEqual(['{', EMPTY_MEMBER, '}']);
    }
    expect(stream.tokens.find((t) => t.owner === port && t.text === EMPTY_MEMBER)?.grammarElement).toBe(
      A.portElementAccess.jsonMemberParserRuleCall_4,
    );
    expect(stream.tokens.find((t) => t.owner === label && t.text === EMPTY_MEMBER)?.grammarElement).toBe(
      A.labelElementAccess.jsonMemberParserRuleCall_5,
    );
    expect(stream.tokens.find((t) => t.owner === edge && t.text === EMPTY_MEMBER)?.grammarElement).toBe(
      A.edgeElementAccess.jsonMemberParserRuleCall_5,
    );
  });

  it('writes an edge as sources, targets, identifier, labels, properties', () => {
    const root = graph();
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const edge = ElkGraphUtil.createEdge(root);
    edge.setIdentifier('e');
    edge.getSources().add(a);
    edge.getTargets().add(a);
    ElkGraphUtil.createLabelWithText('t', edge);
    edge.getProperties().put(CoreOptions.PRIORITY, 3);
    expect(
      sequence(root)
        .tokens.filter((t) => t.owner === edge)
        .map((t) => t.text),
    ).toEqual([
      ...['{', '"sources"', ':', '[', '"a"', ']', ',', '"targets"', ':', '[', '"a"', ']', ',', '"id"', ':', '"e"', ','],
      ...['"labels"', ':', '[', ']', ',', '"layoutOptions"', ':', '{', '}', '}'],
    ]);
  });

  it('does not write incomingEdges and outgoingEdges of a node incident to edges', () => {
    const root = graph();
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const edge = ElkGraphUtil.createEdge(root);
    edge.getSources().add(a);
    edge.getTargets().add(a);
    expect(a.getOutgoingEdges().size()).toBe(1);
    expect(a.getIncomingEdges().size()).toBe(1);
    const aTexts = sequence(root)
      .tokens.filter((t) => t.owner === a)
      .map((t) => t.text);
    expect(aTexts).toEqual(['{', '"id"', ':', '"a"', '}']);
  });
});

describe('serialisation failures', () => {
  it('rejects an edge with sections, naming the count', () => {
    const root = graph();
    const edge = ElkGraphUtil.createEdge(root);
    ElkGraphUtil.createEdgeSection(edge);
    ElkGraphUtil.createEdgeSection(edge);
    expect(() => sequence(root)).toThrow(
      new ElkGraphJsonSerializationError(
        'Could not serialize ElkEdge:\nElkEdge.sections violates the upper bound: It holds 2 values, but only 0 are allowed.',
      ),
    );
  });

  it('rejects a property without key', () => {
    const root = graph();
    root.getProperties().put(null, 'v');
    expect(() => sequence(root)).toThrow(/grammar rule 'PropertyKey'/);
  });

  it('rejects an identifier that lexes as a keyword', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('id');
    expect(() => sequence(root)).toThrow(/grammar rule 'STRING'/);
  });

  it('rejects a label whose text was set to null', () => {
    const root = graph();
    ElkGraphUtil.createLabelWithText('t', root).setText(null);
    expect(() => sequence(root)).toThrow(ElkGraphJsonSerializationError);
  });

  it('rejects an edge to a node that is not in the graph', () => {
    const root = graph();
    const stray = ElkGraphUtil.createGraph();
    stray.setIdentifier('z');
    const edge = ElkGraphUtil.createEdge(root);
    edge.getTargets().add(stray);
    expect(() => sequence(root)).toThrow(/Cannot write the reference 'targets'/);
  });
});

describe('Property rule: the value', () => {
  function withValue(value: unknown): ElkNode {
    const root = graph();
    root.getProperties().put(new Property<unknown>('p.v'), value);
    return root;
  }

  function valueToken(root: ElkNode): string | undefined {
    return sequence(root).tokens.find((t) => t.assignment === A.propertyAccess.valueAssignment_2_0)?.text;
  }

  it('writes every value through the first value alternative', () => {
    const root = withValue(true);
    const token = sequence(root).tokens.find((t) => t.assignment === A.propertyAccess.valueAssignment_2_0);
    expect([token?.text, token?.grammarElement]).toEqual([
      'true',
      A.propertyAccess.valueStringValueParserRuleCall_2_0_0,
    ]);
  });

  it.each([
    ['a number', 2.5, '2.5'],
    ['a bigint', 7n, '7'],
    ['null', null, 'null'],
    ['a string that parses as a number, unquoted', '1e3', '1e3'],
    ['any other string, quoted unescaped', 'a"b', '"a"b"'],
  ])('converts %s', (_label, value, expected) => {
    expect(valueToken(withValue(value))).toBe(expected);
  });

  it('reads a list of one element as that element and rejects any other length', () => {
    expect(valueToken(withValue(['only']))).toBe('"only"');
    const chain = new LinkedList<string>();
    chain.add('x');
    expect(valueToken(withValue(chain))).toBe('"x"');
    chain.add('y');
    expect(() => sequence(withValue(chain))).toThrow(/is not allowed to have a value, but it does/);
    expect(() => sequence(withValue([]))).toThrow(ElkGraphJsonSerializationError);
  });
});

describe('loaded documents: lazily linked references', () => {
  it('resolves the proxies of a fresh load while writing the sources and targets', () => {
    const root = ElkGraphJsonText.load(
      '{ id: "g", children: [{ id: "a" }, { id: "b" }], edges: [{ id: "e", sources: ["a"], targets: ["b"] }] }',
    ).root as ElkNode;
    expect(texts(root).filter((t) => t === '"a"' || t === '"b"')).toEqual(['"a"', '"b"', '"a"', '"b"']);
  });

  it('fails for a reference that stays a proxy, and records the linking error on the resource', () => {
    const loaded = ElkGraphJsonText.load('{ id: "g", edges: [{ id: "e", targets: ["gone"] }] }');
    expect(() => sequence(loaded.root as ElkNode)).toThrow(/its target is not visible/);
    expect(loaded.resource.getErrors().size()).toBe(1);
  });
});

describe('token identity', () => {
  it('reports keywords without assignment, key rule calls unassigned, and values with the enclosing assignment', () => {
    const root = graph();
    root.setX(1);
    const tokens = sequence(root).tokens;
    expect(tokens.map((t) => [t.kind, t.grammarElement, t.assignment, t.text])).toEqual([
      ['keyword', A.elkNodeAccess.leftCurlyBracketKeyword_1, null, '{'],
      ['assignment', A.elkIdAccess.keyIdParserRuleCall_0, null, '"id"'],
      ['keyword', A.elkIdAccess.colonKeyword_1, null, ':'],
      ['assignment', A.elkIdAccess.identifierSTRINGTerminalRuleCall_2_0, A.elkIdAccess.identifierAssignment_2, '"g"'],
      ['keyword', A.elkNodeAccess.commaKeyword_2_1_0, null, ','],
      ['assignment', A.shapeElementAccess.keyXParserRuleCall_0_0, null, '"x"'],
      ['keyword', A.shapeElementAccess.colonKeyword_0_1, null, ':'],
      ['assignment', A.shapeElementAccess.XNumberParserRuleCall_0_2_0, A.shapeElementAccess.XAssignment_0_2, '1'],
      ['keyword', A.elkNodeAccess.rightCurlyBracketKeyword_4, null, '}'],
    ]);
    expect(tokens.every((t) => t.owner === root)).toBe(true);
  });

  it('reports a cross reference with its cross reference element and assignment', () => {
    const root = graph();
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const edge = ElkGraphUtil.createEdge(root);
    edge.getSources().add(a);
    const ref = sequence(root).tokens.find((t) => t.kind === 'crossref');
    expect([ref?.grammarElement, ref?.assignment, ref?.text, ref?.owner]).toEqual([
      A.elkEdgeSourcesAccess.sourcesElkConnectableShapeCrossReference_1_0_0,
      A.elkEdgeSourcesAccess.sourcesAssignment_1_0,
      '"a"',
      edge,
    ]);
  });

  it('enters each property as a child region of the Property rule call', () => {
    const root = graph();
    root.getProperties().put(CoreOptions.PRIORITY, 1);
    const regions = new ElkGraphJsonSerializer().serializeToRegions(root);
    expect(regions.regionForDocument().getText()).toBe('{"id":"g","layoutOptions":{priority:1}}');
  });
});
