// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../java/lang/UnsupportedOperationException.js';
import * as ImmutableSet from './ImmutableSet.js';

describe('ImmutableSet.copyOf', () => {
  it('drops duplicates and keeps first-occurrence order', () => {
    const s = ImmutableSet.copyOf([3, 1, 3]);
    expect([...s]).toEqual([3, 1]);
    expect(s.size).toBe(2);
    expect(s.has(1)).toBe(true);
    expect(s.has(2)).toBe(false);
  });

  it('copies: later changes to the source do not show through', () => {
    const src = new Set([1]);
    const s = ImmutableSet.copyOf(src);
    src.add(2);
    expect([...s]).toEqual([1]);
  });

  it('rejects every mutator', () => {
    const s = ImmutableSet.copyOf([1]) as Set<number>;
    expect(() => s.add(2)).toThrow(UnsupportedOperationException);
    expect(() => s.delete(1)).toThrow(UnsupportedOperationException);
    expect(() => s.clear()).toThrow(UnsupportedOperationException);
    expect([...s]).toEqual([1]);
  });

  it('rejects null and undefined elements', () => {
    expect(() => ImmutableSet.copyOf([1, null])).toThrow(TypeError);
    expect(() => ImmutableSet.copyOf([undefined])).toThrow(TypeError);
  });
});

describe('ImmutableSet.of', () => {
  it('keeps argument order minus duplicates', () => {
    expect([...ImmutableSet.of('b', 'a', 'b')]).toEqual(['b', 'a']);
    expect([...ImmutableSet.of()]).toEqual([]);
  });

  it('is frozen', () => {
    expect(() => (ImmutableSet.of(1) as Set<number>).add(2)).toThrow(UnsupportedOperationException);
  });
});
