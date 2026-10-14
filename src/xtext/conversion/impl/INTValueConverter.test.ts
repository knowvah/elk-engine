// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import type { AbstractRule } from '../../AbstractRule.js';
import type { TokenSource } from './AbstractLexerBasedConverter.js';
import { INTValueConverter } from './INTValueConverter.js';
import type { ValueConverterException } from '../ValueConverterException.js';

const LEXER_REF = new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const VALUE_CONVERTER_EXCEPTION = 'org.eclipse.xtext.conversion.ValueConverterException';
const INT_PREFIX = 'int:';
const INT_RULE: AbstractRule = { getName: () => 'INT', isTerminalRule: () => true };
/** Bare digits lex as RULE_SIGNED_INT in the ELK lexer (T2 observation), so `INT.toString` never matches. */
const SIGNED_INT_LEXER: TokenSource = (text) => [{ type: 'RULE_SIGNED_INT', text }];

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string | null;
  readonly output?: { readonly text: string };
  readonly error?: { readonly cls: string; readonly msg: string };
}

const intRows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter(
  (row) => row.converter === 'INT',
);

function converter(): INTValueConverter {
  const result = new INTValueConverter(SIGNED_INT_LEXER);
  result.setRule(INT_RULE);
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

describe('INTValueConverter vectors', () => {
  it('replays the toValue rows', () => {
    const rows = intRows.filter((row) => row.op === 'toValue');
    expect(rows.length).toBe(14);
    for (const row of rows) {
      if (row.error === undefined) {
        expect(String(converter().toValue(row.input, null)), JSON.stringify(row.input)).toBe(row.output?.text);
        continue;
      }
      expect(row.error.cls).toBe(VALUE_CONVERTER_EXCEPTION);
      const e = failure(() => converter().toValue(row.input, null));
      expect(e.getMessage(), JSON.stringify(row.input)).toBe(row.error.msg);
    }
  });

  it('replays the toString rows with Integer inputs', () => {
    const rows = intRows.filter(
      (row) => row.op === 'toString' && (row.input === null || row.input.startsWith(INT_PREFIX)),
    );
    expect(rows.length).toBe(5);
    for (const row of rows) {
      const value = row.input === null ? null : Number(row.input.substring(INT_PREFIX.length));
      const e = failure(() => converter().toString(value));
      expect(e.getMessage(), JSON.stringify(row.input)).toBe(row.error?.msg);
    }
  });
});

describe('INTValueConverter', () => {
  it('wraps the NumberFormatException as the cause', () => {
    const e = failure(() => converter().toValue('1.5', null));
    expect(e.cause).toBeInstanceOf(NumberFormatException);
    expect(e.getMessage()).toBe("Couldn't convert '1.5' to an int value.");
  });

  it('passes the node to the exception', () => {
    const node = { getStartLine: () => 3, getText: () => '1.5', getSemanticElement: () => null };
    expect(failure(() => converter().toValue('1.5', node)).getNode()).toBe(node);
  });

  it('formats a non-negative value without a lexer', () => {
    const plain = new INTValueConverter();
    plain.setRule(INT_RULE);
    expect(plain.toString(42)).toBe('42');
  });
});
