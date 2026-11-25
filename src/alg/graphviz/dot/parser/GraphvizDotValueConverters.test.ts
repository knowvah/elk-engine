// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { DefaultTerminalConverters } from '../../../../xtext/common/services/DefaultTerminalConverters.js';
import { NO_OP_CONVERTER } from '../../../../xtext/conversion/IValueConverter.js';
import { DefaultTerminalConverter } from '../../../../xtext/conversion/impl/DefaultTerminalConverter.js';
import { EFactoryValueConverter } from '../../../../xtext/conversion/impl/EFactoryValueConverter.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../../xtext/conversion/ValueConverterWithValueException.js';
import type { AbstractRule } from '../../../../xtext/AbstractRule.js';
import { createValueConverterService, GRAPHVIZ_DOT_RULES } from './GraphvizDotValueConverters.js';

const LEXER_REF = new URL('../../../../../test/golden/refs/java/graphviz-dot-lexer.json', import.meta.url);
const CLASS_VCE = 'org.eclipse.xtext.conversion.ValueConverterException';
const CLASS_VCE_WITH_VALUE = 'org.eclipse.xtext.conversion.ValueConverterWithValueException';
const CLASS_CCE = 'java.lang.ClassCastException';
const CLASS_STRING = 'java.lang.String';
const CLASS_INTEGER = 'java.lang.Integer';
const NULL_INPUT = '<null>';
const CONVERTER_FAMILY = 'conv';
const GRAMMAR_PREFIX = 'org.eclipse.elk.alg.graphviz.dot.GraphvizDot.';
const TERMINALS_PREFIX = 'org.eclipse.xtext.common.Terminals.';

interface Described {
  readonly class: string;
  readonly text: string;
}

interface ConverterRow {
  readonly id: string;
  readonly rule: string;
  readonly op: 'toValue' | 'toString';
  readonly input: string | null;
  readonly output?: Described | string | null;
  readonly error?: { readonly cls: string; readonly msg: string; readonly value?: Described };
}

interface LexerRef {
  readonly classOnlyMessages: readonly string[];
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly converters: readonly ConverterRow[];
}

const REF = JSON.parse(readFileSync(LEXER_REF, 'utf8')) as LexerRef;
const SERVICE = createValueConverterService();

/** Mirrors the recorder's typed `toString` inputs: `<null>`, `str:`, `int:`, `double:`. */
function decodeTyped(input: string | null): unknown {
  if (input === null || input === NULL_INPUT) return null;
  const colon = input.indexOf(':');
  const payload = input.substring(colon + 1);
  return input.startsWith('str:') ? payload : Number(payload);
}

function describeValue(value: unknown): Described | null {
  if (value === null) return null;
  if (typeof value === 'number') return { class: CLASS_INTEGER, text: String(value) };
  return { class: CLASS_STRING, text: value as string };
}

function errorClass(e: unknown): string {
  if (e instanceof ValueConverterWithValueException) return CLASS_VCE_WITH_VALUE;
  if (e instanceof ValueConverterException) return CLASS_VCE;
  if (e instanceof ClassCastException) return CLASS_CCE;
  return (e as Error).name;
}

function run(row: ConverterRow): unknown {
  return row.op === 'toValue'
    ? SERVICE.toValue(row.input, row.rule, null)
    : SERVICE.toString(decodeTyped(row.input), row.rule);
}

function thrownBy(row: ConverterRow): unknown {
  try {
    run(row);
  } catch (e) {
    return e;
  }
  return null;
}

function replayError(row: ConverterRow, error: NonNullable<ConverterRow['error']>): void {
  const thrown = thrownBy(row);
  expect.soft(thrown, row.id).not.toBeNull();
  expect.soft(errorClass(thrown), row.id).toBe(error.cls);
  if (!REF.classOnlyMessages.includes(error.cls)) {
    expect.soft((thrown as Error).message, row.id).toBe(error.msg);
  }
  if (error.value !== undefined) {
    expect.soft(describeValue((thrown as ValueConverterWithValueException).getValue()), row.id).toEqual(error.value);
  }
}

function replayRow(row: ConverterRow): void {
  if (row.error !== undefined) {
    replayError(row, row.error);
  } else if (row.op === 'toString') {
    expect.soft(run(row), row.id).toBe(row.output);
  } else {
    expect.soft(describeValue(run(row)), row.id).toEqual(row.output);
  }
}

function replayAll(): number {
  let replayed = 0;
  for (const row of REF.converters) {
    replayRow(row);
    replayed++;
  }
  return replayed;
}

describe('GraphvizDot value converters: replay of the recorded JVM converter rows', () => {
  it('replays every converter row', () => {
    expect(replayAll()).toBe(REF.rowCounts[CONVERTER_FAMILY]);
  });

  it('is the default terminal converter service of Xtext', () => {
    expect(SERVICE).toBeInstanceOf(DefaultTerminalConverters);
    expect(SERVICE.getConverter('NoSuchRule')).toBe(NO_OP_CONVERTER);
  });

  it('serves the rules under the qualified names the generated parser passes', () => {
    // registerEFactoryConverters builds one converter per registered name, simple and qualified
    expect(SERVICE.getConverter(`${GRAMMAR_PREFIX}DotID`)).toBeInstanceOf(EFactoryValueConverter);
    expect(SERVICE.getConverter('DotID')).toBeInstanceOf(EFactoryValueConverter);
    expect(SERVICE.getConverter(`${TERMINALS_PREFIX}WS`)).toBeInstanceOf(DefaultTerminalConverter);
    expect(SERVICE.getConverter(`${GRAMMAR_PREFIX}FLOAT`)).toBeInstanceOf(DefaultTerminalConverter);
    expect(SERVICE.getConverter(`${GRAMMAR_PREFIX}ID`)).toBe(SERVICE.getConverter('ID'));
  });

  it('looks the grammar rules up as GrammarUtil does', () => {
    const id = GRAPHVIZ_DOT_RULES.findRuleForName('ID') as AbstractRule;
    expect(id.isTerminalRule()).toBe(true);
    expect(GRAPHVIZ_DOT_RULES.getQualifiedName(id)).toBe(`${GRAMMAR_PREFIX}ID`);
    const ws = GRAPHVIZ_DOT_RULES.findRuleForName('WS') as AbstractRule;
    expect(GRAPHVIZ_DOT_RULES.getQualifiedName(ws)).toBe(`${TERMINALS_PREFIX}WS`);
    expect(GRAPHVIZ_DOT_RULES.findRuleForName(`${TERMINALS_PREFIX}ID`)?.getName()).toBe('ID');
    expect(GRAPHVIZ_DOT_RULES.findRuleForName('NoSuchRule')).toBeNull();
    expect(GRAPHVIZ_DOT_RULES.getEStringDatatypeRules().map((r) => r.getName())).toEqual(['DotID']);
    expect(GRAPHVIZ_DOT_RULES.getTerminalRules().map((t) => t.rule.getName())).toEqual([
      'INT',
      'ID',
      'FLOAT',
      'STRING',
      'PREC_LINE',
      'ML_COMMENT',
      'SL_COMMENT',
      'WS',
      'ANY_OTHER',
    ]);
  });
});
