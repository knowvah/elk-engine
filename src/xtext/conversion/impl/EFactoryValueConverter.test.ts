// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { EFactoryValueConverter } from './EFactoryValueConverter.js';

describe('EFactoryValueConverter (EString)', () => {
  const converter = new EFactoryValueConverter();

  it('converts strings to themselves in both directions', () => {
    expect(converter.toValue('a.b.c', null)).toBe('a.b.c');
    expect(converter.toString('a.b.c')).toBe('a.b.c');
  });

  it('keeps null', () => {
    expect(converter.toValue(null, null)).toBeNull();
    expect(converter.toString(null)).toBeNull();
  });
});
