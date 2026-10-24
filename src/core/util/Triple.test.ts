// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { Triple } from './Triple.js';

describe('Triple', () => {
  it('exposes members', () => {
    const t = new Triple('a', 2, true);
    expect([t.getFirst(), t.getSecond(), t.getThird()]).toEqual(['a', 2, true]);
  });

  it('hashCode follows Arrays.hashCode: ((31+97)*31+2)*31+0 with null', () => {
    expect(new Triple('a', 2, null).hashCode()).toBe(123070);
  });

  it('hashCode of all nulls is 31^3 = 29791', () => {
    expect(new Triple(null, null, null).hashCode()).toBe(29791);
  });

  it('equal members give equal triples and hashes', () => {
    const a = new Triple('a', 2, null);
    const b = new Triple('a', 2, null);
    expect(a.equals(b)).toBe(true);
    expect(a.hashCode()).toBe(b.hashCode());
    expect(a.equals(new Triple('a', 3, null))).toBe(false);
    expect(a.equals(new Triple('a', 2, 'x'))).toBe(false);
  });

  it('equals throws ClassCastException for a non-Triple', () => {
    expect(() => new Triple(1, 2, 3).equals('x')).toThrow(ClassCastException);
  });

  it('toString prints null members as "null"', () => {
    expect(new Triple('a', 2, null).toString()).toBe('(a, 2, null)');
  });
});
