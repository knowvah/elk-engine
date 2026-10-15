// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ClassCastException } from './ClassCastException.js';
import { checkCast, isNumber, isString } from './JavaCast.js';

const STRING = 'java.lang.String';

describe('checkCast', () => {
  it('returns a value of the target type unchanged', () => {
    expect(checkCast('a', isString, STRING)).toBe('a');
    expect(checkCast(1.5, isNumber, 'java.lang.Double')).toBe(1.5);
  });

  it('lets null through, as a Java cast of null succeeds', () => {
    expect(checkCast(null, isString, STRING)).toBeNull();
  });

  it('throws a ClassCastException naming the target class for any other value', () => {
    expect(() => checkCast(1, isString, STRING)).toThrow(ClassCastException);
    expect(() => checkCast(1, isString, STRING)).toThrow(
      'value of type number cannot be cast to class java.lang.String',
    );
    expect(() => checkCast(5n, isNumber, 'java.lang.Integer')).toThrow(ClassCastException);
  });
});

describe('the instance guards', () => {
  it('isString accepts strings only', () => {
    expect([isString('x'), isString(1), isString(undefined)]).toEqual([true, false, false]);
  });

  it('isNumber accepts numbers only, not bigint', () => {
    expect([isNumber(1), isNumber(Number.NaN), isNumber(1n), isNumber('1')]).toEqual([true, true, false, false]);
  });
});
