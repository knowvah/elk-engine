// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EObjectContainmentEList } from './EObjectContainmentEList.js';
import { EObjectEList } from './EObjectEList.js';

const POINTS = 0;
const PLAIN = 1;
const ITEM_CLASS: EClass = { getName: () => 'Item' };

/**
 * Owns `points` (opposite-less containment, like `bendPoints`) and `plain` (no inverse). The
 * element side records calls and otherwise leaves negative feature ids to the `BasicEObjectImpl`
 * base; only the container side's generated `case POINTS` (`basicRemove`) is spelled out.
 */
class Item extends BasicEObjectImpl {
  readonly points = new EObjectContainmentEList<Item>(this, POINTS);
  readonly plain = new EObjectEList<Item>(this, PLAIN);
  readonly calls: string[] = [];

  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return ITEM_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.points];
  }

  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    this.calls.push(`add ${featureID}`);
    super.eInverseAdd(otherEnd, featureID);
  }

  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    this.calls.push(`remove ${featureID}`);
    if (featureID === POINTS) {
      this.points.basicRemove(otherEnd as Item);
      return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Item has no container feature');
  }
}

function items(...ids: string[]): Item[] {
  return ids.map((id) => new Item(id));
}

describe('EObjectEList without an inverse', () => {
  it('is unique and never calls the element', () => {
    const [o, a, b, c] = items('o', 'a', 'b', 'c') as [Item, Item, Item, Item];
    expect(o.plain.add(a)).toBe(true);
    expect(o.plain.add(a)).toBe(false);
    o.plain.addAt(0, b);
    expect(o.plain.addAll([a, c])).toBe(true);
    expect(o.plain.toArray()).toEqual([b, a, c]);
    expect(o.plain.set(0, b)).toBe(b);
    expect(o.plain.removeAt(0)).toBe(b);
    o.plain.clear();
    expect(o.plain.size()).toBe(0);
    expect([a.calls, b.calls, c.calls]).toEqual([[], [], []]);
    expect(a.eContainer()).toBeNull();
  });

  it('adds and removes without the inverse through basicAdd and basicRemove', () => {
    const [o, a, b] = items('o', 'a', 'b') as [Item, Item, Item];
    o.points.basicAdd(a);
    o.points.basicRemove(b);
    expect(o.points.toArray()).toEqual([a]);
    o.points.basicRemove(a);
    expect(o.points.size()).toBe(0);
    expect(a.calls).toEqual([]);
  });

  it('rejects null', () => {
    const o = new Item('o');
    expect(() => o.plain.add(null as unknown as Item)).toThrow(
      new IllegalArgumentException("The 'no null' constraint is violated"),
    );
  });
});

describe('EObjectEList opposite-less arms (through EObjectContainmentEList)', () => {
  it('passes EOPPOSITE_FEATURE_BASE - featureID to the element, whose base sets the container', () => {
    const [o, p] = items('o', 'p') as [Item, Item];
    o.points.add(p);
    expect(p.calls).toEqual([`add ${EOPPOSITE_FEATURE_BASE - POINTS}`]);
    expect(p.eContainer()).toBe(o);
    expect(p.eContainerFeatureID()).toBe(-1);
    o.points.remove(p);
    expect(p.calls).toEqual(['add -1', 'remove -1']);
    expect(p.eContainer()).toBeNull();
  });

  it('removes the element from its old container through the container feature id', () => {
    const [o, q, p] = items('o', 'q', 'p') as [Item, Item, Item];
    o.points.add(p);
    q.points.add(p);
    expect(o.points.size()).toBe(0);
    expect(o.calls).toEqual(['remove 0']);
    expect(p.eContainer()).toBe(q);
  });

  it('answers contains from the container feature id beyond four elements', () => {
    const [o, q, a, b, c, d, e, f] = items('o', 'q', 'a', 'b', 'c', 'd', 'e', 'f') as Item[];
    (o as Item).points.addAll([a, b, c, d, e] as Item[]);
    (q as Item).points.add(f as Item);
    expect((o as Item).points.contains(c as Item)).toBe(true);
    expect((o as Item).points.contains(f as Item)).toBe(false);
    (f as Item).eBasicSetContainer(o as Item, -5);
    expect((o as Item).points.contains(f as Item)).toBe(false);
  });
});
