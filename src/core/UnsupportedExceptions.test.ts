// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { RuntimeException } from '../java/lang/RuntimeException.js';
import { UnsupportedConfigurationException } from './UnsupportedConfigurationException.js';
import { UnsupportedGraphException } from './UnsupportedGraphException.js';

describe.each([
  ['UnsupportedConfigurationException', UnsupportedConfigurationException],
  ['UnsupportedGraphException', UnsupportedGraphException],
])('%s', (name, Ctor) => {
  it('carries message, cause and name, and is a RuntimeException', () => {
    const cause = new Error('inner');
    const e = new Ctor('msg', cause);
    expect(e).toBeInstanceOf(RuntimeException);
    expect(e.name).toBe(name);
    expect(e.message).toBe('msg');
    expect(e.cause).toBe(cause);
  });

  it('works without arguments', () => {
    const e = new Ctor();
    expect(e.message).toBe('');
    expect(e.cause).toBeUndefined();
  });
});
