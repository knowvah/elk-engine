// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from './IllegalArgumentException.js';
import { NumberFormatException } from './NumberFormatException.js';
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { ArithmeticException } from '../lang/ArithmeticException.js';

describe('NumberFormatException', () => {
  it('carries the Java simple name and message', () => {
    const e = new NumberFormatException('m');
    expect(e.name).toBe('NumberFormatException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('NumberFormatException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new NumberFormatException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new NumberFormatException('m');
    expect(e instanceof NumberFormatException).toBe(true);
    expect(e instanceof IllegalArgumentException).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof IllegalArgumentException).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new NumberFormatException('m');
    expect(e instanceof IndexOutOfBoundsException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
  });
});
