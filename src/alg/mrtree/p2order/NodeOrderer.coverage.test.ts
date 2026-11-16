// SPDX-License-Identifier: EPL-2.0
// Priority 3 of NodeOrderer (NodeOrderer.java:250-259, mission 8a, T19): the out-of-bounds constraint nodes are sorted by
// `-Integer.compare(x.POSITION_CONSTRAINT, y.POSITION_CONSTRAINT)` (descending), then placed from the last free slot backwards.
// The recorded rows reach `compareInts` only with the `a > b` outcome; every permutation of three constraints here reaches the
// `a < b` outcome as well. Expectation: the order that sort-and-fill statement defines, not a layout.
import { describe, expect, it } from 'vitest';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { NodeOrderer } from './NodeOrderer.js';

type Place = (sorted: (TNode | null)[], outOfBound: TNode[], undefinedNodes: TNode[]) => void;
const place = (NodeOrderer as unknown as { placeOutOfBoundAndUndefined: Place }).placeOutOfBoundAndUndefined;

const PERMUTATIONS: readonly (readonly number[])[] = [
  [1, 2, 3],
  [1, 3, 2],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  [3, 2, 1],
];

describe('NodeOrderer priority 3 (NodeOrderer.java:250-259)', () => {
  it.each(PERMUTATIONS)('constraints %i, %i, %i end up ascending from the first slot', (...constraints) => {
    const graph = new TGraph();
    const nodes = constraints.map((constraint, index) => {
      const node = new TNode(index, graph);
      node.setProperty(MrTreeOptions.POSITION_CONSTRAINT, constraint);
      return node;
    });
    const sorted: (TNode | null)[] = [null, null, null];

    place(sorted, [...nodes], []);

    expect(sorted.map((node) => node?.getProperty(MrTreeOptions.POSITION_CONSTRAINT))).toEqual([1, 2, 3]);
  });
});
