// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import { ArithmeticException } from '../lang/ArithmeticException.js';

describe('IndexOutOfBoundsException', () => {
  it('carries the Java simple name and message', () => {
    const e = new IndexOutOfBoundsException('m');
    expect(e.name).toBe('IndexOutOfBoundsException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('IndexOutOfBoundsException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new IndexOutOfBoundsException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new IndexOutOfBoundsException('m');
    expect(e instanceof IndexOutOfBoundsException).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new IndexOutOfBoundsException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
  });
});
