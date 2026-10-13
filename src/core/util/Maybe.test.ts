// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import { Maybe } from './Maybe.js';

/** A value-equal element with its own `equals` / `hashCode` / `toString`. */
class Key {
  constructor(readonly v: number) {}
  equals(o: unknown): boolean {
    return o instanceof Key && o.v === this.v;
  }
  hashCode(): number {
    return this.v;
  }
  toString(): string {
    return `K${this.v}`;
  }
}

describe('Maybe', () => {
  it('create and the no-argument constructor give an empty maybe', () => {
    const created = Maybe.create<string>();
    expect(created.get()).toBeNull();
    expect(created.isEmpty()).toBe(true);
    expect(new Maybe<string>().get()).toBeNull();
  });

  it('the one-argument constructor holds the object', () => {
    const m = new Maybe('a');
    expect(m.get()).toBe('a');
    expect(m.isEmpty()).toBe(false);
  });

  it('set replaces the object and clear empties it', () => {
    const m = new Maybe<number>();
    m.set(3);
    expect([m.get(), m.isEmpty()]).toEqual([3, false]);
    m.set(null);
    expect(m.isEmpty()).toBe(true);
    m.set(4);
    m.clear();
    expect([m.get(), m.isEmpty()]).toEqual([null, true]);
  });

  it('equals compares empties, then contents by value', () => {
    expect(new Maybe().equals(new Maybe())).toBe(true);
    expect(new Maybe().equals(new Maybe('a'))).toBe(false);
    expect(new Maybe('a').equals(new Maybe())).toBe(false);
    expect(new Maybe('a').equals(new Maybe('a'))).toBe(true);
    expect(new Maybe('a').equals(new Maybe('b'))).toBe(false);
    expect(new Maybe(new Key(1)).equals(new Maybe(new Key(1)))).toBe(true);
    expect(new Maybe(new Key(1)).equals(new Maybe(new Key(2)))).toBe(false);
  });

  it('equals is false for a non-Maybe, and identity-only for plain objects', () => {
    expect(new Maybe('a').equals('a')).toBe(false);
    expect(new Maybe('a').equals(null)).toBe(false);
    const o = {};
    expect(new Maybe(o).equals(new Maybe(o))).toBe(true);
    expect(new Maybe({}).equals(new Maybe({}))).toBe(false);
  });

  it('hashCode is 0 when empty and the element hash otherwise', () => {
    expect(new Maybe().hashCode()).toBe(0);
    expect(new Maybe('a').hashCode()).toBe(97);
    expect(new Maybe('ab').hashCode()).toBe(3105);
    expect(new Maybe(7).hashCode()).toBe(7);
    expect(new Maybe(1.5).hashCode()).toBe(1073217536);
    expect(new Maybe(true).hashCode()).toBe(1231);
    expect(new Maybe(false).hashCode()).toBe(1237);
    expect(new Maybe(new Key(42)).hashCode()).toBe(42);
    const o = {};
    expect(new Maybe(o).hashCode()).toBe(new Maybe(o).hashCode());
  });

  it('toString wraps the element text', () => {
    expect(new Maybe().toString()).toBe('maybe(null)');
    expect(new Maybe('a').toString()).toBe('maybe(a)');
    expect(new Maybe(3).toString()).toBe('maybe(3)');
    expect(new Maybe(1.5).toString()).toBe('maybe(1.5)');
    expect(new Maybe(2 ** 40).toString()).toBe('maybe(1.099511627776E12)');
    expect(new Maybe(new Key(5)).toString()).toBe('maybe(K5)');
  });

  it('iterator yields the single element once, then is exhausted', () => {
    const it = new Maybe('a').iterator();
    expect(it.hasNext()).toBe(true);
    expect(it.next()).toBe('a');
    expect(it.hasNext()).toBe(false);
    expect(() => it.next()).toThrow(NoSuchElementException);
  });

  it('iterator of an empty maybe has no next', () => {
    const it = new Maybe<string>().iterator();
    expect(it.hasNext()).toBe(false);
    expect(() => it.next()).toThrow(NoSuchElementException);
  });

  it('iterator remove empties the maybe after next, and is illegal before', () => {
    const m = new Maybe('a');
    const it = m.iterator();
    expect(() => it.remove()).toThrow(IllegalStateException);
    expect(m.get()).toBe('a');
    it.next();
    it.remove();
    expect(m.isEmpty()).toBe(true);
    expect(() => new Maybe<string>().iterator().remove()).toThrow(IllegalStateException);
  });

  it('is a JavaScript iterable over the element', () => {
    expect([...new Maybe('a')]).toEqual(['a']);
    expect([...new Maybe<string>()]).toEqual([]);
  });
});
