// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../../core/data/LayoutOptionData.js';
import { KVector } from '../../../../core/math/KVector.js';
import { LayoutOptionProxy } from '../../../../core/util/internal/LayoutOptionProxy.js';
import { Property } from '../../../../graph/properties/Property.js';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import type { AbstractRule } from '../../../../xtext/AbstractRule.js';
import { EFactoryValueConverter } from '../../../../xtext/conversion/impl/EFactoryValueConverter.js';
import { NO_OP_CONVERTER } from '../../../../xtext/conversion/IValueConverter.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../../xtext/conversion/ValueConverterWithValueException.js';
import { tokenize } from '../parser/ElkGraphJsonLexer.js';
import {
  ELK_GRAPH_JSON_RULES,
  ElkGraphJsonRuleName,
  ElkGraphJsonValueConverterService,
} from './ElkGraphJsonValueConverterService.js';
import { NumberValueConverter } from './NumberValueConverter.js';
import { PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';
import { PropertyValueValueConverter } from './PropertyValueValueConverter.js';

const LEXER_REF = new URL('../../../../../test/golden/refs/java/graph-json-text-lexer.json', import.meta.url);
const CLASS_CAST = 'java.lang.ClassCastException';
const CLASS_LAYOUT_OPTION_DATA = 'org.eclipse.elk.core.data.LayoutOptionData';
const CLASS_PROPERTY = 'org.eclipse.elk.graph.properties.Property';
const CLASS_PROXY = 'org.eclipse.elk.core.util.internal.LayoutOptionProxy';
const CLASS_DOUBLE = 'java.lang.Double';
const CLASS_STRING = 'java.lang.String';
const CLASS_VCE = 'org.eclipse.xtext.conversion.ValueConverterException';
const CLASS_VCE_WITH_VALUE = 'org.eclipse.xtext.conversion.ValueConverterWithValueException';
/**
 * Rows whose Java box type a `number` cannot carry, as `converter.toString(input)`: a `Float` prints `2.0` where a whole `Double` prints `2` (`StringValue` `double:1.0`), an `Integer` fails the `Double`
 * cast of `Number` where a whole `Double` converts (`Number` `double:1.0`), and a `Double` fails the `Integer` cast
 * of `INT` where a whole `Integer` converts (`INT` `int:1`); one TypeScript value would need both outcomes.
 */
const UNREPRESENTABLE_ROWS: ReadonlySet<string> = new Set([
  'INT.toString(double:1.5)',
  'StringValue.toString(float:2.0)',
  'Number.toString(int:1)',
]);
const rowKey = (row: Row): string => `${row.converter}.${row.op}(${row.input ?? 'null'})`;
const isUnrepresentable = (row: Row): boolean => UNREPRESENTABLE_ROWS.has(rowKey(row));
/** Converters replayed through the service; the other terminals (DefaultTerminalConverter) are not registered. */
const REPLAYED: ReadonlySet<string> = new Set([
  'Number',
  'PropertyKey',
  'StringValue',
  'NumberValue',
  'BooleanValue',
  'ID',
  'STRING',
  'INT',
  'Bogus',
  'WS',
]);

interface Described {
  readonly class?: string;
  readonly text?: string;
  readonly id?: string;
}

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string | null;
  readonly output?: Described | string | null;
  readonly error?: { readonly cls: string; readonly msg: string };
}

const rows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter((row) =>
  REPLAYED.has(row.converter),
);

/** Mirrors `ElktLexerVectors.Typed.parse`; Java enum constants are modelled by their `name()`/`ordinal()`. */
function decodeTyped(input: string | null): unknown {
  if (input === null) return null;
  const colon = input.indexOf(':');
  const payload = input.substring(colon + 1);
  switch (input.substring(0, colon)) {
    case 'str':
      return payload;
    case 'int':
    case 'double':
    case 'float':
      return Number(payload);
    case 'long':
      return BigInt(payload);
    case 'bool':
      return payload === 'true';
    case 'obj':
      return { toString: () => payload };
    case 'enum': {
      const name = payload.substring(payload.lastIndexOf('.') + 1);
      return { name: () => name, ordinal: () => 0, toString: () => name };
    }
    case 'kvector': {
      const [x, y] = payload.split(',').map(Number);
      return new KVector(x as number, y as number);
    }
    case 'proxy':
      return new LayoutOptionProxy(payload);
    case 'opt':
      return LayoutMetaDataService.getInstance().getOptionData(payload);
    default:
      return new Property<unknown>(payload);
  }
}

function describeValue(v: unknown): Described | null {
  if (v === null) return null;
  if (v instanceof LayoutOptionData) return { class: CLASS_LAYOUT_OPTION_DATA, id: v.getId() };
  if (v instanceof Property) return { class: CLASS_PROPERTY, id: v.getId() };
  if (v instanceof LayoutOptionProxy) return { class: CLASS_PROXY, text: v.toString() as string };
  if (typeof v === 'string') return { class: CLASS_STRING, text: v };
  throw new Error(`unexpected value ${String(v)}`);
}

/** Describes a number as the Java type the row records (`Integer` rows print plain, `Double` rows like Java). */
function describeNumber(v: number, javaClass: string): Described {
  return { class: javaClass, text: javaClass === CLASS_DOUBLE ? doubleToString(v) : String(v) };
}

function errorClass(e: unknown): string {
  if (e instanceof ValueConverterWithValueException) return CLASS_VCE_WITH_VALUE;
  if (e instanceof ValueConverterException) return CLASS_VCE;
  return (e as Error).name;
}

function run(service: ElkGraphJsonValueConverterService, row: Row): unknown {
  return row.op === 'toValue'
    ? service.toValue(row.input, row.converter, null)
    : service.toString(decodeTyped(row.input), row.converter);
}

describe('ElkGraphJsonValueConverterService vectors', () => {
  const service = new ElkGraphJsonValueConverterService(tokenize);

  it('replays every converter row that a TypeScript value can express', () => {
    let replayed = 0;
    for (const row of rows) {
      if (isUnrepresentable(row)) continue;
      const label = `${row.converter}.${row.op}(${JSON.stringify(row.input)})`;
      if (row.error?.cls === CLASS_CAST) {
        // the JDK's cast message is JDK-version text (ElktLexerVectors.java:36): the class only
        expect(() => run(service, row), label).toThrow(ClassCastException);
      } else if (row.error !== undefined) {
        let thrown: unknown = null;
        try {
          run(service, row);
        } catch (e) {
          thrown = e;
        }
        expect(thrown, label).not.toBeNull();
        expect(errorClass(thrown), label).toBe(row.error.cls);
        expect((thrown as Error).message, label).toBe(row.error.msg);
      } else if (row.op === 'toString') {
        expect(run(service, row), label).toBe(row.output);
      } else {
        const actual = run(service, row);
        const expected = row.output as Described | null;
        const described =
          typeof actual === 'number' ? describeNumber(actual, expected?.class as string) : describeValue(actual);
        expect(described, label).toEqual(expected);
      }
      replayed++;
    }
    expect(replayed).toBeGreaterThan(400);
  });

  it('skips only the three rows a number cannot represent', () => {
    expect(rows.filter(isUnrepresentable).map(rowKey).sort()).toEqual([...UNREPRESENTABLE_ROWS].sort());
    expect(rows.filter((row) => row.error?.cls === CLASS_CAST && !isUnrepresentable(row)).length).toBe(11);
  });

  it('serves the ELK converters under their rule names, one shared value converter', () => {
    expect(service.getConverter(ElkGraphJsonRuleName.NUMBER)).toBeInstanceOf(NumberValueConverter);
    expect(service.getConverter(ElkGraphJsonRuleName.PROPERTY_KEY)).toBeInstanceOf(PropertyKeyValueConverter);
    const value = service.getConverter(ElkGraphJsonRuleName.STRING_VALUE);
    expect(value).toBeInstanceOf(PropertyValueValueConverter);
    expect(service.getConverter(ElkGraphJsonRuleName.NUMBER_VALUE)).toBe(value);
    expect(service.getConverter(ElkGraphJsonRuleName.BOOLEAN_VALUE)).toBe(value);
  });

  it('serves the converters under qualified names too', () => {
    expect(service.getConverter('org.eclipse.elk.graph.json.text.ElkGraphJson.Number')).toBe(
      service.getConverter(ElkGraphJsonRuleName.NUMBER),
    );
    expect(service.getConverter('org.eclipse.xtext.common.Terminals.ID')).toBe(service.getConverter('ID'));
    expect(service.getConverter('org.eclipse.elk.graph.json.text.ElkGraphJson.JsonValue')).toBeInstanceOf(
      EFactoryValueConverter,
    );
  });

  it('falls back to the no-op converter for unknown rules', () => {
    expect(service.getConverter('Bogus')).toBe(NO_OP_CONVERTER);
  });

  it('looks rules up by simple and qualified name', () => {
    const id = ELK_GRAPH_JSON_RULES.findRuleForName('ID');
    expect(id?.isTerminalRule()).toBe(true);
    expect(ELK_GRAPH_JSON_RULES.getQualifiedName(id as AbstractRule)).toBe('org.eclipse.xtext.common.Terminals.ID');
    const number = ELK_GRAPH_JSON_RULES.findRuleForName('org.eclipse.elk.graph.json.text.ElkGraphJson.Number');
    expect(number?.isTerminalRule()).toBe(false);
    expect(ELK_GRAPH_JSON_RULES.getQualifiedName(number as AbstractRule)).toBe(
      'org.eclipse.elk.graph.json.text.ElkGraphJson.Number',
    );
    expect(ELK_GRAPH_JSON_RULES.findRuleForName('Bogus')).toBeNull();
    expect(ELK_GRAPH_JSON_RULES.getEStringDatatypeRules().map((r) => r.getName())).toContain('JsonValue');
  });
});
