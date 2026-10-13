// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { identityHashCode } from './IdentityHashCode.js';

describe('identityHashCode', () => {
  it('returns the same int for the same object on every call', () => {
    const o = {};
    const first = identityHashCode(o);
    expect(Number.isInteger(first)).toBe(true);
    expect(identityHashCode(o)).toBe(first);
  });

  it('ignores structural equality', () => {
    expect(identityHashCode({})).not.toBe(identityHashCode({}));
  });

  it('is stable for a frozen object', () => {
    const o = Object.freeze({ a: 1 });
    expect(identityHashCode(o)).toBe(identityHashCode(o));
  });
});
