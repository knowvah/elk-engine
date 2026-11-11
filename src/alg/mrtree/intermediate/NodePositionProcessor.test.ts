// SPDX-License-Identifier: EPL-2.0
// Proof of NodePositionProcessor (mission 8a, T14): `process` from the recorded DirectionProcessor stop to the recorded NodePositionProcessor
// stop for every row of the ref that runs it, plus Java-traced hand cases (NodePositionProcessor.java:45-109).
import { describe, expect, it } from 'vitest';
import { graphOf, replayStep, runOn } from '../../../../test/helpers/mrtree-processor-replay.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { NodePositionProcessor } from './NodePositionProcessor.js';

describe('NodePositionProcessor.process against the recorded stops (acceptance)', () => {
  it('equals the NodePositionProcessor stop of every transition', { timeout: 60_000 }, () => {
    const replay = replayStep('NodePositionProcessor', () => new NodePositionProcessor());
    expect(replay.total).toBe(88);
    expect(replay.refused).toBe(0);
  });
});

describe('NodePositionProcessor hand cases', () => {
  it('copies XCOOR/YCOOR to the position level by level and then moves every node by half its size', () => {
    // root n0 -> n1 -> n2; n0 -> n3; n4 is detached (only the final shift reaches it)
    const { g, nodes } = graphOf(5, [
      [0, 1],
      [1, 2],
      [0, 3],
    ]);
    nodes[0]!.setProperty(InternalProperties.ROOT, true);
    const coords: [number, number][] = [
      [10, 0],
      [4, 20],
      [6, 40],
      [16, 20],
      [99, 99],
    ];
    nodes.forEach((n, i) => {
      n.setProperty(InternalProperties.XCOOR, coords[i]![0]);
      n.setProperty(InternalProperties.YCOOR, coords[i]![1]);
      n.getSize().x = 2;
      n.getSize().y = 6;
    });
    nodes[4]!.getPosition().x = 5;
    nodes[4]!.getPosition().y = 7;
    runOn(new NodePositionProcessor(), g);
    expect(nodes.map((n) => [n.getPosition().x, n.getPosition().y])).toEqual([
      [9, -3],
      [3, 17],
      [5, 37],
      [15, 17],
      [4, 4],
    ]);
  });

  it('a graph without a root throws (Java: NullPointerException on root.getChildrenCopy())', () => {
    expect(() => runOn(new NodePositionProcessor(), graphOf(1, []).g)).toThrow(TypeError);
  });
});
