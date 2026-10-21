// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import type { EDataType } from '../EDataType.js';
import { Literals } from '../EcorePackage.js';
import { EcoreFactoryImpl } from './EcoreFactoryImpl.js';

const factory = new EcoreFactoryImpl();
const { EINT, EDOUBLE, ESTRING } = Literals;
const FOREIGN: EDataType = { getName: () => 'EBoolean', getEPackage: () => EINT.getEPackage() };
const NOT_VALID = "The datatype 'EBoolean' is not a valid classifier";

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('EcoreFactoryImpl EInt', () => {
  // Expected values: test/golden/refs/java/text.json integerValueOf rows ("+1", "-0", "2147483648", "abc")
  // through EcoreFactoryImpl.createEIntFromString = Integer.valueOf.
  it('parses like Integer.valueOf', () => {
    expect(factory.createFromString(EINT, '+1')).toBe(1);
    expect(Object.is(factory.createFromString(EINT, '-0'), 0)).toBe(true);
  });

  it('throws NumberFormatException with the JVM message', () => {
    expect(thrownBy(() => factory.createFromString(EINT, '2147483648'))).toEqual(
      new NumberFormatException('For input string: "2147483648"'),
    );
    const error = thrownBy(() => factory.createFromString(EINT, 'abc'));
    expect(error).toBeInstanceOf(NumberFormatException);
    expect((error as Error).message).toBe('For input string: "abc"');
  });

  // EcoreFactoryImpl.java createEIntFromString/convertEIntToString: null maps to null.
  it('maps null to null in both directions', () => {
    expect(factory.createFromString(EINT, null)).toBeNull();
    expect(factory.convertToString(EINT, null)).toBeNull();
  });

  it('converts to the Integer.toString text', () => {
    expect(factory.convertToString(EINT, -2147483648)).toBe('-2147483648');
    expect(factory.convertToString(EINT, 42)).toBe('42');
  });
});

describe('EcoreFactoryImpl EDouble', () => {
  // Expected values: text.json parseDouble rows (".5", "1d"), Javadoc Double.valueOf grammar ("1e3"),
  // text.json parseDouble "" row for the exception class; toString rows 4000000000000000 -> "2.0".
  it('parses like Double.valueOf', () => {
    expect(factory.createFromString(EDOUBLE, '1e3')).toBe(1000);
    expect(factory.createFromString(EDOUBLE, '1d')).toBe(1);
    expect(factory.createFromString(EDOUBLE, '.5')).toBe(0.5);
  });

  it('throws NumberFormatException for non-numbers', () => {
    const error = thrownBy(() => factory.createFromString(EDOUBLE, 'abc'));
    expect(error).toBeInstanceOf(NumberFormatException);
    expect((error as Error).message).toBe('For input string: "abc"');
  });

  it('maps null to null in both directions', () => {
    expect(factory.createFromString(EDOUBLE, null)).toBeNull();
    expect(factory.convertToString(EDOUBLE, null)).toBeNull();
  });

  it('converts with Double.toString', () => {
    expect(factory.convertToString(EDOUBLE, 2)).toBe('2.0');
    expect(factory.convertToString(EDOUBLE, 1e7)).toBe('1.0E7');
  });
});

describe('EcoreFactoryImpl EString', () => {
  it('is the identity in both directions', () => {
    expect(factory.createFromString(ESTRING, 'a b')).toBe('a b');
    expect(factory.convertToString(ESTRING, 'a b')).toBe('a b');
    expect(factory.createFromString(ESTRING, '')).toBe('');
  });

  it('maps null to null in both directions', () => {
    expect(factory.createFromString(ESTRING, null)).toBeNull();
    expect(factory.convertToString(ESTRING, null)).toBeNull();
  });
});

describe('EcoreFactoryImpl other datatypes', () => {
  // EcoreFactoryImpl.java createFromString/convertToString default arm.
  it('rejects an unsupported datatype in both directions', () => {
    expect(thrownBy(() => factory.createFromString(FOREIGN, '1'))).toEqual(new IllegalArgumentException(NOT_VALID));
    expect(thrownBy(() => factory.convertToString(FOREIGN, true))).toEqual(new IllegalArgumentException(NOT_VALID));
  });
});
