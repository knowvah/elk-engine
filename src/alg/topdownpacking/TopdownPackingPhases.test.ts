// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { TopdownPackingPhases } from './TopdownPackingPhases.js';

const DECLARED = ['P1_NODE_ARRANGEMENT', 'P2_WHITESPACE_ELIMINATION'] as const;

describe('TopdownPackingPhases', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(TopdownPackingPhases.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
  });

  it('compareTo orders by ordinal', () => {
    const [p1, p2] = TopdownPackingPhases.values();
    expect([p1!.compareTo(p2!), p2!.compareTo(p1!), p1!.compareTo(p1!)]).toEqual([-1, 1, 0]);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TopdownPackingPhases.valueOf(name)).toBe(TopdownPackingPhases[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TopdownPackingPhases.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TopdownPackingPhases.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.topdownpacking.TopdownPackingPhases.FOO',
    );
  });
});
