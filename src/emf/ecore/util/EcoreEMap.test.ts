// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { HashStrategy } from '../../../java/util/HashStrategy.js';
import type { EList } from '../../common/util/EList.js';
import type { EClass } from '../EClass.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import { BasicEObjectImpl } from '../impl/BasicEObjectImpl.js';
import { EcoreEMap, type BasicEMapEntry } from './EcoreEMap.js';

interface Key {
  readonly id: string;
}

/** Keys equal by id, like `IProperty` (`Property.equals` compares ids). */
const BY_ID: HashStrategy<Key> = {
  hash: (k) => k.id.length,
  equals: (a, b) => a.id === b.id,
};

const PROPERTIES = 0;
const ENTRY_FEATURE_ID = EOPPOSITE_FEATURE_BASE - PROPERTIES;
const ENTRY_CLASS: EClass = { getName: () => 'ElkPropertyToValueMapEntry' };
const HOLDER_CLASS: EClass = { getName: () => 'ElkNode' };

const key = (id: string): Key => ({ id });

/** A map entry `EObject` with no code for its container: the base handles the opposite-less id. */
class Entry extends BasicEObjectImpl implements BasicEMapEntry<Key, string> {
  constructor(
    private readonly key: Key,
    private value: string,
  ) {
    super();
  }

  getKey(): Key {
    return this.key;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): string {
    const oldValue = this.value;
    this.value = value;
    return oldValue;
  }

  eClass(): EClass {
    return ENTRY_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Entry has no container feature');
  }
}

/** A property holder whose only containment feature is `properties`. */
class Holder extends BasicEObjectImpl {
  readonly properties = new EcoreEMap<Key, string, Entry>(BY_ID, this, PROPERTIES, (k, v) => new Entry(k, v));

  eClass(): EClass {
    return HOLDER_CLASS;
  }

  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.properties.entryList()];
  }

  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    if (featureID === PROPERTIES) {
      this.properties.entryList().basicRemove(otherEnd as Entry);
      return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  eBasicRemoveFromContainerFeature(): void {
    throw new Error('Holder is never contained');
  }
}

function holderWith(...entries: Array<[string, string]>): Holder {
  const holder = new Holder();
  for (const [k, v] of entries) {
    holder.properties.put(key(k), v);
  }
  return holder;
}

function entryIds(map: EcoreEMap<Key, string, Entry>): Array<[string, string]> {
  return [...map.entries()].map(([k, v]) => [k.id, v]);
}

describe('EcoreEMap put and get', () => {
  it('starts empty', () => {
    const map = new Holder().properties;
    expect(map.size()).toBe(0);
    expect(map.isEmpty()).toBe(true);
    expect(map.get(key('a'))).toBeUndefined();
    expect(map.containsKey(key('a'))).toBe(false);
    expect(map.entryList().size()).toBe(0);
  });

  it('appends a contained entry per new key and looks keys up by equality', () => {
    const holder = holderWith(['a', 'v1'], ['b', 'v2'], ['c', 'v3']);
    const map = holder.properties;
    expect(entryIds(map)).toEqual([
      ['a', 'v1'],
      ['b', 'v2'],
      ['c', 'v3'],
    ]);
    expect(map.get(key('b'))).toBe('v2');
    expect(map.containsKey(key('c'))).toBe(true);
    expect(map.size()).toBe(3);
    expect(map.isEmpty()).toBe(false);
    const entry = map.entryList().get(1);
    expect(entry.eContainer()).toBe(holder);
    expect(entry.eContainerFeatureID()).toBe(ENTRY_FEATURE_ID);
  });

  it('replaces the value of an existing key in the same entry, keeping its position', () => {
    const map = holderWith(['a', 'v1'], ['b', 'v2'], ['c', 'v3']).properties;
    const b = map.entryList().get(1);
    expect(map.put(key('b'), 'v9')).toBe('v2');
    expect(map.put(key('a'), 'v8')).toBe('v1');
    expect(map.put(key('d'), 'v4')).toBeUndefined();
    expect(map.entryList().get(1)).toBe(b);
    expect(entryIds(map)).toEqual([
      ['a', 'v8'],
      ['b', 'v9'],
      ['c', 'v3'],
      ['d', 'v4'],
    ]);
  });
});

describe('EcoreEMap removeKey and clear', () => {
  it('releases the removed entry and appends a key put again', () => {
    const map = holderWith(['a', 'v1'], ['b', 'v2'], ['c', 'v3']).properties;
    const a = map.entryList().get(0);
    expect(map.removeKey(key('a'))).toBe('v1');
    expect(a.eContainer()).toBeNull();
    expect(map.containsKey(key('a'))).toBe(false);
    map.put(key('a'), 'v4');
    expect(entryIds(map)).toEqual([
      ['b', 'v2'],
      ['c', 'v3'],
      ['a', 'v4'],
    ]);
    expect(map.entryList().get(2)).not.toBe(a);
    expect(map.removeKey(key('z'))).toBeUndefined();
    expect(map.size()).toBe(3);
  });

  it('releases every entry on clear', () => {
    const map = holderWith(['a', 'v1'], ['b', 'v2']).properties;
    const entries = map.entryList().toArray();
    map.clear();
    expect(map.size()).toBe(0);
    expect(map.get(key('a'))).toBeUndefined();
    expect(entryIds(map)).toEqual([]);
    expect(entries.map((e) => e.eContainer())).toEqual([null, null]);
  });
});

describe('EcoreEMap entryList', () => {
  it('is the live delegate list, and edits through it update the map', () => {
    const holder = holderWith(['a', 'v1'], ['b', 'v2']);
    const map = holder.properties;
    const list = map.entryList();
    expect(map.entryList()).toBe(list);
    map.put(key('c'), 'v3');
    expect(list.size()).toBe(3);
    const a = list.removeAt(0);
    expect(map.containsKey(key('a'))).toBe(false);
    expect(a.eContainer()).toBeNull();
    list.addAt(0, new Entry(key('x'), 'vx'));
    expect(map.get(key('x'))).toBe('vx');
    expect(list.set(0, new Entry(key('y'), 'vy')).getValue()).toBe('vx');
    expect([map.containsKey(key('x')), map.get(key('y'))]).toEqual([false, 'vy']);
    list.move(2, 0);
    expect(entryIds(map)).toEqual([
      ['b', 'v2'],
      ['c', 'v3'],
      ['y', 'vy'],
    ]);
    expect(map.get(key('y'))).toBe('vy');
  });

  it('loses an entry that another holder takes', () => {
    const [first, second] = [holderWith(['a', 'v1']), new Holder()];
    const a = first.properties.entryList().get(0);
    second.properties.entryList().add(a);
    expect(first.properties.containsKey(key('a'))).toBe(false);
    expect(first.properties.size()).toBe(0);
    expect(second.properties.get(key('a'))).toBe('v1');
    expect(a.eContainer()).toBe(second);
  });

  it('looks up the first of two entries with equal keys, then the other once the first leaves', () => {
    const map = holderWith(['a', 'v1']).properties;
    const shadow = new Entry(key('a'), 'v2');
    map.entryList().add(shadow);
    expect(map.get(key('a'))).toBe('v1');
    map.entryList().removeAt(0);
    expect(map.get(key('a'))).toBe('v2');
    map.entryList().add(new Entry(key('a'), 'v3'));
    map.entryList().remove(map.entryList().get(1));
    expect(map.get(key('a'))).toBe('v2');
    map.entryList().set(0, shadow);
    expect(map.get(key('a'))).toBe('v2');
  });

  it('puts entries first in the holder contents', () => {
    const holder = holderWith(['a', 'v1'], ['b', 'v2']);
    expect([...holder.eAllContents()].map((e) => (e as Entry).getKey().id)).toEqual(['a', 'b']);
  });
});

describe('EcoreEMap views', () => {
  it('iterates entries and exposes a live read-only map view', () => {
    const map = holderWith(['a', 'v1']).properties;
    const view = map.map();
    expect([...map].map(([k, v]) => `${k.id}=${v}`)).toEqual(['a=v1']);
    map.put(key('b'), 'v2');
    expect(view.size()).toBe(2);
    expect(view.isEmpty()).toBe(false);
    expect(view.get(key('b'))).toBe('v2');
    expect(view.containsKey(key('a'))).toBe(true);
    expect([...view].map(([k, v]) => `${k.id}=${v}`)).toEqual(['a=v1', 'b=v2']);
  });
});
