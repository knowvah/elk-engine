// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { StringBuilder } from './StringBuilder.js';

describe('StringBuilder', () => {
  it('starts empty', () => {
    expect(new StringBuilder().toString()).toBe('');
  });

  it('appends strings and chains', () => {
    const sb = new StringBuilder();
    expect(sb.append('ab').append('cd')).toBe(sb);
    expect(sb.toString()).toBe('abcd');
  });

  it('appends null as the text null', () => {
    expect(new StringBuilder().append(null).toString()).toBe('null');
  });

  it('appends a char from its UTF-16 code unit', () => {
    expect(new StringBuilder().appendChar(0x20).appendChar(0x41).toString()).toBe(' A');
  });

  it('appends an object through String.valueOf semantics', () => {
    const obj = { toString: (): string => 'custom' };
    expect(
      new StringBuilder().appendObject(obj).appendObject(null).appendObject(undefined).appendObject(7).toString(),
    ).toBe('customnullnull7');
  });
});
