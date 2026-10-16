// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../../core/data/LayoutOptionData.js';
import { Property } from '../../../../graph/properties/Property.js';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { tokenize } from '../parser/ElkGraphJsonLexer.js';
import { ELK_GRAPH_JSON_KEYWORDS } from '../parser/ElkGraphJsonTokenType.js';
import { PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';

const DIRECTION_ID = 'org.eclipse.elk.direction';

describe('PropertyKeyValueConverter', () => {
  const converter = new PropertyKeyValueConverter(tokenize, ELK_GRAPH_JSON_KEYWORDS);

  it.each(['"elk.direction"', "'elk.direction'", 'elk.direction', '"direction"'])(
    'resolves %s to the registered direction option',
    (text) => {
      const key = converter.toValue(text, null);
      expect(key).toBeInstanceOf(LayoutOptionData);
      expect(key.getId()).toBe(DIRECTION_ID);
    },
  );

  it('creates a fresh unregistered property keeping the original text, quotes included', () => {
    const key = converter.toValue('"custom.unknown.key"', null);
    expect(key).toBeInstanceOf(Property);
    expect(key).not.toBeInstanceOf(LayoutOptionData);
    expect(key.getId()).toBe('"custom.unknown.key"');
    expect(LayoutMetaDataService.getInstance().getOptionData('"custom.unknown.key"')).toBeNull();
    expect(converter.toValue('plain', null).getId()).toBe('plain');
  });

  it('strips matching quotes only', () => {
    expect(converter.toValue('"elk.direction\'', null).getId()).toBe('"elk.direction\'');
    expect(converter.toValue('"', null).getId()).toBe('"');
  });

  it('rejects empty input', () => {
    expect(() => converter.toValue('', null)).toThrow(ValueConverterException);
    expect(() => converter.toValue(null, null)).toThrow('Cannot convert empty string to a property identifier.');
  });

  it('prints a known option as its shortest suffix containing the group', () => {
    const direction = LayoutMetaDataService.getInstance().getOptionData(DIRECTION_ID) as LayoutOptionData;
    expect(converter.toString(direction)).toBe('direction');
  });

  it('prints an unknown key quoted, escaping keyword segments', () => {
    expect(converter.toString(new Property<unknown>('my.custom.key'))).toBe('"my.custom.key"');
    expect(converter.toString(new Property<unknown>('a.id'))).toBe('"a.^id"');
  });

  it('rejects null and a non-property as the JVM bridge does', () => {
    expect(() => converter.toString(null)).toThrow('IProperty value may not be null.');
    expect(() => converter.toString('direction' as never)).toThrow(ClassCastException);
  });
});
