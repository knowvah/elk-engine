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

describe('GraphProperties oracle row site/enums/GraphProperties', () => {
  // oracle: site/enums/GraphProperties
  it('site/enums/GraphProperties: constants in declaration order with name, ordinal and toString', () => {
    expect(GraphProperties.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['COMMENTS', 0, 'COMMENTS'],
      ['EXTERNAL_PORTS', 1, 'EXTERNAL_PORTS'],
      ['HYPEREDGES', 2, 'HYPEREDGES'],
      ['HYPERNODES', 3, 'HYPERNODES'],
      ['NON_FREE_PORTS', 4, 'NON_FREE_PORTS'],
      ['NORTH_SOUTH_PORTS', 5, 'NORTH_SOUTH_PORTS'],
      ['SELF_LOOPS', 6, 'SELF_LOOPS'],
      ['CENTER_LABELS', 7, 'CENTER_LABELS'],
      ['END_LABELS', 8, 'END_LABELS'],
      ['PARTITIONS', 9, 'PARTITIONS'],
    ]);
  });

  // oracle: site/enums/GraphProperties
  it('site/enums/GraphProperties: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => GraphProperties.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => GraphProperties.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.GraphProperties.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/GraphProperties
  it('site/enums/GraphProperties: compareTo first/last', () => {
    const values = GraphProperties.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-9);
    expect(last.compareTo(first)).toBe(9);
    expect(first.compareTo(first)).toBe(0);
  });
});
