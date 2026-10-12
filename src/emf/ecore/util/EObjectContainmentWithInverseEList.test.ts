// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { BasicIndexOutOfBoundsException } from '../../common/util/BasicIndexOutOfBoundsException.js';
import { ECollections } from '../../common/util/ECollections.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EObjectContainmentWithInverseEList } from './EObjectContainmentWithInverseEList.js';
import { EObjectWithInverseEList } from './EObjectWithInverseEList.js';

// Feature ids of the fake class, in the style of a generated ElkGraphPackage.
const TAGS = 0;
const CHILDREN = 1;
const PARENT = 2;
const TAG_OWNER = 3;
const NO_DUPLICATES = "The 'no duplicates' constraint is violated";
const NODE_CLASS: EClass = { getName: () => 'Node' };

/** Two containment pairs: `tags` ↔ tag owner and `children` ↔ `parent`, like a generated impl. */
class Node extends BasicEObjectImpl {
  readonly tags = new EObjectContainmentWithInverseEList<Node>(this, TAGS, TAG_OWNER);
  readonly children = new EObjectContainmentWithInverseEList<Node>(this, CHILDREN, PARENT);

  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return NODE_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.tags, this.children];
  }

  eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    if (featureID === TAGS || featureID === CHILDREN) {
      this.listFor(featureID).basicAdd(otherEnd as Node);
      return;
    }
    if (this.eInternalContainer() !== null) {
      this.eBasicRemoveFromContainer();
    }
    this.eBasicSetContainer(otherEnd, featureID);
  }

  eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    if (featureID === TAGS || featureID === CHILDREN) {
      this.listFor(featureID).basicRemove(otherEnd as Node);
      return;
    }
    this.eBasicSetContainer(null, featureID);
  }

  eBasicRemoveFromContainerFeature(): void {
    const opposite = this.eContainerFeatureID() === PARENT ? CHILDREN : TAGS;
    (this.eInternalContainer() as InternalEObject).eInverseRemove(this, opposite);
  }

  private listFor(featureID: number): EObjectWithInverseEList<Node> {
    return featureID === TAGS ? this.tags : this.children;
  }
}

function nodes(...ids: string[]): Node[] {
  return ids.map((id) => new Node(id));
}

function ids(list: EList<Node>): string[] {
  return list.toArray().map((n) => n.id);
}

function thrown(f: () => unknown): Error {
  try {
    f();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}

describe('EObjectContainmentWithInverseEList add', () => {
  it('sets the container and the inverse feature id; a second add returns false', () => {
    const [g, n1] = nodes('g', 'n1') as [Node, Node];
    expect(g.children.add(n1)).toBe(true);
    expect(n1.eContainer()).toBe(g);
    expect(n1.eContainerFeatureID()).toBe(PARENT);
    expect(g.children.add(n1)).toBe(false);
    expect(ids(g.children)).toEqual(['n1']);
  });

  it('moves an element out of its previous container', () => {
    const [g, h, n1, n2] = nodes('g', 'h', 'n1', 'n2') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    expect(h.children.add(n1)).toBe(true);
    expect(ids(g.children)).toEqual(['n2']);
    expect(ids(h.children)).toEqual(['n1']);
    expect(n1.eContainer()).toBe(h);
  });

  it('moves an element between containment features and updates the feature id', () => {
    const [g, n1, t] = nodes('g', 'n1', 't') as [Node, Node, Node];
    n1.tags.add(t);
    expect(t.eContainerFeatureID()).toBe(TAG_OWNER);
    g.children.add(t);
    expect(ids(n1.tags)).toEqual([]);
    expect(t.eContainer()).toBe(g);
    expect(t.eContainerFeatureID()).toBe(PARENT);
  });

  it('has no recursion check: adding an ancestor or the owner itself builds a cycle', () => {
    const [g, n1, n2, n3] = nodes('g', 'n1', 'n2', 'n3') as [Node, Node, Node, Node];
    g.children.add(n1);
    n1.children.add(n2);
    n2.children.add(n3);
    expect(n2.children.add(n1)).toBe(true);
    expect(ids(g.children)).toEqual([]);
    expect(n1.eContainer()).toBe(n2);
    expect(ids(n2.children)).toEqual(['n3', 'n1']);
    expect(n1.children.add(n1)).toBe(true);
    expect(n1.eContainer()).toBe(n1);
    expect(ids(n2.children)).toEqual(['n3']);
    expect(ids(n1.children)).toEqual(['n2', 'n1']);
  });

  it('inserts at an index and moves the element out of its old container', () => {
    const [g, h, n1, n2, n3] = nodes('g', 'h', 'n1', 'n2', 'n3') as [Node, Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    h.children.add(n3);
    g.children.addAt(0, n3);
    expect(ids(g.children)).toEqual(['n3', 'n1', 'n2']);
    expect(ids(h.children)).toEqual([]);
    expect(n3.eContainer()).toBe(g);
  });

  it('changes nothing when addAt fails', () => {
    const [g, n1, n2, n3] = nodes('g', 'n1', 'n2', 'n3') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    expect(() => g.children.addAt(5, n3)).toThrow(new BasicIndexOutOfBoundsException(5, 2));
    const negative = thrown(() => g.children.addAt(-1, n3));
    expect(negative).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(negative.message).toBe('arraycopy: source index -1 out of bounds for object array[4]');
    expect(() => g.children.addAt(0, n1)).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(ids(g.children)).toEqual(['n1', 'n2']);
    expect(n3.eContainer()).toBeNull();
  });

  it('adds all non-duplicates and contains each of them', () => {
    const [g, h, n1, n2, n3] = nodes('g', 'h', 'n1', 'n2', 'n3') as [Node, Node, Node, Node, Node];
    g.children.add(n1);
    h.children.add(n2);
    expect(g.children.addAll([n1, n2, n3, n2])).toBe(true);
    expect(ids(g.children)).toEqual(['n1', 'n2', 'n3']);
    expect(ids(h.children)).toEqual([]);
    expect([n2.eContainer(), n3.eContainer()]).toEqual([g, g]);
    expect(g.children.addAll([n1])).toBe(false);
  });
});

describe('EObjectContainmentWithInverseEList remove and clear', () => {
  it('clears the container on remove and keeps the feature id', () => {
    const [g, n1, n2] = nodes('g', 'n1', 'n2') as [Node, Node, Node];
    g.children.addAll([n1, n2]);
    expect(g.children.remove(n1)).toBe(true);
    expect(n1.eContainer()).toBeNull();
    expect(n1.eContainerFeatureID()).toBe(PARENT);
    expect(g.children.remove(n1)).toBe(false);
    expect(g.children.removeAt(0)).toBe(n2);
    expect(n2.eContainer()).toBeNull();
    expect(g.children.isEmpty()).toBe(true);
  });

  it('clears every element container', () => {
    const [g, n1, n2, n4] = nodes('g', 'n1', 'n2', 'n4') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    n1.children.add(n4);
    g.children.clear();
    expect(g.children.size()).toBe(0);
    expect([n1.eContainer(), n2.eContainer()]).toEqual([null, null]);
    expect(n4.eContainer()).toBe(n1);
  });
});

describe('EObjectContainmentWithInverseEList set', () => {
  it('releases the old element and moves the new one in', () => {
    const [g, n1, n2, n3, n4] = nodes('g', 'n1', 'n2', 'n3', 'n4') as [Node, Node, Node, Node, Node];
    g.children.addAll([n1, n2, n3]);
    n3.children.add(n4);
    expect(g.children.set(1, n4)).toBe(n2);
    expect(ids(g.children)).toEqual(['n1', 'n4', 'n3']);
    expect(n2.eContainer()).toBeNull();
    expect(n4.eContainer()).toBe(g);
    expect(ids(n3.children)).toEqual([]);
  });

  it('rejects a duplicate at another index and allows the same element in place', () => {
    const [g, n1, n2] = nodes('g', 'n1', 'n2') as [Node, Node, Node];
    g.children.addAll([n1, n2]);
    expect(() => g.children.set(0, n2)).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(g.children.set(0, n1)).toBe(n1);
    expect(n1.eContainer()).toBe(g);
    expect(ids(g.children)).toEqual(['n1', 'n2']);
  });

  it('adds the inverse but removes none when setUnique writes past the size', () => {
    const [g, n1, n2, x] = nodes('g', 'n1', 'n2', 'x') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    expect(g.children.setUnique(3, x)).toBeNull();
    expect(x.eContainer()).toBe(g);
    expect(ids(g.children)).toEqual(['n1', 'n2']);
  });
});

describe('EObjectContainmentWithInverseEList contains', () => {
  it('answers from the container for more than four elements', () => {
    const [g, h, a, b, c, d, e, f, t] = nodes('g', 'h', 'a', 'b', 'c', 'd', 'e', 'f', 't');
    const list = (g as Node).children;
    list.addAll([a, b, c, d, e] as Node[]);
    (h as Node).children.add(f as Node);
    (g as Node).tags.add(t as Node);
    expect(list.contains(e as Node)).toBe(true);
    expect(list.contains(f as Node)).toBe(false);
    expect(list.contains(t as Node)).toBe(false);
    expect(list.add(e as Node)).toBe(false);
  });

  it('scans for four or fewer elements', () => {
    const [g, a, t] = nodes('g', 'a', 't') as [Node, Node, Node];
    g.children.add(a);
    g.tags.add(t);
    expect(g.children.contains(a)).toBe(true);
    expect(g.children.contains(t)).toBe(false);
  });
});

describe('EObjectContainmentWithInverseEList order', () => {
  it('moves without changing containers', () => {
    const [g, n1, n2, n3] = nodes('g', 'n1', 'n2', 'n3') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2, n3]);
    g.children.moveElement(2, n1);
    expect(ids(g.children)).toEqual(['n2', 'n3', 'n1']);
    expect(g.children.move(0, 2)).toBe(n1);
    expect([n1, n2, n3].map((n) => n.eContainer())).toEqual([g, g, g]);
  });

  it('is sorted by ECollections.sort without any element changing container', () => {
    const [g, n1, n2, n3, n4] = nodes('g', 'b', 'd', 'a', 'c') as [Node, Node, Node, Node, Node];
    g.children.addAll([n1, n2, n3, n4]);
    ECollections.sort(g.children, (p, q) => (p.id < q.id ? 1 : p.id > q.id ? -1 : 0));
    expect(ids(g.children)).toEqual(['d', 'c', 'b', 'a']);
    expect([n1, n2, n3, n4].map((n) => [n.eContainer(), n.eContainerFeatureID()])).toEqual([
      [g, PARENT],
      [g, PARENT],
      [g, PARENT],
      [g, PARENT],
    ]);
  });

  it('adds and removes through the list iterator', () => {
    const [g, n1, n2, n3] = nodes('g', 'n1', 'n2', 'n3') as [Node, Node, Node, Node];
    g.children.addAll([n1, n2]);
    const it = g.children.listIterator();
    it.next();
    it.remove();
    it.add(n3);
    expect(ids(g.children)).toEqual(['n3', 'n2']);
    expect(n1.eContainer()).toBeNull();
    expect(n3.eContainer()).toBe(g);
  });

  it('rejects null', () => {
    const g = new Node('g');
    expect(() => g.children.add(null as unknown as Node)).toThrow(
      new IllegalArgumentException("The 'no null' constraint is violated"),
    );
  });
});
