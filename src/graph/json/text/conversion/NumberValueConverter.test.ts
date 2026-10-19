// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { NumberValueConverter } from './NumberValueConverter.js';

const INT_MAX = '2147483647';
const INT_MIN = '-2147483648';

function failure(fn: () => unknown): ValueConverterException {
  try {
    fn();
  } catch (e) {
    return e as ValueConverterException;
  }
  throw new Error('expected a ValueConverterException');
}

describe('NumberValueConverter', () => {
  const converter = new NumberValueConverter();

  it('prints whole doubles through intValue(), saturating', () => {
    expect(converter.toString(42)).toBe('42');
    expect(converter.toString(-0)).toBe('0');
    expect(converter.toString(1e10)).toBe(INT_MAX);
    expect(converter.toString(Infinity)).toBe(INT_MAX);
    expect(converter.toString(-Infinity)).toBe(INT_MIN);
  });

  it('prints NaN and fractions as doubles', () => {
    expect(converter.toString(NaN)).toBe('NaN');
    expect(converter.toString(1.5)).toBe('1.5');
    expect(converter.toString(1e-5)).toBe('1.0E-5');
  });

  it('rejects null on the way out and a non-number as the JVM bridge does', () => {
    expect(failure(() => converter.toString(null)).getMessage()).toBe('Double value may not be null.');
    expect(() => converter.toString('1' as unknown as number)).toThrow(/ClassCast|cannot be cast/i);
  });

  it('parses with Double.valueOf leniency', () => {
    expect(converter.toValue('1', null)).toBe(1);
    expect(converter.toValue(' 1.5', null)).toBe(1.5);
    expect(converter.toValue('0x1p3', null)).toBe(8);
  });

  it('rejects empty input and keeps the NumberFormatException as the cause', () => {
    expect(failure(() => converter.toValue('', null)).getMessage()).toBe(
      'Cannot convert empty string to a double value.',
    );
    expect(failure(() => converter.toValue(null, null)).getMessage()).toBe(
      'Cannot convert empty string to a double value.',
    );
    const e = failure(() => converter.toValue('abc', null));
    expect(e.getMessage()).toBe("Cannot convert 'abc' to a double value.");
    expect(e.cause).toBeInstanceOf(NumberFormatException);
  });
});
