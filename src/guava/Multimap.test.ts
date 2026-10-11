// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as Int32 from '../java/lang/Int32.js';
import * as JavaDouble from '../java/lang/JavaDouble.js';
import * as JavaInteger from '../java/lang/JavaInteger.js';
import { INTEGER, STRING, hashable, type HashStrategy } from '../java/util/HashStrategy.js';
import { ArrayListMultimap } from './ArrayListMultimap.js';
import { HashMultimap } from './HashMultimap.js';
import { LinkedHashMultimap } from './LinkedHashMultimap.js';
import { LinkedListMultimap } from './LinkedListMultimap.js';
import type { Multimap, ValueCollection } from './Multimap.js';
import { TreeMultimap } from './TreeMultimap.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/guava.json', import.meta.url);

type Kind = 'string' | 'integer' | 'kvector';

interface Step {
  readonly op: string;
  readonly args: readonly unknown[];
  readonly result: unknown;
  readonly order?: unknown;
}

interface Init {
  readonly factory: string;
  readonly expectedKeys?: number;
  readonly expectedValuesPerKey?: number;
  readonly keyOrder?: string;
  readonly valueOrder?: string;
}

interface Script {
  readonly name: string;
  readonly keyKind: Kind;
  readonly init: Init;
  readonly steps: readonly Step[];
}

type Section = 'hashMultimap' | 'arrayListMultimap' | 'linkedListMultimap' | 'linkedHashMultimap' | 'treeMultimap';

type Vectors = { readonly jdk: string; readonly guava: string } & Record<Section, readonly Script[]>;

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

type Comparator = (a: unknown, b: unknown) => number;

const COARSE_KEY = 5000;
const COARSE_VALUE = 4;

function naturalOrder(a: unknown, b: unknown): number {
  if (typeof a !== 'string') {
    return (a as number) - (b as number);
  }
  if (a === b) {
    return 0;
  }
  const less = a < (b as string);
  return less ? -1 : 1;
}

function coarseKey(k: unknown): number {
  return typeof k === 'string' ? k.length : Math.floor((k as number) / COARSE_KEY);
}

/** The vectors' comparator names: natural, reverse, or equal-within-a-class (`coarse`). */
function comparatorFor(name: string, coarse: (v: unknown) => number): Comparator {
  switch (name) {
    case 'natural':
      return naturalOrder;
    case 'reverse':
      return (a, b) => naturalOrder(b, a);
    default:
      return (a, b) => coarse(a) - coarse(b);
  }
}

function createMultimap(script: Script): Multimap<unknown, number> {
  const { factory, expectedKeys, expectedValuesPerKey, keyOrder, valueOrder } = script.init;
  const keys = strategyFor(script.keyKind);
  const values = INTEGER;
  switch (factory) {
    case 'HashMultimap.create()':
      return HashMultimap.create(keys, values);
    case 'ArrayListMultimap.create()':
      return ArrayListMultimap.create(keys, values);
    case 'ArrayListMultimap.create(int,int)':
      return ArrayListMultimap.create(keys, values, expectedKeys, expectedValuesPerKey);
    case 'LinkedListMultimap.create()':
      return LinkedListMultimap.create(keys, values);
    case 'LinkedHashMultimap.create()':
      return LinkedHashMultimap.create(keys, values);
    default:
      return TreeMultimap.create(
        comparatorFor(keyOrder as string, coarseKey),
        comparatorFor(valueOrder as string, (v) => Math.floor((v as number) / COARSE_VALUE)) as (
          a: number,
          b: number,
        ) => number,
      );
  }
}

type Ops = Record<string, (args: unknown[]) => unknown>;

/** `hold` keeps the live `get(k)` view; the `hold*` operations read and write through it. */
function multimapOps(mm: Multimap<unknown, number>, kind: Kind): Ops {
  const held = new Map<string, ValueCollection<number>>();
  const key = (token: unknown): unknown => decode(kind, token);
  const view = (token: unknown): ValueCollection<number> => held.get(JSON.stringify(token)) as ValueCollection<number>;
  return {
    put: (a) => mm.put(key(a[0]), a[1] as number),
    remove: (a) => mm.remove(key(a[0]), a[1] as number),
    removeAll: (a) => mm.removeAll(key(a[0])),
    get: (a) => [...mm.get(key(a[0]))],
    containsKey: (a) => mm.containsKey(key(a[0])),
    putAll: (a) => mm.putAll(key(a[0]), a[1] as number[]),
    size: () => mm.size,
    clear: () => mm.clear(),
    putEach: (a) => {
      (a[0] as unknown[]).forEach((token) => mm.put(key(token), 0));
      return mm.size;
    },
    hold: (a) => {
      held.set(JSON.stringify(a[0]), mm.get(key(a[0])));
      return undefined;
    },
    holdRead: (a) => [...view(a[0])],
    holdAdd: (a) => view(a[0]).add(a[1] as number),
    holdRemove: (a) => view(a[0]).remove(a[1] as number),
  };
}

function observe(mm: Multimap<unknown, number>, full: boolean): unknown {
  const state: Record<string, unknown> = {
    keySet: mm.keySet().map(encode),
    entries: mm.entries().map(([k, v]) => [encode(k), v]),
  };
  if (full) {
    Object.assign(state, { keys: mm.keys().map(encode), values: mm.values(), size: mm.size });
  }
  return state;
}

function replay(script: Script): void {
  const mm = createMultimap(script);
  const ops = multimapOps(mm, script.keyKind);
  const last = script.steps.length - 1;
  script.steps.forEach((step, index) => {
    const result = ops[step.op]?.([...step.args]);
    const actual = { result, order: step.order === undefined ? undefined : observe(mm, index === last) };
    const expected = { result: step.result ?? undefined, order: step.order };
    expect(actual, `${script.name} step ${index} ${step.op}`).toEqual(expected);
  });
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as Vectors;
const KINDS: readonly Kind[] = ['string', 'integer', 'kvector'];
const TREE_KINDS: readonly Kind[] = ['string', 'integer'];
/** Plans per key kind: 8 deterministic and 8 random scripts (+ 41 `create(int,int)` sweeps for ArrayListMultimap). */
const PLANS_PER_KIND = 16;
const CREATE_SWEEPS_PER_KIND = 41;
const TREE_COMPARATOR_PAIRS = 9;

describe('Multimap JVM+Guava replay (guava.json multimap sections)', () => {
  it('was generated by JDK 21 with Guava 33.3.0', () => {
    expect([vectors.jdk, vectors.guava]).toEqual(['21.0.1', '33.3.0-jre']);
  });

  const hashOrdered: ReadonlyArray<readonly [Section, string, number]> = [
    ['hashMultimap', 'HashMultimap', 0],
    ['arrayListMultimap', 'ArrayListMultimap', CREATE_SWEEPS_PER_KIND],
    ['linkedListMultimap', 'LinkedListMultimap', 0],
    ['linkedHashMultimap', 'LinkedHashMultimap', 0],
  ];
  for (const [section, label, sweeps] of hashOrdered) {
    for (const kind of KINDS) {
      it(`replays every ${label} ${kind} script: results and orders after each step`, () => {
        const scripts = vectors[section].filter((s) => s.keyKind === kind);
        expect(scripts.length).toBe(PLANS_PER_KIND + sweeps);
        scripts.forEach(replay);
      });
    }
  }

  for (const kind of TREE_KINDS) {
    it(`replays every TreeMultimap ${kind} script (9 comparator pairs): results and orders after each step`, () => {
      const scripts = vectors.treeMultimap.filter((s) => s.keyKind === kind);
      expect(scripts.length).toBe(PLANS_PER_KIND * TREE_COMPARATOR_PAIRS);
      scripts.forEach(replay);
    });
  }
});
