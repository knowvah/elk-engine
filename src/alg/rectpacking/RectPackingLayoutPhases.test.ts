// SPDX-License-Identifier: EPL-2.0
// Proof of RectPackingLayoutPhases (mission 8c, T6): the three constants of RectPackingLayoutPhases.java:21-28 in declaration order.
// The names are those the recorder's `processors` lists group by phase (p1 width approximation, p2 packing, p3 whitespace elimination).
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { RectPackingLayoutPhases } from './RectPackingLayoutPhases.js';

describe('RectPackingLayoutPhases (RectPackingLayoutPhases.java)', () => {
  it('has the three Java constants in declaration order', () => {
    expect(RectPackingLayoutPhases.values().map((c) => [c.ordinal(), c.name(), c.toString()])).toEqual([
      [0, 'P1_WIDTH_APPROXIMATION', 'P1_WIDTH_APPROXIMATION'],
      [1, 'P2_PACKING', 'P2_PACKING'],
      [2, 'P3_WHITESPACE_ELIMINATION', 'P3_WHITESPACE_ELIMINATION'],
    ]);
  });

  it('valueOf finds a constant by name and rejects an unknown one with the Java message', () => {
    expect(RectPackingLayoutPhases.valueOf('P2_PACKING')).toBe(RectPackingLayoutPhases.P2_PACKING);
    expect(() => RectPackingLayoutPhases.valueOf('P4_NOPE')).toThrow(
      new IllegalArgumentException('No enum constant org.eclipse.elk.alg.rectpacking.RectPackingLayoutPhases.P4_NOPE'),
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(
      RectPackingLayoutPhases.P3_WHITESPACE_ELIMINATION.compareTo(RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION),
    ).toBe(2);
    expect(RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION.compareTo(RectPackingLayoutPhases.P2_PACKING)).toBe(-1);
  });
});
