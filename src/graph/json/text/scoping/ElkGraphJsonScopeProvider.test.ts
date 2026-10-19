// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import type { IScope } from '../../../../xtext/scoping/IScope.js';
import { ElkGraphFactory } from '../../../ElkGraphFactory.js';
import '../../../impl/ElkGraphFactoryImpl.js';
import { ElkGraphJsonScopeProvider } from './ElkGraphJsonScopeProvider.js';

const DELEGATED: IScope = {
  getSingleElement: () => null,
  getElements: () => [],
  getAllElements: () => [],
};

function ref(name: string, type: string): EReferenceInfo {
  return {
    name,
    referenceType: { name: type, isAssignableFrom: (n) => n === type },
    upperBound: -1,
    unique: true,
    containment: false,
    container: false,
    derived: false,
    changeable: true,
    transient: false,
  };
}

const OUTGOING_SECTIONS = ref('outgoingSections', 'ElkEdgeSection');
const SOURCES = ref('sources', 'ElkConnectableShape');

function provider(): ElkGraphJsonScopeProvider {
  return new ElkGraphJsonScopeProvider({ getScope: () => DELEGATED });
}

function edgeWithSections(...ids: string[]) {
  const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
  return ids.map((id) => {
    const s = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
    s.setIdentifier(id);
    edge.getSections().add(s);
    return s;
  });
}

describe('ElkGraphJsonScopeProvider', () => {
  it('delegates every reference but outgoingSections', () => {
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    expect(provider().getScope(edge, SOURCES)).toBe(DELEGATED);
  });

  it('delegates a same-named reference of another type', () => {
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    expect(provider().getScope(edge, ref('outgoingSections', 'ElkEdge'))).toBe(DELEGATED);
  });

  it('scopes outgoingSections to the sections of the edge, by identifier, with no outer scope', () => {
    const [s1, s2] = edgeWithSections('s1', 's2');
    const scope = provider().getScope(s1, OUTGOING_SECTIONS);
    expect(scope.getSingleElement(QualifiedName.create('s2'))?.getEObjectOrProxy()).toBe(s2);
    expect([...scope.getAllElements()].map((d) => d.getName().toString())).toEqual(['s1', 's2']);
    expect(scope.getSingleElement(QualifiedName.create('s3'))).toBeNull();
  });

  it('lets the first of two sections with the same identifier win', () => {
    const [first] = edgeWithSections('s', 's');
    const scope = provider().getScope(first, OUTGOING_SECTIONS);
    expect(scope.getSingleElement(QualifiedName.create('s'))?.getEObjectOrProxy()).toBe(first);
  });

  it('fails for a section without an edge, as the Xtend dereference does', () => {
    const orphan = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
    expect(() => provider().getScope(orphan, OUTGOING_SECTIONS)).toThrow(TypeError);
  });
});
