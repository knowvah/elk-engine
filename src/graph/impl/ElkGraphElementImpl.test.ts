// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { isEMapPropertyHolder } from '../EMapPropertyHolder.js';
import { isElkGraphElement } from '../ElkGraphElement.js';
import { ElkGraphPackage } from '../ElkGraphPackage.js';
import { Property } from '../properties/Property.js';
import { ElkGraphElementImpl } from './ElkGraphElementImpl.js';
import { ElkLabelImpl } from './ElkLabelImpl.js';

/** The abstract class under test, made concrete. */
class TestElement extends ElkGraphElementImpl {}

const PROP = new Property<string>('test.prop');

/** A label with the given text, added to `parent`'s labels. */
function labelOn(parent: ElkGraphElementImpl, text: string): ElkLabelImpl {
  const label = new ElkLabelImpl();
  label.setText(text);
  parent.getLabels().add(label);
  return label;
}

describe('ElkGraphElementImpl', () => {
  it('defaults to a null identifier and no labels', () => {
    const element = new TestElement();
    expect(element.getIdentifier()).toBeNull();
    expect(element.getLabels().size()).toBe(0);
    expect(element.getLabels()).toBe(element.getLabels());
  });

  it('sets the identifier', () => {
    const element = new TestElement();
    element.setIdentifier('n1');
    expect(element.getIdentifier()).toBe('n1');
    element.setIdentifier(null);
    expect(element.getIdentifier()).toBeNull();
  });

  it('reports the ElkGraphElement EClass and passes the guards', () => {
    const element = new TestElement();
    expect(element.eClass().getName()).toBe('ElkGraphElement');
    expect(isElkGraphElement(element)).toBe(true);
    expect(isEMapPropertyHolder(element)).toBe(true);
    expect(isElkGraphElement({ getLabels: () => null })).toBe(false);
  });

  it('adding to the labels list sets the label parent', () => {
    const element = new TestElement();
    const label = labelOn(element, 'a');
    expect(element.getLabels().toArray()).toEqual([label]);
    expect(label.getParent()).toBe(element);
    expect(label.eContainer()).toBe(element);
    expect(label.eContainerFeatureID()).toBe(ElkGraphPackage.ELK_LABEL__PARENT);
  });

  it('removing from the labels list clears the label parent', () => {
    const element = new TestElement();
    const label = labelOn(element, 'a');
    element.getLabels().remove(label);
    expect(element.getLabels().size()).toBe(0);
    expect(label.getParent()).toBeNull();
    expect(label.eContainer()).toBeNull();
  });

  it('walks properties first, then labels depth-first', () => {
    const element = new TestElement();
    const l1 = labelOn(element, 'l1');
    const l1a = labelOn(l1, 'l1a');
    const l2 = labelOn(element, 'l2');
    const l2a = labelOn(l2, 'l2a');
    expect([...element.eAllContents()]).toEqual([l1, l1a, l2, l2a]);
    element.setProperty(PROP, 'v');
    const entry = element.getProperties().entryList().get(0);
    expect(entry.eContainer()).toBe(element);
    expect([...element.eAllContents()]).toEqual([entry, l1, l1a, l2, l2a]);
    expect(element.eContents().toArray()).toEqual([entry, l1, l2]);
  });

  it('eInverseAdd/eInverseRemove on labels touch only the list', () => {
    const element = new TestElement();
    const label = new ElkLabelImpl();
    element.eInverseAdd(label, ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS);
    expect(element.getLabels().toArray()).toEqual([label]);
    expect(label.eContainer()).toBeNull();
    element.eInverseRemove(label, ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS);
    expect(element.getLabels().size()).toBe(0);
  });

  it('passes other features to the superclass', () => {
    const element = new TestElement();
    const other = new TestElement();
    element.eInverseAdd(other, -4);
    expect(element.eContainer()).toBe(other);
    expect(element.eContainerFeatureID()).toBe(-4);
    expect(() => element.eInverseAdd(other, ElkGraphPackage.ELK_GRAPH_ELEMENT__IDENTIFIER)).toThrow(
      UnsupportedOperationException,
    );
    element.setProperty(PROP, 'v');
    const entry = element.getProperties().entryList().get(0);
    element.eInverseRemove(entry, ElkGraphPackage.ELK_GRAPH_ELEMENT__PROPERTIES);
    expect(element.hasProperty(PROP)).toBe(false);
  });

  it('prints the generated toString (D10: no identity hash)', () => {
    const element = new TestElement();
    expect(element.toString()).toBe('org.eclipse.elk.graph.impl.ElkGraphElementImpl (identifier: null)');
    element.setIdentifier('n1');
    expect(element.toString()).toBe('org.eclipse.elk.graph.impl.ElkGraphElementImpl (identifier: n1)');
  });
});
