// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { assertionsEnabled, devAssert } from '../../src/java/lang/DevAssert.js';
import { assertionErrorOf } from './assertion-error-of.js';
import { withAssertions } from './with-assertions.js';

describe('assertionErrorOf', () => {
  it('returns the AssertionError of a failed devAssert, also when the suite runs with assertions off', () => {
    withAssertions(false, () => {
      const error = assertionErrorOf(() => {
        devAssert(
          () => false,
          () => 'detail',
        );
      });
      expect(error.message).toBe('detail');
      expect(assertionsEnabled()).toBe(false);
    });
  });

  it('fails when the step returns', () => {
    expect(() => assertionErrorOf(() => undefined)).toThrow('expected an AssertionError, but the step returned');
  });

  it('lets any other error through', () => {
    const other = new RangeError('other');
    expect(() =>
      assertionErrorOf(() => {
        throw other;
      }),
    ).toThrow(other);
  });
});
