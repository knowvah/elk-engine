// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { JsonImportException } from './JsonImportException.js';

describe('JsonImportException', () => {
  it('carries message and cause', () => {
    const cause = new Error('inner');
    const e = new JsonImportException('outer', cause);
    expect(e.message).toBe('outer');
    expect(e.cause).toBe(cause);
    expect(e.name).toBe('JsonImportException');
    expect(e).toBeInstanceOf(Error);
  });

  it('allows no arguments', () => {
    const e = new JsonImportException();
    expect(e.message).toBe('');
    expect(e.cause).toBeUndefined();
  });
});
