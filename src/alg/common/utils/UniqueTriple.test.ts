// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Direction } from '../polyomino/structures/Direction.js';
import { UniqueTriple } from './UniqueTriple.js';

describe('UniqueTriple', () => {
  it('returns its three values', () => {
    const triple = new UniqueTriple(Direction.EAST, 3, 7);
    expect(triple.getFirst()).toBe(Direction.EAST);
    expect(triple.getSecond()).toBe(3);
    expect(triple.getThird()).toBe(7);
  });

  it('prints as "(first, second, third)"', () => {
    expect(new UniqueTriple(Direction.NORTH, 1, 2).toString()).toBe('(NORTH, 1, 2)');
  });

  it('has identity semantics: equal members do not make equal triples (no equals/hashCode in Java)', () => {
    const a = new UniqueTriple(Direction.NORTH, 1, 2);
    const b = new UniqueTriple(Direction.NORTH, 1, 2);
    expect(a).not.toBe(b);
    expect(new Set([a, b, a]).size).toBe(2);
    expect(new Map([[a, 'a']]).get(b)).toBeUndefined();
  });
});
