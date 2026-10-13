// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { IFactory } from './IFactory.js';
import { InstancePool } from './InstancePool.js';

/** Factory handing out numbered objects and recording the order of `destroy` calls. */
class CountingFactory implements IFactory<{ id: number }> {
  readonly destroyed: number[] = [];
  private next = 0;
  create(): { id: number } {
    return { id: this.next++ };
  }
  destroy(obj: { id: number }): void {
    this.destroyed.push(obj.id);
  }
}

describe('InstancePool', () => {
  it('INFINITE is -1', () => {
    expect(InstancePool.INFINITE).toBe(-1);
  });

  it('with limit 2 keeps two released instances and destroys the third', () => {
    const factory = new CountingFactory();
    const pool = new InstancePool(factory, 2);
    const [a, b, c] = [pool.fetch(), pool.fetch(), pool.fetch()];
    expect([a.id, b.id, c.id]).toEqual([0, 1, 2]);
    pool.release(a);
    pool.release(b);
    pool.release(c);
    expect(factory.destroyed).toEqual([2]);
    expect(pool.fetch()).toBe(a);
    expect(pool.fetch()).toBe(b);
    expect(pool.fetch().id).toBe(3);
  });

  it('without a limit keeps everything', () => {
    const factory = new CountingFactory();
    const pool = new InstancePool(factory);
    const objs = [pool.fetch(), pool.fetch(), pool.fetch()];
    objs.forEach((o) => pool.release(o));
    expect(factory.destroyed).toEqual([]);
    expect(pool.fetch()).toBe(objs[0]);
  });

  it('clear destroys held instances in order and empties the pool', () => {
    const factory = new CountingFactory();
    const pool = new InstancePool(factory);
    const [a, b] = [pool.fetch(), pool.fetch()];
    pool.release(b);
    pool.release(a);
    pool.clear();
    expect(factory.destroyed).toEqual([1, 0]);
    expect(pool.fetch().id).toBe(2);
  });
});
