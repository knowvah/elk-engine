// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Random } from '../../../../java/util/Random.js';
import { RandVal } from './RandVal.js';

interface RandValRow {
  readonly id: string;
  readonly seed: number;
  readonly kind: 'exact' | 'minMax' | 'gaussian';
  readonly params: Record<string, number>;
  readonly draws: { readonly val: number[]; readonly intVal: number[]; readonly floatVal: number[] };
}

const VECTORS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../test/golden/refs/java/grandom-generate.json',
);
const DRAW_COUNT = 20;
const rows = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { rows: { id: string; kind: string }[] }).rows.filter(
  (row) => row.id.startsWith('randval-'),
) as unknown as RandValRow[];

function build(row: RandValRow): RandVal {
  switch (row.kind) {
    case 'exact':
      return RandVal.exact(row.params['exact']!);
    case 'minMax':
      return RandVal.minMax(row.params['min']!, row.params['max']!);
    case 'gaussian':
      return RandVal.gaussian(row.params['mean']!, row.params['stddv']!);
  }
}

function draws(row: RandValRow, pick: (rv: RandVal, r: Random) => number): number[] {
  const rv = build(row);
  const r = new Random(BigInt(row.seed));
  return Array.from({ length: DRAW_COUNT }, () => pick(rv, r));
}

describe('RandVal replay of the JVM vectors', () => {
  it('has the 12 recorded rows', () => {
    expect(rows).toHaveLength(12);
  });

  describe.each(rows)('$id', (row) => {
    it('val equals the recorded doubles (Double.toString round-trips)', () => {
      expect(draws(row, (rv, r) => rv.val(r))).toEqual(row.draws.val);
    });
    it('intVal equals the recorded ints', () => {
      expect(draws(row, (rv, r) => rv.intVal(r))).toEqual(row.draws.intVal);
    });
    it('floatVal equals the recorded floats (Float.toString text, fround of the parsed value)', () => {
      expect(draws(row, (rv, r) => rv.floatVal(r))).toEqual(row.draws.floatVal.map((f) => Math.fround(f)));
    });
  });

  it('a gaussian second val consumes the cached Gaussian of the first pair', () => {
    const row = rows.find((candidate) => candidate.id === 'randval-gaussian-10-3')!;
    expect(draws(row, (rv, r) => rv.val(r)).slice(0, 2)).toEqual(row.draws.val.slice(0, 2));
    const r = new Random(5n);
    const g1 = r.nextGaussian();
    const g2 = r.nextGaussian();
    expect([g1 * 3 + 10, g2 * 3 + 10]).toEqual(row.draws.val.slice(0, 2));
  });
});

describe('RandVal branches', () => {
  it('allNil behaves as gaussian(0, 0): one nextGaussian per val, result 0', () => {
    const r = new Random(6n);
    const witness = new Random(6n);
    expect(RandVal.allNil().val(r)).toBe(0);
    witness.nextGaussian();
    expect(r.nextDouble()).toBe(witness.nextDouble());
  });

  it('defaultVal and defaultInt read the exact field only', () => {
    expect(RandVal.exact(2.5).defaultVal()).toBe(2.5);
    expect(RandVal.exact(2.5).defaultInt()).toBe(3);
    expect(RandVal.exact(0.3).defaultInt()).toBe(0);
    expect(RandVal.exact(-1.5).defaultInt()).toBe(-1);
    expect(RandVal.minMax(1, 9).defaultVal()).toBe(0);
    expect(RandVal.allNil().defaultInt()).toBe(0);
  });

  it('exact does not draw from the Random', () => {
    const r = new Random(1n);
    RandVal.exact(4).val(r);
    expect(r.nextDouble()).toBe(new Random(1n).nextDouble());
  });

  it('setters and getters', () => {
    const rv = RandVal.minMax(1, 2);
    expect([rv.min(), rv.max()]).toEqual([1, 2]);
    rv.setMin(3);
    rv.setMax(3);
    expect([rv.min(), rv.max(), rv.val(new Random(1n))]).toEqual([3, 3, 3]);
    const g = RandVal.allNil();
    g.setMean(10);
    g.setStddv(0);
    expect(g.val(new Random(1n))).toBe(10);
  });

  it('negative results clamp to 0', () => {
    expect(RandVal.exact(-3).val(new Random(1n))).toBe(0);
    expect(RandVal.exact(-3).intVal(new Random(1n))).toBe(0);
  });
});
