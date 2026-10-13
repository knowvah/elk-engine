// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ClassCastException } from './ClassCastException.js';
import { IllegalStateException } from './IllegalStateException.js';

describe('ClassCastException', () => {
  it('carries the Java simple name and message', () => {
    const e = new ClassCastException('m');
    expect(e instanceof Error).toBe(true);
    expect(e instanceof ClassCastException).toBe(true);
    expect(e.name).toBe('ClassCastException');
    expect(e.message).toBe('m');
    expect(String(e)).toBe('ClassCastException: m');
  });

  it('defaults to an empty message', () => {
    expect(new ClassCastException().message).toBe('');
  });

  it('is not an instance of unrelated siblings', () => {
    const e: unknown = new ClassCastException('m');
    expect(e instanceof IllegalStateException).toBe(false);
  });
});
