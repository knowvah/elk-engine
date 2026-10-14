// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import * as Strings from './Strings.js';

const LEXER_REF = new URL('../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const FROM_JAVA = 'convertFromJavaString';
const TO_JAVA = 'convertToJavaString';
const ILLEGAL_ARGUMENT = 'java.lang.IllegalArgumentException';
const STRING_INDEX = 'java.lang.StringIndexOutOfBoundsException';

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string;
  readonly output?: unknown;
  readonly error?: { readonly cls: string; readonly msg: string };
}

const rows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter(
  (row) => row.converter === 'Strings',
);
const rowsOf = (op: string): readonly Row[] => rows.filter((row) => row.op === op);

function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('Strings vectors (graph-text-lexer.json)', () => {
  it('replays split for both overloads', () => {
    expect(rowsOf('split/string').length).toBe(16);
    expect(rowsOf('split/char').length).toBe(16);
    for (const row of [...rowsOf('split/string'), ...rowsOf('split/char')]) {
      expect(Strings.split(row.input, '.'), JSON.stringify(row.input)).toEqual(row.output);
    }
  });

  it('replays convertToJavaString with and without unicode escapes', () => {
    expect(rowsOf(`${TO_JAVA}/unicode`).length).toBe(8);
    expect(rowsOf(`${TO_JAVA}/plain`).length).toBe(7);
    for (const row of rowsOf(`${TO_JAVA}/unicode`)) {
      expect(Strings.convertToJavaString(row.input), JSON.stringify(row.input)).toBe(row.output);
    }
    for (const row of rowsOf(`${TO_JAVA}/plain`)) {
      expect(Strings.convertToJavaString(row.input, false), JSON.stringify(row.input)).toBe(row.output);
    }
  });

  it('replays convertFromJavaString with and without unicode escapes', () => {
    for (const [suffix, useUnicode] of [
      ['unicode', true],
      ['plain', false],
    ] as const) {
      const selected = rowsOf(`${FROM_JAVA}/${suffix}`);
      expect(selected.length).toBeGreaterThan(0);
      for (const row of selected) {
        const label = `${suffix} ${JSON.stringify(row.input)}`;
        if (row.error === undefined) {
          expect(Strings.convertFromJavaString(row.input, useUnicode), label).toBe(row.output);
          continue;
        }
        const e = caught(() => Strings.convertFromJavaString(row.input, useUnicode)) as Error;
        const expectedClass = row.error.cls === ILLEGAL_ARGUMENT ? IllegalArgumentException : IndexOutOfBoundsException;
        expect(row.error.cls === ILLEGAL_ARGUMENT || row.error.cls === STRING_INDEX, label).toBe(true);
        expect(e, label).toBeInstanceOf(expectedClass);
        expect(e.message, label).toBe(row.error.msg);
      }
    }
  });
});

describe('Strings', () => {
  it('drops trailing empty segments and keeps interior ones', () => {
    expect(Strings.split('a..b.', '.')).toEqual(['a', '', 'b']);
  });

  it('splits around a multi-character delimiter', () => {
    expect(Strings.split('a::b::::c::', '::')).toEqual(['a', 'b', '', 'c']);
  });

  it('notNull is String.valueOf', () => {
    expect(Strings.notNull(null)).toBe('null');
    expect(Strings.notNull(undefined)).toBe('null');
    expect(Strings.notNull(42)).toBe('42');
    expect(Strings.notNull('x')).toBe('x');
  });

  it('isEmpty is true for null, undefined and the empty string only', () => {
    expect(Strings.isEmpty(null)).toBe(true);
    expect(Strings.isEmpty(undefined)).toBe(true);
    expect(Strings.isEmpty('')).toBe(true);
    expect(Strings.isEmpty(' ')).toBe(false);
  });

  it('toHex yields upper-case hex digit code units', () => {
    expect(String.fromCharCode(Strings.toHex(11))).toBe('B');
    expect(String.fromCharCode(Strings.toHex(0x1f))).toBe('F');
  });

  it('exports an empty array constant', () => {
    expect(Strings.EMPTY_ARRAY).toEqual([]);
  });
});
