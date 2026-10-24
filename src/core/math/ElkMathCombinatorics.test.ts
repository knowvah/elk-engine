// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { FACT_TABLE, binomiald, binomiall, factd, factl, powd, powf } from './ElkMath.js';

describe('ElkMathCombinatorics', () => {
  it('FACT_TABLE has 21 entries ending in 20!', () => {
    expect(FACT_TABLE).toHaveLength(21);
    expect(FACT_TABLE[5]).toBe(120n);
  });

  it('factl error message names the table length', () => {
    expect(() => factl(21)).toThrow('The input must be between 0 and 21');
  });

  it('factd returns table values and rejects negatives', () => {
    expect(factd(20)).toBe(2432902008176640000);
    expect(() => factd(-1)).toThrow('The input must be positive');
  });

  it('factd uses Stirling beyond the table (approximates 21!)', () => {
    expect(factd(21) / 51090942171709440000).toBeCloseTo(1, 2);
  });

  it('binomiall covers the factorial branch, the recursive branch and errors', () => {
    expect(binomiall(5, 2)).toBe(10n);
    expect(binomiall(0, 0)).toBe(1n);
    expect(binomiall(21, 10)).toBe(352716n);
    expect(() => binomiall(2, 3)).toThrow('k must be smaller than n');
    expect(() => binomiall(2, -1)).toThrow(IllegalArgumentException);
  });

  it('binomiald covers exact and error branches', () => {
    expect(binomiald(5, 2)).toBe(10);
    expect(() => binomiald(2, 3)).toThrow('k must be smaller than n');
    expect(() => binomiald(-1, 0)).toThrow('k and n must be positive');
  });

  it('powd and powf handle odd, even and negative exponents', () => {
    expect(powd(2, 10)).toBe(1024);
    expect(powd(2, -3)).toBe(0.125);
    expect(powf(3, 5)).toBe(243);
    expect(powf(2, -2)).toBe(0.25);
  });

  it('powf rounds each step to float (overflows to Infinity like a float)', () => {
    expect(powf(10, 40)).toBe(Infinity);
    expect(powd(10, 40)).toBe(1e40);
  });
});
