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

/** Keys named `k<hash>`, hashing to that (possibly negative) number, so bucket positions can be derived by hand. */
const NUMBERED: HashStrategy<Key> = {
  hash: (k) => Number(k.id.slice(1)),
  equals: (a, b) => a.id === b.id,
};

class NumberedHolder extends Holder {
  override readonly properties = new EcoreEMap<Key, string, Entry>(
    NUMBERED,
    this,
    PROPERTIES,
    (k, v) => new Entry(k, v),
  );
}

const numbered = (...hashes: number[]): NumberedHolder => {
  const holder = new NumberedHolder();
  for (const h of hashes) {
    holder.properties.put(key(`k${h}`), `v${h}`);
  }
  return holder;
};

const viewIds = (map: EcoreEMap<Key, string, Entry>): string[] => [...map.map()].map(([k]) => k.id);

describe('EcoreEMap map() iterates the hash buckets (BasicEMap.entrySet)', () => {
  it('is empty for an empty map and keeps the list order for entries()', () => {
    const map = new NumberedHolder().properties;
    expect(viewIds(map)).toEqual([]);
    expect(entryIds(numbered(3, 1).properties).map(([k]) => k)).toEqual(['k3', 'k1']);
  });

  it('puts the first key at capacity 1, then grows to 2 * 1 + 4 = 6 and rehashes', () => {
    // put k3: capacity 1, bucket 0. put k1: grow(2) -> capacity 6, k3 -> bucket 3, k1 -> bucket 1.
    // put k2: grow(3) fits, bucket 2. Scan: 1, 2, 3 while the list stays 3, 1, 2.
    const map = numbered(3, 1, 2).properties;
    expect(viewIds(map)).toEqual(['k1', 'k2', 'k3']);
    expect(entryIds(map).map(([k]) => k)).toEqual(['k3', 'k1', 'k2']);
  });

  it('rehashes the old buckets in order into capacity 2 * 6 + 4 = 16 on the seventh key', () => {
    // Puts 20, 3, 17, 1, 33, 0 fill capacity 6: buckets 0:[0] 1:[1] 2:[20] 3:[3,33] 5:[17].
    // put 5: grow(7) -> capacity 16, rehash in old-bucket order: 0 -> 0; 1 -> 1; 20 -> 4;
    // 3 -> 3; 33 -> 1 (after 1); 17 -> 1 (after 33). Then 5 -> bucket 5.
    // Scan: b0 [0], b1 [1, 33, 17], b3 [3], b4 [20], b5 [5].
    const map = numbered(20, 3, 17, 1, 33, 0, 5).properties;
    expect(viewIds(map)).toEqual(['k0', 'k1', 'k33', 'k17', 'k3', 'k20', 'k5']);
  });

  it('masks negative hashes before taking the remainder', () => {
    // put k2: capacity 1. put k-1: grow(2) -> capacity 6; (-1 & 0x7FFFFFFF) % 6 = 2147483647 % 6 = 1,
    // k2 -> bucket 2. Scan: k-1, k2.
    expect(viewIds(numbered(2, -1).properties)).toEqual(['k-1', 'k2']);
  });

  it('builds the buckets at capacity 2 * size + 1 from entries added through the list', () => {
    // Three list adds with entryData still null: size 3. First map operation: capacity 7;
    // k9 -> 2, k2 -> 2, k7 -> 0. Scan: k7, then bucket 2 in list order k9, k2.
    const holder = new NumberedHolder();
    const list = holder.properties.entryList();
    for (const h of [9, 2, 7]) {
      list.add(new Entry(key(`k${h}`), `v${h}`));
    }
    const map = holder.properties;
    expect(map.get(key('k2'))).toBe('v2');
    expect(viewIds(map)).toEqual(['k7', 'k9', 'k2']);
    expect(entryIds(map).map(([k]) => k)).toEqual(['k9', 'k2', 'k7']);
  });

  it('answers containsKey from list-added entries and counts removals made before the buckets exist', () => {
    // List adds k5, k3, k4, then removing k5 with entryData null leaves size 2: capacity 5,
    // k3 -> 3, k4 -> 4. Scan: k3, k4.
    const holder = new NumberedHolder();
    const list = holder.properties.entryList();
    for (const h of [5, 3, 4]) {
      list.add(new Entry(key(`k${h}`), `v${h}`));
    }
    list.removeAt(0);
    expect(holder.properties.containsKey(key('k3'))).toBe(true);
    expect(holder.properties.containsKey(key('k5'))).toBe(false);
    expect(viewIds(holder.properties)).toEqual(['k3', 'k4']);
  });

  it('drops removed keys from their bucket and starts over at capacity 1 after a clear', () => {
    const map = numbered(4, 1, 2).properties;
    expect(map.removeKey(key('k1'))).toBe('v1');
    expect(viewIds(map)).toEqual(['k2', 'k4']);
    expect(map.removeKey(key('k9'))).toBeUndefined();
    map.clear();
    expect(viewIds(map)).toEqual([]);
    expect(map.containsKey(key('k4'))).toBe(false);
    // After the clear, put k8: capacity 1. put k7: grow(2) -> capacity 6, k8 -> 2, k7 -> 1.
    map.put(key('k8'), 'v8');
    map.put(key('k7'), 'v7');
    expect(viewIds(map)).toEqual(['k7', 'k8']);
  });

  it('keeps equal-key entries in list-entry order within a bucket and removes the entry itself', () => {
    const map = numbered(1).properties;
    const shadow = new Entry(key('k1'), 'shadow');
    map.entryList().add(shadow);
    expect(viewIds(map)).toEqual(['k1', 'k1']);
    map.entryList().remove(shadow);
    expect([...map.map()].map(([, v]) => v)).toEqual(['v1']);
  });
});

describe('EcoreEMap null keys (BasicEMap.hashOf: null hashes to 0, keys compare by identity)', () => {
  it('puts, gets, tests and removes a null key, apart from the key hashing to 0', () => {
    const map = numbered(0).properties;
    expect(map.get(null)).toBeUndefined();
    expect(map.containsKey(null)).toBe(false);
    expect(map.put(null, 'vn')).toBeUndefined();
    expect(map.put(null, 'vn2')).toBe('vn');
    expect(map.get(null)).toBe('vn2');
    expect(map.get(key('k0'))).toBe('v0');
    expect(map.containsKey(null)).toBe(true);
    expect(map.size()).toBe(2);
    expect(map.removeKey(null)).toBe('vn2');
    expect(map.containsKey(null)).toBe(false);
    expect(map.get(key('k0'))).toBe('v0');
  });

  it('finds a non-null key past a null-keyed entry in the same bucket', () => {
    const map = new NumberedHolder().properties;
    map.put(null, 'vn');
    map.put(key('k0'), 'v0');
    expect(map.get(key('k0'))).toBe('v0');
    expect(map.removeKey(key('k0'))).toBe('v0');
    expect(map.get(null)).toBe('vn');
  });

  it('places the null key in bucket 0 when iterating map()', () => {
    // put k3: capacity 1. put null: grow(2) -> capacity 6, k3 -> bucket 3, null -> hash 0, bucket 0.
    // put k1: bucket 1. Scan: null, k1, k3.
    const map = new NumberedHolder().properties;
    map.put(key('k3'), 'v3');
    map.put(null, 'vn');
    map.put(key('k1'), 'v1');
    expect([...map.map()].map(([k]) => (k as Key | null)?.id ?? null)).toEqual([null, 'k1', 'k3']);
  });
});
