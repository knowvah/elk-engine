// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { isPropertyValueProxy } from './IPropertyValueProxy.js';

describe('isPropertyValueProxy', () => {
  it('accepts an object with a resolveValue function', () => {
    expect(isPropertyValueProxy({ resolveValue: () => null })).toBe(true);
    class Proxy {
      resolveValue(): number {
        return 1;
      }
    }
    expect(isPropertyValueProxy(new Proxy())).toBe(true);
  });

  it('rejects null, primitives, functions and objects without a resolveValue function', () => {
    expect(isPropertyValueProxy(null)).toBe(false);
    expect(isPropertyValueProxy(undefined)).toBe(false);
    expect(isPropertyValueProxy(3)).toBe(false);
    expect(isPropertyValueProxy('resolveValue')).toBe(false);
    expect(isPropertyValueProxy(() => null)).toBe(false);
    expect(isPropertyValueProxy({})).toBe(false);
    expect(isPropertyValueProxy({ resolveValue: 4 })).toBe(false);
  });
});
