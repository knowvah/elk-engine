// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { collectionToString, mapToString } from './BKNodePlacerDebug.js';

describe('collectionToString', () => {
  it('prints a Java list as [a, b]', () => {
    expect(collectionToString(['a', 'b', 'c'])).toBe('[a, b, c]');
  });

  it('prints an empty collection as []', () => {
    expect(collectionToString(new Set<string>())).toBe('[]');
  });

  it('prints null and undefined elements as null and uses the elements toString', () => {
    const element = { toString: (): string => 'node' };
    expect(collectionToString([null, element, undefined])).toBe('[null, node, null]');
  });

  it('prints a set in insertion order', () => {
    expect(collectionToString(new Set(['z', 'a']))).toBe('[z, a]');
  });
});

describe('mapToString', () => {
  it('prints a Java map of lists as {k=[a, b], k2=[c]}', () => {
    const map = new Map<string, string[]>([
      ['k', ['a', 'b']],
      ['k2', ['c']],
    ]);
    expect(mapToString(map)).toBe('{k=[a, b], k2=[c]}');
  });

  it('prints an empty map as {} and a null key as null', () => {
    expect(mapToString(new Map())).toBe('{}');
    expect(mapToString(new Map([[null, ['x']]]))).toBe('{null=[x]}');
  });
});
