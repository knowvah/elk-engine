// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as Int32 from '../lang/Int32.js';
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import * as JavaDouble from '../lang/JavaDouble.js';
import * as JavaInteger from '../lang/JavaInteger.js';
import { DOUBLE, INTEGER, STRING, hashable, type HashStrategy } from './HashStrategy.js';
import { JavaHashMap } from './JavaHashMap.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/collections.json', import.meta.url);
const HEX_DIGITS = 16;
const COMPARABLE_COLLIDER = 'ColliderComparable';

/**
 * Scripts whose JVM iteration order is a function of `System.identityHashCode`, not of hash and
 * insertion history: a tree bin holds equal-hash keys without a comparison order (`ColliderPlain`,
 * KVector), which the JVM ties by identity. Evidence: `collider-ColliderPlain-same-fwd-cap64` and
 * `-same-rev-cap64` run identical constructors and operations through step 9 yet differ at step 9
 * (asserted below); regenerating `collections.json` after any byte change to
 * `tools/vectors/JavaVectors.java` (even a comment) changes exactly these scripts. They are
 * reported, not modelled, and skipped by the replay.
 */
const IDENTITY_DEPENDENT: ReadonlySet<string> = new Set([
  'seq-kvector-grid',
  'seq-kvector-frac',
  'shrink-kvector-frac',
  'seq-kvector-special',
  'collider-ColliderPlain-same-fwd-cap64',
  'collider-ColliderPlain-same-fwd-capdef',
  'collider-ColliderPlain-same-rev-cap64',
  'collider-ColliderPlain-same-rev-capdef',
  'collider-ColliderPlain-same-shuf-cap64',
  'collider-ColliderPlain-same-shuf-capdef',
  'collider-ColliderPlain-same-mix-cap64',
  'collider-ColliderPlain-same-mix-capdef',
  'collider-ColliderPlain-same-shuf-cap1024',
  'rand-collider-9',
  'rand-collider-19',
  'rand-collider-27',
  'rand-collider-31',
  'rand-collider-73',
  'rand-collider-91',
  'rand-collider-123',
  'rand-collider-125',
  'rand-collider-127',
  'rand-collider-129',
  'rand-collider-137',
  'rand-collider-139',
  'rand-collider-143',
  'rand-collider-161',
]);
function isIdentityDependent(script: Script): boolean {
  return IDENTITY_DEPENDENT.has(script.name);
}

const DIVERGENT_PAIR = ['collider-ColliderPlain-same-fwd-cap64', 'collider-ColliderPlain-same-rev-cap64'] as const;
const DIVERGENT_STEP = 9;

type Json = unknown;

interface Step {
  readonly op: string;
  readonly args: readonly Json[];
  readonly result?: Json;
  readonly order?: readonly Json[];
}

interface Init {
  readonly ctor: string;
  readonly capacity?: number;
  readonly loadFactor?: string;
  readonly sourceOrder?: readonly Json[];
}

interface Script {
  readonly name: string;
  readonly keyKind: string;
  readonly keyClass?: string;
  readonly init: Init;
  readonly steps: readonly Step[];
}

interface CollectionVectors {
  readonly jdk: string;
  readonly hashMap: readonly Script[];
}

/** Test key with KVector's hash (`core/src/.../math/KVector.java:155`) and `==` equality. */
class KVec {
  constructor(
    readonly token: string,
    readonly x: number,
    readonly y: number,
  ) {}

  hashCode(): number {
    return Int32.add(JavaDouble.hashCode(this.x), JavaInteger.reverse(JavaDouble.hashCode(this.y)));
  }

  equals(o: unknown): boolean {
    return o instanceof KVec && this.x === o.x && this.y === o.y;
  }
}

/** Test key with a fixed hash; equal by id. */
class Collider {
  constructor(
    readonly id: number,
    readonly hash: number,
  ) {}

  hashCode(): number {
    return this.hash;
  }

  equals(o: unknown): boolean {
    return o instanceof Collider && o.id === this.id;
  }
}

/** Decodes JSON key tokens to keys and encodes keys back to comparable strings. */
interface Codec {
  readonly strategy: HashStrategy<unknown>;
  decode(token: Json): unknown;
  encode(key: unknown): string;
  tokenOf(token: Json): string;
}

function fromBits(hex: string): number {
  return JavaDouble.longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
}

function toBits(x: number): string {
  return BigInt.asUintN(64, JavaDouble.doubleToRawLongBits(x)).toString(16).padStart(HEX_DIGITS, '0');
}

function plainCodec(strategy: HashStrategy<unknown>): Codec {
  return {
    strategy,
    decode: (token) => token,
    encode: (key) => JSON.stringify(key),
    tokenOf: (token) => JSON.stringify(token),
  };
}

function doubleCodec(): Codec {
  return {
    strategy: DOUBLE as HashStrategy<unknown>,
    decode: (token) => fromBits(token as string),
    encode: (key) => toBits(key as number),
    tokenOf: (token) => token as string,
  };
}

/** KVector keys are interned per script: the generator reuses instances, so `==` identity applies. */
function kvectorCodec(): Codec {
  const pool = new Map<string, KVec>();
  return {
    strategy: hashable<KVec>() as HashStrategy<unknown>,
    decode: (token) => {
      const text = JSON.stringify(token);
      const [x, y] = token as [string, string];
      let key = pool.get(text);
      if (key === undefined) {
        key = new KVec(text, fromBits(x), fromBits(y));
        pool.set(text, key);
      }
      return key;
    },
    encode: (key) => (key as KVec).token,
    tokenOf: (token) => JSON.stringify(token),
  };
}

function colliderCodec(keyClass: string | undefined): Codec {
  const base = hashable<Collider>();
  const strategy: HashStrategy<Collider> =
    keyClass === COMPARABLE_COLLIDER ? { ...base, compare: (a, b) => a.id - b.id } : base;
  return {
    strategy: strategy as HashStrategy<unknown>,
    decode: (token) => {
      const { id, hash } = token as { id: number; hash: number };
      return new Collider(id, hash);
    },
    encode: (key) => String((key as Collider).id),
    tokenOf: (token) => String((token as { id: number }).id),
  };
}

function codecFor(script: Script): Codec {
  switch (script.keyKind) {
    case 'string':
      return plainCodec(STRING as HashStrategy<unknown>);
    case 'integer':
      return plainCodec(INTEGER as HashStrategy<unknown>);
    case 'double':
      return doubleCodec();
    case 'kvector':
      return kvectorCodec();
    default:
      return colliderCodec(script.keyClass);
  }
}

function construct(script: Script, codec: Codec): JavaHashMap<unknown, number> {
  const init = script.init;
  switch (init.ctor) {
    case 'HashMap()':
      return new JavaHashMap(codec.strategy);
    case 'HashMap(int)':
      return new JavaHashMap(codec.strategy, init.capacity);
    case 'HashMap(int,float)':
      return new JavaHashMap(codec.strategy, init.capacity, fromBits(init.loadFactor ?? ''));
    default: {
      const source = (init.sourceOrder ?? []).map((k, i): [unknown, number] => [codec.decode(k), i]);
      return JavaHashMap.copyOf(codec.strategy, source);
    }
  }
}

function apply(map: JavaHashMap<unknown, number>, codec: Codec, step: Step): unknown {
  const key = (): unknown => codec.decode(step.args[0]);
  switch (step.op) {
    case 'size':
      return map.size;
    case 'put':
      return map.put(key(), step.args[1] as number);
    case 'remove':
      return map.remove(key());
    case 'get':
      return map.get(key());
    case 'containsKey':
      return map.containsKey(key());
    case 'clear':
      map.clear();
      return undefined;
    case 'putAll':
      map.putAll(
        step.args.map((e): [unknown, number] => {
          const [k, v] = e as [Json, number];
          return [codec.decode(k), v];
        }),
      );
      return undefined;
    default:
      throw new Error(`unknown op ${step.op}`);
  }
}

function replay(script: Script): void {
  const codec = codecFor(script);
  const map = construct(script, codec);
  script.steps.forEach((step, index) => {
    const result = apply(map, codec, step);
    const actual = { result, order: step.order ? [...map.keys()].map(codec.encode) : undefined };
    const expected = { result: step.result ?? undefined, order: step.order?.map(codec.tokenOf) };
    expect(actual, `${script.name} step ${index} ${step.op}`).toEqual(expected);
  });
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as CollectionVectors;

/** keyKind, script count, identity-dependent scripts skipped. */
const SCRIPT_COUNTS: ReadonlyArray<readonly [string, number, number]> = [
  ['string', 252, 0],
  ['integer', 252, 0],
  ['double', 206, 0],
  ['kvector', 228, 4],
  ['collider', 268, 23],
];

describe('JavaHashMap JVM replay (collections.json hashMap)', () => {
  it('was generated by JDK 21 with the expected script total', () => {
    expect([vectors.jdk, vectors.hashMap.length]).toEqual(['21.0.1', 1206]);
  });

  for (const [kind, count, identityDependent] of SCRIPT_COUNTS) {
    it(`replays every ${kind} script except identity-dependent ones: results and order after each step`, () => {
      const scripts = vectors.hashMap.filter((s) => s.keyKind === kind);
      const replayed = scripts.filter((s) => !isIdentityDependent(s));
      expect([scripts.length, scripts.length - replayed.length]).toEqual([count, identityDependent]);
      replayed.forEach(replay);
    });
  }

  it('identity-dependent order: identical histories diverge on the JVM', () => {
    const [a, b] = DIVERGENT_PAIR.map((name) => vectors.hashMap.find((s) => s.name === name) as Script);
    const history = (s: Script): string =>
      JSON.stringify([s.keyClass, s.init, s.steps.slice(0, DIVERGENT_STEP + 1).map((st) => [st.op, st.args])]);
    expect(history(a as Script)).toBe(history(b as Script));
    expect(a?.steps[DIVERGENT_STEP]?.order).not.toEqual(b?.steps[DIVERGENT_STEP]?.order);
  });
});

describe('JavaHashMap API', () => {
  it('exposes keys, values, entries and the default iterator in the same order', () => {
    const map = new JavaHashMap<string, number>(STRING);
    expect(map.isEmpty()).toBe(true);
    map.put('b', 2);
    map.put('a', 1);
    map.put('c', 3);
    expect([...map.keys()]).toEqual(['a', 'b', 'c']);
    expect([...map.values()]).toEqual([1, 2, 3]);
    expect([...map.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect([...map]).toEqual([...map.entries()]);
    expect(map.isEmpty()).toBe(false);
  });

  it('rejects a negative capacity and a non-positive or NaN load factor like the Javadoc', () => {
    expect(() => new JavaHashMap(STRING, -1)).toThrow(IllegalArgumentException);
    expect(() => new JavaHashMap(STRING, 16, 0)).toThrow(IllegalArgumentException);
    expect(() => new JavaHashMap(STRING, 16, Number.NaN)).toThrow(IllegalArgumentException);
  });
});
