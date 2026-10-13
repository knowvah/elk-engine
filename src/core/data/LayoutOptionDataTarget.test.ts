// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';

describe('LayoutOptionDataTarget', () => {
  it('lists the constants in declaration order', () => {
    expect(LayoutOptionDataTarget.values().map((c) => c.name())).toEqual([
      'PARENTS',
      'NODES',
      'EDGES',
      'PORTS',
      'LABELS',
    ]);
    expect(LayoutOptionDataTarget.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4]);
  });

  it('looks up by name', () => {
    expect(LayoutOptionDataTarget.valueOf('LABELS')).toBe(LayoutOptionDataTarget.LABELS);
    expect(LayoutOptionDataTarget.valueOf('LABELS').toString()).toBe('LABELS');
  });

  it('rejects unknown names', () => {
    expect(() => LayoutOptionDataTarget.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => LayoutOptionDataTarget.valueOf('NOPE')).toThrow('LayoutOptionData.Target.NOPE');
  });

  it('compares by ordinal', () => {
    expect(LayoutOptionDataTarget.PARENTS.compareTo(LayoutOptionDataTarget.LABELS)).toBe(-4);
    expect(LayoutOptionDataTarget.NODES.compareTo(LayoutOptionDataTarget.NODES)).toBe(0);
  });
});
