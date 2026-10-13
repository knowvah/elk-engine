// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Pair } from './Pair.js';

/** A value-equal key with its own `equals` / `hashCode` / `compareTo`. */
class Key {
  constructor(readonly v: number) {}
  equals(o: unknown): boolean {
    return o instanceof Key && o.v === this.v;
  }
  hashCode(): number {
    return this.v;
  }
  compareTo(o: Key): number {
    return this.v - o.v;
  }
  toString(): string {
    return `K${this.v}`;
  }
}

describe('Pair', () => {
  it('create gives null elements and of gives both', () => {
    const empty = Pair.create<string, number>();
    expect(empty.getFirst()).toBeNull();
    expect(empty.getSecond()).toBeNull();
    const p = Pair.of('a', 2);
    expect([p.getFirst(), p.getSecond()]).toEqual(['a', 2]);
  });

  it('fromMap yields one pair per entry in map order', () => {
    const list = Pair.fromMap(
      new Map([
        ['x', 1],
        ['y', 2],
      ]),
    );
    expect(list.map((p) => p.toString())).toEqual(['pair(x,1)', 'pair(y,2)']);
  });

  it('setters and clear', () => {
    const p = Pair.of('a', 'b');
    p.setFirst('c');
    p.setSecond('d');
    expect([p.getFirst(), p.getSecond()]).toEqual(['c', 'd']);
    p.clear();
    expect([p.getFirst(), p.getSecond()]).toEqual([null, null]);
  });

  it('equals is value equality over both elements', () => {
    expect(Pair.of('a', 1).equals(Pair.of('a', 1))).toBe(true);
    expect(Pair.of(new Key(3), 1).equals(Pair.of(new Key(3), 1))).toBe(true);
    expect(Pair.of('a', 1).equals(Pair.of('a', 2))).toBe(false);
    expect(Pair.of('a', 1).equals(Pair.of('b', 1))).toBe(false);
    expect(Pair.create().equals(Pair.create())).toBe(true);
    expect(Pair.of('a', 1).equals(Pair.create())).toBe(false);
    expect(Pair.create().equals(Pair.of('a', 1))).toBe(false);
    expect(Pair.of('a', 1).equals('a')).toBe(false);
    const o = {};
    expect(Pair.of(o, 1).equals(Pair.of(o, 1))).toBe(true);
    expect(Pair.of(o, 1).equals(Pair.of({}, 1))).toBe(false);
  });

  it('hashCode combines the half words as in Java', () => {
    expect(Pair.of(1, 2).hashCode()).toBe(131073);
    expect(Pair.of(65536, 3).hashCode()).toBe(131072);
    expect(Pair.of(7, 0x50002).hashCode()).toBe(131074);
    expect(Pair.of(-65536, null).hashCode()).toBe(-65536);
    expect(Pair.create().hashCode()).toBe(0);
  });

  it('equal pairs have equal hash codes', () => {
    expect(Pair.of('abc', new Key(9)).hashCode()).toBe(Pair.of('abc', new Key(9)).hashCode());
  });

  it('hashes strings, doubles, booleans and identity objects', () => {
    // "a".hashCode() = 97
    expect(Pair.of('a', null).hashCode()).toBe(97);
    // Double.hashCode(0.5): bits 0x3FE0000000000000 -> 0x3FE00000
    expect(Pair.of(0.5, null).hashCode()).toBe(0x3fe00000 & -65536);
    // Boolean.hashCode: 1231 / 1237
    expect(Pair.of(true, null).hashCode()).toBe(1231);
    expect(Pair.of(false, null).hashCode()).toBe(1237);
    const o = {};
    expect(Pair.of(o, null).hashCode()).toBe(Pair.of(o, null).hashCode());
  });

  it('toString matches the Java format', () => {
    expect(Pair.create().toString()).toBe('pair(null,null)');
    expect(Pair.of(null, 'b').toString()).toBe('pair(null,b)');
    expect(Pair.of('a', null).toString()).toBe('pair(a,null)');
    expect(Pair.of('a', 'b').toString()).toBe('pair(a,b)');
    expect(Pair.of(1, 1.5).toString()).toBe('pair(1,1.5)');
    expect(Pair.of(1, 100000000).toString()).toBe('pair(1,100000000)');
    expect(Pair.of(1e10, 2).toString()).toBe('pair(1.0E10,2)');
  });

  it('iterates over the non-null elements, first before second', () => {
    expect([...Pair.of('a', 'b')]).toEqual(['a', 'b']);
    expect([...Pair.of('a', null)]).toEqual(['a']);
    expect([...Pair.of(null, 'b')]).toEqual(['b']);
    expect([...Pair.create()]).toEqual([]);
  });

  it('FirstComparator and SecondComparator order by the respective element', () => {
    const first = new Pair.FirstComparator<Key, string>();
    const second = new Pair.SecondComparator<string, Key>();
    expect(first.compare(Pair.of(new Key(1), 'z'), Pair.of(new Key(4), 'a'))).toBe(-3);
    expect(second.compare(Pair.of('a', new Key(9)), Pair.of('z', new Key(2)))).toBe(7);
  });
});
