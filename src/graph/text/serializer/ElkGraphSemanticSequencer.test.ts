// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkNode } from '../../ElkNode.js';
import type { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import { Property } from '../../properties/Property.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { ElkGraphText } from '../ElkGraphText.js';
import { ElkGraphGrammarAccess } from './ElkGraphGrammarAccess.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';
import { ElkGraphSerializer } from './ElkGraphSerializer.js';

const A = ElkGraphGrammarAccess;

function load(text: string): ElkNode {
  return ElkGraphText.load(text).root as ElkNode;
}

function texts(root: ElkNode): string[] {
  return new ElkGraphSerializer().sequence(root).tokens.map((t) => t.text);
}

function entryOf(root: ElkNode): ElkPropertyToValueMapEntryImpl {
  return [...root.getProperties().entryList()][0] as ElkPropertyToValueMapEntryImpl;
}

describe('token identity', () => {
  it('reports keywords without assignment and values with the enclosing assignment', () => {
    const root = load('graph g node a');
    const tokens = new ElkGraphSerializer().sequence(root).tokens;
    expect(tokens.map((t) => [t.kind, t.grammarElement, t.assignment, t.text])).toEqual([
      ['keyword', A.rootNodeAccess.graphKeyword_1_0, null, 'graph'],
      [
        'assignment',
        A.rootNodeAccess.identifierIDTerminalRuleCall_1_1_0,
        A.rootNodeAccess.identifierAssignment_1_1,
        'g',
      ],
      ['keyword', A.elkNodeAccess.nodeKeyword_0, null, 'node'],
      ['assignment', A.elkNodeAccess.identifierIDTerminalRuleCall_1_0, A.elkNodeAccess.identifierAssignment_1, 'a'],
    ]);
    expect(tokens[2]!.owner).toBe(root.getChildren().get(0));
  });

  it('reports a cross reference with its cross reference element and assignment', () => {
    const tokens = new ElkGraphSerializer().sequence(load('graph g node a node b edge a -> b')).tokens;
    const refs = tokens.filter((t) => t.kind === 'crossref');
    expect(refs.map((t) => [t.grammarElement, t.assignment, t.text])).toEqual([
      [A.elkEdgeAccess.sourcesElkConnectableShapeCrossReference_2_0, A.elkEdgeAccess.sourcesAssignment_2, 'a'],
      [A.elkEdgeAccess.targetsElkConnectableShapeCrossReference_5_0, A.elkEdgeAccess.targetsAssignment_5, 'b'],
    ]);
  });

  it('builds a region access that finds the region of every contained object', () => {
    const root = load('graph g node a { port p }');
    const regions = new ElkGraphSerializer().serializeToRegions(root);
    const node = root.getChildren().get(0)!;
    expect(regions.regionForEObject(node)).not.toBeNull();
    expect(regions.regionForEObject(node.getPorts().get(0)!)).not.toBeNull();
    expect(regions.regionForRootEObject().getSemanticElement()).toBe(root);
  });
});

describe('transient and optional values', () => {
  it('never writes incomingEdges, outgoingEdges or incomingSections', () => {
    const root = load('graph g node a node b edge a -> b');
    const [a, b] = [...root.getChildren()];
    expect(a!.getOutgoingEdges().size()).toBe(1);
    expect(b!.getIncomingEdges().size()).toBe(1);
    expect(texts(root)).toEqual(['graph', 'g', 'node', 'a', 'node', 'b', 'edge', 'a', '->', 'b']);
  });

  it('writes no braces for a node without body and no layout for an unset shape', () => {
    expect(texts(load('graph g node a'))).not.toContain('{');
    expect(texts(load('graph g node a layout [ ]'))).not.toContain('layout');
  });

  it('writes the braces of an edge only when it has a layout, properties or labels', () => {
    const plain = 'graph g node a node b edge a -> b';
    expect(texts(load(plain))).not.toContain('{');
    expect(texts(load(`${plain} { priority: 1 }`).getContainedEdges().get(0)!.eContainer() as ElkNode)).toContain('{');
    expect(texts(load(`${plain} { label "l" }`))).toContain('{');
  });

  it('writes an unset label text as the empty string', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createLabel(root);
    expect(texts(root)).toEqual(['label', '""']);
  });
});

describe('sequence_Property', () => {
  it('writes the value of a string that needs quotes as QualifiedIdValue, unescaped (G1 quirk)', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(new Property<unknown>('my.option'), 'say "hi"');
    const tokens = new ElkGraphSerializer().sequence(root).tokens;
    const value = tokens.at(-1)!;
    expect(value.assignment).toBe(A.propertyAccess.valueAssignment_2_1);
    expect(value.grammarElement).toBe(A.propertyAccess.valueQualifiedIdValueParserRuleCall_2_1_0);
    expect(value.text).toBe('"say "hi""');
  });

  it('chooses BooleanValue, NumberValue and the null keyword by the runtime type', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(new Property<unknown>('p.bool'), true);
    root.getProperties().put(new Property<unknown>('p.num'), 2.5);
    root.getProperties().put(new Property<unknown>('p.none'), null);
    const tokens = new ElkGraphSerializer().sequence(root).tokens;
    const used = tokens.filter((t) => t.assignment?.startsWith('Property.value') || t.text === 'null');
    expect(used.map((t) => [t.assignment, t.text])).toEqual([
      [A.propertyAccess.valueAssignment_2_3, 'true'],
      [A.propertyAccess.valueAssignment_2_2, '2.5'],
      [null, 'null'],
    ]);
  });

  it('replaces a resolvable proxy value in the entry and writes the resolved value', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(CoreOptions.PRIORITY, new LayoutOptionProxy('5'));
    expect(texts(root)).toEqual(['priority', ':', '5']);
    expect(entryOf(root).getValue()).toBe(5);
  });

  it('keeps an unresolvable proxy and writes its text', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(new Property<unknown>('no.such.option'), new LayoutOptionProxy('abc'));
    expect(texts(root)).toEqual(['no.such.option', ':', 'abc']);
    expect(entryOf(root).getValue()).toBeInstanceOf(LayoutOptionProxy);
  });

  it('fails for an entry without key', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(null, 'v');
    expect(() => texts(root)).toThrow(/'key' is required/);
  });

  it('fails for a key segment that is not an identifier', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(new Property<unknown>('^node'), 'v');
    expect(() => texts(root)).toThrow(ElkGraphSerializationError);
  });
});

describe('serialisation errors', () => {
  function edgeOf(root: ElkNode): ElkEdge {
    return root.getContainedEdges().get(0)!;
  }

  it('rejects a single section that has outgoing sections', () => {
    const root = load('graph g node a node b edge e: a -> b');
    const section = ElkGraphUtil.createEdgeSection(edgeOf(root));
    section.getOutgoingSections().add(ElkGraphUtil.createEdgeSection(edgeOf(root)));
    expect(() => texts(root)).toThrow(/sections need an identifier/);
  });

  it('rejects a section with identifier next to one without', () => {
    const root = load('graph g node a node b edge e: a -> b { layout [ section s1 [] ] }');
    ElkGraphUtil.createEdgeSection(edgeOf(root));
    expect(() => texts(root)).toThrow(/identifier each/);
  });

  it('rejects an edge end that is no node or port of the graph', () => {
    const root = load('graph g node a node b edge e: a -> b');
    const stranger = ElkGraphUtil.createGraph();
    stranger.setIdentifier('z');
    edgeOf(root).getTargets().add(stranger);
    expect(() => texts(root)).toThrow(/not visible in the scope/);
  });

  it('rejects an unset required identifier and a missing edge end', () => {
    const noId = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(noId);
    expect(() => texts(noId)).toThrow(/'identifier' is required/);
    const noEnds = ElkGraphUtil.createGraph();
    ElkGraphUtil.createEdge(noEnds);
    expect(() => texts(noEnds)).toThrow(/ElkEdge.sources violates the lower bound/);
  });

  it('rejects a label whose text is null', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createLabel(root).setText(null);
    expect(() => texts(root)).toThrow(/'text' is required/);
  });

  it('rejects a section without identifier in the multi form', () => {
    const root = load('graph g node a node b edge e: a -> b { layout [ section s1 [] ] }');
    edgeOf(root).getSections().get(0)!.setIdentifier(null);
    // one section without identifier is the single form: written without error
    expect(texts(root)).toContain('layout');
  });
});

describe('section forms', () => {
  it('writes sections with outgoing sections, shapes, bends and properties in order', () => {
    const root = load(
      'graph g node a { port p } node b edge e: a -> b { layout [ section s1 -> s2, s3 [ incoming: a.p start: 1, 2 bends: 1, 1 | 2, 2 priority: 1 ] section s2 [] section s3 [] ] }',
    );
    const all = texts(root);
    const layout = all.slice(all.indexOf('layout'));
    expect(layout).toEqual([
      'layout',
      '[',
      'section',
      's1',
      '->',
      's2',
      ',',
      's3',
      '[',
      'incoming',
      ':',
      'a.p',
      'start',
      ':',
      '1',
      ',',
      '2',
      'bends',
      ':',
      '1',
      ',',
      '1',
      '|',
      '2',
      ',',
      '2',
      'priority',
      ':',
      '1',
      ']',
      'section',
      's2',
      '[',
      ']',
      'section',
      's3',
      '[',
      ']',
      ']',
      '}',
    ]);
  });

  it('writes one section without identifier as the single form, without the section keyword', () => {
    const root = load('graph g node a node b edge e: a -> b { layout [ start: 1, 2 end: 3, 4 ] }');
    const all = texts(root);
    expect(all.slice(all.indexOf('layout'))).toEqual([
      'layout',
      '[',
      'start',
      ':',
      '1',
      ',',
      '2',
      'end',
      ':',
      '3',
      ',',
      '4',
      ']',
      '}',
    ]);
  });
});
