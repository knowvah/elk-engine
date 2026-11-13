// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `growAt` (mission 8c, T14, PK6) against a verbatim transcription of the recursive Java
// (`GrowTreePhase.java:68` `growAt`) on seeded random trees, compared at raw bits, plus a depth no recursion survives.
import { describe, expect, it, vi } from 'vitest';
import type { Tree } from '../../common/Tree.js';
import type { Node } from '../../common/spore/Node.js';
import { Utils } from '../../common/utils/Utils.js';
import { SVGImage } from '../../common/utils/SVGImage.js';
import {
  buildTree,
  pathSpec,
  randomSpec,
  seededRandom,
  SHAPES,
  snapshot,
  type BuiltTree,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { GrowTreePhase } from './GrowTreePhase.js';

/** The private members of `GrowTreePhase` the reference drives (test-only access). */
interface Internals {
  svg: SVGImage;
  root: Tree<Node>;
  overlapsExisted: boolean;
  growAt(r: Tree<Node>): void;
  debugOut(c?: Tree<Node> | null): void;
}

const TREES = 1000;
const MAX_NODES = 30;
const DEEP_PATH_LENGTH = 50_000;
const DEEP_SPACING = 20;

/** A phase prepared as `process` leaves it before `growAt`: tree and (disabled) svg set, flag cleared. */
function prepare(built: BuiltTree): { phase: GrowTreePhase; internals: Internals } {
  const phase = new GrowTreePhase();
  // Justification: `svg`, `root` and `growAt` are private; the cast is the only access to them.
  const internals = phase as unknown as Internals;
  internals.svg = new SVGImage(null);
  internals.root = built.root;
  internals.overlapsExisted = false;
  return { phase, internals };
}

/** Verbatim transcription of the recursive Java `growAt`, over the real `debugOut`. */
function referenceGrowAt(internals: Internals, r: Tree<Node>): void {
  for (const c of r.children) {
    c.node.translate(r.node.vertex.clone().sub(r.node.originalVertex));
    const t = Utils.overlap(r.node.rect, c.node.rect);
    if (t > 1.0) {
      internals.overlapsExisted = true;
    }
    c.node.setCenterPosition(
      r.node.vertex.clone().add(c.node.originalVertex.clone().sub(r.node.originalVertex).scale(t)),
    );
    internals.debugOut(r);
    referenceGrowAt(internals, c);
  }
}

interface Outcome {
  readonly nodes: string[];
  readonly overlapsExisted: boolean;
}

function runReference(spec: TreeSpec): Outcome {
  const built = buildTree(spec);
  const { internals } = prepare(built);
  referenceGrowAt(internals, built.root);
  return { nodes: snapshot(built), overlapsExisted: internals.overlapsExisted };
}

function runExplicit(spec: TreeSpec): Outcome {
  const built = buildTree(spec);
  const { internals } = prepare(built);
  internals.growAt(built.root);
  return { nodes: snapshot(built), overlapsExisted: internals.overlapsExisted };
}

describe('GrowTreePhase.growAt: explicit stack equals the verbatim recursion', () => {
  it(`${TREES} seeded random trees: every node's vertex and rectangle at raw bits, and overlapsExisted, are equal`, () => {
    const rnd = seededRandom(20_261_114);
    const mismatches: number[] = [];
    let moved = 0;
    let flagged = 0;
    for (let i = 0; i < TREES; i++) {
      const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
      const expected = runReference(spec);
      const actual = runExplicit(spec);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        mismatches.push(i);
      }
      if (expected.nodes.join('|') !== snapshot(buildTree(spec)).join('|')) {
        moved++;
      }
      if (expected.overlapsExisted) {
        flagged++;
      }
    }
    expect(mismatches).toEqual([]);
    // the comparison has power: nodes move and the flag is set in some trees and clear in others
    expect(moved).toBeGreaterThan(TREES / 2);
    expect(flagged).toBeGreaterThan(0);
    expect(flagged).toBeLessThan(TREES);
  });

  it('calls debugOut with the parent of each child in the order of the recursion, on every shape', () => {
    for (const shape of SHAPES) {
      const spec = randomSpec(shape, 12, seededRandom(11));
      const orders: number[][] = [];
      for (const run of ['reference', 'explicit']) {
        const built = buildTree(spec);
        const { internals } = prepare(built);
        const order: number[] = [];
        internals.debugOut = (c) => {
          order.push(built.trees.indexOf(c!));
        };
        if (run === 'reference') {
          referenceGrowAt(internals, built.root);
        } else {
          internals.growAt(built.root);
        }
        orders.push(order);
      }
      expect(orders[1]).toEqual(orders[0]);
      expect(orders[0]).toHaveLength(11);
    }
  });

  it(`grows a ${DEEP_PATH_LENGTH}-node path without overflowing the call stack`, () => {
    const built = buildTree(pathSpec(DEEP_PATH_LENGTH, DEEP_SPACING));
    const { internals } = prepare(built);
    const parents: Tree<Node>[] = [];
    // the whole-tree debug drawing of every step is stubbed: this test is about the traversal of `growAt` alone
    const debug = vi.spyOn(internals, 'debugOut').mockImplementation((c) => {
      parents.push(c!);
    });
    try {
      internals.growAt(built.root);
    } finally {
      debug.mockRestore();
    }
    expect(parents).toHaveLength(DEEP_PATH_LENGTH - 1);
    expect(parents[0]).toBe(built.trees[0]);
    expect(parents[DEEP_PATH_LENGTH - 2]).toBe(built.trees[DEEP_PATH_LENGTH - 2]);
    expect(internals.overlapsExisted).toBe(false);
  });
});
