// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import { URI } from '../../common/util/URI.js';
import { ResourceImpl } from '../resource/impl/ResourceImpl.js';
import { ResourceSetImpl } from '../resource/impl/ResourceSetImpl.js';
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

  it('appends the proxy URI for a proxy (D5) and drops it when the proxy URI is cleared', () => {
    const node = new Node('n');
    node.eSetProxyURI(URI.createURI('file:/a.elkj#|0'));
    expect(node.toString()).toBe('org.eclipse.elk.graph.impl.ElkNodeImpl (eProxyURI: file:/a.elkj#|0)');
    node.eSetProxyURI(null);
    expect(node.toString()).toBe('org.eclipse.elk.graph.impl.ElkNodeImpl');
  });
});

describe('BasicEObjectImpl proxies', () => {
  const PROXY = URI.createURI('file:/a.elkj#|0');

  it('is not a proxy without a proxy URI', () => {
    const n = new Node('n');
    expect(n.eProxyURI()).toBeNull();
    expect(n.eIsProxy()).toBe(false);
  });

  it('becomes a proxy with eSetProxyURI and a resolved object again with null', () => {
    const n = new Node('n');
    n.eSetProxyURI(PROXY);
    expect(n.eProxyURI()).toBe(PROXY);
    expect(n.eIsProxy()).toBe(true);
    n.eSetProxyURI(null);
    expect(n.eProxyURI()).toBeNull();
    expect(n.eIsProxy()).toBe(false);
  });

  it('keeps the proxy URI and the direct resource independent', () => {
    const n = new Node('n');
    const resource = new ResourceImpl();
    resource.getContents().add(n);
    n.eSetProxyURI(PROXY);
    expect(n.eDirectResource()).toBe(resource);
    expect(n.eProxyURI()).toBe(PROXY);
  });

  it('eResolveProxy resolves through the resource set of this object', () => {
    const target = new Node('target');
    const owner = new Node('owner');
    const resource = new ResourceImpl(URI.createURI('file:/a.elkj'));
    resource.getContents().addAll([target, owner]);
    new ResourceSetImpl().getResources().add(resource);
    const proxy = new Node('proxy');
    proxy.eSetProxyURI(URI.createURI('file:/a.elkj#/0'));
    expect(owner.eResolveProxy(proxy)).toBe(target);
    const lost = new Node('lost');
    expect(lost.eResolveProxy(proxy)).toBe(proxy);
  });
});

describe('BasicEObjectImpl resources', () => {
  it('has no resource unless it or a container is a direct content', () => {
    const [g, n1] = [new Node('g'), new Node('n1')];
    g.children.add(n1);
    expect(n1.eDirectResource()).toBeNull();
    expect(n1.eResource()).toBeNull();
    expect(n1.eInternalResource()).toBeNull();
  });

  it('finds the resource of the root through any depth of containers', () => {
    const n = sampleGraph();
    const resource = new ResourceImpl();
    resource.getContents().add(n['g'] as Node);
    for (const id of ['g', 'lg', 'n1', 'ln1', 'lln1', 'n2', 'n3']) {
      expect((n[id] as Node).eResource()).toBe(resource);
    }
    expect((n['n2'] as Node).eDirectResource()).toBeNull();
    expect((n['g'] as Node).eDirectResource()).toBe(resource);
  });

  it('stops at a container cycle that has no resource', () => {
    const [a, b] = [new Node('a'), new Node('b')];
    a.children.add(b);
    b.children.add(a);
    expect(a.eResource()).toBeNull();
  });

  it('restarts the walk from the current container after 100000 steps in a cycle above the start', () => {
    const [x, a, b] = [new Node('x'), new Node('a'), new Node('b')];
    a.children.add(x);
    a.children.add(b);
    b.children.add(a);
    expect(x.eInternalContainer()).toBe(a);
    expect(x.eResource()).toBeNull();
  });

  it('eSetResource moves a root from its old resource and stores the new one', () => {
    const root = new Node('r');
    const [first, second] = [new ResourceImpl(), new ResourceImpl()];
    first.getContents().add(root);
    root.eSetResource(second);
    expect(first.getContents().size()).toBe(0);
    expect(root.eDirectResource()).toBe(second);
    root.eSetResource(null);
    expect(root.eDirectResource()).toBeNull();
  });

  it('eSetResource detaches a contained object from its container', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    g.children.add(n);
    const resource = new ResourceImpl();
    n.eSetResource(resource);
    expect(n.eInternalContainer()).toBeNull();
    expect(g.children.size()).toBe(0);
    expect(n.eDirectResource()).toBe(resource);
    expect(n.removedFrom).toEqual([PARENT]);
  });

  it('putting a root into a container removes it from the resource contents', () => {
    const [g, n] = [new Node('g'), new Node('n')];
    const resource = new ResourceImpl();
    resource.getContents().addAll([g, n]);
    g.children.add(n);
    expect(resource.getContents().toArray()).toEqual([g]);
    expect(n.eDirectResource()).toBeNull();
    expect(n.eResource()).toBe(resource);
    expect(n.eContainer()).toBe(g);
  });

  it('clearing the container of a resource root keeps it in the resource', () => {
    const n = new Node('n');
    const resource = new ResourceImpl();
    resource.getContents().add(n);
    n.eBasicSetContainer(null, PARENT);
    expect(n.eDirectResource()).toBe(resource);
    expect(resource.getContents().toArray()).toEqual([n]);
  });
});
