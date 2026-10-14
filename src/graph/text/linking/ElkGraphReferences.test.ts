// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import '../../impl/ElkGraphFactoryImpl.js';
import {
  ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
  ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
  ELK_EDGE__SOURCES,
  ELK_EDGE__TARGETS,
  ELK_EDGE_SECTION__INCOMING_SECTIONS,
  ELK_EDGE_SECTION__INCOMING_SHAPE,
  ELK_EDGE_SECTION__OUTGOING_SECTIONS,
  ELK_EDGE_SECTION__OUTGOING_SHAPE,
  ElkGraphReferences,
} from './ElkGraphReferences.js';

const factory = ElkGraphFactory.eINSTANCE;
const references = new ElkGraphReferences();

describe('ElkGraphReferences', () => {
  it('lists the non-containment references of each class', () => {
    expect(references.getEAllReferences(factory.createElkNode())).toEqual([
      ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
      ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
    ]);
    expect(references.getEAllReferences(factory.createElkPort())).toHaveLength(2);
    expect(references.getEAllReferences(factory.createElkEdge())).toEqual([ELK_EDGE__SOURCES, ELK_EDGE__TARGETS]);
    expect(references.getEAllReferences(factory.createElkEdgeSection())).toEqual([
      ELK_EDGE_SECTION__OUTGOING_SHAPE,
      ELK_EDGE_SECTION__INCOMING_SHAPE,
      ELK_EDGE_SECTION__OUTGOING_SECTIONS,
      ELK_EDGE_SECTION__INCOMING_SECTIONS,
    ]);
    expect(references.getEAllReferences(factory.createElkLabel())).toEqual([]);
  });

  it('finds a reference by feature name on the classes that have it only', () => {
    expect(references.getReference(factory.createElkEdge(), 'sources')).toBe(ELK_EDGE__SOURCES);
    expect(references.getReference(factory.createElkEdgeSection(), 'incomingShape')).toBe(
      ELK_EDGE_SECTION__INCOMING_SHAPE,
    );
    expect(references.getReference(factory.createElkEdge(), 'incomingShape')).toBeNull();
  });

  it('types references for the scope filter', () => {
    const shapeType = ELK_EDGE__SOURCES.referenceType;
    expect(['ElkConnectableShape', 'ElkNode', 'ElkPort'].every((n) => shapeType.isAssignableFrom(n))).toBe(true);
    expect(['ElkEdge', 'ElkLabel', 'ElkEdgeSection'].some((n) => shapeType.isAssignableFrom(n))).toBe(false);
    expect(shapeType.name).toBe('ElkConnectableShape');
    expect(ELK_EDGE_SECTION__OUTGOING_SECTIONS.referenceType.isAssignableFrom('ElkEdgeSection')).toBe(true);
  });

  it('sets a single reference and unsets it again', () => {
    const section = factory.createElkEdgeSection();
    const node = factory.createElkNode();
    references.eSet(section, ELK_EDGE_SECTION__INCOMING_SHAPE, node);
    expect(section.getIncomingShape()).toBe(node);
    references.eUnset(section, ELK_EDGE_SECTION__INCOMING_SHAPE);
    expect(section.getIncomingShape()).toBeNull();
  });

  it('adds to a list once and clears the inverse end with it', () => {
    const edge = factory.createElkEdge();
    const node = factory.createElkNode();
    expect(references.eGetList(edge, ELK_EDGE__SOURCES).addAll([node])).toBe(true);
    expect(references.eGetList(edge, ELK_EDGE__SOURCES).addAll([node])).toBe(false);
    expect([...node.getOutgoingEdges()]).toEqual([edge]);
    references.eUnset(edge, ELK_EDGE__SOURCES);
    expect(edge.getSources().size()).toBe(0);
    expect(node.getOutgoingEdges().size()).toBe(0);
  });

  it('rejects a reference of the wrong multiplicity', () => {
    const section = factory.createElkEdgeSection();
    expect(() => references.eSet(section, ELK_EDGE_SECTION__OUTGOING_SECTIONS, section)).toThrow(TypeError);
    expect(() => references.eGetList(section, ELK_EDGE_SECTION__OUTGOING_SHAPE)).toThrow(TypeError);
  });
});
