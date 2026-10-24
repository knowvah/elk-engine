// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IDataProvider } from './IDataProvider.js';

/** Counting provider over strings; targets-for results are configurable. */
class CountingProvider extends IDataProvider<string, number> {
  commentCalls = 0;
  targetCalls = 0;
  targetsForCalls = 0;
  attached: [string, number][] = [];
  targetsFor: Map<string, number[]> = new Map();
  subs: IDataProvider<string, number>[] = [];

  provideComments(): string[] {
    this.commentCalls++;
    return ['c1', 'c2'];
  }
  provideTargets(): number[] {
    this.targetCalls++;
    return [3, 1, 2];
  }
  override provideTargetsFor(comment: string): Iterable<number> {
    this.targetsForCalls++;
    return this.targetsFor.get(comment) ?? super.provideTargetsFor(comment);
  }
  provideSubHierarchies(): IDataProvider<string, number>[] {
    return this.subs;
  }
  attach(comment: string, target: number): void {
    this.attached.push([comment, target]);
  }
}

describe('IDataProvider defaults', () => {
  it('provideTargetsFor delegates to provideTargets', () => {
    const p = new CountingProvider();
    expect([...p.provideTargetsFor('c1')]).toEqual([3, 1, 2]);
    expect(p.targetCalls).toBe(1);
  });
});

describe('IDataProvider.cached()', () => {
  it('caches comments and targets as arrays in provider order', () => {
    const p = new CountingProvider();
    const c = p.cached();
    expect(c.provideComments()).toEqual(['c1', 'c2']);
    expect(c.provideComments()).toBe(c.provideComments());
    expect(c.provideTargets()).toEqual([3, 1, 2]);
    expect(c.provideTargets()).toBe(c.provideTargets());
    expect(p.commentCalls).toBe(1);
    expect(p.targetCalls).toBe(1);
  });

  it('first provideTargetsFor returns the uncached collection, later calls the multimap set', () => {
    const p = new CountingProvider();
    p.targetsFor.set('c1', [5, 4, 5]);
    const c = p.cached();
    const first = c.provideTargetsFor('c1');
    expect(first).toBe(p.targetsFor.get('c1'));
    const second = c.provideTargetsFor('c1');
    expect(second).not.toBe(first);
    expect(second).toBeInstanceOf(Set);
    // HashMultimap values are a set: duplicates collapse, insertion order kept
    expect([...second]).toEqual([5, 4]);
    expect(p.targetsForCalls).toBe(1);
  });

  it('never caches an empty result: it is recomputed on every call', () => {
    const p = new CountingProvider();
    p.targetsFor.set('c1', []);
    const c = p.cached();
    c.provideTargetsFor('c1');
    c.provideTargetsFor('c1');
    c.provideTargetsFor('c1');
    expect(p.targetsForCalls).toBe(3);
    p.targetsFor.set('c1', [7]);
    expect([...c.provideTargetsFor('c1')]).toEqual([7]);
    expect(p.targetsForCalls).toBe(4);
  });

  it('default provideTargetsFor goes through the wrapped provider', () => {
    const p = new CountingProvider();
    const c = p.cached();
    expect([...c.provideTargetsFor('x')]).toEqual([3, 1, 2]);
    expect([...c.provideTargetsFor('x')]).toEqual([3, 1, 2]);
    expect(p.targetsForCalls).toBe(1);
  });

  it('wraps sub-hierarchies in cached providers once', () => {
    const sub = new CountingProvider();
    const p = new CountingProvider();
    p.subs = [sub];
    const c = p.cached();
    const subs = [...c.provideSubHierarchies()];
    expect(subs).toHaveLength(1);
    expect(subs[0]).not.toBe(sub);
    expect(c.provideSubHierarchies()).toBe(c.provideSubHierarchies());
    subs[0]?.provideComments();
    subs[0]?.provideComments();
    expect(sub.commentCalls).toBe(1);
  });

  it('forwards attach', () => {
    const p = new CountingProvider();
    p.cached().attach('c1', 9);
    expect(p.attached).toEqual([['c1', 9]]);
  });
});
