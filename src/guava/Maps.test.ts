// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import * as Int32 from '../java/lang/Int32.js';
import * as JavaDouble from '../java/lang/JavaDouble.js';
import * as JavaInteger from '../java/lang/JavaInteger.js';
import { INTEGER, STRING, hashable, type HashStrategy } from '../java/util/HashStrategy.js';
import type { JavaHashMap } from '../java/util/JavaHashMap.js';
import type { JavaHashSet } from '../java/util/JavaHashSet.js';
import * as Maps from './Maps.js';
import * as Sets from './Sets.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/guava.json', import.meta.url);

type Kind = 'string' | 'integer' | 'kvector';

interface Step {
  readonly op: string;
  readonly args: readonly unknown[];
  readonly result: unknown;
  readonly order?: { readonly keys: readonly unknown[] };
}

interface Script {
  readonly name: string;
  readonly keyKind: Kind;
  readonly init: {
    readonly factory: string;
    readonly n?: number;
    readonly source?: string;
    readonly items?: unknown[];
  };
  readonly steps: readonly Step[];
}

interface Vectors {
  readonly jdk: string;
  readonly guava: string;
  readonly maps: readonly Script[];
  readonly sets: readonly Script[];
  readonly negativeExpectedSize: { readonly maps: Thrown; readonly sets: Thrown };
}

interface Thrown {
  readonly throws: string;
  readonly message: string;
}

/** KVector-style test key: ELK `KVector.java:155` hash, equality by coordinates. */
class KVec {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  hashCode(): number {
    return Int32.add(JavaDouble.hashCode(this.x), JavaInteger.reverse(JavaDouble.hashCode(this.y)));
  }

  equals(o: unknown): boolean {
    return o instanceof KVec && o.x === this.x && o.y === this.y;
  }

  toString(): string {
    return `${this.x},${this.y}`;
  }
}

function strategyFor(kind: Kind): HashStrategy<unknown> {
  const strategies = { string: STRING, integer: INTEGER, kvector: hashable<KVec>() };
  return strategies[kind] as HashStrategy<unknown>;
}

function decode(kind: Kind, token: unknown): unknown {
  if (kind !== 'kvector') {
    return token;
  }
  const [x, y] = String(token).split(',').map(Number);
  return new KVec(x as number, y as number);
}

function encode(key: unknown): unknown {
  return key instanceof KVec ? key.toString() : key;
}

/** An operation table over one container, and the order it reports. */
interface Sut {
  readonly ops: Record<string, (args: unknown[]) => unknown>;
  keys(): unknown[];
}

function replay(script: Script, sut: Sut): void {
  script.steps.forEach((step, index) => {
    const result = sut.ops[step.op]?.([...step.args]);
    const actual = { result: encode(result), order: step.order ? { keys: sut.keys() } : undefined };
    const expected = { result: step.result ?? undefined, order: step.order };
    expect(actual, `${script.name} step ${index} ${step.op}`).toEqual(expected);
  });
}

function mapSut(map: JavaHashMap<unknown, number>, kind: Kind): Sut {
  const key = (token: unknown): unknown => decode(kind, token);
  return {
    ops: {
      put: (a) => map.put(key(a[0]), a[1] as number),
      get: (a) => map.get(key(a[0])),
      remove: (a) => map.remove(key(a[0])),
      containsKey: (a) => map.containsKey(key(a[0])),
      size: () => map.size,
      clear: () => map.clear(),
      putEach: (a) => {
        (a[0] as unknown[]).forEach((token) => map.put(key(token), 1));
        return map.size;
      },
    },
    keys: () => [...map.keys()].map(encode),
  };
}

function setSut(set: JavaHashSet<unknown>, kind: Kind): Sut {
  const key = (token: unknown): unknown => decode(kind, token);
  return {
    ops: {
      add: (a) => set.add(key(a[0])),
      remove: (a) => set.remove(key(a[0])),
      contains: (a) => set.contains(key(a[0])),
      size: () => set.size,
      clear: () => set.clear(),
      addEach: (a) => {
        (a[0] as unknown[]).forEach((token) => set.add(key(token)));
        return set.size;
      },
    },
    keys: () => [...set].map(encode),
  };
}

function newMap(script: Script): JavaHashMap<unknown, number> {
  const strategy = strategyFor(script.keyKind);
  return script.init.factory === 'newHashMap()'
    ? Maps.newHashMap(strategy)
    : Maps.newHashMapWithExpectedSize(strategy, script.init.n as number);
}

/** A bare iterable: not a Java `Collection`, so `Sets.newHashSet` adds element by element. */
function bareIterable<T>(items: T[]): Iterable<T> {
  return { [Symbol.iterator]: () => items[Symbol.iterator]() };
}

function newSet(script: Script): JavaHashSet<unknown> {
  const { factory, n, source } = script.init;
  const strategy = strategyFor(script.keyKind);
  const items = (script.init.items ?? []).map((token) => decode(script.keyKind, token));
  switch (factory) {
    case 'newHashSet()':
      return Sets.newHashSet(strategy);
    case 'newHashSetWithExpectedSize(int)':
      return Sets.newHashSetWithExpectedSize(strategy, n as number);
    case 'newHashSet(E...)':
      return Sets.newHashSetOf(strategy, ...items);
    default:
      return Sets.newHashSet(strategy, source === 'collection' ? items : bareIterable(items));
  }
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as Vectors;
const KINDS: readonly Kind[] = ['string', 'integer', 'kvector'];
/** Scripts per key kind: 101 expected-size sweeps + 1 sequence + 8 random (+ 73 constructor scripts for sets). */
const MAP_SCRIPTS_PER_KIND = 110;
const SET_SCRIPTS_PER_KIND = 183;

describe('Maps/Sets JVM+Guava replay (guava.json maps, sets)', () => {
  it('was generated by JDK 21 with Guava 33.3.0 and the expected script totals', () => {
    expect([vectors.jdk, vectors.guava, vectors.maps.length, vectors.sets.length]).toEqual([
      '21.0.1',
      '33.3.0-jre',
      MAP_SCRIPTS_PER_KIND * KINDS.length,
      SET_SCRIPTS_PER_KIND * KINDS.length,
    ]);
  });

  for (const kind of KINDS) {
    it(`replays every ${kind} map script: results and key order after each step`, () => {
      const scripts = vectors.maps.filter((s) => s.keyKind === kind);
      expect(scripts.length).toBe(MAP_SCRIPTS_PER_KIND);
      scripts.forEach((s) => replay(s, mapSut(newMap(s), kind)));
    });

    it(`replays every ${kind} set script: results and element order after each step`, () => {
      const scripts = vectors.sets.filter((s) => s.keyKind === kind);
      expect(scripts.length).toBe(SET_SCRIPTS_PER_KIND);
      scripts.forEach((s) => replay(s, setSut(newSet(s), kind)));
    });
  }
});

describe('Maps.expectedSizeCapacity', () => {
  it('is ceil(n / 0.75): the smallest table size that holds n without growth (capacity sweeps)', () => {
    const capacities = [0, 1, 3, 12, 13, 24, 96, 97].map(Maps.expectedSizeCapacity);
    expect(capacities).toEqual([0, 2, 4, 16, 18, 32, 128, 130]);
  });
});

describe('Maps.newHashMap and newHashMapWithExpectedSize', () => {
  it('iterate string keys in JVM hash order', () => {
    const map = Maps.newHashMap<string, number>(STRING);
    ['b', 'a', 'c'].forEach((k, i) => map.put(k, i));
    expect([...map.keys()]).toEqual(['a', 'b', 'c']);
  });

  it('reject a negative expected size with the Guava message', () => {
    const { maps } = vectors.negativeExpectedSize;
    expect([maps.throws, maps.message]).toEqual([
      'IllegalArgumentException',
      'expectedSize cannot be negative but was: -1',
    ]);
    expect(() => Maps.newHashMapWithExpectedSize(STRING, -1)).toThrow(IllegalArgumentException);
    expect(() => Maps.newHashMapWithExpectedSize(STRING, -1)).toThrow(maps.message);
  });
});

describe('Maps.newLinkedHashMap', () => {
  it('iterates in insertion order and keeps the position of a re-put key', () => {
    const map = Maps.newLinkedHashMap<string, number>();
    map.set('z', 1);
    map.set('a', 2);
    map.set('z', 3);
    expect([...map]).toEqual([
      ['z', 3],
      ['a', 2],
    ]);
  });
});

class Side {
  constructor(
    readonly label: string,
    private readonly index: number,
  ) {}
  ordinal(): number {
    return this.index;
  }
}
const NORTH = new Side('N', 0);
const EAST = new Side('E', 1);
const SOUTH = new Side('S', 2);

describe('Maps.newEnumMap', () => {
  it('starts empty', () => {
    const map = Maps.newEnumMap<Side, string>();
    expect([map.size, [...map.keys()], map.get(NORTH), map.containsKey(NORTH)]).toEqual([0, [], undefined, false]);
  });

  it('iterates keys, values and entries in ordinal order regardless of insertion order', () => {
    const map = Maps.newEnumMap<Side, string>();
    map.put(SOUTH, 's');
    map.put(NORTH, 'n');
    map.put(EAST, 'e');
    expect(map.keys()).toEqual([NORTH, EAST, SOUTH]);
    expect(map.values()).toEqual(['n', 'e', 's']);
    expect(map.entries()).toEqual([
      [NORTH, 'n'],
      [EAST, 'e'],
      [SOUTH, 's'],
    ]);
    expect([...map]).toEqual(map.entries());
    expect(map.size).toBe(3);
  });

  it('put returns the previous value; get, containsKey and remove follow Map semantics', () => {
    const map = Maps.newEnumMap<Side, string>();
    expect(map.put(EAST, 'a')).toBeUndefined();
    expect(map.put(EAST, 'b')).toBe('a');
    expect([map.get(EAST), map.containsKey(EAST), map.containsKey(NORTH)]).toEqual(['b', true, false]);
    expect(map.remove(NORTH)).toBeUndefined();
    expect(map.remove(EAST)).toBe('b');
    expect([map.size, map.containsKey(EAST)]).toEqual([0, false]);
  });

  it('clear empties the map', () => {
    const map = Maps.newEnumMap<Side, string>();
    map.put(NORTH, 'n');
    map.put(SOUTH, 's');
    map.clear();
    expect([map.size, map.keys()]).toEqual([0, []]);
  });
});
