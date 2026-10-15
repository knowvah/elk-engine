// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';
import { StringIndexOutOfBoundsException } from './StringIndexOutOfBoundsException.js';
import { ArrayIndexOutOfBoundsException } from './ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from './IllegalArgumentException.js';

describe('StringIndexOutOfBoundsException', () => {
  it('carries the Java simple name and message', () => {
    const e = new StringIndexOutOfBoundsException('Index 1 out of bounds for length 1');
    expect(e.name).toBe('StringIndexOutOfBoundsException');
    expect(e.message).toBe('Index 1 out of bounds for length 1');
    expect(String(e)).toBe('StringIndexOutOfBoundsException: Index 1 out of bounds for length 1');
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new StringIndexOutOfBoundsException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new StringIndexOutOfBoundsException('m');
    expect(e instanceof StringIndexOutOfBoundsException).toBe(true);
    expect(e instanceof IndexOutOfBoundsException).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new StringIndexOutOfBoundsException('m');
    expect(e instanceof ArrayIndexOutOfBoundsException).toBe(false);
    expect(e instanceof IllegalArgumentException).toBe(false);
  });
});
