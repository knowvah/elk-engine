// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Exception } from './Exception.js';
import { RuntimeException } from './RuntimeException.js';

describe('RuntimeException', () => {
  it('carries the Java simple name and message', () => {
    const e = new RuntimeException('m');
    expect(e.name).toBe('RuntimeException');
    expect(e.message).toBe('m');
    expect(String(e)).toBe('RuntimeException: m');
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new RuntimeException().message).toBe('');
  });

  it("keeps a cause, as Java's (String, Throwable) constructor", () => {
    const cause = new Error('root');
    expect(new RuntimeException('m', { cause }).cause).toBe(cause);
  });
});

describe('RuntimeException parent chain', () => {
  it('is an Exception and an Error', () => {
    const e: unknown = new RuntimeException('m');
    expect(e instanceof Exception).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('is not every Exception', () => {
    expect(new Exception('m') instanceof RuntimeException).toBe(false);
  });
});
