// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { ResourceScopeCache } from '../../../../xtext/util/ResourceScopeCache.js';
import type { IQualifiedNameConverter } from '../../../../xtext/naming/IQualifiedNameConverter.js';
import { ElkGraphFactory } from '../../../ElkGraphFactory.js';
import '../../../impl/ElkGraphFactoryImpl.js';
import { ElkGraphJsonQualifiedNameProvider } from './ElkGraphJsonQualifiedNameProvider.js';

// the flat provider never consults the converter (the name attribute resolver finds nothing)
const NO_CONVERTER = {} as IQualifiedNameConverter;

function nameOf(obj: EObject): string | null {
  const provider = new ElkGraphJsonQualifiedNameProvider(NO_CONVERTER, new ResourceScopeCache());
  return provider.getFullyQualifiedName(obj)?.toString() ?? null;
}

function node(id: string | null) {
  const n = ElkGraphFactory.eINSTANCE.createElkNode();
  if (id !== null) n.setIdentifier(id);
  return n;
}

describe('ElkGraphJsonQualifiedNameProvider', () => {
  it('names nested elements by their identifier alone', () => {
    const root = node('r');
    const a = node('a');
    const b = node('b');
    const port = ElkGraphFactory.eINSTANCE.createElkPort();
    port.setIdentifier('p');
    root.getChildren().add(a);
    a.getChildren().add(b);
    b.getPorts().add(port);
    expect([root, a, b, port].map(nameOf)).toEqual(['r', 'a', 'b', 'p']);
  });

  it('keeps a dotted identifier as one segment', () => {
    const provider = new ElkGraphJsonQualifiedNameProvider(NO_CONVERTER, new ResourceScopeCache());
    const name = provider.getFullyQualifiedName(node('a.b'));
    expect(name?.getSegmentCount()).toBe(1);
    expect(name?.getFirstSegment()).toBe('a.b');
  });

  it('gives an element without identifier no name', () => {
    const root = node('r');
    const child = node(null);
    root.getChildren().add(child);
    expect(nameOf(child)).toBeNull();
  });

  it('names an edge and a label by identifier', () => {
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    edge.setIdentifier('e');
    const label = ElkGraphFactory.eINSTANCE.createElkLabel();
    label.setIdentifier('l');
    expect([nameOf(edge), nameOf(label)]).toEqual(['e', 'l']);
  });

  it('gives an object that is no graph element no name', () => {
    expect(nameOf(ElkGraphFactory.eINSTANCE.createElkEdgeSection())).toBeNull();
  });
});
