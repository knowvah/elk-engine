// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { RuntimeException } from '../../java/lang/RuntimeException.js';
import { WrappedException } from './WrappedException.js';

describe('WrappedException', () => {
  it('cause-only constructor derives the message from cause.toString()', () => {
    const cause = new Error('boom');
    const e = new WrappedException(cause);
    expect(e.message).toBe('Error: boom');
    expect(e.cause).toBe(cause);
    expect(e).toBeInstanceOf(RuntimeException);
    expect(e.name).toBe('WrappedException');
  });

  it('message-and-cause constructor keeps both', () => {
    const cause = new Error('boom');
    const e = new WrappedException('extra', cause);
    expect(e.message).toBe('extra');
    expect(e.cause).toBe(cause);
  });

  it('null cause gives a null-free empty message', () => {
    const e = new WrappedException(null);
    expect(e.message).toBe('');
    expect(e.cause).toBeNull();
  });
});
