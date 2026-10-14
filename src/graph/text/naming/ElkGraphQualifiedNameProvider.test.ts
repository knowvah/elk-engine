// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { ResourceScopeCache } from '../../../xtext/util/ResourceScopeCache.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import '../../impl/ElkGraphFactoryImpl.js';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { parse } from '../parser/ElkGraphParser.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphQualifiedNameConverter } from './ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from './ElkGraphQualifiedNameProvider.js';

const SERVICES = new ElkGraphValueConverterService();

function provider(): ElkGraphQualifiedNameProvider {
  return new ElkGraphQualifiedNameProvider(
    new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS),
    new ResourceScopeCache(),
  );
}

function nameOf(obj: EObject): string | null {
  return provider().getFullyQualifiedName(obj)?.toString() ?? null;
}

function root(text: string): ElkNode {
  return parse(text, SERVICES).root as ElkNode;
}

describe('ElkGraphQualifiedNameProvider', () => {
  it('names nested nodes by their dotted path below an unnamed root', () => {
    const top = root('node a { node b { node c } }');
    const a = top.getChildren().get(0);
    const b = a.getChildren().get(0);
    const c = b.getChildren().get(0);
    const names = provider();
    expect(names.getFullyQualifiedName(a)?.toString()).toBe('a');
    expect(names.getFullyQualifiedName(b)?.toString()).toBe('a.b');
    expect(names.getFullyQualifiedName(c)?.toString()).toBe('a.b.c');
  });

  it('prefixes the name of a named root', () => {
    const top = root('graph r\nnode a { port p label l: "x" }');
    const a = top.getChildren().get(0);
    expect(nameOf(top)).toBe('r');
    expect(nameOf(a)).toBe('r.a');
    expect(nameOf(a.getPorts().get(0))).toBe('r.a.p');
  });

  it('gives an unnamed root and an unnamed element no name', () => {
    const top = root('node a { port p }');
    expect(nameOf(top)).toBeNull();
    const unnamed = ElkGraphFactory.eINSTANCE.createElkNode();
    expect(nameOf(unnamed)).toBeNull();
  });

  it('skips unnamed ancestors', () => {
    const top = root('node a');
    const unnamedMiddle = ElkGraphFactory.eINSTANCE.createElkNode();
    const leaf = ElkGraphFactory.eINSTANCE.createElkNode();
    leaf.setIdentifier('leaf');
    top.getChildren().add(unnamedMiddle);
    unnamedMiddle.getChildren().add(leaf);
    expect(nameOf(leaf)).toBe('leaf');
    top.setIdentifier('r');
    expect(nameOf(leaf)).toBe('r.leaf');
  });

  it('names an edge section by its identifier alone, below a named edge and root', () => {
    const top = root('graph r\nnode a\nedge e : a -> a { layout [ section s [ ] ] }');
    const edge = top.getContainedEdges().get(0) as ElkEdge;
    expect(nameOf(edge)).toBe('r.e');
    expect(nameOf(edge.getSections().get(0))).toBe('s');
  });

  it('gives an object that is neither an element nor a section no name', () => {
    const top = root('node a\nedge e : a -> a { layout [ section s [ start: 1, 2 bends: 3, 4 | 5, 6 ] ] }');
    const section = (top.getContainedEdges().get(0) as ElkEdge).getSections().get(0);
    expect(nameOf(section.getBendPoints().get(0))).toBeNull();
  });
});
