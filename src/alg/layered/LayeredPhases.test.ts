// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayeredPhases } from './LayeredPhases.js';

const DECLARED = [
  'P1_CYCLE_BREAKING',
  'P2_LAYERING',
  'P3_NODE_ORDERING',
  'P4_NODE_PLACEMENT',
  'P5_EDGE_ROUTING',
] as const;

describe('LayeredPhases', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LayeredPhases.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LayeredPhases.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4]);
    expect(LayeredPhases.values()[4]).toBe(LayeredPhases.P5_EDGE_ROUTING);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(LayeredPhases.P3_NODE_ORDERING.toString()).toBe('P3_NODE_ORDERING');
    expect(LayeredPhases.P5_EDGE_ROUTING.compareTo(LayeredPhases.P1_CYCLE_BREAKING)).toBe(4);
    expect(LayeredPhases.P1_CYCLE_BREAKING.compareTo(LayeredPhases.P5_EDGE_ROUTING)).toBe(-4);
    expect(LayeredPhases.P2_LAYERING.compareTo(LayeredPhases.P2_LAYERING)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LayeredPhases.valueOf(name)).toBe(LayeredPhases[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LayeredPhases.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LayeredPhases.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.LayeredPhases.FOO',
    );
  });
});
