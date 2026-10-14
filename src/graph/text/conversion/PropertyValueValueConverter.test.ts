// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../graph/impl/ElkPropertyToValueMapEntryImpl.js';
import { Property } from '../../../graph/properties/Property.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { INode } from '../../../xtext/nodemodel/INode.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphQualifiedNameConverter } from '../naming/ElkGraphQualifiedNameConverter.js';
import { PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';
import { PropertyValueValueConverter } from './PropertyValueValueConverter.js';

const LEXER_REF = new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const CLASS_PROXY = 'org.eclipse.elk.core.util.internal.LayoutOptionProxy';
const CLASS_DOUBLE = 'java.lang.Double';
const SINGLE_PROPERTY = /^([^\s:]+): (\S+|"[^"]*"|'[^']*')$/;

interface Described {
  readonly class: string;
  readonly text: string;
  readonly id?: string;
}

interface DocumentRow {
  readonly converter: string;
  readonly input: string;
  readonly output?: { readonly errors: readonly unknown[]; readonly entry: { readonly value: Described } | null };
}

const documentRows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly DocumentRow[] }).converters
  .filter((row) => row.converter === 'Document' && row.output?.errors.length === 0)
  .filter((row) => SINGLE_PROPERTY.test(row.input) && row.output?.entry?.value !== null);

const qualifiedNames = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);
const converter = new PropertyValueValueConverter(qualifiedNames);
const keys = new PropertyKeyValueConverter(tokenize, ELK_GRAPH_KEYWORDS);

/** What the parser does: the key is converted and set on the entry before its value is converted. */
function nodeFor(keyText: string): INode {
  const entry = new ElkPropertyToValueMapEntryImpl();
  entry.setKey(keys.toValue(keyText, null));
  return { getStartLine: () => 1, getText: () => '', getSemanticElement: () => entry };
}

function describeValue(value: unknown, javaClass: string): string {
  if (typeof value === 'number') return javaClass === CLASS_DOUBLE ? doubleToString(value) : String(value);
  return String(value);
}

describe('PropertyValueValueConverter.toValue with a node', () => {
  it('replays the single-property Document rows', () => {
    expect(documentRows.length).toBeGreaterThan(60);
    for (const row of documentRows) {
      const [, keyText, valueText] = SINGLE_PROPERTY.exec(row.input) as RegExpExecArray;
      const expected = row.output?.entry?.value as Described;
      const actual = converter.toValue(valueText as string, nodeFor(keyText as string));
      if (expected.class === CLASS_PROXY) {
        expect(actual, row.input).toBeInstanceOf(LayoutOptionProxy);
        expect(String(actual), row.input).toBe(expected.text);
      } else {
        expect(actual, row.input).not.toBeInstanceOf(LayoutOptionProxy);
        expect(describeValue(actual, expected.class), row.input).toBe(expected.text);
      }
    }
  });

  it('resolves an option through the registry when the key is an unregistered property of a known id', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    entry.setKey(new Property<unknown>('org.eclipse.elk.direction'));
    const node: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => entry };
    expect(converter.toValue('UP', node)).toBe(Direction.UP);
  });

  it('falls back to a proxy for unknown keys and for a node without an entry', () => {
    const unknown = converter.toValue('"x"', nodeFor('my.custom.key'));
    expect(unknown).toBeInstanceOf(LayoutOptionProxy);
    expect(String(unknown)).toBe('x');
    const bare: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => null };
    expect(String(converter.toValue('a.b', bare))).toBe('a.b');
  });

  it('falls back to a proxy when the entry has no key yet', () => {
    const entry = new ElkPropertyToValueMapEntryImpl();
    const node: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => entry };
    expect(converter.toValue('UP', node)).toBeInstanceOf(LayoutOptionProxy);
  });

  it('returns null for empty and null literals', () => {
    expect(converter.toValue('', null)).toBeNull();
    expect(converter.toValue(null, null)).toBeNull();
    expect(converter.toValue('null', null)).toBeNull();
  });
});

describe('PropertyValueValueConverter.toValue identifier starts', () => {
  // Java isJavaIdentifierStart accepts letters, letter numbers, currency symbols and connector punctuation, so
  // these go through the qualified name converter, which drops the trailing empty segment; others stay verbatim.
  it.each([
    ['éx.', 'éx'],
    ['日.', '日'],
    ['Ⅰ.', 'Ⅰ'],
    ['€.', '€'],
    ['‿.', '‿'],
    ['$.', '$'],
    ['_.', '_'],
    ['^.', ''],
  ])('treats %j as an identifier start', (input, text) => {
    expect(String(converter.toValue(input, null))).toBe(text);
  });

  it.each(['1.', '².', '̀.', '@x.', '.'])('keeps %j verbatim', (input) => {
    expect(String(converter.toValue(input, null))).toBe(input);
  });

  it('strips matching quotes without unescaping', () => {
    expect(String(converter.toValue('"a\\nb"', null))).toBe('a\\nb');
    expect(String(converter.toValue("'a'", null))).toBe('a');
    expect(String(converter.toValue('"a\'', null))).toBe('"a\'');
  });
});

describe('PropertyValueValueConverter.toString', () => {
  it('prints enum constants bare and other objects through quoteIfNecessary', () => {
    expect(converter.toString(Direction.UP)).toBe('UP');
    expect(converter.toString(PortConstraints.FIXED_ORDER)).toBe('FIXED_ORDER');
    const set = EnumSet.noneOf<NodeLabelPlacement>(NodeLabelPlacement);
    set.add(NodeLabelPlacement.H_LEFT);
    expect(converter.toString(set)).toBe('"[H_LEFT]"');
  });

  it('prints primitives', () => {
    expect(converter.toString(true)).toBe('true');
    expect(converter.toString(5n)).toBe('5');
    expect(converter.toString(null)).toBe('null');
    expect(converter.toString(new LayoutOptionProxy(null))).toBe('null');
  });

  it('rethrows failures other than ValueConverterException from the name converter', () => {
    class Exploding extends ElkGraphQualifiedNameConverter {
      override toString(): string {
        throw new RangeError('boom');
      }
    }
    const exploding = new PropertyValueValueConverter(new Exploding(tokenize, ELK_GRAPH_KEYWORDS));
    expect(() => exploding.toString('a b')).toThrow(RangeError);
  });

  it('propagates a failing toString of the value', () => {
    const exploding = {
      toString: (): string => {
        throw new RangeError('boom');
      },
    };
    expect(() => converter.toString(exploding)).toThrow(RangeError);
  });
});
