// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkMath, boundi } from './ElkMath.js';

describe('ElkMath.boundi', () => {
  it.each([
    [5, 1, 3, 3],
    [-2, 1, 3, 1],
    [2, 1, 3, 2],
    [1, 1, 3, 1],
    [3, 1, 3, 3],
  ])('boundi(%i, %i, %i) = %i', (x, lower, upper, expected) => {
    expect(boundi(x, lower, upper)).toBe(expected);
  });

  it('returns lower when lower > upper because x <= lower is tested first', () => {
    expect(boundi(1, 1, 0)).toBe(1);
  });

  it('is reachable through the ElkMath namespace object as in Java', () => {
    expect(ElkMath.boundi).toBe(boundi);
  });
});
