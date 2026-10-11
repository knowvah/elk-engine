// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from './UnsupportedOperationException.js';
import { IllegalArgumentException } from './IllegalArgumentException.js';
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';
import { ArithmeticException } from './ArithmeticException.js';

describe('UnsupportedOperationException', () => {
  it('carries the Java simple name and message', () => {
    const e = new UnsupportedOperationException('m');
    expect(e.name).toBe('UnsupportedOperationException');
    expect(e.message).toBe('m');
    expect(String(e).startsWith('UnsupportedOperationException: ')).toBe(true);
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new UnsupportedOperationException().message).toBe('');
  });

  it('is an instance of its parent chain', () => {
    const e = new UnsupportedOperationException('m');
    expect(e instanceof UnsupportedOperationException).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new UnsupportedOperationException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
    expect(e instanceof IndexOutOfBoundsException).toBe(false);
    expect(e instanceof ArithmeticException).toBe(false);
    expect(e instanceof TypeError).toBe(false);
  });
});
