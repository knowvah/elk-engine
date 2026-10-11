// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import * as Int32 from '../java/lang/Int32.js';
import * as JavaDouble from '../java/lang/JavaDouble.js';
import * as JavaInteger from '../java/lang/JavaInteger.js';
import { INTEGER, STRING, hashable, type HashStrategy } from '../java/util/HashStrategy.js';
import { HashBiMap, type BiMap } from './HashBiMap.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/guava.json', import.meta.url);

type Kind = 'string' | 'integer' | 'kvector';

interface Step {
  readonly op: string;
  readonly args: readonly unknown[];
  readonly result: unknown;
  readonly order?: unknown;
}

interface Script {
  readonly name: string;
  readonly keyKind: Kind;
  readonly steps: readonly Step[];
}

interface Vectors {
  readonly biMap: readonly Script[];
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

/** Runs one step; a thrown `IllegalArgumentException` becomes the vector's `{throws, message}`. */
function attempt(action: () => unknown): unknown {
  try {
    return encode(action());
  } catch (e) {
    if (!(e instanceof IllegalArgumentException)) {
      throw e;
    }
    return { throws: e.name, message: e.message };
  }
}

type Ops = Record<string, (args: unknown[]) => unknown>;

/** Forward operations take (key, value); inverse ones take (value, key) and decode the key second. */
function biMapOps(bimap: BiMap<unknown, unknown>, kind: Kind): Ops {
  const inv = bimap.inverse();
  const key = (token: unknown): unknown => decode(kind, token);
  return {
    put: (a) => bimap.put(key(a[0]), a[1]),
    forcePut: (a) => bimap.forcePut(key(a[0]), a[1]),
    remove: (a) => bimap.remove(key(a[0])),
    get: (a) => bimap.get(key(a[0])),
    containsKey: (a) => bimap.containsKey(key(a[0])),
    size: () => bimap.size,
    clear: () => bimap.clear(),
    inversePut: (a) => inv.put(a[0], key(a[1])),
    inverseForcePut: (a) => inv.forcePut(a[0], key(a[1])),
    inverseRemove: (a) => inv.remove(a[0]),
    inverseGet: (a) => inv.get(a[0]),
    inverseContainsKey: (a) => inv.containsKey(a[0]),
  };
}

function observe(bimap: BiMap<unknown, unknown>): unknown {
  return {
    keys: bimap.keys().map(encode),
    values: bimap.values(),
    inverseKeys: bimap.inverse().keys(),
  };
}

function replay(script: Script): void {
  const bimap = HashBiMap.create<unknown, unknown>(strategyFor(script.keyKind), INTEGER as HashStrategy<unknown>);
  const ops = biMapOps(bimap, script.keyKind);
  script.steps.forEach((step, index) => {
    const result = attempt(() => ops[step.op]?.([...step.args]));
    const actual = { result, order: step.order === undefined ? undefined : observe(bimap) };
    const expected = { result: step.result ?? undefined, order: step.order };
    expect(actual, `${script.name} step ${index} ${step.op}`).toEqual(expected);
  });
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as Vectors;
const KINDS: readonly Kind[] = ['string', 'integer', 'kvector'];
/** Per key kind: sequence, duplicate-value, inverse, remove-reinsert and 8 random scripts. */
const SCRIPTS_PER_KIND = 12;

describe('HashBiMap JVM+Guava replay (guava.json biMap)', () => {
  for (const kind of KINDS) {
    it(`replays every ${kind} script: results, key, value and inverse order after each step`, () => {
      const scripts = vectors.biMap.filter((s) => s.keyKind === kind);
      expect(scripts.length).toBe(SCRIPTS_PER_KIND);
      scripts.forEach(replay);
    });
  }

  it('records the duplicate-value rejection as IllegalArgumentException', () => {
    const script = vectors.biMap.find((s) => s.name === 'integer-duplicate-value') as Script;
    expect(script.steps[2]?.result).toEqual({ throws: 'IllegalArgumentException', message: 'value already present: 1' });
  });
});

function newStrings(): BiMap<string, number> {
  return HashBiMap.create<string, number>(STRING, INTEGER);
}

describe('HashBiMap', () => {
  it('put of a value already bound to another key throws IllegalArgumentException and changes nothing', () => {
    const bimap = newStrings();
    bimap.put('k1', 1);
    expect(() => bimap.put('k2', 1)).toThrow(IllegalArgumentException);
    expect(() => bimap.put('k2', 1)).toThrow('value already present: 1');
    expect(bimap.entries()).toEqual([['k1', 1]]);
  });

  it('iterates keys in insertion order, not hash order', () => {
    const bimap = newStrings();
    ['zz', 'a', 'mm', 'b'].forEach((k, i) => bimap.put(k, i));
    expect(bimap.keys()).toEqual(['zz', 'a', 'mm', 'b']);
    expect(bimap.values()).toEqual([0, 1, 2, 3]);
    expect(bimap.entries()).toEqual([
      ['zz', 0],
      ['a', 1],
      ['mm', 2],
      ['b', 3],
    ]);
    expect([bimap.size, bimap.isEmpty()]).toEqual([4, false]);
  });

  it('put of an existing key rebinds it in place and returns the old value', () => {
    const bimap = newStrings();
    bimap.put('a', 1);
    bimap.put('b', 2);
    expect(bimap.put('a', 3)).toBe(1);
    expect(bimap.put('a', 3)).toBe(3);
    expect(bimap.entries()).toEqual([
      ['a', 3],
      ['b', 2],
    ]);
    expect(bimap.inverse().get(1)).toBeUndefined();
  });

  it('forcePut evicts the entry holding the value; an existing key keeps its position', () => {
    const bimap = newStrings();
    bimap.put('a', 1);
    bimap.put('b', 2);
    bimap.put('c', 3);
    expect(bimap.forcePut('c', 1)).toBe(3);
    expect(bimap.entries()).toEqual([
      ['b', 2],
      ['c', 1],
    ]);
    expect(bimap.forcePut('d', 2)).toBeUndefined();
    expect(bimap.entries()).toEqual([['c', 1], ['d', 2]]);
  });

  it('inverse() is a live view in both directions and its inverse is the original', () => {
    const bimap = newStrings();
    const inverse = bimap.inverse();
    bimap.put('a', 1);
    expect([inverse.get(1), inverse.containsKey(1), inverse.size]).toEqual(['a', true, 1]);
    inverse.put(2, 'b');
    expect(bimap.get('b')).toBe(2);
    inverse.remove(1);
    expect(bimap.containsKey('a')).toBe(false);
    expect(inverse.inverse()).toBe(bimap);
    expect(() => inverse.put(3, 'b')).toThrow('key already present: b');
  });

  it('inverse().put of an existing inverse key removes that binding and appends the new one', () => {
    const bimap = newStrings();
    bimap.put('a', 1);
    bimap.put('b', 2);
    bimap.put('c', 3);
    expect(bimap.inverse().put(1, 'z')).toBe('a');
    expect(bimap.entries()).toEqual([
      ['b', 2],
      ['c', 3],
      ['z', 1],
    ]);
    expect(bimap.inverse().forcePut(2, 'z')).toBe('b');
    expect(bimap.entries()).toEqual([
      ['c', 3],
      ['z', 2],
    ]);
  });

  it('get and remove of an absent key return undefined; clear empties both directions', () => {
    const bimap = newStrings();
    bimap.put('a', 1);
    expect([bimap.get('x'), bimap.remove('x'), bimap.containsKey('x')]).toEqual([undefined, undefined, false]);
    expect(bimap.remove('a')).toBe(1);
    bimap.put('b', 2);
    bimap.clear();
    expect([bimap.size, bimap.isEmpty(), bimap.inverse().size, bimap.keys()]).toEqual([0, true, 0, []]);
    bimap.put('b', 2);
    expect(bimap.entries()).toEqual([['b', 2]]);
  });

  it('matches keys and values by their strategies, not by identity', () => {
    const bimap = HashBiMap.create<KVec, string>(hashable<KVec>(), STRING);
    bimap.put(new KVec(1, 2), 'p');
    expect(bimap.get(new KVec(1, 2))).toBe('p');
    expect(bimap.inverse().get('p')?.toString()).toBe('1,2');
    expect(() => bimap.put(new KVec(3, 4), 'p')).toThrow('value already present: p');
  });
});
