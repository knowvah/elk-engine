// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { identityHashCode } from '../lang/IdentityHashCode.js';
import * as JavaObjects from './JavaObjects.js';

class Valued {
  constructor(private readonly v: number) {}
  equals(o: unknown): boolean {
    return o instanceof Valued && o.v === this.v;
  }
  hashCode(): number {
    return this.v * 31;
  }
}

describe('JavaObjects.equals', () => {
  it('equates null only with null', () => {
    expect(JavaObjects.equals(null, null)).toBe(true);
    expect(JavaObjects.equals(null, 'a')).toBe(false);
    expect(JavaObjects.equals('a', null)).toBe(false);
  });

  it('uses value equals when defined and identity otherwise', () => {
    expect(JavaObjects.equals(new Valued(2), new Valued(2))).toBe(true);
    expect(JavaObjects.equals(new Valued(2), new Valued(3))).toBe(false);
    expect(JavaObjects.equals({}, {})).toBe(false);
    const o = {};
    expect(JavaObjects.equals(o, o)).toBe(true);
  });

  it('follows Double.equals for NaN and signed zero', () => {
    expect(JavaObjects.equals(Number.NaN, Number.NaN)).toBe(true);
    expect(JavaObjects.equals(0, -0)).toBe(false);
  });
});

describe('JavaObjects.hashCode', () => {
  it('hashes null as 0 and strings, booleans as Java does', () => {
    expect(JavaObjects.hashCode(null)).toBe(0);
    expect(JavaObjects.hashCode('ab')).toBe(3105);
    expect(JavaObjects.hashCode(true)).toBe(1231);
    expect(JavaObjects.hashCode(false)).toBe(1237);
  });

  it('hashes int32 numbers as Integer and others as Double', () => {
    expect(JavaObjects.hashCode(7)).toBe(7);
    expect(JavaObjects.hashCode(1.0)).toBe(1);
    expect(JavaObjects.hashCode(1.5)).toBe(1073217536);
  });

  it('uses the object hashCode or the identity hash', () => {
    expect(JavaObjects.hashCode(new Valued(2))).toBe(62);
    const o = {};
    expect(JavaObjects.hashCode(o)).toBe(identityHashCode(o));
  });
});

describe('JavaObjects.toString', () => {
  it('renders null, Integer and Double texts', () => {
    expect(JavaObjects.toString(null)).toBe('null');
    expect(JavaObjects.toString(3)).toBe('3');
    expect(JavaObjects.toString(1.5)).toBe('1.5');
    expect(JavaObjects.toString(1e10)).toBe('1.0E10');
    expect(JavaObjects.toString('x')).toBe('x');
    expect(JavaObjects.toString(true)).toBe('true');
  });
});
