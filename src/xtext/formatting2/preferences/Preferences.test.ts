// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ExceptionAcceptor } from '../ExceptionAcceptor.js';
import {
  DEFAULT_INDENTATION,
  DEFAULT_INDENTATION_LENGTH,
  DEFAULT_LINE_SEPARATOR,
  DEFAULT_MAX_LINE_WIDTH,
  DEFAULT_TAB_WIDTH,
  FormatterPreferenceKeys,
} from '../FormatterPreferenceKeys.js';
import { IntegerKey } from './IntegerKey.js';
import { MapBasedPreferenceValues } from './MapBasedPreferenceValues.js';
import { PreferenceKey } from './PreferenceKey.js';
import { StringKey } from './StringKey.js';

describe('FormatterPreferenceKeys', () => {
  it('declares the Xtext ids and defaults', () => {
    const keys = FormatterPreferenceKeys;
    expect(
      [keys.lineSeparator, keys.indentation, keys.indentationLength, keys.tabWidth, keys.maxLineWidth].map((k) => [
        k.getId(),
        k.getDefaultValue(),
      ]),
    ).toEqual([
      ['line.separator', '\n'],
      ['indentation', '\t'],
      ['indentation.length', '-1'],
      ['tab.width', '4'],
      ['line.width.max', '120'],
    ]);
    expect([DEFAULT_LINE_SEPARATOR, DEFAULT_INDENTATION]).toEqual(['\n', '\t']);
    expect([DEFAULT_INDENTATION_LENGTH, DEFAULT_TAB_WIDTH, DEFAULT_MAX_LINE_WIDTH]).toEqual([-1, 4, 120]);
  });
});

describe('preference keys', () => {
  it('describes itself', () => {
    expect(new PreferenceKey('k', 'v').toString()).toBe("Preference key 'k' with default value 'v'.");
    expect(new PreferenceKey('k', null).getDefaultValue()).toBeNull();
  });

  it('converts string and integer values', () => {
    const text = new StringKey('s', 'x');
    expect([text.toValue('y'), text.valueToString('z'), text.toValue(null)]).toEqual(['y', 'z', null]);
    const num = new IntegerKey('i', 7);
    expect([num.getDefaultValue(), num.toValue('12'), num.valueToString(3), num.toValue(null)]).toEqual([
      '7',
      12,
      '3',
      null,
    ]);
    expect(new IntegerKey('n', null).getDefaultValue()).toBeNull();
  });

  it('rejects a malformed integer with the Xtext message and the NumberFormatException as cause', () => {
    const num = new IntegerKey('i', 7);
    try {
      num.toValue('12x');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalArgumentException);
      expect((e as Error).message).toBe('12x is not a valid integer preference value');
      expect((e as Error).cause).toBeInstanceOf(Error);
    }
  });
});

describe('MapBasedPreferenceValues', () => {
  const key = new StringKey('k', 'default');

  it('reads the map first, then the delegate, then the key default', () => {
    const delegate = new MapBasedPreferenceValues();
    delegate.put('k', 'from delegate');
    const values = new MapBasedPreferenceValues(delegate);
    expect(values.getPreference(key)).toBe('from delegate');
    values.put('k', 'own');
    expect(values.getPreference(key)).toBe('own');
    expect(values.getDelegate()).toBe(delegate);
    expect(new MapBasedPreferenceValues().getPreference(key)).toBe('default');
    expect(new MapBasedPreferenceValues().getTypedPreference(key)).toBe('default');
  });

  it('puts, removes and clears values', () => {
    const values = new MapBasedPreferenceValues();
    values.putTyped(key, 'a');
    expect(values.getValues().get('k')).toBe('a');
    values.putPreference(key, 42);
    expect(values.getValues().get('k')).toBe('42');
    values.putPreference(key, null);
    expect(values.getValues().has('k')).toBe(false);
    values.putPreference(key, undefined);
    values.put('k', 'b');
    values.put('k', null);
    expect(values.getValues().size).toBe(0);
    values.put('x', 'y');
    values.clear();
    expect(values.getValues().size).toBe(0);
  });
});

describe('ExceptionAcceptor', () => {
  it('throws, ignores or drops', () => {
    const error = new Error('boom');
    expect(() => ExceptionAcceptor.THROWING(error)).toThrow(error);
    expect(ExceptionAcceptor.IGNORING(error)).toBeUndefined();
    expect(ExceptionAcceptor.LOGGING(error)).toBeUndefined();
  });
});
