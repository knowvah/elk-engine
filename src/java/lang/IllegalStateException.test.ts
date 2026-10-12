// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from './IllegalStateException.js';
import { IllegalArgumentException } from './IllegalArgumentException.js';

describe('IllegalStateException', () => {
  it('carries the Java simple name and message', () => {
    const e = new IllegalStateException('m');
    expect(e instanceof Error).toBe(true);
    expect(e instanceof IllegalStateException).toBe(true);
    expect(e.name).toBe('IllegalStateException');
    expect(e.message).toBe('m');
    expect(String(e)).toBe('IllegalStateException: m');
  });

  it('defaults to an empty message', () => {
    expect(new IllegalStateException().message).toBe('');
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new IllegalStateException('m');
    expect(e instanceof IllegalArgumentException).toBe(false);
  });
});
