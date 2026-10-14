// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import { Property } from '../../../graph/properties/Property.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';

const NODE_NODE = 'org.eclipse.elk.spacing.nodeNode';

function failure(fn: () => unknown): ValueConverterException {
  try {
    fn();
  } catch (e) {
    return e as ValueConverterException;
  }
  throw new Error('expected a ValueConverterException');
}

describe('PropertyKeyValueConverter', () => {
  const converter = new PropertyKeyValueConverter(tokenize, ELK_GRAPH_KEYWORDS);
  const registry = LayoutMetaDataService.getInstance();

  it('prints the shortest suffix that contains the option group', () => {
    const option = registry.getOptionData(NODE_NODE) as LayoutOptionData;
    expect(converter.toString(option)).toBe('spacing.nodeNode');
    expect(converter.toString(new Property<unknown>(NODE_NODE))).toBe('spacing.nodeNode');
  });

  it('prints an unknown id in full, escaping keywords per segment', () => {
    expect(converter.toString(new Property<unknown>('my.node.key'))).toBe('my.^node.key');
  });

  it('rejects a null key and invalid id characters', () => {
    expect(failure(() => converter.toString(null)).getMessage()).toBe('IProperty value may not be null.');
    expect(failure(() => converter.toString(new Property<unknown>('a-b'))).getMessage()).toBe(
      "ID 'a-b' contains invalid characters: '-' (0x2d)",
    );
  });

  it('resolves a suffix to the registered option', () => {
    expect(converter.toValue('spacing.nodeNode', null)).toBe(registry.getOptionData(NODE_NODE));
  });

  it('returns a fresh unregistered property with the verbatim string for unknown keys', () => {
    const first = converter.toValue('^node.custom', null);
    expect(first).toBeInstanceOf(Property);
    expect(first).not.toBeInstanceOf(LayoutOptionData);
    expect(first.getId()).toBe('^node.custom');
    expect(converter.toValue('^node.custom', null)).not.toBe(first);
    expect(registry.getOptionData('^node.custom')).toBeNull();
  });

  it('rejects an empty key', () => {
    expect(failure(() => converter.toValue('', null)).getMessage()).toBe(
      'Cannot convert empty string to a property identifier.',
    );
  });
});
