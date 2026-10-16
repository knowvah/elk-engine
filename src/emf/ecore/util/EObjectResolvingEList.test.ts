// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../common/util/URI.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { ResourceImpl } from '../resource/impl/ResourceImpl.js';
import { ResourceSetImpl } from '../resource/impl/ResourceSetImpl.js';
import { EObjectContainmentEList } from './EObjectContainmentEList.js';
import { EObjectEList } from './EObjectEList.js';
import { EObjectResolvingEList } from './EObjectResolvingEList.js';

const DOC = 'file:/a.elkj';
const ITEM_CLASS: EClass = { getName: () => 'Item' };
const POINTS = 0;

/** Lists: `refs` (resolving, no opposite), `plain` (not resolving), `points` (a containment list that resolves). */
class Item extends BasicEObjectImpl {
  readonly refs = new EObjectResolvingEList<Item>(this, 0);
  readonly plain = new EObjectEList<Item>(this, 1);
  readonly points = new ResolvingContainment(this, POINTS);
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

/** No EMF list is both containment and resolving here; this exercises the containment arm of `resolve`. */
class ResolvingContainment extends EObjectContainmentEList<Item> {
  protected override hasProxies(): boolean {
    return true;
  }
}

function world(): { owner: Item; target: Item; second: Item } {
  const [owner, target, second] = [new Item('owner'), new Item('target'), new Item('second')];
  const resource = new ResourceImpl(URI.createURI(DOC));
  resource.getContents().addAll([owner, target, second]);
  new ResourceSetImpl().getResources().add(resource);
  return { owner, target, second };
}

function proxyTo(fragment: string): Item {
  const proxy = new Item(`proxy${fragment}`);
  proxy.eSetProxyURI(URI.createURI(`${DOC}#${fragment}`));
  return proxy;
}

describe('EObjectResolvingEList', () => {
  it('replaces a resolvable proxy in place and returns the target', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.add(proxy);
    expect(owner.refs.get(0)).toBe(target);
    expect(owner.refs.basicGet(0)).toBe(target);
    expect(target.calls).toEqual([]);
    expect(proxy.calls).toEqual([]);
  });

  it('returns the same proxy twice when it does not resolve, and basicGet never resolves', () => {
    const { owner, target } = world();
    const lost = proxyTo('/9');
    const found = proxyTo('/1');
    owner.refs.add(lost);
    owner.refs.add(found);
    expect(owner.refs.get(0)).toBe(lost);
    expect(owner.refs.get(0)).toBe(lost);
    expect(owner.refs.basicGet(1)).toBe(found);
    expect(owner.refs.get(1)).toBe(target);
  });

  it('resolves during contains, indexOf and toArray', () => {
    const { owner, target, second } = world();
    owner.refs.addAll([proxyTo('/1'), proxyTo('/2')]);
    expect([owner.refs.contains(second), owner.refs.indexOf(second)]).toEqual([true, 1]);
    expect(owner.refs.basicGet(1).eIsProxy()).toBe(true);
    expect(owner.refs.toArray()).toEqual([target, second]);
    expect(owner.refs.basicGet(1)).toBe(second);
  });
});

describe('EObjectEList without proxies', () => {
  it('does not resolve a proxy element anywhere', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.plain.add(proxy);
    expect(owner.plain.get(0)).toBe(proxy);
    expect(owner.plain.contains(target)).toBe(false);
    expect(owner.plain.indexOf(target)).toBe(-1);
    expect(owner.plain.toArray()).toEqual([proxy]);
  });
});

describe('resolution of a containment list', () => {
  it('removes the proxy and adds the target through the inverse when the target is uncontained', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.points.add(proxy);
    expect(owner.points.get(0)).toBe(target);
    expect(proxy.calls).toEqual([`add ${-1 - POINTS}`, `remove ${-1 - POINTS}`]);
    expect(target.calls).toEqual([`add ${-1 - POINTS}`]);
    expect(target.eContainer()).toBe(owner);
  });

  it('leaves the target where it is when it already has a container', () => {
    const { owner, target, second } = world();
    target.eBasicSetContainer(second, -1);
    owner.eResolveProxy = (): Item => target;
    owner.points.add(proxyTo('/1'));
    expect(owner.points.get(0)).toBe(target);
    expect(target.calls).toEqual([]);
    expect(target.eContainer()).toBe(second);
  });
});
