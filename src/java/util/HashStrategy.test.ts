// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { DOUBLE, INTEGER, STRING, hashable, identity } from './HashStrategy.js';

/** `1.0` is `0x3ff0000000000000`; `Double.hashCode` is `(int) (bits ^ (bits >>> 32))`. */
const ONE_HASH = 0x3ff00000;

describe('STRING', () => {
  it('hashes with String.hashCode and compares by UTF-16 code units', () => {
    expect([STRING.hash(''), STRING.hash('Aa'), STRING.hash('BB')]).toEqual([0, 2112, 2112]);
    expect([STRING.equals('Aa', 'Aa'), STRING.equals('Aa', 'BB')]).toEqual([true, false]);
    expect([
      Math.sign(STRING.compare?.('Aa', 'BB') ?? 0),
      Math.sign(STRING.compare?.('a', 'Z') ?? 0),
      Math.sign(STRING.compare?.('\u{1F600}', '￿') ?? 0),
      STRING.compare?.('x', 'x'),
    ]).toEqual([-1, 1, -1, 0]);
  });
});

describe('INTEGER', () => {
  it('hashes to the value and compares numerically', () => {
    expect([INTEGER.hash(-5), INTEGER.hash(2147483647)]).toEqual([-5, 2147483647]);
    expect([INTEGER.equals(3, 3), INTEGER.equals(3, 4)]).toEqual([true, false]);
    expect([
      Math.sign(INTEGER.compare?.(-1, 1) ?? 0),
      Math.sign(INTEGER.compare?.(2, 1) ?? 0),
      INTEGER.compare?.(7, 7),
    ]).toEqual([-1, 1, 0]);
  });
});

describe('DOUBLE', () => {
  it('follows Double.hashCode, Double.equals (bit equality) and Double.compare', () => {
    expect([DOUBLE.hash(1), DOUBLE.hash(0), DOUBLE.hash(-0)]).toEqual([ONE_HASH, 0, -2147483648]);
    expect([DOUBLE.equals(Number.NaN, Number.NaN), DOUBLE.equals(0, -0), DOUBLE.equals(1.5, 1.5)]).toEqual([
      true,
      false,
      true,
    ]);
    expect([
      DOUBLE.compare?.(-0, 0),
      DOUBLE.compare?.(Number.NaN, Number.POSITIVE_INFINITY),
      DOUBLE.compare?.(2, 2),
    ]).toEqual([-1, 1, 0]);
  });
});

describe('identity', () => {
  it('hashes by identity and ignores structural equality', () => {
    const strategy = identity<object>();
    const a = {};
    expect(strategy.hash(a)).toBe(strategy.hash(a));
    expect(strategy.equals(a, a)).toBe(true);
    expect(strategy.equals(a, {})).toBe(false);
    expect(strategy.hash(a)).not.toBe(strategy.hash({}));
  });
});

describe('hashable', () => {
  class Key {
    constructor(readonly id: number) {}

    hashCode(): number {
      return this.id * 10;
    }

    equals(o: unknown): boolean {
      return o instanceof Key && o.id === this.id;
    }
  }

  it('delegates to hashCode and equals and is not Comparable', () => {
    const strategy = hashable<Key>();
    expect([
      strategy.hash(new Key(4)),
      strategy.equals(new Key(4), new Key(4)),
      strategy.equals(new Key(4), new Key(5)),
    ]).toEqual([40, true, false]);
    expect(strategy.compare).toBeUndefined();
  });
});
