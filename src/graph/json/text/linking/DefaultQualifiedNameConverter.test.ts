// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import { DefaultQualifiedNameConverter } from './DefaultQualifiedNameConverter.js';

const converter = new DefaultQualifiedNameConverter();

describe('DefaultQualifiedNameConverter', () => {
  it('splits at dots into segments', () => {
    expect(converter.toQualifiedName('a.b.c').getSegments()).toEqual(['a', 'b', 'c']);
  });

  it('keeps interior empty segments and drops trailing ones (Strings.split)', () => {
    expect(converter.toQualifiedName('a..b.').getSegments()).toEqual(['a', '', 'b']);
  });

  it('prints segments joined by dots', () => {
    expect(converter.toString(QualifiedName.create('a', 'b'))).toBe('a.b');
  });

  it('rejects a null or empty text and a null name with the Xtext messages', () => {
    expect(() => converter.toQualifiedName(null)).toThrow(
      new IllegalArgumentException('Qualified name cannot be null'),
    );
    expect(() => converter.toQualifiedName('')).toThrow(new IllegalArgumentException('Qualified name cannot be empty'));
    expect(() => converter.toString(null)).toThrow(new IllegalArgumentException('Qualified name cannot be null'));
  });
});
