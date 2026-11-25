// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { DotEObject } from './DotPackage.js';
import { DotFactory, DotFactoryImpl } from './DotFactory.js';
import { DotPackage } from './DotPackage.js';

// Expected values: DotFactory.java (the create methods) and DotFactoryImpl.java (each creates its *Impl).

const L = DotPackage.Literals;

/** [create method, the class its object must have, the generated impl class name]. */
const CREATES: ReadonlyArray<readonly [string, (f: DotFactory) => DotEObject, unknown, string]> = [
  ['createGraphvizModel', (f) => f.createGraphvizModel(), L.GRAPHVIZ_MODEL, 'GraphvizModelImpl'],
  ['createGraph', (f) => f.createGraph(), L.GRAPH, 'GraphImpl'],
  ['createStatement', (f) => f.createStatement(), L.STATEMENT, 'StatementImpl'],
  ['createAttribute', (f) => f.createAttribute(), L.ATTRIBUTE, 'AttributeImpl'],
  ['createNodeStatement', (f) => f.createNodeStatement(), L.NODE_STATEMENT, 'NodeStatementImpl'],
  ['createNode', (f) => f.createNode(), L.NODE, 'NodeImpl'],
  ['createEdgeStatement', (f) => f.createEdgeStatement(), L.EDGE_STATEMENT, 'EdgeStatementImpl'],
  ['createEdgeTarget', (f) => f.createEdgeTarget(), L.EDGE_TARGET, 'EdgeTargetImpl'],
  ['createAttributeStatement', (f) => f.createAttributeStatement(), L.ATTRIBUTE_STATEMENT, 'AttributeStatementImpl'],
  ['createSubgraph', (f) => f.createSubgraph(), L.SUBGRAPH, 'SubgraphImpl'],
  ['createPort', (f) => f.createPort(), L.PORT, 'PortImpl'],
];

describe('DotFactory.eINSTANCE', () => {
  it('is one DotFactoryImpl', () => {
    expect(DotFactory.eINSTANCE).toBeInstanceOf(DotFactoryImpl);
    expect(DotFactory.eINSTANCE).toBe(DotFactory.eINSTANCE);
  });

  it.each(CREATES)('%s creates a fresh, uncontained object of its class', (_name, create, eClass, impl) => {
    const first = create(DotFactory.eINSTANCE);
    const second = create(DotFactory.eINSTANCE);
    expect(first.eClass()).toBe(eClass);
    expect(first.constructor.name).toBe(impl);
    expect(first).not.toBe(second);
    expect(first.eContainer()).toBeNull();
  });

  it('getDotPackage returns the package', () => {
    expect(DotFactory.eINSTANCE.getDotPackage()).toBe(DotPackage);
  });
});
