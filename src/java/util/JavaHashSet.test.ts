// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as Int32 from '../lang/Int32.js';
import * as JavaDouble from '../lang/JavaDouble.js';
import * as JavaInteger from '../lang/JavaInteger.js';
import { DOUBLE, INTEGER, STRING, hashable, type HashStrategy } from './HashStrategy.js';
import { JavaHashSet } from './JavaHashSet.js';

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
  readonly hashSet: readonly Script[];
}

/** Test element with KVector's hash (`core/src/.../math/KVector.java:155`) and `==` equality. */
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

/** Test element with a fixed hash; equal by id. */
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

/** Decodes JSON element tokens and encodes elements back to comparable strings. */
interface Codec {
  readonly strategy: HashStrategy<unknown>;
  decode(token: Json): unknown;
  encode(element: unknown): string;
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
    encode: (element) => JSON.stringify(element),
    tokenOf: (token) => JSON.stringify(token),
  };
}

function doubleCodec(): Codec {
  return {
    strategy: DOUBLE as HashStrategy<unknown>,
    decode: (token) => fromBits(token as string),
    encode: (element) => toBits(element as number),
    tokenOf: (token) => token as string,
  };
}

/** KVector elements are interned per script: the generator reuses instances, so `==` identity applies. */
function kvectorCodec(): Codec {
  const pool = new Map<string, KVec>();
  return {
    strategy: hashable<KVec>() as HashStrategy<unknown>,
    decode: (token) => {
      const text = JSON.stringify(token);
      const [x, y] = token as [string, string];
      let element = pool.get(text);
      if (element === undefined) {
        element = new KVec(text, fromBits(x), fromBits(y));
        pool.set(text, element);
      }
      return element;
    },
    encode: (element) => (element as KVec).token,
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
    encode: (element) => String((element as Collider).id),
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

function construct(script: Script, codec: Codec): JavaHashSet<unknown> {
  const init = script.init;
  switch (init.ctor) {
    case 'HashSet()':
      return new JavaHashSet(codec.strategy);
    case 'HashSet(int)':
      return new JavaHashSet(codec.strategy, init.capacity);
    default:
      return JavaHashSet.copyOf(codec.strategy, (init.sourceOrder ?? []).map(codec.decode));
  }
}

function apply(set: JavaHashSet<unknown>, codec: Codec, step: Step): unknown {
  const element = (): unknown => codec.decode(step.args[0]);
  switch (step.op) {
    case 'size':
      return set.size;
    case 'add':
      return set.add(element());
    case 'remove':
      return set.remove(element());
    case 'contains':
      return set.contains(element());
    case 'clear':
      set.clear();
      return undefined;
    case 'addAll':
      return set.addAll(step.args.map(codec.decode));
    default:
      throw new Error(`unknown op ${step.op}`);
  }
}

function replay(script: Script): void {
  const codec = codecFor(script);
  const set = construct(script, codec);
  script.steps.forEach((step, index) => {
    const result = apply(set, codec, step);
    const actual = { result, order: step.order ? [...set].map(codec.encode) : undefined };
    const expected = { result: step.result ?? undefined, order: step.order?.map(codec.tokenOf) };
    expect(actual, `${script.name} step ${index} ${step.op}`).toEqual(expected);
  });
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as CollectionVectors;

/** keyKind, script count, identity-dependent scripts skipped. */
const SCRIPT_COUNTS: ReadonlyArray<readonly [string, number, number]> = [
  ['string', 238, 0],
  ['integer', 238, 0],
  ['double', 206, 0],
  ['kvector', 222, 4],
  ['collider', 268, 23],
];

describe('JavaHashSet JVM replay (collections.json hashSet)', () => {
  it('was generated by JDK 21 with the expected script total', () => {
    expect([vectors.jdk, vectors.hashSet.length]).toEqual(['21.0.1', 1172]);
  });

  for (const [kind, count, identityDependent] of SCRIPT_COUNTS) {
    it(`replays every ${kind} script except identity-dependent ones: results and order after each step`, () => {
      const scripts = vectors.hashSet.filter((s) => s.keyKind === kind);
      const replayed = scripts.filter((s) => !isIdentityDependent(s));
      expect([scripts.length, scripts.length - replayed.length]).toEqual([count, identityDependent]);
      replayed.forEach(replay);
    });
  }

  it('identity-dependent order: identical histories diverge on the JVM', () => {
    const [a, b] = DIVERGENT_PAIR.map((name) => vectors.hashSet.find((s) => s.name === name) as Script);
    const history = (s: Script): string =>
      JSON.stringify([s.keyClass, s.init, s.steps.slice(0, DIVERGENT_STEP + 1).map((st) => [st.op, st.args])]);
    expect(history(a as Script)).toBe(history(b as Script));
    expect(a?.steps[DIVERGENT_STEP]?.order).not.toEqual(b?.steps[DIVERGENT_STEP]?.order);
  });
});

describe('JavaHashSet API', () => {
  it('reports emptiness and accepts an explicit load factor', () => {
    const set = new JavaHashSet<number>(INTEGER, 4, 1);
    expect(set.isEmpty()).toBe(true);
    expect(set.add(3)).toBe(true);
    expect(set.add(3)).toBe(false);
    expect([set.isEmpty(), set.size, [...set]]).toEqual([false, 1, [3]]);
  });

  it('addAll returns false when nothing changed', () => {
    const set = JavaHashSet.copyOf(STRING, ['a', 'b']);
    expect(set.addAll(['a', 'b'])).toBe(false);
    expect(set.addAll(['c'])).toBe(true);
    expect([...set]).toEqual(['a', 'b', 'c']);
  });
});
