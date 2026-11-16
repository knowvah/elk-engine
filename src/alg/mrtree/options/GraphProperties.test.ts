// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GraphProperties } from './GraphProperties.js';

const DECLARED = ['SELF_LOOPS'] as const;

describe('GraphProperties', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(GraphProperties.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(GraphProperties.values()[0]).toBe(GraphProperties.SELF_LOOPS);
  });

  it('compareTo orders by ordinal', () => {
    expect(GraphProperties.SELF_LOOPS.compareTo(GraphProperties.SELF_LOOPS)).toBe(0);
    expect(GraphProperties.SELF_LOOPS.compareTo(GraphProperties.SELF_LOOPS)).toBe(0);
    expect(GraphProperties.SELF_LOOPS.compareTo(GraphProperties.SELF_LOOPS)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(GraphProperties.valueOf(name)).toBe(GraphProperties[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => GraphProperties.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => GraphProperties.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.options.GraphProperties.FOO',
    );
  });
});
