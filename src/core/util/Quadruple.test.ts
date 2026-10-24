// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { Quadruple } from './Quadruple.js';

describe('Quadruple', () => {
  it('exposes members', () => {
    const q = new Quadruple('a', 2, true, 'd');
    expect([q.getFirst(), q.getSecond(), q.getThird(), q.getFourth()]).toEqual(['a', 2, true, 'd']);
  });

  it('hashCode of all nulls is 31^4 = 923521', () => {
    expect(new Quadruple(null, null, null, null).hashCode()).toBe(923521);
  });

  it('hashCode follows Arrays.hashCode with Integer, String, null, Boolean', () => {
    // ((((1*31+1)*31+97)*31+0)*31+1231)
    expect(new Quadruple(1, 'a', null, true).hashCode()).toBe(1047760);
  });

  it('toString with nulls', () => {
    expect(new Quadruple(null, null, null, null).toString()).toBe('(null, null, null, null)');
    expect(new Quadruple(1, 'a', null, true).toString()).toBe('(1, a, null, true)');
  });

  it('equals compares all four members', () => {
    const a = new Quadruple(1, 'a', null, true);
    expect(a.equals(new Quadruple(1, 'a', null, true))).toBe(true);
    expect(a.equals(new Quadruple(1, 'a', null, false))).toBe(false);
    expect(a.equals(new Quadruple(1, 'b', null, true))).toBe(false);
  });

  it('equals throws ClassCastException for a non-Quadruple', () => {
    expect(() => new Quadruple(1, 2, 3, 4).equals('x')).toThrow(ClassCastException);
  });
});
