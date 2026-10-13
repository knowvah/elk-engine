// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayoutOptionDataVisibility } from './LayoutOptionDataVisibility.js';

describe('LayoutOptionDataVisibility', () => {
  it('lists the constants in declaration order', () => {
    expect(LayoutOptionDataVisibility.values().map((c) => c.name())).toEqual(['VISIBLE', 'ADVANCED', 'HIDDEN']);
    expect(LayoutOptionDataVisibility.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
  });

  it('looks up by name', () => {
    expect(LayoutOptionDataVisibility.valueOf('HIDDEN')).toBe(LayoutOptionDataVisibility.HIDDEN);
    expect(LayoutOptionDataVisibility.valueOf('HIDDEN').toString()).toBe('HIDDEN');
  });

  it('rejects unknown names', () => {
    expect(() => LayoutOptionDataVisibility.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => LayoutOptionDataVisibility.valueOf('NOPE')).toThrow('LayoutOptionData.Visibility.NOPE');
  });

  it('compares by ordinal', () => {
    expect(LayoutOptionDataVisibility.VISIBLE.compareTo(LayoutOptionDataVisibility.HIDDEN)).toBe(-2);
    expect(LayoutOptionDataVisibility.ADVANCED.compareTo(LayoutOptionDataVisibility.ADVANCED)).toBe(0);
  });
});
