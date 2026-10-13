// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { HierarchyHandling } from './HierarchyHandling.js';

const DECLARED = ['INHERIT', 'INCLUDE_CHILDREN', 'SEPARATE_CHILDREN'] as const;

describe('HierarchyHandling', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(HierarchyHandling.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(HierarchyHandling.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
    expect(HierarchyHandling.values()).toHaveLength(3);
    expect(HierarchyHandling.values()[2]).toBe(HierarchyHandling.SEPARATE_CHILDREN);
  });

  it('toString is the name', () => {
    expect(HierarchyHandling.SEPARATE_CHILDREN.toString()).toBe('SEPARATE_CHILDREN');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(HierarchyHandling.valueOf(name)).toBe(HierarchyHandling[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => HierarchyHandling.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => HierarchyHandling.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.HierarchyHandling.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(HierarchyHandling.SEPARATE_CHILDREN.compareTo(HierarchyHandling.INHERIT)).toBe(2);
    expect(HierarchyHandling.INHERIT.compareTo(HierarchyHandling.SEPARATE_CHILDREN)).toBe(-2);
    expect(HierarchyHandling.INHERIT.compareTo(HierarchyHandling.INHERIT)).toBe(0);
  });
});
