// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { add, div, fromDouble, mul, sub } from './Float32.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/numeric.json', import.meta.url);
const BITS_BYTES = 8;
const HEX_RADIX = 16;

type F32Row = readonly [string, string, string, string];
type D2fRow = readonly [string, string];
interface Vectors {
  readonly f32: readonly F32Row[];
  readonly d2f: readonly D2fRow[];
}

const scratch = new DataView(new ArrayBuffer(BITS_BYTES));

function fromHex(hex: string): number {
  scratch.setBigUint64(0, BigInt(`0x${hex}`));
  return scratch.getFloat64(0);
}

function toHex(x: number): string {
  scratch.setFloat64(0, x);
  return scratch.getBigUint64(0).toString(HEX_RADIX).padStart(BITS_BYTES * 2, '0');
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as Vectors;
const OPS = { add, sub, mul, div } as const;

describe('Float32', () => {
  it('fromDouble replays every d2f vector bit-exactly', () => {
    expect(vectors.d2f.length).toBe(72);
    for (const [d, f] of vectors.d2f) {
      expect(toHex(fromDouble(fromHex(d))), d).toBe(f);
    }
  });

  it('add/sub/mul/div replay every f32 vector bit-exactly', () => {
    expect(vectors.f32.length).toBe(2704);
    for (const [op, a, b, expected] of vectors.f32) {
      const fn = OPS[op as keyof typeof OPS];
      expect(toHex(fn(fromHex(a), fromHex(b))), `${op} ${a} ${b}`).toBe(expected);
    }
  });
});
