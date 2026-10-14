// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { StringBuilder } from '../../../java/lang/StringBuilder.js';
import type { AbstractRule } from '../../AbstractRule.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { ValueConverterWithValueException } from '../ValueConverterWithValueException.js';
import { Implementation } from './STRINGValueConverter.Implementation.js';
import { STRINGValueConverter } from './STRINGValueConverter.js';

const LEXER_REF = new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const WITH_VALUE = 'org.eclipse.xtext.conversion.ValueConverterWithValueException';
const PLAIN = 'org.eclipse.xtext.conversion.ValueConverterException';
const STRING_PREFIX = 'str:';
const STRING_RULE: AbstractRule = { getName: () => 'STRING', isTerminalRule: () => true };

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string | null;
  readonly output?: { readonly text: string } | string | null;
  readonly error?: { readonly cls: string; readonly msg: string; readonly value?: { readonly text: string } };
}

const stringRows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter(
  (row) => row.converter === 'STRING',
);

function converter(): STRINGValueConverter {
  const result = new STRINGValueConverter();
  result.setRule(STRING_RULE);
  return result;
}

function failure(fn: () => unknown): ValueConverterException {
  try {
    fn();
  } catch (e) {
    return e as ValueConverterException;
  }
  throw new Error('expected a ValueConverterException');
}

describe('STRINGValueConverter vectors', () => {
  it('replays the toValue rows', () => {
    const rows = stringRows.filter((row) => row.op === 'toValue');
    expect(rows.length).toBe(47);
    for (const row of rows) {
      const label = JSON.stringify(row.input);
      if (row.error === undefined) {
        const expected = row.output === null ? null : (row.output as { text: string }).text;
        expect(converter().toValue(row.input, null), label).toBe(expected);
        continue;
      }
      const e = failure(() => converter().toValue(row.input, null));
      expect(e.getMessage(), label).toBe(row.error.msg);
      expect(e instanceof ValueConverterWithValueException, label).toBe(row.error.cls === WITH_VALUE);
      expect(row.error.cls === WITH_VALUE || row.error.cls === PLAIN, label).toBe(true);
      expect((e as ValueConverterWithValueException).getValue(), label).toBe(row.error.value?.text);
    }
  });

  it('replays the toString rows with String inputs', () => {
    const rows = stringRows.filter(
      (row) => row.op === 'toString' && (row.input === null || row.input.startsWith(STRING_PREFIX)),
    );
    expect(rows.length).toBe(21);
    for (const row of rows) {
      const value = row.input === null ? null : row.input.substring(STRING_PREFIX.length);
      const label = JSON.stringify(row.input);
      if (row.error === undefined) {
        expect(converter().toString(value), label).toBe(row.output);
        continue;
      }
      expect(failure(() => converter().toString(value)).getMessage(), label).toBe(row.error.msg);
    }
  });
});

describe('STRINGValueConverter ranges', () => {
  const range = (input: string): [number, number] => {
    const e = failure(() => converter().toValue(input, null)) as ValueConverterWithValueException;
    return [e.getOffset(), e.getLength()];
  };

  it('has no range for an unclosed literal', () => {
    expect(range('"abc')).toEqual([-1, -1]);
    expect(range('"')).toEqual([-1, -1]);
  });

  it('points at the escape sequence for an unknown escape', () => {
    expect(range('"a\\xb"')).toEqual([2, 2]);
  });

  it('points at the lone backslash for a literal ending in one', () => {
    expect(range('"a\\')).toEqual([2, 1]);
  });

  it('points at the \\u for an invalid unicode escape', () => {
    expect(range('"\\u00zz"')).toEqual([1, 2]);
  });

  it('turns a later problem into an unclosed literal without a range', () => {
    expect(range('"\\q\\')).toEqual([-1, -1]);
  });
});

describe('STRINGValueConverter internals', () => {
  it('wraps an IllegalArgumentException from the implementation', () => {
    class Throwing extends STRINGValueConverter {
      protected override convertFromString(): string {
        throw new IllegalArgumentException('boom');
      }
    }
    const e = failure(() => new Throwing().toValue('"ab"', null));
    expect(e.getMessage()).toBe('boom');
    expect(e.cause).toBeInstanceOf(IllegalArgumentException);
  });

  it('lets other errors through', () => {
    class Throwing extends STRINGValueConverter {
      protected override convertFromString(): string {
        throw new IllegalStateException('state');
      }
    }
    expect(() => new Throwing().toValue('"ab"', null)).toThrow('state');
  });

  it('rejects an implementation whose index state is inconsistent', () => {
    class Probe extends Implementation {
      run(): string {
        return this.convertFromJavaStringFrom('abcd', true, 5, new StringBuilder());
      }
    }
    const probe = new Probe({
      getInvalidEscapeSequenceMessage: () => 'e',
      getStringNotClosedMessage: () => 'n',
      isHexSequence: () => true,
    });
    expect(() => probe.run()).toThrow(IllegalStateException);
  });

  it('funnels hex checks through the owner', () => {
    const calls: [string, number, number][] = [];
    class Probe extends Implementation {
      run(): boolean {
        return this.isHexSequence('00ff', 1, 3);
      }
    }
    const probe = new Probe({
      getInvalidEscapeSequenceMessage: () => 'e',
      getStringNotClosedMessage: () => 'n',
      isHexSequence: (input, off, chars) => {
        calls.push([input, off, chars]);
        return false;
      },
    });
    expect(probe.run()).toBe(false);
    expect(calls).toEqual([['00ff', 1, 3]]);
  });

  it('exposes the default hex sequence check', () => {
    expect(converter().isHexSequence('0g', 0, 2)).toBe(false);
    expect(converter().isHexSequence('0f', 0, 2)).toBe(true);
  });
});
