// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { Property } from '../../properties/Property.js';
import {
  ElkFeature,
  ElkGraphTransientValueService,
  ListTransient,
  ValueTransient,
} from './ElkGraphTransientValueService.js';

const service = new ElkGraphTransientValueService();

describe('ElkGraphTransientValueService.isValueTransient', () => {
  it('is PREFERABLY for an unset double and NO for a set one', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(service.isValueTransient(node, ElkFeature.X)).toBe(ValueTransient.PREFERABLY);
    node.setX(5);
    expect(service.isValueTransient(node, ElkFeature.X)).toBe(ValueTransient.NO);
  });

  it('treats -0.0 as unset and NaN as set, like the generated eIsSet (x != 0.0)', () => {
    const node = ElkGraphUtil.createNode(null);
    node.setWidth(-0);
    expect(service.isValueTransient(node, ElkFeature.WIDTH)).toBe(ValueTransient.PREFERABLY);
    node.setWidth(Number.NaN);
    expect(service.isValueTransient(node, ElkFeature.WIDTH)).toBe(ValueTransient.NO);
  });

  it('is YES for an unset string without serialisable default, NO once set', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(service.isValueTransient(node, ElkFeature.IDENTIFIER)).toBe(ValueTransient.YES);
    node.setIdentifier('n');
    expect(service.isValueTransient(node, ElkFeature.IDENTIFIER)).toBe(ValueTransient.NO);
  });

  it('has the empty string as the serialisable default of a label text', () => {
    const label = ElkGraphUtil.createLabel(null);
    expect(service.isValueTransient(label, ElkFeature.TEXT)).toBe(ValueTransient.PREFERABLY);
    label.setText('t');
    expect(service.isValueTransient(label, ElkFeature.TEXT)).toBe(ValueTransient.NO);
  });

  it('is YES for a reference that is null', () => {
    const section = ElkGraphUtil.createEdgeSection(null);
    expect(service.isValueTransient(section, ElkFeature.INCOMING_SHAPE)).toBe(ValueTransient.YES);
    section.setIncomingShape(ElkGraphUtil.createNode(null));
    expect(service.isValueTransient(section, ElkFeature.INCOMING_SHAPE)).toBe(ValueTransient.NO);
  });

  it('is PREFERABLY for an unset property key and value (EJavaObject attributes)', () => {
    const node = ElkGraphUtil.createNode(null);
    node.getProperties().put(new Property<unknown>('k'), null);
    const [entry] = [...node.getProperties().entryList()];
    expect(service.isValueTransient(entry!, ElkFeature.KEY)).toBe(ValueTransient.NO);
    expect(service.isValueTransient(entry!, ElkFeature.VALUE)).toBe(ValueTransient.PREFERABLY);
  });
});

describe('ElkGraphTransientValueService.isListTransient', () => {
  it('is YES for an empty list and NO for a populated one', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(service.isListTransient(node, ElkFeature.CHILDREN)).toBe(ListTransient.YES);
    ElkGraphUtil.createNode(node);
    expect(service.isListTransient(node, ElkFeature.CHILDREN)).toBe(ListTransient.NO);
  });

  it('is always YES for incomingEdges, outgoingEdges and incomingSections, even when populated', () => {
    const root = ElkGraphUtil.createGraph();
    const [a, b] = [ElkGraphUtil.createNode(root), ElkGraphUtil.createNode(root)];
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    expect(a.getOutgoingEdges().size()).toBe(1);
    expect(service.isListTransient(a, ElkFeature.OUTGOING_EDGES)).toBe(ListTransient.YES);
    expect(service.isListTransient(b, ElkFeature.INCOMING_EDGES)).toBe(ListTransient.YES);
    const [first, second] = [ElkGraphUtil.createEdgeSection(edge), ElkGraphUtil.createEdgeSection(edge)];
    first.getOutgoingSections().add(second);
    expect(second.getIncomingSections().size()).toBe(1);
    expect(service.isListTransient(second, ElkFeature.INCOMING_SECTIONS)).toBe(ListTransient.YES);
  });

  it('never marks an element of a list transient', () => {
    expect(service.isValueInListTransient(ElkGraphUtil.createNode(null), 0, ElkFeature.CHILDREN)).toBe(false);
  });
});
