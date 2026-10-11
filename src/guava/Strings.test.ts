// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import * as Strings from './Strings.js';

describe('Strings.isNullOrEmpty', () => {
  it('is true for null, undefined and the empty string', () => {
    expect(Strings.isNullOrEmpty(null)).toBe(true);
    expect(Strings.isNullOrEmpty(undefined)).toBe(true);
    expect(Strings.isNullOrEmpty('')).toBe(true);
  });

  it('is false for non-empty strings, including whitespace', () => {
    expect(Strings.isNullOrEmpty('a')).toBe(false);
    expect(Strings.isNullOrEmpty(' ')).toBe(false);
  });
});

describe('Strings.repeat', () => {
  it('repeats the string count times', () => {
    expect(Strings.repeat('ab', 3)).toBe('ababab');
    expect(Strings.repeat('ab', 1)).toBe('ab');
  });

  it('returns the empty string for count zero', () => {
    expect(Strings.repeat('ab', 0)).toBe('');
  });

  it('throws IllegalArgumentException with the Guava message for negative counts', () => {
    expect(() => Strings.repeat('ab', -1)).toThrow(IllegalArgumentException);
    expect(() => Strings.repeat('ab', -1)).toThrow('invalid count: -1');
  });
});
