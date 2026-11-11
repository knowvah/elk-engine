// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NegativeArraySizeException } from './NegativeArraySizeException.js';
import { RuntimeException } from './RuntimeException.js';

describe('NegativeArraySizeException', () => {
  it('carries the Java simple name and message', () => {
    const e = new NegativeArraySizeException('-4');
    expect(e.name).toBe('NegativeArraySizeException');
    expect(e.message).toBe('-4');
  });

  it('defaults to an empty message', () => {
    expect(new NegativeArraySizeException().message).toBe('');
  });

  it('is a RuntimeException and an Error', () => {
    const e = new NegativeArraySizeException('-1');
    expect(e instanceof RuntimeException).toBe(true);
    expect(e instanceof Error).toBe(true);
  });
});
