// SPDX-License-Identifier: EPL-2.0
// The `pos > 0` FALSE arm of RelativeXPlacer.java:192 (mission 8a, T19), reachable but unrecorded: the root-centering `while`
// (:181-187) leaves `pos` at 0 when the first child has a negative y (`getY() >= maxDepth` with maxDepth 0.0 fails at once),
// and `moveRoot` keeps its initial 0.0 (:191). Asserted from those statements, not from a layout.
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { computeRootMove } from './RelativeXPlacerStraightSteps.js';

describe('computeRootMove (RelativeXPlacer.java:181-194)', () => {
  it('a first child with negative y ends the loop at once: pos 0, moveRoot stays 0.0', () => {
    const graph = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(graph);
    child.setY(-5);
    expect(computeRootMove(graph, [child])).toEqual({ pos: 0, maxDepth: 0, maxDepthStartPos: 0, moveRoot: 0 });
  });

  it('no children: the loop is skipped, pos 0, moveRoot 0.0', () => {
    const graph = ElkGraphUtil.createGraph();
    expect(computeRootMove(graph, [])).toEqual({ pos: 0, maxDepth: 0, maxDepthStartPos: 0, moveRoot: 0 });
  });
});
