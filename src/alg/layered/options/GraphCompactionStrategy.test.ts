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
