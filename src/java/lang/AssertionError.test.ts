// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AssertionError } from './AssertionError.js';
import { Exception } from './Exception.js';

describe('AssertionError', () => {
  it('carries the Java simple name and the detail message', () => {
    const e = new AssertionError('m');
    expect(e.name).toBe('AssertionError');
    expect(e.message).toBe('m');
    expect(String(e)).toBe('AssertionError: m');
    expect(typeof e.stack).toBe('string');
  });

  it("has an empty message without a detail, as Java's no-argument constructor has none", () => {
    expect(new AssertionError().message).toBe('');
    expect(String(new AssertionError())).toBe('AssertionError');
  });
});

describe('AssertionError parent chain', () => {
  it('is an Error (Throwable) and not an Exception, so a ported catch (Exception e) does not catch it', () => {
    const e: unknown = new AssertionError('m');
    expect(e instanceof Error).toBe(true);
    expect(e instanceof Exception).toBe(false);
    expect(Object.getPrototypeOf(AssertionError)).toBe(Error);
  });
});
