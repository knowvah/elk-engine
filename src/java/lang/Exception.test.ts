// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Exception } from './Exception.js';

describe('Exception', () => {
  it('carries the Java simple name and message', () => {
    const e = new Exception('m');
    expect(e.name).toBe('Exception');
    expect(e.message).toBe('m');
    expect(String(e)).toBe('Exception: m');
    expect(typeof e.stack).toBe('string');
  });

  it('defaults to an empty message', () => {
    expect(new Exception().message).toBe('');
  });

  it("keeps a cause, as Java's (String, Throwable) constructor", () => {
    const cause = new Error('root');
    expect(new Exception('m', { cause }).cause).toBe(cause);
  });
});
