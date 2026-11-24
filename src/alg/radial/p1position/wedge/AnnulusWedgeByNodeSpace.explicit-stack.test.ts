// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `calculateWedgeSpace` (mission tree-recursion-depth, #67, D4) against a verbatim transcription of
// the recursive Java (`AnnulusWedgeByNodeSpace.java:31-43`) on seeded trees, compared at raw bits, plus a depth no recursion
// survives.
import { describe, expect, it } from 'vitest';
import {
  doubleBits,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../../../test/helpers/spore-tree-fixtures.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { RadialUtil } from '../../RadialUtil.js';
import { AnnulusWedgeByNodeSpace } from './AnnulusWedgeByNodeSpace.js';
import { buildCaterpillar } from '../../../../../test/helpers/radial-tree-fixtures.js';

const TREES = 60;
const MAX_NODES = 40;
const DEEP_SPINE = 15_000;
const TIMEOUT = { timeout: 120_000 };
const ENDLESS_TIMEOUT = { timeout: 60_000 };

/** Verbatim transcription of the recursive Java `calculateWedgeSpace` (`AnnulusWedgeByNodeSpace.java:31-43`). */
function twinCalculateWedgeSpace(node: ElkNode): number {
  const successors = RadialUtil.getSuccessors(node);
  const height = node.getHeight();
  const width = node.getWidth();
  const nodeSize = Math.sqrt(height * height + width * width);

  let childSpace = 0;
  for (const child of successors) {
    childSpace += twinCalculateWedgeSpace(child);
  }
  return Math.max(childSpace, nodeSize);
}

/**
 * Builds the radial tree of a spec iteratively: every node a child of one graph node, an edge from each parent to each child in
 * index order, sizes from the spec's rectangles skewed by their coordinates so the diagonals are irrational.
 */
function buildRadialTree(spec: TreeSpec): ElkNode[] {
  const graph = ElkGraphUtil.createGraph();
  const nodes = spec.rects.map(([x, y, w, h]) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(w + x / 17, h + y / 13);
    return node;
  });
  spec.parents.forEach((parent, i) => ElkGraphUtil.createSimpleEdge(nodes[parent]!, nodes[i + 1]!));
  return nodes;
}

/** Nodes a (returned), b and c, 3 x 4, with edges a→b, b→c, c→b: a successor cycle the recursion never leaves. */
function buildEndlessCycle(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  const [a, b, c] = [0, 1, 2].map(() => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(3, 4);
    return node;
  });
  ElkGraphUtil.createSimpleEdge(a!, b!);
  ElkGraphUtil.createSimpleEdge(b!, c!);
  ElkGraphUtil.createSimpleEdge(c!, b!);
  return a!;
}

describe('AnnulusWedgeByNodeSpace.calculateWedgeSpace: explicit stack equals the verbatim recursion', () => {
  it(`${TREES} seeded trees of every shape: the space of every node equals the twin at raw bits`, TIMEOUT, () => {
    const rnd = seededRandom(20_261_123);
    const criteria = new AnnulusWedgeByNodeSpace();
    const mismatches: string[] = [];
    let summed = 0;
    for (let i = 0; i < TREES; i++) {
      const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
      buildRadialTree(spec).forEach((node, n) => {
        const expected = twinCalculateWedgeSpace(node);
        const actual = criteria.calculateWedgeSpace(node);
        if (doubleBits(actual) !== doubleBits(expected)) {
          mismatches.push(`tree ${i} node ${n}: ${actual} vs ${expected}`);
        }
        const own = Math.sqrt(node.getHeight() ** 2 + node.getWidth() ** 2);
        if (expected !== own) {
          summed++;
        }
      });
    }
    expect(mismatches).toEqual([]);
    // the comparison has power: many nodes take the sum of their successors, not their own diagonal
    expect(summed).toBeGreaterThan(200);
  });

  it(`a ${DEEP_SPINE}-node caterpillar spine completes without overflow, like the twin`, TIMEOUT, () => {
    const spine = buildCaterpillar(DEEP_SPINE).spineNodes;
    const root = spine[0]!;
    // spine node k from the end needs k leaves of diagonal 5: the root 5 * DEEP_SPINE, an exact double
    const port = new AnnulusWedgeByNodeSpace().calculateWedgeSpace(root);
    expect(port).toBe(5 * DEEP_SPINE);
    let twin: number | null = null;
    try {
      twin = twinCalculateWedgeSpace(root);
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(doubleBits(twin)).toBe(doubleBits(port));
    }
  });

  it(
    'a successor cycle reachable from the root (a→b, b→c, c→b) throws RangeError, like the twin',
    ENDLESS_TIMEOUT,
    () => {
      const root = buildEndlessCycle();
      // the Java recursion never ends there and throws StackOverflowError; the port's stack is depth-checked
      expect(() => new AnnulusWedgeByNodeSpace().calculateWedgeSpace(root)).toThrow(RangeError);
      expect(() => twinCalculateWedgeSpace(root)).toThrow(RangeError);
    },
  );
});
