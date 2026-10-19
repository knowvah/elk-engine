// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { BasicIndexOutOfBoundsException } from '../../common/util/BasicIndexOutOfBoundsException.js';
import type { EList } from '../../common/util/EList.js';
import { URI } from '../../common/util/URI.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { ResourceImpl } from '../resource/impl/ResourceImpl.js';
import { ResourceSetImpl } from '../resource/impl/ResourceSetImpl.js';
import { EObjectWithInverseResolvingEList, ManyInverse } from './EObjectWithInverseResolvingEList.js';

const REFS = 0;
const BACKS = 1;
const DOC = 'file:/a.elkj';
const PEER_CLASS: EClass = { getName: () => 'Peer' };
const NO_DUPLICATES = "The 'no duplicates' constraint is violated";

/** `refs` (resolving, many-to-many) ↔ `backs`, like `ElkEdge.sources` ↔ `ElkConnectableShape.outgoingEdges`. */
class Peer extends BasicEObjectImpl {
  readonly refs = new ManyInverse<Peer>(this, REFS, BACKS);
  readonly plainRefs = new EObjectWithInverseResolvingEList<Peer>(this, REFS, BACKS);
  readonly backs = new ManyInverse<Peer>(this, BACKS, REFS);

  constructor(readonly id: string) {
    super();
  }

  eClass(): EClass {
    return PEER_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    (featureID === REFS ? this.refs : this.backs).basicAdd(otherEnd as Peer);
  }

  eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    (featureID === REFS ? this.refs : this.backs).basicRemove(otherEnd as Peer);
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Peer is never contained');
  }
}

/** The resource holds `owner` (`/0`) and `target` (`/1`); `/9` names nothing. */
function world(): { owner: Peer; target: Peer; second: Peer } {
  const [owner, target, second] = [new Peer('owner'), new Peer('target'), new Peer('second')];
  const resource = new ResourceImpl(URI.createURI(DOC));
  resource.getContents().addAll([owner, target, second]);
  new ResourceSetImpl().getResources().add(resource);
  return { owner, target, second };
}

function proxyTo(fragment: string): Peer {
  const proxy = new Peer(`proxy${fragment}`);
  proxy.eSetProxyURI(URI.createURI(`${DOC}#${fragment}`));
  return proxy;
}

function ids(list: readonly Peer[]): string[] {
  return list.map((p) => p.id);
}

describe('resolution in get', () => {
  it('returns the target of a resolvable proxy and stores it in the slot', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    expect(owner.refs.get(0)).toBe(target);
    expect(owner.refs.basicGet(0)).toBe(target);
  });

  it('leaves the edge in the proxy inverse list and adds none to the target (EcoreEList.resolve)', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    expect(proxy.backs.toArray()).toEqual([owner]);
    owner.refs.get(0);
    expect(proxy.backs.toArray()).toEqual([owner]);
    expect(target.backs.size()).toBe(0);
  });

  it('returns the same proxy on every access of an unresolvable one', () => {
    const { owner } = world();
    const proxy = proxyTo('/9');
    owner.refs.addUnique(proxy);
    expect(owner.refs.get(0)).toBe(proxy);
    expect(owner.refs.get(0)).toBe(owner.refs.get(0));
    expect(owner.refs.basicGet(0)).toBe(proxy);
  });

  it('never resolves in basicGet', () => {
    const { owner } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    expect(owner.refs.basicGet(0)).toBe(proxy);
    expect(owner.refs.basicGet(0)).toBe(proxy);
  });

  it('range-checks basicGet like get', () => {
    const { owner } = world();
    expect(() => owner.refs.basicGet(0)).toThrow(new BasicIndexOutOfBoundsException(0, 0));
    owner.refs.addUnique(proxyTo('/1'));
    expect(() => owner.refs.basicGet(1)).toThrow(new BasicIndexOutOfBoundsException(1, 1));
  });

  it('leaves a resolved (non-proxy) element alone', () => {
    const { owner, target } = world();
    owner.refs.add(target);
    expect(owner.refs.get(0)).toBe(target);
  });

  it('resolves a plain EObjectWithInverseResolvingEList as well', () => {
    const { owner, target } = world();
    owner.plainRefs.addUnique(proxyTo('/1'));
    expect(owner.plainRefs.get(0)).toBe(target);
  });

  it('keeps duplicates of a repeated reference added with addUnique and resolves each slot', () => {
    const { owner, target } = world();
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.addUnique(proxyTo('/1'));
    expect([owner.refs.get(0), owner.refs.get(1)]).toEqual([target, target]);
    expect(owner.refs.size()).toBe(2);
  });
});

describe('resolution in iteration and toArray', () => {
  it('resolves through iterator, for-of and listIterator', () => {
    const { owner, target, second } = world();
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.addUnique(proxyTo('/2'));
    expect(ids([...owner.refs])).toEqual(['target', 'second']);
    expect(owner.refs.basicGet(0)).toBe(target);
    expect(owner.refs.basicGet(1)).toBe(second);
    const other = world();
    other.owner.refs.addUnique(proxyTo('/1'));
    expect(other.owner.refs.listIterator().next()).toBe(other.target);
  });

  it('toArray resolves every slot and returns the resolved elements', () => {
    const { owner, target, second } = world();
    const unresolvable = proxyTo('/9');
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.addUnique(unresolvable);
    owner.refs.addUnique(proxyTo('/2'));
    expect(owner.refs.toArray()).toEqual([target, unresolvable, second]);
    expect([owner.refs.basicGet(0), owner.refs.basicGet(2)]).toEqual([target, second]);
  });
});

describe('resolution in contains and indexOf', () => {
  it('finds a target through its proxy without replacing the slot', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    expect(owner.refs.contains(target)).toBe(true);
    expect(owner.refs.indexOf(target)).toBe(0);
    expect(owner.refs.basicGet(0)).toBe(proxy);
  });

  it('finds the proxy itself directly', () => {
    const { owner } = world();
    const proxy = proxyTo('/9');
    owner.refs.addUnique(proxy);
    expect(owner.refs.contains(proxy)).toBe(true);
    expect(owner.refs.indexOf(proxy)).toBe(0);
  });

  it('misses an element that no slot resolves to', () => {
    const { owner, second } = world();
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.addUnique(proxyTo('/9'));
    expect(owner.refs.contains(second)).toBe(false);
    expect(owner.refs.indexOf(second)).toBe(-1);
  });

  it('applies the no-duplicates check through the resolved element', () => {
    const { owner, target } = world();
    owner.refs.addUnique(proxyTo('/1'));
    expect(owner.refs.add(target)).toBe(false);
    expect(() => owner.refs.addAt(0, target)).toThrow(new IllegalArgumentException(NO_DUPLICATES));
  });
});

describe('setUnique (resolveLazyCrossReferences)', () => {
  it('moves the edge from the proxy to the target', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    expect(owner.refs.setUnique(0, target)).toBe(proxy);
    expect(proxy.backs.size()).toBe(0);
    expect(target.backs.toArray()).toEqual([owner]);
    expect(owner.refs.basicGet(0)).toBe(target);
  });

  it('adds a repeated reference to the target twice', () => {
    const { owner, target } = world();
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.addUnique(proxyTo('/1'));
    owner.refs.setUnique(0, target);
    owner.refs.setUnique(1, target);
    expect(target.backs.toArray()).toEqual([owner, owner]);
  });

  it('after an access-only resolution, setUnique of the same target removes the edge from the replaced slot only', () => {
    const { owner, target } = world();
    const proxy = proxyTo('/1');
    owner.refs.addUnique(proxy);
    owner.refs.get(0);
    expect(owner.refs.setUnique(0, target)).toBe(target);
    expect(proxy.backs.toArray()).toEqual([owner]);
    expect(target.backs.size()).toBe(0);
  });
});
