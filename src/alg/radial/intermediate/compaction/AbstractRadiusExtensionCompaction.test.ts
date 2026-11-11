// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { AbstractRadiusExtensionCompaction } from './AbstractRadiusExtensionCompaction.js';

const SIZE = 10;
const graph = ElkGraphUtil.createGraph();

function box(x: number, y: number, size = SIZE): ElkNode {
  const node = ElkGraphUtil.createNode(graph);
  node.setLocation(x, y);
  node.setDimensions(size, size);
  return node;
}

describe('AbstractRadiusExtensionCompaction', () => {
  it('defaults to step 1 and spacing 0 and keeps what the setters store', () => {
    const compaction = new AbstractRadiusExtensionCompaction();
    expect(compaction.getCompactionStep()).toBe(1);
    expect(compaction.getSpacing()).toBe(0);
    const root = box(0, 0);
    compaction.setCompactionStep(5);
    compaction.setSpacing(2.5);
    compaction.setRoot(root);
    expect([compaction.getCompactionStep(), compaction.getSpacing(), compaction.getRoot()]).toEqual([5, 2.5, root]);
  });

  // AbstractRadiusExtensionCompaction.java:111-128: the four corner cases of `overlap`, each with its first matching branch
  it.each([
    ['left upper and right lower corner (first branch)', [5, 5], [0, 0]],
    ['right lower and left upper corner (second branch)', [0, 0], [5, 5]],
    ['left lower and right upper corner (third branch)', [5, 0], [0, 5]],
    ['right upper and left lower corner (fourth branch)', [0, 5], [5, 0]],
  ] as const)('overlap: %s', (_name, first, second) => {
    const compaction = new AbstractRadiusExtensionCompaction();
    expect(compaction.overlap(box(first[0], first[1]), box(second[0], second[1]))).toBe(true);
  });

  it('overlap is false for separated boxes and counts the spacing around each box', () => {
    const compaction = new AbstractRadiusExtensionCompaction();
    expect(compaction.overlap(box(0, 0), box(11, 11))).toBe(false);
    compaction.setSpacing(4);
    expect(compaction.overlap(box(0, 0), box(11, 11))).toBe(true);
  });

  it('overlapLayer: false below two nodes, adjacent pairs, and the wrap-around pair of last and first', () => {
    const compaction = new AbstractRadiusExtensionCompaction();
    expect(compaction.overlapLayer([box(0, 0)])).toBe(false);
    expect(compaction.overlapLayer([])).toBe(false);
    expect(compaction.overlapLayer([box(0, 0), box(5, 5)])).toBe(true);
    // 0 -> 1 and 1 -> 2 are apart; only the cyclic pair (2, 0) overlaps
    expect(compaction.overlapLayer([box(0, 0), box(100, 100), box(5, 5)])).toBe(true);
    expect(compaction.overlapLayer([box(0, 0), box(100, 100), box(200, 200)])).toBe(false);
  });

  // contractLayer: node centers move along the ray from the root center by `compactionStep`
  it('contractLayer contracts and extends along the ray to the root by the step size', () => {
    const compaction = new AbstractRadiusExtensionCompaction();
    compaction.setRoot(box(-5, -5)); // center (0, 0)
    compaction.setCompactionStep(2);
    const node = box(5, -5); // center (10, 0)
    compaction.contractLayer([node], true);
    expect([node.getX(), node.getY()]).toEqual([3, -5]);
    compaction.contractLayer([node], false);
    compaction.contractLayer([node], false);
    expect([node.getX(), node.getY()]).toEqual([7, -5]);
  });

  it('moveNode moves a node by the distance along the root-to-node unit vector', () => {
    const compaction = new AbstractRadiusExtensionCompaction();
    compaction.setRoot(box(-5, -5));
    const node = box(-2, -1); // center (3, 4)
    compaction.moveNode(node, 5);
    expect([node.getX(), node.getY()]).toEqual([1, 3]);
  });
});
