// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';
import { ArrayIndexOutOfBoundsException } from './ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import { ArithmeticException } from '../lang/ArithmeticException.js';

describe('ArrayIndexOutOfBoundsException', () => {
  it('carries the Java simple name and message', () => {
    const e = new ArrayIndexOutOfBoundsException('m');
    expect(e.name).toBe('ArrayIndexOutOfBoundsException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('ArrayIndexOutOfBoundsException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new ArrayIndexOutOfBoundsException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new ArrayIndexOutOfBoundsException('m');
    expect(e instanceof ArrayIndexOutOfBoundsException).toBe(true);
    expect(e instanceof IndexOutOfBoundsException).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof IndexOutOfBoundsException).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new ArrayIndexOutOfBoundsException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
  });
});
