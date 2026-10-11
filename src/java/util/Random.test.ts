// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { shuffle } from './Collections.js';
import { Random } from './Random.js';

interface Call {
  readonly method: string;
  readonly arg?: number | number[];
  readonly value: number | string | boolean | number[];
}
interface Case {
  readonly seed: string;
  readonly calls: Call[];
}

const VECTORS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../test/golden/refs/java/random.json',
);
const cases = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { cases: Case[] }).cases;

const HEX_RADIX = 16;
const scratch = new DataView(new ArrayBuffer(8));

/** Decodes a 16-hex-digit IEEE-754 bit string to a double. */
function fromBits(hex: string): number {
  scratch.setBigUint64(0, BigInt(`0x${hex}`));
  return scratch.getFloat64(0);
}
/** Encodes a double as its 16-hex-digit IEEE-754 bit string. */
function toBits(x: number): string {
  scratch.setFloat64(0, x);
  return scratch.getBigUint64(0).toString(HEX_RADIX).padStart(HEX_RADIX, '0');
}

function replay(rnd: Random, call: Call): void {
  const expected = call.value;
  switch (call.method) {
    case 'nextInt':
      expect(rnd.nextInt()).toBe(expected);
      break;
    case 'nextIntBound':
      expect(rnd.nextInt(call.arg as number)).toBe(expected);
      break;
    case 'nextLong':
      expect(rnd.nextLong()).toBe(BigInt(expected as string));
      break;
    case 'nextBoolean':
      expect(rnd.nextBoolean()).toBe(expected);
      break;
    case 'nextDouble':
      expect(toBits(rnd.nextDouble())).toBe(expected);
      break;
    case 'nextFloat':
      expect(toBits(rnd.nextFloat())).toBe(expected);
      break;
    case 'nextGaussian':
      expect(toBits(rnd.nextGaussian())).toBe(expected);
      break;
    case 'shuffle': {
      const list = [...(call.arg as number[])];
      shuffle(list, rnd);
      expect(list).toEqual(expected);
      break;
    }
    default:
      throw new Error(`unknown vector method ${call.method}`);
  }
}

describe('Random vs JVM vectors', () => {
  it.each(cases.map((c) => [c.seed, c] as const))('seed %s replays bit-identically', (_s, c) => {
    const rnd = new Random(BigInt(c.seed));
    for (const call of c.calls) replay(rnd, call);
  });

  it('accepts safe-integer number seeds equal to the bigint seed', () => {
    expect(new Random(42).nextLong()).toBe(new Random(42n).nextLong());
  });

  it('rejects non-safe-integer number seeds', () => {
    expect(() => new Random(1.5)).toThrow(RangeError);
    expect(() => new Random(2 ** 60)).toThrow(RangeError);
  });

  it('setSeed resets the sequence and clears the cached gaussian', () => {
    const rnd = new Random(7n);
    const first = rnd.nextGaussian();
    rnd.setSeed(7n);
    expect(rnd.nextGaussian()).toBe(first);
    rnd.setSeed(7);
    expect(rnd.nextGaussian()).toBe(first);
  });

  it('no-arg constructor yields a usable generator', () => {
    const v = new Random().nextDouble();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('nextInt rejects non-positive and non-integer bounds', () => {
    const rnd = new Random(1n);
    expect(() => rnd.nextInt(0)).toThrow(RangeError);
    expect(() => rnd.nextInt(-1)).toThrow(/-1/);
    expect(() => rnd.nextInt(1.5)).toThrow(RangeError);
    expect(() => rnd.nextInt(2 ** 31)).toThrow(RangeError);
  });

  it('returns the cached second gaussian on every second call', () => {
    const gaussians = (seed: bigint): number[] => {
      const r = new Random(seed);
      return Array.from({ length: 6 }, () => r.nextGaussian());
    };
    // Calls 2, 4, 6 come from the cache, so they never consume state:
    const r = new Random(99n);
    const a = r.nextGaussian();
    const b = r.nextGaussian();
    const c = r.nextGaussian();
    const d = r.nextGaussian();
    expect(gaussians(99n).slice(0, 4)).toEqual([a, b, c, d]);
    const r2 = new Random(99n);
    r2.nextGaussian();
    const longBefore = new Random(99n);
    longBefore.nextGaussian();
    const second = r2.nextGaussian();
    expect(second).toBe(b);
    expect(r2.nextLong()).toBe(longBefore.nextLong());
  });

  it('strict log agrees with Math.log across every internal branch', () => {
    // Feed nextDouble pairs (d, 0.5) so v1 = 2d-1 and v2 = 0, giving s = v1^2.
    class Scripted extends Random {
      private readonly queue: number[];
      constructor(values: number[]) {
        super(0n);
        this.queue = [...values];
      }
      override nextDouble(): number {
        return this.queue.shift() ?? 0.5;
      }
    }
    const radii = [
      0.5, 0.25, 0.125, 0.5 * (1 + 2 ** -24), 0.8367, 1 - 2 ** -22 + 2 ** -26, 1 - 2 ** -22, 1 - 2 ** -30,
      0.99, 0.9, 0.7, 0.4, 0.2, 0.05, 1e-3, 1e-9,
    ];
    for (const radius of radii) {
      const d = (1 + radius) / 2;
      const v1 = 2 * d - 1; // the exact value nextGaussian sees
      const expected = v1 * Math.sqrt((-2 * Math.log(v1 * v1)) / (v1 * v1));
      const actual = new Scripted([d, 0.5]).nextGaussian();
      expect(actual / expected, `v1=${v1} a=${actual} e=${expected}`).toBeCloseTo(1, 12);
    }
  });
});
