// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { EObjectContainmentWithInverseEList } from '../util/EObjectContainmentWithInverseEList.js';
import { BasicEObjectImpl } from './BasicEObjectImpl.js';

const TAGS = 0;
const CHILDREN = 1;
const PARENT = 2;
const TAG_OWNER = 3;
const NODE_CLASS: EClass = { getName: () => 'ElkNode' };

/** Containment features in declaration order: `tags` before `children` (like labels before children). */
class Node extends BasicEObjectImpl {
  readonly tags = new EObjectContainmentWithInverseEList<Node>(this, TAGS, TAG_OWNER);
  readonly children = new EObjectContainmentWithInverseEList<Node>(this, CHILDREN, PARENT);
  readonly removedFrom: number[] = [];

  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return NODE_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.tags, this.children];
  }

  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case TAGS:
      case CHILDREN:
        (featureID === TAGS ? this.tags : this.children).basicAdd(otherEnd as Node);
        return;
      case PARENT:
      case TAG_OWNER:
        if (this.eInternalContainer() !== null) {
          this.eBasicRemoveFromContainer();
        }
        this.eBasicSetContainer(otherEnd, featureID);
        return;
      default:
        super.eInverseAdd(otherEnd, featureID);
    }
  }

  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case TAGS:
      case CHILDREN:
        (featureID === TAGS ? this.tags : this.children).basicRemove(otherEnd as Node);
        return;
      case PARENT:
      case TAG_OWNER:
        this.eBasicSetContainer(null, featureID);
        return;
      default:
        super.eInverseRemove(otherEnd, featureID);
    }
  }

  eBasicRemoveFromContainerFeature(): void {
    this.removedFrom.push(this.eContainerFeatureID());
    const opposite = this.eContainerFeatureID() === PARENT ? CHILDREN : TAGS;
    (this.eInternalContainer() as InternalEObject).eInverseRemove(this, opposite);
  }
}

class Port extends Node {
  protected override javaClassName(): string {
    return 'org.eclipse.elk.graph.impl.ElkPortImpl';
  }
}

function ids(objects: Iterable<InternalEObject>): string[] {
  return [...objects].map((o) => (o as Node).id);
}

/** g{tags: lg; children: n1{tags: ln1{tags: lln1}; children: n2}, n3} */
function sampleGraph(): Record<string, Node> {
  const n = Object.fromEntries(['g', 'lg', 'n1', 'ln1', 'lln1', 'n2', 'n3'].map((id) => [id, new Node(id)]));
  const at = (id: string): Node => n[id] as Node;
  at('g').tags.add(at('lg'));
  at('g').children.addAll([at('n1'), at('n3')]);
  at('n1').children.add(at('n2'));
  at('n1').tags.add(at('ln1'));
  at('ln1').tags.add(at('lln1'));
  return n;
}

describe('BasicEObjectImpl container', () => {
  it('starts uncontained with feature id 0', () => {
    const n = new Node('n');
    expect(n.eContainer()).toBeNull();
    expect(n.eInternalContainer()).toBeNull();
    expect(n.eContainerFeatureID()).toBe(0);
  });

  it('sets container and feature id together', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    n.eBasicSetContainer(g, PARENT);
    expect(n.eContainer()).toBe(g);
    expect(n.eInternalContainer()).toBe(g);
    expect(n.eContainerFeatureID()).toBe(PARENT);
    n.eBasicSetContainer(null, PARENT);
    expect(n.eContainer()).toBeNull();
    expect(n.eContainerFeatureID()).toBe(PARENT);
  });

  it('removes from the container through eBasicRemoveFromContainerFeature for a feature id >= 0', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    g.children.add(n);
    n.eBasicRemoveFromContainer();
    expect(n.removedFrom).toEqual([PARENT]);
    expect(g.children.size()).toBe(0);
    expect(n.eContainer()).toBe(g);
  });
});

describe('BasicEObjectImpl inverse defaults (EMF 4-arg eInverseAdd/eInverseRemove)', () => {
  const OPPOSITE_LESS = EOPPOSITE_FEATURE_BASE - 7;

  it('takes a negative feature id as an opposite-less container', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    n.eInverseAdd(g, OPPOSITE_LESS);
    expect(n.eContainer()).toBe(g);
    expect(n.eContainerFeatureID()).toBe(OPPOSITE_LESS);
    n.eInverseRemove(g, OPPOSITE_LESS);
    expect(n.eContainer()).toBeNull();
    expect(n.eContainerFeatureID()).toBe(OPPOSITE_LESS);
  });

  it('leaves the old container first', () => {
    const [g, h, n] = [new Node('g'), new Node('h'), new Node('n')];
    g.children.add(n);
    n.eInverseAdd(h, OPPOSITE_LESS);
    expect(n.removedFrom).toEqual([PARENT]);
    expect(g.children.size()).toBe(0);
    expect(n.eContainer()).toBe(h);
  });

  it('rejects a feature id with no generated case (dynamic features are not ported)', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    expect(() => n.eInverseAdd(g, 9)).toThrow(
      new UnsupportedOperationException('eInverseAdd: no generated case for feature 9'),
    );
    expect(() => n.eInverseRemove(g, 9)).toThrow(
      new UnsupportedOperationException('eInverseRemove: no generated case for feature 9'),
    );
    expect(n.eContainer()).toBeNull();
  });
});

describe('BasicEObjectImpl contents', () => {
  it('lists direct contents in containment-feature declaration order', () => {
    const n = sampleGraph();
    expect(ids((n['g'] as Node).eContents())).toEqual(['lg', 'n1', 'n3']);
    expect(ids((n['n1'] as Node).eContents())).toEqual(['ln1', 'n2']);
    expect((n['n2'] as Node).eContents().size()).toBe(0);
  });

  it('walks all contents depth-first pre-order, excluding the root', () => {
    const n = sampleGraph();
    expect(ids((n['g'] as Node).eAllContents())).toEqual(['lg', 'n1', 'ln1', 'lln1', 'n2', 'n3']);
    expect(ids((n['n1'] as Node).eAllContents())).toEqual(['ln1', 'lln1', 'n2']);
    expect(ids((n['n3'] as Node).eAllContents())).toEqual([]);
  });

  it('walks a containment cycle forever (EMF has no guard)', () => {
    const [g, n1, n2] = [new Node('g'), new Node('n1'), new Node('n2')];
    g.children.add(n1);
    n1.children.add(n2);
    n2.children.add(g);
    const walk = g.eAllContents();
    const first = Array.from({ length: 7 }, () => (walk.next().value as Node).id);
    expect(first).toEqual(['n1', 'n2', 'g', 'n1', 'n2', 'g', 'n1']);
  });
});

describe('BasicEObjectImpl toString', () => {
  it('is the Java implementation class name derived from the EClass name, with no identity hash', () => {
    expect(new Node('n').toString()).toBe('org.eclipse.elk.graph.impl.ElkNodeImpl');
    expect(String(new Port('p'))).toBe('org.eclipse.elk.graph.impl.ElkPortImpl');
  });
});
