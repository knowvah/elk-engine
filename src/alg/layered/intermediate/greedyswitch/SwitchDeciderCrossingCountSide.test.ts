// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

describe('CrossingCountSide (SwitchDecider.java:253-258)', () => {
  it('lists WEST then EAST with their ordinals and names', () => {
    expect(CrossingCountSide.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['WEST', 0, 'WEST'],
      ['EAST', 1, 'EAST'],
    ]);
  });

  it('resolves a constant by name and rejects an unknown name with the Java message', () => {
    expect(CrossingCountSide.valueOf('EAST')).toBe(CrossingCountSide.EAST);
    expect(() => CrossingCountSide.valueOf('NORTH')).toThrow(IllegalArgumentException);
    expect(() => CrossingCountSide.valueOf('NORTH')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.intermediate.greedyswitch.SwitchDecider.CrossingCountSide.NORTH',
    );
  });
});
