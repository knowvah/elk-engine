// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Direction } from '../../../../core/options/Direction.js';
import { LayoutOptionProxy } from '../../../../core/util/internal/LayoutOptionProxy.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../../graph/impl/ElkPropertyToValueMapEntryImpl.js';
import { Property } from '../../../../graph/properties/Property.js';
import type { INode } from '../../../../xtext/nodemodel/INode.js';
import { PropertyValueValueConverter } from './PropertyValueValueConverter.js';

function nodeWithKey(key: Property<unknown> | null): INode {
  const entry = new ElkPropertyToValueMapEntryImpl();
  if (key !== null) entry.setKey(key);
  return { getStartLine: () => 1, getText: () => '', getSemanticElement: () => entry };
}

describe('PropertyValueValueConverter.toString', () => {
  const converter = new PropertyValueValueConverter();

  it('double-quotes non-numeric strings and keeps the literals bare', () => {
    expect(converter.toString('abc')).toBe('"abc"');
    expect(converter.toString('')).toBe('""');
    expect(converter.toString('true')).toBe('true');
    expect(converter.toString('false')).toBe('false');
    expect(converter.toString('null')).toBe('null');
    expect(converter.toString('1.5')).toBe('1.5');
  });

  it('prints numbers and booleans bare', () => {
    expect(converter.toString(3)).toBe('3');
    expect(converter.toString(1e10)).toBe('2147483647');
    expect(converter.toString(1.5)).toBe('1.5');
    expect(converter.toString(NaN)).toBe('NaN');
    expect(converter.toString(true)).toBe('true');
    expect(converter.toString(5n)).toBe('5');
    expect(converter.toString(null)).toBe('null');
  });

  it('quotes every other object, enum constants included', () => {
    expect(converter.toString(Direction.UP)).toBe('"UP"');
    expect(converter.toString({ toString: () => 'x y' })).toBe('"x y"');
  });

  it('prints a proxy through its text', () => {
    expect(converter.toString(new LayoutOptionProxy('abc'))).toBe('"abc"');
    expect(converter.toString(new LayoutOptionProxy('7'))).toBe('7');
    expect(converter.toString(new LayoutOptionProxy(null))).toBe('null');
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

describe('PropertyValueValueConverter.toValue', () => {
  const converter = new PropertyValueValueConverter();

  it('returns null for empty and null literals', () => {
    expect(converter.toValue('', null)).toBeNull();
    expect(converter.toValue(null, null)).toBeNull();
    expect(converter.toValue('null', null)).toBeNull();
  });

  it('strips matching quotes only and falls back to a proxy without a node', () => {
    expect(String(converter.toValue('"a b"', null))).toBe('a b');
    expect(String(converter.toValue("'a'", null))).toBe('a');
    expect(String(converter.toValue('"a\'', null))).toBe('"a\'');
    expect(converter.toValue('"x"', null)).toBeInstanceOf(LayoutOptionProxy);
    expect(String(converter.toValue('a.b', null))).toBe('a.b');
  });

  it('parses against a known option of the entry key', () => {
    const key = new Property<unknown>('org.eclipse.elk.direction');
    expect(converter.toValue('"UP"', nodeWithKey(key))).toBe(Direction.UP);
  });

  it('falls back to a proxy for unknown keys, unparsable values and key-less entries', () => {
    expect(converter.toValue('"x"', nodeWithKey(new Property<unknown>('my.custom.key')))).toBeInstanceOf(
      LayoutOptionProxy,
    );
    expect(
      converter.toValue('"nonsense"', nodeWithKey(new Property<unknown>('org.eclipse.elk.direction'))),
    ).toBeInstanceOf(LayoutOptionProxy);
    expect(converter.toValue('1', nodeWithKey(null))).toBeInstanceOf(LayoutOptionProxy);
    const bare: INode = { getStartLine: () => 1, getText: () => '', getSemanticElement: () => null };
    expect(converter.toValue('1', bare)).toBeInstanceOf(LayoutOptionProxy);
  });
});
