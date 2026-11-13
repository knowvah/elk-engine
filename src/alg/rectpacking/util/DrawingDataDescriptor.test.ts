// SPDX-License-Identifier: EPL-2.0
// Proof of DrawingDataDescriptor (mission 8c, T6): the five constants of DrawingDataDescriptor.java:23-37 in declaration order, and
// every placement option the recorded GreedyWidthApproximator stops name.
import { describe, expect, it } from 'vitest';
import { collectStops } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { DrawingDataDescriptor } from './DrawingDataDescriptor.js';

const GREEDY = 'after:GreedyWidthApproximator';

describe('DrawingDataDescriptor (DrawingDataDescriptor.java)', () => {
  it('has the five Java constants in declaration order, covering every recorded placement option', () => {
    expect(DrawingDataDescriptor.values().map((c) => [c.ordinal(), c.name(), c.toString()])).toEqual([
      [0, 'CANDIDATE_POSITION_LAST_PLACED_RIGHT', 'CANDIDATE_POSITION_LAST_PLACED_RIGHT'],
      [1, 'CANDIDATE_POSITION_LAST_PLACED_BELOW', 'CANDIDATE_POSITION_LAST_PLACED_BELOW'],
      [2, 'CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT', 'CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT'],
      [3, 'CANDIDATE_POSITION_WHOLE_DRAWING_BELOW', 'CANDIDATE_POSITION_WHOLE_DRAWING_BELOW'],
      [4, 'WHOLE_DRAWING', 'WHOLE_DRAWING'],
    ]);
    const recorded = new Set(collectStops([GREEDY]).map((f) => f.stop.state.drawing!.placementOption));
    for (const name of recorded) {
      expect(DrawingDataDescriptor.valueOf(name).name()).toBe(name);
    }
    expect(DrawingDataDescriptor.valueOf('WHOLE_DRAWING')).toBe(DrawingDataDescriptor.WHOLE_DRAWING);
  });

  it('compareTo orders by ordinal and valueOf rejects an unknown name with the Java message', () => {
    expect(
      DrawingDataDescriptor.WHOLE_DRAWING.compareTo(DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT),
    ).toBe(4);
    expect(() => DrawingDataDescriptor.valueOf('NOPE')).toThrow(
      new IllegalArgumentException('No enum constant org.eclipse.elk.alg.rectpacking.util.DrawingDataDescriptor.NOPE'),
    );
  });
});
