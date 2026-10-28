// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GraphCompactionStrategy } from './GraphCompactionStrategy.js';

const DECLARED = [
  'NONE',
  'LEFT',
  'RIGHT',
  'LEFT_RIGHT_CONSTRAINT_LOCKING',
  'LEFT_RIGHT_CONNECTION_LOCKING',
  'EDGE_LENGTH',
] as const;

describe('GraphCompactionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(GraphCompactionStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(GraphCompactionStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(GraphCompactionStrategy.values()[5]).toBe(GraphCompactionStrategy.EDGE_LENGTH);
  });

  it('toString is the name', () => {
    expect(GraphCompactionStrategy.EDGE_LENGTH.toString()).toBe('EDGE_LENGTH');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(GraphCompactionStrategy.valueOf(name)).toBe(GraphCompactionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => GraphCompactionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => GraphCompactionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.GraphCompactionStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(GraphCompactionStrategy.EDGE_LENGTH.compareTo(GraphCompactionStrategy.NONE)).toBe(5);
    expect(GraphCompactionStrategy.NONE.compareTo(GraphCompactionStrategy.EDGE_LENGTH)).toBe(-5);
    expect(GraphCompactionStrategy.NONE.compareTo(GraphCompactionStrategy.NONE)).toBe(0);
  });
});

describe('GraphCompactionStrategy oracle row site/enums/GraphCompactionStrategy', () => {
  // oracle: site/enums/GraphCompactionStrategy
  it('site/enums/GraphCompactionStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(GraphCompactionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['LEFT', 1, 'LEFT'],
      ['RIGHT', 2, 'RIGHT'],
      ['LEFT_RIGHT_CONSTRAINT_LOCKING', 3, 'LEFT_RIGHT_CONSTRAINT_LOCKING'],
      ['LEFT_RIGHT_CONNECTION_LOCKING', 4, 'LEFT_RIGHT_CONNECTION_LOCKING'],
      ['EDGE_LENGTH', 5, 'EDGE_LENGTH'],
    ]);
  });

  // oracle: site/enums/GraphCompactionStrategy
  it('site/enums/GraphCompactionStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => GraphCompactionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => GraphCompactionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.GraphCompactionStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/GraphCompactionStrategy
  it('site/enums/GraphCompactionStrategy: compareTo first/last', () => {
    const values = GraphCompactionStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-5);
    expect(last.compareTo(first)).toBe(5);
    expect(first.compareTo(first)).toBe(0);
  });
});
