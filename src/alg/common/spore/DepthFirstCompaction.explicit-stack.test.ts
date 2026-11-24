// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `compactTree` (mission 8c, T14, PK6) against a verbatim transcription of the recursive Java
// (`DepthFirstCompaction.java` `compactTree`) on seeded random trees, compared at raw bits, plus a depth no recursion survives.
import { describe, expect, it, vi } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../../java/lang/StackDepth.js';
import type { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import {
  buildTree,
  doubleBits,
  pathSpec,
  randomSpec,
  seededRandom,
  SHAPES,
  snapshot,
  type BuiltTree,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { DepthFirstCompaction } from './DepthFirstCompaction.js';
import { Node } from './Node.js';

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

//--- mission spore-recursion-depth (#76, AC6): translateSubtree and drawTree --------------------------------------
// The underlap walks and the whole-`compact` case with all four twins are in `DepthFirstCompaction.walks.explicit-stack.test.ts`.
// Neither walk can run without end: both follow `Tree.children`, and the spore trees are acyclic (`addNode` builds them from
// `NaiveMinST`'s output). The port still checks the depth after each frame push (D7).

/** The private statics of the two pre-order walks and `SVGImage`'s document builder (test-only access). */
interface WalkInternals {
  translateSubtree(tree: Tree<Node>, v: KVector): void;
  drawTree(t: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void;
}
interface SvgInternals {
  buildDocument(): string[];
}

// Justification: the class has a private constructor and private statics; the cast is the only access to them.
const walks = DepthFirstCompaction as unknown as WalkInternals;

const WALK_TREES = 100;
const WALK_DEEP_LENGTH = 20_000;
const WALK_LIMIT_LENGTH = MAX_STACK_DEPTH + 2;
const WALK_SPACING = 20;
const WALK_SVG_FILE = 'walks';
const WALK_TIMEOUT = { timeout: 120_000 };
const RED_LINE = /stroke="red"/g;

/** `DepthFirstCompaction.java:173-176`, verbatim. */
function twinTranslateSubtree(tree: Tree<Node>, v: KVector): void {
  tree.node.translate(v);
  tree.children.forEach((c) => twinTranslateSubtree(c, v));
}

/** `DepthFirstCompaction.java:181-195`, verbatim. */
function twinDrawTree(t: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void {
  svgImage.g('rects').addRect(t.node.rect, 'fill="none" stroke="black"');
  svgImage.g('centers').addCircle(t.node.vertex.x, t.node.vertex.y, 6, 'fill="black"');
  t.children.forEach((c) => {
    if (c === mark) {
      svgImage
        .g('edges')
        .addLine(
          t.node.vertex.x,
          t.node.vertex.y,
          c.node.vertex.x,
          c.node.vertex.y,
          'stroke="red" stroke-width="5" stroke-dasharray="8,8"',
        );
    } else {
      svgImage
        .g('edges')
        .addLine(t.node.vertex.x, t.node.vertex.y, c.node.vertex.x, c.node.vertex.y, 'stroke="blue" stroke-width="2"');
    }
    twinDrawTree(c, svgImage, mark);
  });
}

const portTranslateSubtree = (t: Tree<Node>, v: KVector): void => walks.translateSubtree(t, v);
const portDrawTree = (t: Tree<Node>, svg: SVGImage, mark: Tree<Node> | null): void => walks.drawTree(t, svg, mark);

function walkSpecs(seed: number): TreeSpec[] {
  const rnd = seededRandom(seed);
  return Array.from({ length: WALK_TREES }, (_, i) =>
    randomSpec(SHAPES[i % SHAPES.length]!, 2 + Math.floor(rnd() * MAX_NODES), rnd),
  );
}

function nodeIndex(built: BuiltTree, node: Node): number {
  return built.trees.findIndex((t) => t.node === node);
}

/** Runs `deep` with the port, then the twin: the port completes, the twin is equal or overflows (B8 pattern). */
function portThenTwin<T>(deep: (useTwin: boolean) => T): T {
  const port = deep(false);
  let twin: T | null = null;
  try {
    twin = deep(true);
  } catch (e) {
    // the recursive twin may overflow the stack; the port must not
    expect(e).toBeInstanceOf(RangeError);
  }
  if (twin !== null) {
    expect(twin).toEqual(port);
  }
  return port;
}

/** One `translateSubtree` run: the nodes `Node.translate` moved, in call order, with the vector bits, and the snapshot. */
function runTranslate(
  spec: TreeSpec,
  treeIndex: number,
  dx: number,
  dy: number,
  run: typeof portTranslateSubtree,
): { order: string[]; after: string[] } {
  const built = buildTree(spec);
  const spy = vi.spyOn(Node.prototype, 'translate');
  try {
    run(built.trees[treeIndex]!, new KVector(dx, dy));
    const order = spy.mock.contexts.map((node, k) => {
      const v = spy.mock.calls[k]![0];
      // `this` of a `Node.prototype.translate` call is the node moved
      return `${nodeIndex(built, node as Node)}:${doubleBits(v.x)}:${doubleBits(v.y)}`;
    });
    return { order, after: snapshot(built) };
  } finally {
    spy.mockRestore();
  }
}

// AC6 (#76): translateSubtree (DepthFirstCompaction.java:173-176) against its verbatim twin.
describe('DepthFirstCompaction.translateSubtree: explicit stack equals the verbatim recursion', () => {
  it(
    `${2 * WALK_TREES} seeded trees over all shapes, every subtree: equal Node.translate call order and positions at raw bits`,
    WALK_TIMEOUT,
    () => {
      const rnd = seededRandom(7_600_005);
      const mismatches: string[] = [];
      for (const [i, spec] of [...walkSpecs(7_600_006), ...walkSpecs(7_600_007)].entries()) {
        for (let ti = 0; ti < spec.rects.length; ti++) {
          const dx = rnd() * 40 - 20;
          const dy = rnd() * 40 - 20;
          const port = runTranslate(spec, ti, dx, dy, portTranslateSubtree);
          const twin = runTranslate(spec, ti, dx, dy, twinTranslateSubtree);
          if (JSON.stringify(port) !== JSON.stringify(twin)) {
            mismatches.push(`${i}/${ti}`);
          }
        }
      }
      expect(mismatches).toEqual([]);
    },
  );

  it('a single node and a star: pre-order, children left to right', () => {
    const single = { shape: 'path', rects: [[0, 0, 10, 10]], parents: [] } as const satisfies TreeSpec;
    expect(runTranslate(single, 0, 1, 2, portTranslateSubtree)).toEqual(
      runTranslate(single, 0, 1, 2, twinTranslateSubtree),
    );
    const star = randomSpec('star', 9, seededRandom(176));
    const port = runTranslate(star, 0, 3, -4, portTranslateSubtree);
    expect(port.order.map((s) => Number(s.split(':')[0]))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(port).toEqual(runTranslate(star, 0, 3, -4, twinTranslateSubtree));
  });

  it(
    `a ${WALK_DEEP_LENGTH}-node path completes on the default stack; the twin is equal or overflows`,
    WALK_TIMEOUT,
    () => {
      const after = portThenTwin((useTwin) => {
        const built = buildTree(pathSpec(WALK_DEEP_LENGTH, WALK_SPACING));
        (useTwin ? twinTranslateSubtree : portTranslateSubtree)(built.root, new KVector(1, 2));
        return snapshot(built);
      });
      const moved = buildTree(pathSpec(WALK_DEEP_LENGTH, WALK_SPACING));
      moved.trees.forEach((t) => t.node.translate(new KVector(1, 2)));
      expect(after).toEqual(snapshot(moved));
    },
  );

  it(`a ${WALK_LIMIT_LENGTH}-node path throws Java's StackOverflowError as a RangeError (D7)`, WALK_TIMEOUT, () => {
    const built = buildTree(pathSpec(WALK_LIMIT_LENGTH, WALK_SPACING));
    expect(() => portTranslateSubtree(built.root, new KVector(1, 2))).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
  });
});

function drawText(spec: TreeSpec, treeIndex: number, markIndex: number | null, run: typeof portDrawTree): string {
  const built = buildTree(spec);
  const svg = new SVGImage(WALK_SVG_FILE);
  run(built.trees[treeIndex]!, svg, markIndex === null ? null : built.trees[markIndex]!);
  return (svg as unknown as SvgInternals).buildDocument().join('\n');
}

// AC6 (#76): drawTree (DepthFirstCompaction.java:181-195) against its verbatim twin.
describe('DepthFirstCompaction.drawTree: explicit stack equals the verbatim recursion', () => {
  it(
    `${2 * WALK_TREES} seeded trees over all shapes, every mark (and none), from the root and a subtree: equal SVG text`,
    WALK_TIMEOUT,
    () => {
      const mismatches: string[] = [];
      let redLines = 0;
      for (const [i, spec] of [...walkSpecs(7_600_008), ...walkSpecs(7_600_009)].entries()) {
        for (const ti of [0, i % spec.rects.length]) {
          for (const mark of [null, ...spec.rects.keys()]) {
            const port = drawText(spec, ti, mark, portDrawTree);
            const twin = drawText(spec, ti, mark, twinDrawTree);
            if (port !== twin) {
              mismatches.push(`${i}/${ti}/${mark}`);
            }
            redLines += (twin.match(RED_LINE) ?? []).length;
          }
        }
      }
      expect(mismatches).toEqual([]);
      // the comparison has power: the marked edge is drawn red in many runs
      expect(redLines).toBeGreaterThan(WALK_TREES);
    },
  );

  it('a single node: one rectangle, one centre, no edge', () => {
    const single = { shape: 'path', rects: [[0, 0, 10, 10]], parents: [] } as const satisfies TreeSpec;
    const text = drawText(single, 0, null, portDrawTree);
    expect(text).toBe(drawText(single, 0, null, twinDrawTree));
    expect(text.match(/<rect /g)).toHaveLength(1);
    expect(text.match(/<circle /g)).toHaveLength(1);
    expect(text).not.toContain('<line ');
  });

  it('a binary tree marked on an inner child and on a leaf: one red edge, equal SVG text', () => {
    const binary = randomSpec('binary', 7, seededRandom(276));
    for (const mark of [1, 6]) {
      const text = drawText(binary, 0, mark, portDrawTree);
      expect(text).toBe(drawText(binary, 0, mark, twinDrawTree));
      expect(text.match(RED_LINE)).toHaveLength(1);
      expect(text.match(/<line /g)).toHaveLength(6);
    }
  });

  it(
    `a ${WALK_DEEP_LENGTH}-node path completes on the default stack; the twin is equal or overflows`,
    WALK_TIMEOUT,
    () => {
      const spec = pathSpec(WALK_DEEP_LENGTH, WALK_SPACING);
      const text = portThenTwin((useTwin) => drawText(spec, 0, 1, useTwin ? twinDrawTree : portDrawTree));
      expect(text.match(/<rect /g)).toHaveLength(WALK_DEEP_LENGTH);
      expect(text.match(/<line /g)).toHaveLength(WALK_DEEP_LENGTH - 1);
      expect(text.match(RED_LINE)).toHaveLength(1);
    },
  );

  it(`a ${WALK_LIMIT_LENGTH}-node path throws Java's StackOverflowError as a RangeError (D7)`, WALK_TIMEOUT, () => {
    const built = buildTree(pathSpec(WALK_LIMIT_LENGTH, WALK_SPACING));
    expect(() => portDrawTree(built.root, new SVGImage(null), null)).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
  });
});
