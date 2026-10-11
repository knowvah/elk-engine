// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from './IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { ArithmeticException } from '../lang/ArithmeticException.js';

describe('IllegalArgumentException', () => {
  it('carries the Java simple name and message', () => {
    const e = new IllegalArgumentException('m');
    expect(e.name).toBe('IllegalArgumentException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('IllegalArgumentException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new IllegalArgumentException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new IllegalArgumentException('m');
    expect(e instanceof IllegalArgumentException).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new IllegalArgumentException('m');
    expect(e instanceof IndexOutOfBoundsException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
  });
});
