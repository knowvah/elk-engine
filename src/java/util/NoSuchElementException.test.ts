// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NoSuchElementException } from './NoSuchElementException.js';
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { ArithmeticException } from '../lang/ArithmeticException.js';

describe('NoSuchElementException', () => {
  it('carries the Java simple name and message', () => {
    const e = new NoSuchElementException('m');
    expect(e.name).toBe('NoSuchElementException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('NoSuchElementException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new NoSuchElementException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new NoSuchElementException('m');
    expect(e instanceof NoSuchElementException).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new NoSuchElementException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
    expect(e instanceof IndexOutOfBoundsException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
  });
});
