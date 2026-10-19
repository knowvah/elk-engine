// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';
import {
  ElkFeature,
  ElkGraphJsonTransientValueService,
  ListTransient,
  ValueTransient,
} from './ElkGraphJsonTransientValueService.js';

const service = new ElkGraphJsonTransientValueService();

describe('ElkGraphJsonTransientValueService.isValueTransient', () => {
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

  it('is YES for an unset string without serialisable default, NO once set, even when empty', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(service.isValueTransient(node, ElkFeature.IDENTIFIER)).toBe(ValueTransient.YES);
    node.setIdentifier('');
    expect(service.isValueTransient(node, ElkFeature.IDENTIFIER)).toBe(ValueTransient.NO);
  });

  it('has the empty string as the serialisable default of a label text and null as a set value', () => {
    const label = ElkGraphUtil.createLabel(null);
    expect(service.isValueTransient(label, ElkFeature.TEXT)).toBe(ValueTransient.PREFERABLY);
    label.setText('t');
    expect(service.isValueTransient(label, ElkFeature.TEXT)).toBe(ValueTransient.NO);
    label.setText(null);
    expect(service.isValueTransient(label, ElkFeature.TEXT)).toBe(ValueTransient.NO);
  });
});

describe('ElkGraphJsonTransientValueService.isListTransient', () => {
  it('is YES for an empty list and NO for a filled one', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(service.isListTransient(node, ElkFeature.CHILDREN)).toBe(ListTransient.YES);
    ElkGraphUtil.createNode(node);
    expect(service.isListTransient(node, ElkFeature.CHILDREN)).toBe(ListTransient.NO);
  });

  it('is YES for the opposite ends even when they hold values', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const edge = ElkGraphUtil.createEdge(root);
    edge.getSources().add(a);
    expect(a.getOutgoingEdges().size()).toBe(1);
    expect(service.isListTransient(a, ElkFeature.OUTGOING_EDGES)).toBe(ListTransient.YES);
    expect(service.isListTransient(a, ElkFeature.INCOMING_EDGES)).toBe(ListTransient.YES);
    expect(service.isListTransient(ElkGraphUtil.createEdgeSection(edge), ElkFeature.INCOMING_SECTIONS)).toBe(
      ListTransient.YES,
    );
    expect(service.isListTransient(edge, ElkFeature.SOURCES)).toBe(ListTransient.NO);
  });
});
