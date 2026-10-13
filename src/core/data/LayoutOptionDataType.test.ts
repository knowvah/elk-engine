// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayoutOptionDataType } from './LayoutOptionDataType.js';

describe('LayoutOptionDataType', () => {
  it('lists the constants in declaration order', () => {
    expect(LayoutOptionDataType.values().map((c) => c.name())).toEqual([
      'UNDEFINED',
      'BOOLEAN',
      'INT',
      'STRING',
      'DOUBLE',
      'ENUM',
      'ENUMSET',
      'OBJECT',
    ]);
    expect(LayoutOptionDataType.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('looks up by name', () => {
    expect(LayoutOptionDataType.valueOf('OBJECT')).toBe(LayoutOptionDataType.OBJECT);
    expect(LayoutOptionDataType.valueOf('OBJECT').toString()).toBe('OBJECT');
  });

  it('rejects unknown names', () => {
    expect(() => LayoutOptionDataType.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => LayoutOptionDataType.valueOf('NOPE')).toThrow('LayoutOptionData.Type.NOPE');
  });

  it('compares by ordinal', () => {
    expect(LayoutOptionDataType.UNDEFINED.compareTo(LayoutOptionDataType.OBJECT)).toBe(-7);
    expect(LayoutOptionDataType.BOOLEAN.compareTo(LayoutOptionDataType.BOOLEAN)).toBe(0);
  });
});
