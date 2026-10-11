// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import * as Splitter from './Splitter.js';

describe('Splitter.split', () => {
  it('keeps empty strings, including leading and trailing', () => {
    expect([...Splitter.on(',').split('a,,b')]).toEqual(['a', '', 'b']);
    expect([...Splitter.on(',').split(',a,')]).toEqual(['', 'a', '']);
  });

  it('returns one empty string for the empty input', () => {
    expect([...Splitter.on(',').split('')]).toEqual(['']);
  });

  it('returns the whole input when the separator is absent', () => {
    expect([...Splitter.on('.').split('org.eclipse')]).toEqual(['org', 'eclipse']);
    expect([...Splitter.on('.').split('plain')]).toEqual(['plain']);
  });

  it('treats the separator as a literal multi-char string', () => {
    expect([...Splitter.on(', ').split('foo, bar,baz')]).toEqual(['foo', 'bar,baz']);
  });

  it('is re-iterable and indexable by size', () => {
    const parts = Splitter.on('.').split('a.b.c');
    expect([...parts]).toEqual([...parts]);
    expect((parts as readonly string[]).length).toBe(3);
  });

  it('rejects the empty separator', () => {
    expect(() => Splitter.on('')).toThrow(IllegalArgumentException);
  });
});
