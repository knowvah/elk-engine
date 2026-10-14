// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EOFException } from './EOFException.js';
import { IOException } from './IOException.js';

describe('IOException', () => {
  it('carries the message, name and Java class name', () => {
    const e = new IOException('disk gone');
    expect(e.message).toBe('disk gone');
    expect(e.name).toBe('IOException');
    expect(e.javaName).toBe('java.io.IOException');
    expect(e).toBeInstanceOf(Error);
  });

  it('has an empty message when none is given', () => {
    expect(new IOException().message).toBe('');
  });
});

describe('EOFException', () => {
  it('is an IOException with its own name and Java class name', () => {
    const e = new EOFException('End of input');
    expect(e).toBeInstanceOf(IOException);
    expect(e.message).toBe('End of input');
    expect(e.name).toBe('EOFException');
    expect(e.javaName).toBe('java.io.EOFException');
  });
});
