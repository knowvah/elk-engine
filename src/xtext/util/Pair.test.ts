// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Pair } from './Pair.js';
import { Tuples } from './Tuples.js';

describe('Pair', () => {
  it('exposes its elements', () => {
    const pair = Tuples.pair('x', 2);
    expect(pair).toBeInstanceOf(Pair);
    expect(pair.getFirst()).toBe('x');
    expect(pair.getSecond()).toBe(2);
    expect(pair.toString()).toBe('Pair(x, 2)');
  });

  it('is value equal with identity equal objects and Java hash', () => {
    const key = {};
    const a = Tuples.pair(key, 'fqn');
    const b = Tuples.pair(key, 'fqn');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(a)).toBe(true);
    expect(a.hashCode()).toBe(b.hashCode());
    expect(Tuples.pair('a', 'b').hashCode()).toBe(97 + 17 * 98);
  });

  it('differs on either element, null and foreign objects', () => {
    const key = {};
    const a = Tuples.pair(key, 'fqn');
    expect(a.equals(Tuples.pair({}, 'fqn'))).toBe(false);
    expect(a.equals(Tuples.pair(key, 'other'))).toBe(false);
    expect(a.equals(null)).toBe(false);
    expect(a.equals('Pair')).toBe(false);
  });

  it('handles null elements', () => {
    expect(Tuples.pair(null, null).equals(Tuples.pair(null, null))).toBe(true);
    expect(Tuples.pair(null, null).hashCode()).toBe(0);
    expect(Tuples.pair(null, 'a').equals(Tuples.pair('a', 'a'))).toBe(false);
    expect(Tuples.pair('a', null).equals(Tuples.pair('a', 'b'))).toBe(false);
    expect(Tuples.pair('a', null).hashCode()).toBe(97);
  });
});
