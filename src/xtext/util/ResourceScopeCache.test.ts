// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ResourceScopeCache } from './ResourceScopeCache.js';
import { Tuples } from './Tuples.js';

describe('ResourceScopeCache', () => {
  it('computes once per key and resource', () => {
    const cache = new ResourceScopeCache();
    const resource = {};
    const owner = {};
    let calls = 0;
    const provider = (): string => `v${++calls}`;
    expect(cache.get(Tuples.pair(owner, 'fqn'), resource, provider)).toBe('v1');
    expect(cache.get(Tuples.pair(owner, 'fqn'), resource, provider)).toBe('v1');
    expect(calls).toBe(1);
    expect(cache.get(Tuples.pair(owner, 'other'), resource, provider)).toBe('v2');
    expect(cache.get(Tuples.pair({}, 'fqn'), resource, provider)).toBe('v3');
  });

  it('keeps resources apart', () => {
    const cache = new ResourceScopeCache();
    const owner = {};
    expect(cache.get(Tuples.pair(owner, 'k'), {}, () => 1)).toBe(1);
    expect(cache.get(Tuples.pair(owner, 'k'), {}, () => 2)).toBe(2);
  });

  it('caches null results', () => {
    const cache = new ResourceScopeCache();
    const resource = {};
    let calls = 0;
    const provider = (): null => {
      calls++;
      return null;
    };
    expect(cache.get('k', resource, provider)).toBeNull();
    expect(cache.get('k', resource, provider)).toBeNull();
    expect(calls).toBe(1);
  });

  it('computes without caching when the resource is null', () => {
    const cache = new ResourceScopeCache();
    let calls = 0;
    const provider = (): number => ++calls;
    expect(cache.get('k', null, provider)).toBe(1);
    expect(cache.get('k', null, provider)).toBe(2);
  });

  it('allows the provider to re-enter the cache', () => {
    const cache = new ResourceScopeCache();
    const resource = {};
    const value = cache.get('outer', resource, () => cache.get('inner', resource, () => 7) + 1);
    expect(value).toBe(8);
    expect(cache.get('inner', resource, () => 0)).toBe(7);
  });

  it('clear drops the values of one resource only', () => {
    const cache = new ResourceScopeCache();
    const r1 = {};
    const r2 = {};
    cache.get('k', r1, () => 'a');
    cache.get('k', r2, () => 'b');
    cache.clear(r1);
    expect(cache.get('k', r1, () => 'c')).toBe('c');
    expect(cache.get('k', r2, () => 'd')).toBe('b');
    cache.clear({});
  });
});
