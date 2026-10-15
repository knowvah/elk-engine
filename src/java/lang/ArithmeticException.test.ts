// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArithmeticException } from './ArithmeticException.js';
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { RuntimeException } from './RuntimeException.js';

describe('ArithmeticException', () => {
  it('carries the Java simple name and message', () => {
    const e = new ArithmeticException('m');
    expect(e.name).toBe('ArithmeticException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('ArithmeticException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new ArithmeticException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new ArithmeticException('m');
    expect(e instanceof ArithmeticException).toBe(true);
    expect(e instanceof RuntimeException).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new ArithmeticException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
    expect(e instanceof IndexOutOfBoundsException).toBe(false);
  });
});
