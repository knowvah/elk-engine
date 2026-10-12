// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import type { InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EObjectWithInverseEList, ManyInverse } from './EObjectWithInverseEList.js';

const REFS = 0;
const BACKS = 1;
const NO_DUPLICATES = "The 'no duplicates' constraint is violated";
const PEER_CLASS: EClass = { getName: () => 'Peer' };

/** One many-to-many inverse pair, `refs` ↔ `backs` (like `sources` ↔ `outgoingEdges`). */
class Peer extends BasicEObjectImpl {
  readonly refs = new ManyInverse<Peer>(this, REFS, BACKS);
  readonly backs = new EObjectWithInverseEList<Peer>(this, BACKS, REFS);

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
    this.listFor(featureID).basicAdd(otherEnd as Peer);
  }

  eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    this.listFor(featureID).basicRemove(otherEnd as Peer);
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Peer is never contained');
  }

  private listFor(featureID: number): EObjectWithInverseEList<Peer> {
    return featureID === REFS ? this.refs : this.backs;
  }
}

function peers(...ids: string[]): Peer[] {
  return ids.map((id) => new Peer(id));
}

function ids(list: EList<Peer>): string[] {
  return list.toArray().map((p) => p.id);
}

describe('EObjectWithInverseEList add', () => {
  it('adds the owner to the opposite list once', () => {
    const [a, b] = peers('a', 'b') as [Peer, Peer];
    expect(a.refs.add(b)).toBe(true);
    expect(ids(b.backs)).toEqual(['a']);
    expect(a.refs.add(b)).toBe(false);
    expect(b.backs.add(a)).toBe(false);
    expect(ids(b.backs)).toEqual(['a']);
    expect(ids(a.refs)).toEqual(['b']);
  });

  it('adds from either end', () => {
    const [a, b] = peers('a', 'b') as [Peer, Peer];
    expect(b.backs.add(a)).toBe(true);
    expect(ids(a.refs)).toEqual(['b']);
  });

  it('inserts at an index and adds all non-duplicates', () => {
    const [a, b, c, d] = peers('a', 'b', 'c', 'd') as [Peer, Peer, Peer, Peer];
    a.refs.add(b);
    a.refs.addAt(0, c);
    expect(a.refs.addAll([b, d, d])).toBe(true);
    expect(ids(a.refs)).toEqual(['c', 'b', 'd']);
    expect([b, c, d].map((p) => ids(p.backs))).toEqual([['a'], ['a'], ['a']]);
    expect(a.refs.addAll([])).toBe(false);
  });

  it('is unique with a linear scan beyond four elements', () => {
    const [a, b, c, d, e, f, g] = peers('a', 'b', 'c', 'd', 'e', 'f', 'g') as Peer[];
    (a as Peer).refs.addAll([b, c, d, e, f] as Peer[]);
    expect((a as Peer).refs.contains(f as Peer)).toBe(true);
    expect((a as Peer).refs.contains(g as Peer)).toBe(false);
    expect((a as Peer).refs.add(b as Peer)).toBe(false);
  });
});

describe('EObjectWithInverseEList remove, clear and set', () => {
  it('removes both ends, then adds again once', () => {
    const [a, b, c] = peers('a', 'b', 'c') as [Peer, Peer, Peer];
    a.refs.addAll([b, c]);
    expect(a.refs.remove(b)).toBe(true);
    expect(ids(b.backs)).toEqual([]);
    expect(a.refs.remove(b)).toBe(false);
    expect(a.refs.removeAt(0)).toBe(c);
    expect(ids(c.backs)).toEqual([]);
    expect(a.refs.add(b)).toBe(true);
    expect(a.refs.add(b)).toBe(false);
    expect(ids(b.backs)).toEqual(['a']);
  });

  it('clears every opposite', () => {
    const [a, b, c, d] = peers('a', 'b', 'c', 'd') as [Peer, Peer, Peer, Peer];
    a.refs.addAll([b, c]);
    d.refs.add(c);
    a.refs.clear();
    expect(ids(a.refs)).toEqual([]);
    expect(ids(b.backs)).toEqual([]);
    expect(ids(c.backs)).toEqual(['d']);
    c.backs.clear();
    expect(ids(d.refs)).toEqual([]);
  });

  it('replaces an element and moves the inverse with it', () => {
    const [e1, n1, n2, n3] = peers('e1', 'n1', 'n2', 'n3') as [Peer, Peer, Peer, Peer];
    e1.refs.addAll([n1, n2]);
    expect(() => e1.refs.set(0, n2)).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(e1.refs.set(0, n1)).toBe(n1);
    expect(ids(n1.backs)).toEqual(['e1']);
    expect(e1.refs.set(0, n3)).toBe(n1);
    expect(ids(e1.refs)).toEqual(['n3', 'n2']);
    expect(ids(n1.backs)).toEqual([]);
    expect(ids(n3.backs)).toEqual(['e1']);
  });

  it('keeps the inverse on move', () => {
    const [a, b, c] = peers('a', 'b', 'c') as [Peer, Peer, Peer];
    a.refs.addAll([b, c]);
    a.refs.moveElement(0, c);
    expect(ids(a.refs)).toEqual(['c', 'b']);
    expect([ids(b.backs), ids(c.backs)]).toEqual([['a'], ['a']]);
  });
});

describe('ManyInverse', () => {
  it('is an EObjectWithInverseEList', () => {
    expect(new Peer('a').refs).toBeInstanceOf(EObjectWithInverseEList);
  });
});
