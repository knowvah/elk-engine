// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EdgeType } from './EdgeType.js';

const DECLARED = ['NONE', 'DIRECTED', 'UNDIRECTED', 'ASSOCIATION', 'GENERALIZATION', 'DEPENDENCY'] as const;

describe('EdgeType', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeType.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeType.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4, 5]);
    expect(EdgeType.values()).toHaveLength(6);
    expect(EdgeType.values()[5]).toBe(EdgeType.DEPENDENCY);
  });

  it('toString is the name', () => {
    expect(EdgeType.DEPENDENCY.toString()).toBe('DEPENDENCY');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeType.valueOf(name)).toBe(EdgeType[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeType.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeType.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.EdgeType.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeType.DEPENDENCY.compareTo(EdgeType.NONE)).toBe(5);
    expect(EdgeType.NONE.compareTo(EdgeType.DEPENDENCY)).toBe(-5);
    expect(EdgeType.NONE.compareTo(EdgeType.NONE)).toBe(0);
  });
});
