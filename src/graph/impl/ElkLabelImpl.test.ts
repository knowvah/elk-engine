// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { isElkConnectableShape } from '../ElkConnectableShape.js';
import { isElkEdge } from '../ElkEdge.js';
import { isElkEdgeSection } from '../ElkEdgeSection.js';
import { isElkGraphElement } from '../ElkGraphElement.js';
import { ElkGraphPackage } from '../ElkGraphPackage.js';
import { isElkLabel } from '../ElkLabel.js';
import { isElkNode } from '../ElkNode.js';
import { isElkPort } from '../ElkPort.js';
import { isElkShape } from '../ElkShape.js';
import { ElkGraphElementImpl } from './ElkGraphElementImpl.js';
import { ElkLabelImpl } from './ElkLabelImpl.js';

/** A concrete graph element to hang labels on. */
class TestElement extends ElkGraphElementImpl {}

/** `ElkGraphUtil.createLabel(text, parent)`: a new label, parent set through the setter. */
function createLabel(text: string, parent: ElkGraphElementImpl | null): ElkLabelImpl {
  const label = new ElkLabelImpl();
  if (parent !== null) {
    label.setParent(parent);
  }
  label.setText(text);
  return label;
}

describe('ElkLabelImpl', () => {
  it('defaults to empty text, null identifier, zero geometry and no parent', () => {
    const label = new ElkLabelImpl();
    expect(label.getText()).toBe('');
    expect(label.getIdentifier()).toBeNull();
    expect([label.getX(), label.getY(), label.getWidth(), label.getHeight()]).toEqual([0, 0, 0, 0]);
    expect(label.getParent()).toBeNull();
  });

  it('reports the ElkLabel EClass', () => {
    expect(new ElkLabelImpl().eClass().getName()).toBe('ElkLabel');
  });

  it('passes its guards and no guard of an unregistered impl', () => {
    const label = new ElkLabelImpl();
    expect(isElkLabel(label)).toBe(true);
    expect(isElkShape(label)).toBe(true);
    expect(isElkGraphElement(label)).toBe(true);
    expect(isElkLabel({})).toBe(false);
    expect(isElkLabel(null)).toBe(false);
    expect(isElkNode(label)).toBe(false);
    expect(isElkPort(label)).toBe(false);
    expect(isElkEdge(label)).toBe(false);
    expect(isElkEdgeSection(label)).toBe(false);
    expect(isElkConnectableShape(label)).toBe(false);
  });

  it('setParent adds the label to the element and makes it the container', () => {
    const element = new TestElement();
    const label = createLabel('a', element);
    expect(element.getLabels().toArray()).toEqual([label]);
    expect(label.getParent()).toBe(element);
    expect(label.eContainer()).toBe(element);
    expect(label.eContainerFeatureID()).toBe(ElkGraphPackage.ELK_LABEL__PARENT);
  });

  it('setParent to the same parent changes nothing', () => {
    const element = new TestElement();
    const label = createLabel('a', element);
    const other = createLabel('b', element);
    label.setParent(element);
    expect(element.getLabels().toArray()).toEqual([label, other]);
  });

  it('setParent moves the label between elements', () => {
    const first = new TestElement();
    const second = new TestElement();
    const label = createLabel('a', first);
    label.setParent(second);
    expect(first.getLabels().size()).toBe(0);
    expect(second.getLabels().toArray()).toEqual([label]);
    expect(label.eContainer()).toBe(second);
  });

  it('setParent(null) detaches the label', () => {
    const element = new TestElement();
    const label = createLabel('a', element);
    label.setParent(null);
    expect(element.getLabels().size()).toBe(0);
    expect(label.getParent()).toBeNull();
    expect(label.eContainer()).toBeNull();
    label.setParent(null);
    expect(label.eContainer()).toBeNull();
  });

  it('setParent(null) on an uncontained label takes the no-change arm', () => {
    const label = new ElkLabelImpl();
    label.setParent(null);
    expect(label.eContainer()).toBeNull();
    // null == eInternalContainer() and newParent == null: basicSetParent is never called
    expect(label.eContainerFeatureID()).toBe(0);
  });

  it('rejects recursive containment with the JVM message and changes nothing', () => {
    const element = new TestElement();
    const l1 = createLabel('a', element);
    const l2 = createLabel('b', l1);
    const l3 = createLabel('c', null);
    l1.getLabels().add(l3);
    const recursive = new IllegalArgumentException(
      'Recursive containment not allowed for ElkLabel "a" (0.0,0.0 | 0.0,0.0)',
    );
    expect(() => l1.setParent(l1)).toThrow(recursive);
    expect(() => l1.setParent(l2)).toThrow(IllegalArgumentException);
    expect(() => l3.setParent(l1)).not.toThrow();
    expect(element.getLabels().toArray()).toEqual([l1]);
    expect(l1.getLabels().toArray()).toEqual([l2, l3]);
    expect(l1.eContainer()).toBe(element);
  });

  it('a label held by a non-parent feature is re-parented, not reported as the parent', () => {
    const holder = new TestElement();
    const target = new TestElement();
    const label = new ElkLabelImpl();
    label.eInverseAdd(holder, -1 - ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES);
    expect(label.getParent()).toBeNull();
    label.setParent(holder);
    expect(label.getParent()).toBe(holder);
    expect(holder.getLabels().toArray()).toEqual([label]);
    label.setParent(target);
    expect(target.getLabels().toArray()).toEqual([label]);
  });

  it('eInverseAdd on parent leaves the old container first', () => {
    const first = new TestElement();
    const second = new TestElement();
    const label = createLabel('a', first);
    second.getLabels().add(label);
    expect(first.getLabels().size()).toBe(0);
    expect(label.getParent()).toBe(second);
  });

  it('eInverseRemove on parent clears the container; other ids reach the base', () => {
    const element = new TestElement();
    const label = createLabel('a', element);
    label.eInverseRemove(element, ElkGraphPackage.ELK_LABEL__PARENT);
    expect(label.eContainer()).toBeNull();
    expect(() => label.eInverseRemove(element, ElkGraphPackage.ELK_LABEL__TEXT)).toThrow(UnsupportedOperationException);
  });

  it('eBasicRemoveFromContainerFeature removes the label from the parent list only', () => {
    const element = new TestElement();
    const label = createLabel('a', element);
    label.eBasicRemoveFromContainerFeature();
    expect(element.getLabels().size()).toBe(0);
    expect(label.eContainer()).toBe(element);
    label.eBasicSetContainer(element, ElkGraphPackage.ELK_LABEL__TEXT);
    expect(() => label.eBasicRemoveFromContainerFeature()).toThrow(
      new UnsupportedOperationException('eBasicRemoveFromContainerFeature: no generated case for feature 8'),
    );
  });

  it('sets the text, including null', () => {
    const label = new ElkLabelImpl();
    label.setText('x');
    expect(label.getText()).toBe('x');
    label.setText(null);
    expect(label.getText()).toBeNull();
  });

  it('prints ElkLabel "text" (x,y | w,h) with Java doubles', () => {
    const label = new ElkLabelImpl();
    label.setText('x');
    label.setLocation(1, 2);
    label.setDimensions(3, 4);
    expect(label.toString()).toBe('ElkLabel "x" (1.0,2.0 | 3.0,4.0)');
    label.setText('');
    expect(label.toString()).toBe('ElkLabel (1.0,2.0 | 3.0,4.0)');
    label.setText(null);
    label.setLocation(1.5, 0.25);
    expect(label.toString()).toBe('ElkLabel (1.5,0.25 | 3.0,4.0)');
  });
});
