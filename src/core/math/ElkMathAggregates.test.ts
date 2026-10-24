// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArithmeticException } from '../../java/lang/ArithmeticException.js';
import { KVector } from './KVector.js';
import {
  averagei,
  boundd,
  boundf,
  boundi,
  boundl,
  clipVector,
  maxd,
  maxf,
  maxi,
  maxl,
  mind,
  minf,
  minl,
  signum,
} from './ElkMath.js';

describe('ElkMathAggregates', () => {
  it('start values match the Java for empty input', () => {
    expect(maxi()).toBe(-2147483648);
    expect(maxl()).toBe(-2147483648n);
    expect(minl()).toBe(2147483647n);
    expect(maxf()).toBe(-3.4028234663852886e38);
    expect(minf()).toBe(3.4028234663852886e38);
    expect(maxd()).toBe(-Number.MAX_VALUE);
    expect(mind()).toBe(Number.MAX_VALUE);
  });

  it('maxl and minl pick extremes', () => {
    expect(maxl(3n, 9n, -2n)).toBe(9n);
    expect(minl(3n, 9n, -2n)).toBe(-2n);
  });

  it('averagei truncates toward zero and throws on empty input', () => {
    expect(averagei(5, 8, 2, 1)).toBe(4);
    expect(averagei(-7, 0)).toBe(-3);
    expect(() => averagei()).toThrow(ArithmeticException);
  });

  it('bound functions clamp', () => {
    expect(boundi(5, 1, 3)).toBe(3);
    expect(boundl(-5n, 1n, 3n)).toBe(1n);
    expect(boundl(2n, 1n, 3n)).toBe(2n);
    expect(boundf(0.5, 1, 3)).toBe(1);
    expect(boundd(2.5, 1, 3)).toBe(2.5);
    expect(boundd(9, 1, 3)).toBe(3);
    expect(boundl(9n, 1n, 3n)).toBe(3n);
    expect(boundf(9, 1, 3)).toBe(3);
    expect(boundf(2.5, 1, 3)).toBe(2.5);
    expect(boundd(0, 1, 3)).toBe(1);
  });

  it('clipVector scales by the smaller factor and returns the same vector', () => {
    const v = new KVector(10, 5);
    expect(clipVector(v, 4, 4)).toBe(v);
    expect([v.x, v.y]).toEqual([2, 1]);
    const inside = new KVector(1, 1);
    clipVector(inside, 4, 4);
    expect([inside.x, inside.y]).toEqual([1, 1]);
    const tall = new KVector(1, 8);
    clipVector(tall, 4, 4);
    expect([tall.x, tall.y]).toEqual([0.25, 2]);
  });

  it('signum returns -1, 0, 1', () => {
    expect(signum(-0.5)).toBe(-1);
    expect(signum(3)).toBe(1);
    expect(signum(0)).toBe(0);
    expect(signum(NaN)).toBe(0);
  });
});
