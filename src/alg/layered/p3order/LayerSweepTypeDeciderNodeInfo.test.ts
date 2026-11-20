// SPDX-License-Identifier: EPL-2.0
// `NodeInfo.transfer` (LayerSweepTypeDecider.java:164-168) adds three Java `int` fields with `+=`, so a sum past
// Integer.MAX_VALUE wraps to the low 32 bits (JLS 15.18.2, 15.26.2). Expected values come from the JLS.
import { describe, expect, it } from 'vitest';
import { LayerSweepTypeDeciderNodeInfo as NodeInfo } from './LayerSweepTypeDeciderNodeInfo.js';

const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

function infoWith(connectedEdges: number, hierarchicalInfluence: number, randomInfluence: number): NodeInfo {
  const info = new NodeInfo();
  info.connectedEdges = connectedEdges;
  info.hierarchicalInfluence = hierarchicalInfluence;
  info.randomInfluence = randomInfluence;
  return info;
}

describe('LayerSweepTypeDeciderNodeInfo.transfer', () => {
  it('wraps every field to the low 32 bits when the sum passes Integer.MAX_VALUE', () => {
    const target = infoWith(INT_MAX, INT_MAX, INT_MAX);
    target.transfer(infoWith(1, 1, 1));
    expect(target.connectedEdges).toBe(INT_MIN);
    expect(target.hierarchicalInfluence).toBe(INT_MIN);
    expect(target.randomInfluence).toBe(INT_MIN);
  });

  it('adds small values without wrapping', () => {
    const target = infoWith(1, 2, 3);
    target.transfer(infoWith(10, 20, 30));
    expect(target.connectedEdges).toBe(11);
    expect(target.hierarchicalInfluence).toBe(22);
    expect(target.randomInfluence).toBe(33);
  });
});
