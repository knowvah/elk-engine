// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import type { IScope } from '../../../xtext/scoping/IScope.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import '../../impl/ElkGraphFactoryImpl.js';
import { ELK_EDGE__SOURCES, ELK_EDGE_SECTION__OUTGOING_SECTIONS } from '../linking/ElkGraphReferences.js';
import { ElkGraphScopeProvider } from './ElkGraphScopeProvider.js';

const DELEGATED: IScope = {
  getSingleElement: () => null,
  getElements: () => [],
  getAllElements: () => [],
};

function provider(): ElkGraphScopeProvider {
  return new ElkGraphScopeProvider({ getScope: () => DELEGATED });
}

describe('ElkGraphScopeProvider', () => {
  it('delegates every reference but outgoingSections', () => {
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    expect(provider().getScope(edge, ELK_EDGE__SOURCES)).toBe(DELEGATED);
  });

  it('scopes outgoingSections to the sections of the edge, by identifier, with no outer scope', () => {
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    const [s1, s2] = [
      ElkGraphFactory.eINSTANCE.createElkEdgeSection(),
      ElkGraphFactory.eINSTANCE.createElkEdgeSection(),
    ];
    s1.setIdentifier('s1');
    s2.setIdentifier('s2');
    edge.getSections().add(s1);
    edge.getSections().add(s2);
    const scope = provider().getScope(s1, ELK_EDGE_SECTION__OUTGOING_SECTIONS);
    expect(scope.getSingleElement(QualifiedName.create('s2'))?.getEObjectOrProxy()).toBe(s2);
    expect([...scope.getAllElements()].map((d) => d.getName().toString())).toEqual(['s1', 's2']);
    expect(scope.getSingleElement(QualifiedName.create('s3'))).toBeNull();
  });

  it('fails for a section without an edge, as the Xtend dereference does', () => {
    const orphan: EObject = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
    expect(() => provider().getScope(orphan, ELK_EDGE_SECTION__OUTGOING_SECTIONS)).toThrow(TypeError);
  });
});
