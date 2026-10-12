// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../java/lang/IllegalStateException.js';
import { ElkGraphFactory, isElkGraphFactory, setElkGraphFactoryInstance } from './ElkGraphFactory.js';
import { ElkGraphPackage, isInstance, registerImpl } from './ElkGraphPackage.js';

/**
 * Java's values, evaluated from the defining expressions in `ElkGraphPackage.java` (lines 79-1038).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java
 */
const JAVA_VALUES: Record<string, number> = {
  IPROPERTY_HOLDER: 0,
  IPROPERTY_HOLDER_FEATURE_COUNT: 0,
  EMAP_PROPERTY_HOLDER: 1,
  EMAP_PROPERTY_HOLDER__PROPERTIES: 0,
  EMAP_PROPERTY_HOLDER_FEATURE_COUNT: 1,
  ELK_GRAPH_ELEMENT: 2,
  ELK_GRAPH_ELEMENT__PROPERTIES: 0,
  ELK_GRAPH_ELEMENT__LABELS: 1,
  ELK_GRAPH_ELEMENT__IDENTIFIER: 2,
  ELK_GRAPH_ELEMENT_FEATURE_COUNT: 3,
  ELK_SHAPE: 3,
  ELK_SHAPE__PROPERTIES: 0,
  ELK_SHAPE__LABELS: 1,
  ELK_SHAPE__IDENTIFIER: 2,
  ELK_SHAPE__HEIGHT: 3,
  ELK_SHAPE__WIDTH: 4,
  ELK_SHAPE__X: 5,
  ELK_SHAPE__Y: 6,
  ELK_SHAPE_FEATURE_COUNT: 7,
  ELK_LABEL: 4,
  ELK_LABEL__PROPERTIES: 0,
  ELK_LABEL__LABELS: 1,
  ELK_LABEL__IDENTIFIER: 2,
  ELK_LABEL__HEIGHT: 3,
  ELK_LABEL__WIDTH: 4,
  ELK_LABEL__X: 5,
  ELK_LABEL__Y: 6,
  ELK_LABEL__PARENT: 7,
  ELK_LABEL__TEXT: 8,
  ELK_LABEL_FEATURE_COUNT: 9,
  ELK_CONNECTABLE_SHAPE: 5,
  ELK_CONNECTABLE_SHAPE__PROPERTIES: 0,
  ELK_CONNECTABLE_SHAPE__LABELS: 1,
  ELK_CONNECTABLE_SHAPE__IDENTIFIER: 2,
  ELK_CONNECTABLE_SHAPE__HEIGHT: 3,
  ELK_CONNECTABLE_SHAPE__WIDTH: 4,
  ELK_CONNECTABLE_SHAPE__X: 5,
  ELK_CONNECTABLE_SHAPE__Y: 6,
  ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES: 7,
  ELK_CONNECTABLE_SHAPE__INCOMING_EDGES: 8,
  ELK_CONNECTABLE_SHAPE_FEATURE_COUNT: 9,
  ELK_NODE: 6,
  ELK_NODE__PROPERTIES: 0,
  ELK_NODE__LABELS: 1,
  ELK_NODE__IDENTIFIER: 2,
  ELK_NODE__HEIGHT: 3,
  ELK_NODE__WIDTH: 4,
  ELK_NODE__X: 5,
  ELK_NODE__Y: 6,
  ELK_NODE__OUTGOING_EDGES: 7,
  ELK_NODE__INCOMING_EDGES: 8,
  ELK_NODE__PORTS: 9,
  ELK_NODE__CHILDREN: 10,
  ELK_NODE__PARENT: 11,
  ELK_NODE__CONTAINED_EDGES: 12,
  ELK_NODE__HIERARCHICAL: 13,
  ELK_NODE_FEATURE_COUNT: 14,
  ELK_PORT: 7,
  ELK_PORT__PROPERTIES: 0,
  ELK_PORT__LABELS: 1,
  ELK_PORT__IDENTIFIER: 2,
  ELK_PORT__HEIGHT: 3,
  ELK_PORT__WIDTH: 4,
  ELK_PORT__X: 5,
  ELK_PORT__Y: 6,
  ELK_PORT__OUTGOING_EDGES: 7,
  ELK_PORT__INCOMING_EDGES: 8,
  ELK_PORT__PARENT: 9,
  ELK_PORT_FEATURE_COUNT: 10,
  ELK_EDGE: 8,
  ELK_EDGE__PROPERTIES: 0,
  ELK_EDGE__LABELS: 1,
  ELK_EDGE__IDENTIFIER: 2,
  ELK_EDGE__CONTAINING_NODE: 3,
  ELK_EDGE__SOURCES: 4,
  ELK_EDGE__TARGETS: 5,
  ELK_EDGE__SECTIONS: 6,
  ELK_EDGE__HYPEREDGE: 7,
  ELK_EDGE__HIERARCHICAL: 8,
  ELK_EDGE__SELFLOOP: 9,
  ELK_EDGE__CONNECTED: 10,
  ELK_EDGE_FEATURE_COUNT: 11,
  ELK_BEND_POINT: 9,
  ELK_BEND_POINT__X: 0,
  ELK_BEND_POINT__Y: 1,
  ELK_BEND_POINT_FEATURE_COUNT: 2,
  ELK_EDGE_SECTION: 10,
  ELK_EDGE_SECTION__PROPERTIES: 0,
  ELK_EDGE_SECTION__START_X: 1,
  ELK_EDGE_SECTION__START_Y: 2,
  ELK_EDGE_SECTION__END_X: 3,
  ELK_EDGE_SECTION__END_Y: 4,
  ELK_EDGE_SECTION__BEND_POINTS: 5,
  ELK_EDGE_SECTION__PARENT: 6,
  ELK_EDGE_SECTION__OUTGOING_SHAPE: 7,
  ELK_EDGE_SECTION__INCOMING_SHAPE: 8,
  ELK_EDGE_SECTION__OUTGOING_SECTIONS: 9,
  ELK_EDGE_SECTION__INCOMING_SECTIONS: 10,
  ELK_EDGE_SECTION__IDENTIFIER: 11,
  ELK_EDGE_SECTION_FEATURE_COUNT: 12,
  ELK_PROPERTY_TO_VALUE_MAP_ENTRY: 11,
  ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY: 0,
  ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE: 1,
  ELK_PROPERTY_TO_VALUE_MAP_ENTRY_FEATURE_COUNT: 2,
  IPROPERTY: 12,
  PROPERTY_VALUE: 13,
};

describe('ElkGraphPackage', () => {
  it('carries every int constant with the Java value', () => {
    const pkg = ElkGraphPackage as unknown as Record<string, unknown>;
    for (const [name, value] of Object.entries(JAVA_VALUES)) {
      expect([name, pkg[name]]).toEqual([name, value]);
    }
    expect(ElkGraphPackage.ELK_NODE__CHILDREN).toBe(10);
    expect(ElkGraphPackage.ELK_LABEL__PARENT).toBe(7);
  });

  it('carries the namespace strings', () => {
    expect(ElkGraphPackage.eNAME).toBe('graph');
    expect(ElkGraphPackage.eNS_URI).toBe('http://www.eclipse.org/elk/ElkGraph');
    expect(ElkGraphPackage.eNS_PREFIX).toBe('graph');
  });

  it('names the EClass literals as the ecore classifiers', () => {
    const names = Object.entries(ElkGraphPackage.Literals).map(([key, eClass]) => [key, eClass.getName()]);
    expect(names).toEqual([
      ['IPROPERTY_HOLDER', 'IPropertyHolder'],
      ['EMAP_PROPERTY_HOLDER', 'EMapPropertyHolder'],
      ['ELK_GRAPH_ELEMENT', 'ElkGraphElement'],
      ['ELK_SHAPE', 'ElkShape'],
      ['ELK_LABEL', 'ElkLabel'],
      ['ELK_CONNECTABLE_SHAPE', 'ElkConnectableShape'],
      ['ELK_NODE', 'ElkNode'],
      ['ELK_PORT', 'ElkPort'],
      ['ELK_EDGE', 'ElkEdge'],
      ['ELK_BEND_POINT', 'ElkBendPoint'],
      ['ELK_EDGE_SECTION', 'ElkEdgeSection'],
      ['ELK_PROPERTY_TO_VALUE_MAP_ENTRY', 'ElkPropertyToValueMapEntry'],
    ]);
  });
});

describe('isInstance / registerImpl', () => {
  abstract class Base {}
  class Sub extends Base {}
  class Other {}

  it('is false while nothing is registered for the name', () => {
    expect(isInstance('ElkGraphFactory', new Sub())).toBe(false);
  });

  it('is instanceof against the registered class, subclasses included', () => {
    registerImpl('ElkGraphFactory', Base);
    expect(isInstance('ElkGraphFactory', new Sub())).toBe(true);
    expect(isInstance('ElkGraphFactory', new Other())).toBe(false);
    expect(isInstance('ElkGraphFactory', {})).toBe(false);
    expect(isInstance('ElkGraphFactory', null)).toBe(false);
  });
});

describe('ElkGraphFactory.eINSTANCE', () => {
  it('throws until the impl module sets the instance, then returns it', () => {
    expect(() => ElkGraphFactory.eINSTANCE).toThrow(
      new IllegalStateException('ElkGraphFactory.eINSTANCE is not set: load ElkGraphFactoryImpl first'),
    );
    expect(() => ElkGraphFactory.eINSTANCE).toThrow(IllegalStateException);
    const factory = { getElkGraphPackage: () => ElkGraphPackage } as unknown as ElkGraphFactory;
    setElkGraphFactoryInstance(factory);
    expect(ElkGraphFactory.eINSTANCE).toBe(factory);
    expect(ElkGraphFactory.eINSTANCE.getElkGraphPackage().ELK_NODE__CHILDREN).toBe(10);
  });

  it('isElkGraphFactory is instanceof the registered factory class', () => {
    class FactoryImpl {}
    expect(isElkGraphFactory(new FactoryImpl())).toBe(false);
    registerImpl('ElkGraphFactory', FactoryImpl);
    expect(isElkGraphFactory(new FactoryImpl())).toBe(true);
    expect(isElkGraphFactory({})).toBe(false);
  });
});
