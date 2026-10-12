// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { Comparable } from '../../java/lang/Comparable.js';
import { MapPropertyHolder } from './MapPropertyHolder.js';
import { Property } from './Property.js';
import { PropertyHolderComparator } from './PropertyHolderComparator.js';

class Rank implements Comparable<Rank> {
  constructor(readonly level: number) {}
  compareTo(other: Rank): number {
    return this.level - other.level;
  }
}

function holderWith<T>(property: Property<T>, value: T | null): MapPropertyHolder {
  return new MapPropertyHolder().setProperty(property, value);
}

describe('PropertyHolderComparator', () => {
  const NUMBER = new Property<number>('test.number');

  it('sorts holders by an integer property with unset values last', () => {
    const three = holderWith(NUMBER, 3);
    const unset = holderWith(NUMBER, null);
    const one = holderWith(NUMBER, 1);
    const sorted = [three, unset, one].sort(PropertyHolderComparator.with(NUMBER));
    expect(sorted).toEqual([one, three, unset]);
    expect(sorted[0]).toBe(one);
    expect(sorted[1]).toBe(three);
    expect(sorted[2]).toBe(unset);
  });

  it('returns 0 when both values are unset', () => {
    const compare = PropertyHolderComparator.with(NUMBER);
    expect(compare(holderWith(NUMBER, null), holderWith(NUMBER, null))).toBe(0);
  });

  it('returns -1 when only the second value is unset and 1 when only the first is', () => {
    const compare = PropertyHolderComparator.with(NUMBER);
    expect(compare(holderWith(NUMBER, 5), holderWith(NUMBER, null))).toBe(-1);
    expect(compare(holderWith(NUMBER, null), holderWith(NUMBER, 5))).toBe(1);
  });

  it('compares numbers with Double.compare semantics', () => {
    const compare = PropertyHolderComparator.with(NUMBER);
    expect(compare(holderWith(NUMBER, 2), holderWith(NUMBER, 2))).toBe(0);
    expect(compare(holderWith(NUMBER, 2), holderWith(NUMBER, 1))).toBe(1);
    expect(compare(holderWith(NUMBER, 1), holderWith(NUMBER, 2))).toBe(-1);
  });

  it('compares strings by UTF-16 code unit difference like String.compareTo', () => {
    const name = new Property<string>('test.name');
    const compare = PropertyHolderComparator.with(name);
    expect(compare(holderWith(name, 'a'), holderWith(name, 'c'))).toBe(-2);
    expect(compare(holderWith(name, 'abc'), holderWith(name, 'a'))).toBe(2);
  });

  it('compares booleans with false before true', () => {
    const flag = new Property<boolean>('test.flag');
    const compare = PropertyHolderComparator.with(flag);
    expect(compare(holderWith(flag, false), holderWith(flag, true))).toBe(-1);
    expect(compare(holderWith(flag, true), holderWith(flag, false))).toBe(1);
    expect(compare(holderWith(flag, true), holderWith(flag, true))).toBe(0);
  });

  it('delegates to compareTo for Comparable values', () => {
    const rank = new Property<Rank>('test.rank');
    const compare = PropertyHolderComparator.with(rank);
    expect(compare(holderWith(rank, new Rank(9)), holderWith(rank, new Rank(4)))).toBe(5);
  });
});
