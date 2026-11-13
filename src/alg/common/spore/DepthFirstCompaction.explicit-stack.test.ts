// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `compactTree` (mission 8c, T14, PK6) against a verbatim transcription of the recursive Java
// (`DepthFirstCompaction.java` `compactTree`) on seeded random trees, compared at raw bits, plus a depth no recursion survives.
import { describe, expect, it, vi } from 'vitest';
import type { KVector } from '../../../core/math/KVector.js';
import type { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import {
  buildTree,
  pathSpec,
  randomSpec,
  seededRandom,
  SHAPES,
  snapshot,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { DepthFirstCompaction } from './DepthFirstCompaction.js';
import type { Node } from './Node.js';

/** The private statics of `DepthFirstCompaction` the reference drives (test-only access to a hidden-constructor class). */
interface Internals {
  root: Tree<Node>;
  orthogonalCompaction: boolean;
  svg: SVGImage;
  compactTree(tree: Tree<Node>): void;
  restrictToOrthogonal(v: KVector, rt: Node['rect'], rc: Node['rect']): void;
  getMinUnderlap(tree: Tree<Node>, child: Tree<Node>, current: number, v: KVector): number;
  translateSubtree(tree: Tree<Node>, v: KVector): void;
  debugOut(tree: Tree<Node>, mark: Tree<Node> | null): void;
}

// Justification: the class has a private constructor and private statics; the cast is the only access to them.
const internals = DepthFirstCompaction as unknown as Internals;

const TREES_PER_MODE = 1000;
const TIMEOUT = { timeout: 60_000 };
// compaction is cubic in the node count: 16 keeps 2,000 reference/explicit pairs under a second (30 took 5 s per mode at load)
const MAX_NODES = 16;
const DEEP_PATH_LENGTH = 50_000;

/** Verbatim transcription of the recursive Java `compactTree`, over the real private helpers. */
function referenceCompactTree(tree: Tree<Node>): void {
  // first compact the children of the current node
  tree.children.forEach((c) => referenceCompactTree(c));

  // remove underlap between root and its children
  for (const child of tree.children) {
    const compactionVector = tree.node.vertex.clone().sub(child.node.vertex);

    if (internals.orthogonalCompaction) {
      internals.restrictToOrthogonal(compactionVector, tree.node.rect, child.node.rect);
    } else {
      compactionVector.scaleToLength(tree.node.underlap(child.node));
    }

    let minUnderlap = compactionVector.length();
    minUnderlap = internals.getMinUnderlap(internals.root, child, minUnderlap, compactionVector);

    compactionVector.scaleToLength(minUnderlap);
    internals.translateSubtree(child, compactionVector);

    internals.debugOut(tree, child);
  }
}

function runReference(spec: TreeSpec, orthogonal: boolean): string[] {
  const built = buildTree(spec);
  internals.svg = new SVGImage(null);
  internals.orthogonalCompaction = orthogonal;
  internals.root = built.root;
  referenceCompactTree(built.root);
  return snapshot(built);
}

function runExplicit(spec: TreeSpec, orthogonal: boolean): string[] {
  const built = buildTree(spec);
  DepthFirstCompaction.compact(built.root, orthogonal);
  return snapshot(built);
}

describe('DepthFirstCompaction.compactTree: explicit stack equals the verbatim recursion', () => {
  for (const orthogonal of [false, true]) {
    it(
      `${TREES_PER_MODE} seeded random trees, orthogonal=${orthogonal}: every node's vertex and rectangle equal at raw bits`,
      TIMEOUT,
      () => {
        const rnd = seededRandom(orthogonal ? 20_261_113 : 13_112_026);
        const mismatches: number[] = [];
        let moved = 0;
        for (let i = 0; i < TREES_PER_MODE; i++) {
          const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
          const before = snapshot(buildTree(spec));
          const expected = runReference(spec, orthogonal);
          const actual = runExplicit(spec, orthogonal);
          if (actual.join('|') !== expected.join('|')) {
            mismatches.push(i);
          }
          if (expected.join('|') !== before.join('|')) {
            moved++;
          }
        }
        expect(mismatches).toEqual([]);
        // the comparison has power: compaction moves nodes in most of the random trees
        expect(moved).toBeGreaterThan(TREES_PER_MODE / 2);
      },
    );
  }

  it('visits the children of every node before the node itself and the siblings left to right (call order on every shape)', () => {
    for (const shape of SHAPES) {
      const spec = randomSpec(shape, 12, seededRandom(7));
      const orders: number[][] = [];
      for (const run of [referenceCompactTree, internals.compactTree.bind(internals)]) {
        const built = buildTree(spec);
        const order: number[] = [];
        internals.svg = new SVGImage(null);
        internals.orthogonalCompaction = false;
        internals.root = built.root;
        const spy = vi.spyOn(internals, 'translateSubtree').mockImplementation((child) => {
          order.push(built.trees.indexOf(child));
        });
        run(built.root);
        spy.mockRestore();
        orders.push(order);
      }
      expect(orders[1]).toEqual(orders[0]);
      expect(orders[0]).toHaveLength(11);
    }
  });

  it(`compacts a ${DEEP_PATH_LENGTH}-node path without overflowing the call stack, deepest child first`, () => {
    const built = buildTree(pathSpec(DEEP_PATH_LENGTH, 20));
    const order: Tree<Node>[] = [];
    internals.svg = new SVGImage(null);
    internals.orthogonalCompaction = false;
    internals.root = built.root;
    // the cubic work and the recursive helpers are stubbed: this test is about the traversal of `compactTree` alone
    const underlap = vi.spyOn(internals, 'getMinUnderlap').mockReturnValue(0);
    const translate = vi.spyOn(internals, 'translateSubtree').mockImplementation((child) => {
      order.push(child);
    });
    const debug = vi.spyOn(internals, 'debugOut').mockImplementation(() => {});
    try {
      internals.compactTree(built.root);
    } finally {
      underlap.mockRestore();
      translate.mockRestore();
      debug.mockRestore();
    }
    expect(order).toHaveLength(DEEP_PATH_LENGTH - 1);
    expect(order[0]).toBe(built.trees[DEEP_PATH_LENGTH - 1]);
    expect(order[DEEP_PATH_LENGTH - 2]).toBe(built.trees[1]);
  });
});
