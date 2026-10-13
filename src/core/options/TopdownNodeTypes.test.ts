// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { TopdownNodeTypes } from './TopdownNodeTypes.js';

const DECLARED = ['PARALLEL_NODE', 'HIERARCHICAL_NODE', 'ROOT_NODE'] as const;

describe('TopdownNodeTypes', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(TopdownNodeTypes.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(TopdownNodeTypes.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
    expect(TopdownNodeTypes.values()).toHaveLength(3);
    expect(TopdownNodeTypes.values()[2]).toBe(TopdownNodeTypes.ROOT_NODE);
  });

  it('toString is the name', () => {
    expect(TopdownNodeTypes.ROOT_NODE.toString()).toBe('ROOT_NODE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TopdownNodeTypes.valueOf(name)).toBe(TopdownNodeTypes[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TopdownNodeTypes.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TopdownNodeTypes.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.TopdownNodeTypes.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(TopdownNodeTypes.ROOT_NODE.compareTo(TopdownNodeTypes.PARALLEL_NODE)).toBe(2);
    expect(TopdownNodeTypes.PARALLEL_NODE.compareTo(TopdownNodeTypes.ROOT_NODE)).toBe(-2);
    expect(TopdownNodeTypes.PARALLEL_NODE.compareTo(TopdownNodeTypes.PARALLEL_NODE)).toBe(0);
  });
});
