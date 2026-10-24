// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { AbstractRandomListAccessor } from './AbstractRandomListAccessor.js';

class Accessor extends AbstractRandomListAccessor<string> {
  provided = 0;

  constructor() {
    super();
  }

  protected override provideDefault(): string {
    this.provided++;
    return `d${this.provided}`;
  }

  get(i: number): string {
    return this.getListItem(i);
  }

  set(i: number, v: string): void {
    this.setListItem(i, v);
  }

  size(): number {
    return this.getListSize();
  }

  clear(): void {
    this.clearList();
  }
}

describe('AbstractRandomListAccessor', () => {
  it('getListItem grows the list with defaults up to the index', () => {
    const a = new Accessor();
    expect(a.get(5)).toBe('d6');
    expect(a.size()).toBe(6);
    expect(a.get(0)).toBe('d1');
    expect(a.provided).toBe(6);
  });

  it('setListItem within the list replaces the item', () => {
    const a = new Accessor();
    a.get(2);
    a.set(1, 'x');
    expect(a.get(1)).toBe('x');
    expect(a.size()).toBe(3);
  });

  it('setListItem past the end fills only the gap', () => {
    const a = new Accessor();
    a.set(3, 'x');
    expect(a.provided).toBe(3);
    expect(a.size()).toBe(4);
    expect(a.get(3)).toBe('x');
    expect(a.get(2)).toBe('d3');
  });

  it('rejects negative indices', () => {
    const a = new Accessor();
    expect(() => a.get(-1)).toThrow(IndexOutOfBoundsException);
    expect(() => a.set(-2, 'x')).toThrow('Invalid index: -2');
  });

  it('clearList empties the list', () => {
    const a = new Accessor();
    a.get(2);
    a.clear();
    expect(a.size()).toBe(0);
  });
});
