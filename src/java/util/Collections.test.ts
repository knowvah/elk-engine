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
  readonly value: unknown;
}
interface Case {
  readonly seed: string;
  readonly calls: Call[];
}

const VECTORS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../test/golden/refs/java/random.json');
const cases = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { cases: Case[] }).cases;

/** Advances the generator exactly as the JVM harness did between shuffles. */
function advance(rnd: Random, call: Call): void {
  switch (call.method) {
    case 'nextInt':
      rnd.nextInt();
      break;
    case 'nextIntBound':
      rnd.nextInt(call.arg as number);
      break;
    case 'nextLong':
      rnd.nextLong();
      break;
    case 'nextBoolean':
      rnd.nextBoolean();
      break;
    case 'nextDouble':
      rnd.nextDouble();
      break;
    case 'nextFloat':
      rnd.nextFloat();
      break;
    case 'nextGaussian':
      rnd.nextGaussian();
      break;
    default:
      throw new Error(`unknown vector method ${call.method}`);
  }
}

describe('shuffle', () => {
  it.each(cases.map((c) => [c.seed, c] as const))('seed %s matches JVM permutations', (_s, c) => {
    const rnd = new Random(BigInt(c.seed));
    let shuffles = 0;
    for (const call of c.calls) {
      if (call.method !== 'shuffle') {
        advance(rnd, call);
        continue;
      }
      const list = [...(call.arg as number[])];
      shuffle(list, rnd);
      expect(list).toEqual(call.value);
      shuffles++;
    }
    expect(shuffles).toBe(4);
  });

  it('is in place and preserves elements', () => {
    const list = ['a', 'b', 'c', 'd'];
    const same = list;
    shuffle(list, new Random(5n));
    expect(list).toBe(same);
    expect([...list].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('consumes no randomness for lists of size 0 or 1', () => {
    const used = new Random(3n);
    shuffle([], used);
    shuffle([1], used);
    expect(used.nextLong()).toBe(new Random(3n).nextLong());
  });
});
