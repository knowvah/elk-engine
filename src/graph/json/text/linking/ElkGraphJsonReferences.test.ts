// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphFactory } from '../../../ElkGraphFactory.js';
import '../../../impl/ElkGraphFactoryImpl.js';
import {
  ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
  ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
  ELK_EDGE_SECTION__INCOMING_SECTIONS,
  ELK_EDGE_SECTION__INCOMING_SHAPE,
  ELK_EDGE_SECTION__OUTGOING_SECTIONS,
  ELK_EDGE_SECTION__OUTGOING_SHAPE,
  ELK_EDGE__SOURCES,
  ELK_EDGE__TARGETS,
  ElkGraphJsonReferences,
} from './ElkGraphJsonReferences.js';

const factory = ElkGraphFactory.eINSTANCE;
const references = new ElkGraphJsonReferences();

describe('ElkGraphJsonReferences', () => {
  it('lists the cross references of each class in feature order', () => {
    const names = (o: Parameters<typeof references.getEAllReferences>[0]): string[] =>
      references.getEAllReferences(o).map((r) => r.name);
    expect(names(factory.createElkNode())).toEqual(['outgoingEdges', 'incomingEdges']);
    expect(names(factory.createElkPort())).toEqual(['outgoingEdges', 'incomingEdges']);
    expect(names(factory.createElkEdge())).toEqual(['sources', 'targets']);
    expect(names(factory.createElkEdgeSection())).toEqual([
      'outgoingShape',
      'incomingShape',
      'outgoingSections',
      'incomingSections',
    ]);
    expect(names(factory.createElkLabel())).toEqual([]);
    expect(references.getCrossReferences(factory.createElkEdge())).toEqual([ELK_EDGE__SOURCES, ELK_EDGE__TARGETS]);
  });

  it('finds a reference by name or none', () => {
    const edge = factory.createElkEdge();
    expect(references.getReference(edge, 'targets')).toBe(ELK_EDGE__TARGETS);
    expect(references.getReference(edge, 'outgoingEdges')).toBeNull();
  });

  it('resolves proxies for every reference', () => {
    expect(references.isResolveProxies(ELK_EDGE__SOURCES)).toBe(true);
  });

  it('names the containing class of each reference and rejects a foreign one', () => {
    const classes = [
      [ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES, 'ElkConnectableShape'],
      [ELK_CONNECTABLE_SHAPE__INCOMING_EDGES, 'ElkConnectableShape'],
      [ELK_EDGE__SOURCES, 'ElkEdge'],
      [ELK_EDGE__TARGETS, 'ElkEdge'],
      [ELK_EDGE_SECTION__OUTGOING_SHAPE, 'ElkEdgeSection'],
      [ELK_EDGE_SECTION__INCOMING_SHAPE, 'ElkEdgeSection'],
      [ELK_EDGE_SECTION__OUTGOING_SECTIONS, 'ElkEdgeSection'],
      [ELK_EDGE_SECTION__INCOMING_SECTIONS, 'ElkEdgeSection'],
    ] as const;
    expect(classes.map(([ref]) => references.getContainingClassName(ref))).toEqual(classes.map(([, name]) => name));
    expect(() => references.getContainingClassName({ ...ELK_EDGE__SOURCES })).toThrow(TypeError);
  });

  it('adds with addUnique (no duplicate check, inverse set) and clears a list with its inverse ends', () => {
    const edge = factory.createElkEdge();
    const node = factory.createElkNode();
    references.addUnique(edge, ELK_EDGE__SOURCES, node);
    references.addUnique(edge, ELK_EDGE__SOURCES, node);
    expect(edge.getSources().size()).toBe(2);
    expect(node.getOutgoingEdges().size()).toBe(2);
    references.eUnset(edge, ELK_EDGE__SOURCES);
    expect(edge.getSources().size()).toBe(0);
    expect(node.getOutgoingEdges().size()).toBe(0);
  });

  it('adds many values through eGetList and reads a list through getList', () => {
    const edge = factory.createElkEdge();
    const [a, b] = [factory.createElkNode(), factory.createElkPort()];
    references.eGetList(edge, ELK_EDGE__TARGETS).addAll([a, b]);
    const list = references.getList(edge, ELK_EDGE__TARGETS);
    expect([list.size(), list.basicGet(0), list.basicGet(1)]).toEqual([2, a, b]);
  });

  it('sets, reads and unsets a single-valued section reference', () => {
    const section = factory.createElkEdgeSection();
    const node = factory.createElkNode();
    references.eSet(section, ELK_EDGE_SECTION__OUTGOING_SHAPE, node);
    expect(references.getOne(section, ELK_EDGE_SECTION__OUTGOING_SHAPE)).toBe(node);
    references.setOne(section, ELK_EDGE_SECTION__INCOMING_SHAPE, node);
    expect(section.getIncomingShape()).toBe(node);
    references.eUnset(section, ELK_EDGE_SECTION__OUTGOING_SHAPE);
    references.eUnset(section, ELK_EDGE_SECTION__INCOMING_SHAPE);
    expect([section.getOutgoingShape(), section.getIncomingShape()]).toEqual([null, null]);
  });

  it('refuses a reference of the wrong multiplicity', () => {
    const edge = factory.createElkEdge();
    expect(() => references.eSet(edge, ELK_EDGE__SOURCES, factory.createElkNode())).toThrow(TypeError);
    expect(() => references.getOne(edge, ELK_EDGE__SOURCES)).toThrow(TypeError);
    expect(() => references.getList(edge, ELK_EDGE_SECTION__OUTGOING_SHAPE)).toThrow(TypeError);
  });

  it('leaves the metamodel reads that ElkGraphJsonLazyLinker never makes unimplemented', () => {
    expect(() => references.getReferenceType(ELK_EDGE__SOURCES, factory.createElkEdge())).toThrow(/not consulted/);
    expect(() => references.getMetamodelPackages()).toThrow(/not consulted/);
    expect(() => references.getRegistry()).toThrow(/not consulted/);
  });
});
