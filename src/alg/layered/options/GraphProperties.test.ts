// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GraphProperties } from './GraphProperties.js';

const DECLARED = [
  'COMMENTS',
  'EXTERNAL_PORTS',
  'HYPEREDGES',
  'HYPERNODES',
  'NON_FREE_PORTS',
  'NORTH_SOUTH_PORTS',
  'SELF_LOOPS',
  'CENTER_LABELS',
  'END_LABELS',
  'PARTITIONS',
] as const;

describe('GraphProperties', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(GraphProperties.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(GraphProperties.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(GraphProperties.values()[9]).toBe(GraphProperties.PARTITIONS);
  });

  it('toString is the name', () => {
    expect(GraphProperties.PARTITIONS.toString()).toBe('PARTITIONS');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(GraphProperties.valueOf(name)).toBe(GraphProperties[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => GraphProperties.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => GraphProperties.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.GraphProperties.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(GraphProperties.PARTITIONS.compareTo(GraphProperties.COMMENTS)).toBe(9);
    expect(GraphProperties.COMMENTS.compareTo(GraphProperties.PARTITIONS)).toBe(-9);
    expect(GraphProperties.COMMENTS.compareTo(GraphProperties.COMMENTS)).toBe(0);
  });
});
