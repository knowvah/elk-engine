// SPDX-License-Identifier: EPL-2.0
// Mission spore-recursion-depth (issue #76, AC6): proof of the explicit-stack `getMinUnderlap`, `minUnderlapWithSubtree`,
// `translateSubtree` and `drawTree` against verbatim recursive twins of `DepthFirstCompaction.java` `:123-136`, `:138-171`,
// `:173-176` and `:181-195` (D4): the underlap walks here, with a whole-`compact` run with the four twins installed; the
// `translateSubtree` and `drawTree` blocks join the PK6 proof in `DepthFirstCompaction.explicit-stack.test.ts` (D4: a
// second file keeps both under 500 lines). The two pre-order twins are repeated here for the whole-`compact` case.
//
// None of the four walks can run without end: they follow `Tree.children`, and the spore trees are acyclic (`addNode`
// builds them from `NaiveMinST`'s output). The port still checks the depth after each frame push (D7).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { fuzzyCompare } from '../../../guava/DoubleMath.js';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../../java/lang/StackDepth.js';
import { Tree } from '../Tree.js';
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
import { InternalProperties } from './InternalProperties.js';
import { Node } from './Node.js';

/** The private statics of `DepthFirstCompaction` the twins replace (test-only access to a hidden-constructor class). */
interface Internals {
  svg: SVGImage;
  restrictToOrthogonal(v: KVector, rt: Node['rect'], rc: Node['rect']): void;
  getMinUnderlap(tree: Tree<Node>, child: Tree<Node>, current: number, v: KVector): number;
  minUnderlapWithSubtree(r: Node, tree: Tree<Node>, current: number, v: KVector): number;
  translateSubtree(tree: Tree<Node>, v: KVector): void;
  drawTree(t: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void;
}

/** The private document builder of `SVGImage` (test-only access): the text Java writes to the file. */
interface SvgInternals {
  buildDocument(): string[];
}

// Justification: the class has a private constructor and private statics; the cast is the only access to them.
const internals = DepthFirstCompaction as unknown as Internals;

const TREES_PER_MODE = 100;
const MAX_NODES = 16;
const DEEP_PATH_LENGTH = 20_000;
const LIMIT_PATH_LENGTH = MAX_STACK_DEPTH + 2;
const PATH_SPACING = 20;
const SVG_FILE = 'walks';
const TIMEOUT = { timeout: 120_000 };

//--- verbatim recursive twins (D4) --------------------------------------

/** `DepthFirstCompaction.java:123-136`, verbatim. */
function twinGetMinUnderlap(tree: Tree<Node>, child: Tree<Node>, currentMinUnderlap: number, v: KVector): number {
  let minUnderlap = Math.min(
    currentMinUnderlap,
    internals.minUnderlapWithSubtree(tree.node, child, currentMinUnderlap, v),
  );
  for (const c of tree.children) {
    if (c !== child) {
      minUnderlap = Math.min(minUnderlap, twinGetMinUnderlap(c, child, minUnderlap, v));
    }
  }
  return minUnderlap;
}

/** `DepthFirstCompaction.java:138-171`, verbatim, the touching condition inline as the Java has it. */
function twinMinUnderlapWithSubtree(r: Node, tree: Tree<Node>, currentMinUnderlap: number, v: KVector): number {
  const f = InternalProperties.FUZZINESS;
  let minUnderlap = currentMinUnderlap;
  for (const child of tree.children) {
    const c = child.node;
    if (r.touches(c)) {
      if (
        (fuzzyCompare(c.rect.x, r.rect.x + r.rect.width, f) === 0 && v.x < 0) ||
        (fuzzyCompare(c.rect.x + c.rect.width, r.rect.x, f) === 0 && v.x > 0) ||
        (fuzzyCompare(c.rect.y, r.rect.y + r.rect.height, f) === 0 && v.y < 0) ||
        (fuzzyCompare(c.rect.y + c.rect.height, r.rect.y, f) === 0 && v.y > 0)
      ) {
        minUnderlap = 0;
        break;
      }
    } else {
      minUnderlap = Math.min(minUnderlap, r.distance(c, v));
    }
    minUnderlap = Math.min(minUnderlap, twinMinUnderlapWithSubtree(r, child, minUnderlap, v));
  }
  return minUnderlap;
}

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

//--- helpers --------------------------------------

const portGetMinUnderlap = (t: Tree<Node>, c: Tree<Node>, cur: number, v: KVector): number =>
  internals.getMinUnderlap(t, c, cur, v);
const portMinUnderlapWithSubtree = (r: Node, t: Tree<Node>, cur: number, v: KVector): number =>
  internals.minUnderlapWithSubtree(r, t, cur, v);

function svgText(svg: SVGImage): string {
  return (svg as unknown as SvgInternals).buildDocument().join('\n');
}

function nodeIndex(built: BuiltTree, node: Node): number {
  return built.trees.findIndex((t) => t.node === node);
}

/** The compaction vector `removeUnderlap` derives for `child` under `parent`. */
function compactionVector(parent: Node, child: Node, orthogonal: boolean): KVector {
  const v = parent.vertex.clone().sub(child.vertex);
  if (orthogonal) {
    internals.restrictToOrthogonal(v, parent.rect, child.rect);
  } else {
    v.scaleToLength(parent.underlap(child));
  }
  return v;
}

function specs(seed: number): TreeSpec[] {
  const rnd = seededRandom(seed);
  return Array.from({ length: TREES_PER_MODE }, (_, i) =>
    randomSpec(SHAPES[i % SHAPES.length]!, 2 + Math.floor(rnd() * MAX_NODES), rnd),
  );
}

function subtreeSize(tree: Tree<Node>): number {
  let size = 0;
  const open = [tree];
  while (open.length > 0) {
    size++;
    open.push(...open.pop()!.children);
  }
  return size;
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

const STACK_OVERFLOW = new RangeError(STACK_OVERFLOW_MESSAGE);

afterEach(() => {
  vi.restoreAllMocks();
});

//--- getMinUnderlap --------------------------------------

/** One `getMinUnderlap(root, child)` run as `removeUnderlap` makes it: the result and the `minUnderlapWithSubtree` calls. */
function runGetMinUnderlap(
  spec: TreeSpec,
  childIndex: number,
  orthogonal: boolean,
  run: typeof portGetMinUnderlap,
): { value: string; current: string; calls: string[] } {
  const built = buildTree(spec);
  const child = built.trees[childIndex]!;
  const v = compactionVector(built.trees[spec.parents[childIndex - 1]!]!.node, child.node, orthogonal);
  const current = v.length();
  const spy = vi.spyOn(internals, 'minUnderlapWithSubtree');
  const value = run(built.root, child, current, v);
  const calls = spy.mock.calls.map(
    ([r, t, cur]) => `${nodeIndex(built, r)}:${built.trees.indexOf(t)}:${doubleBits(cur)}`,
  );
  spy.mockRestore();
  return { value: doubleBits(value), current: doubleBits(current), calls };
}

// AC6 (#76): getMinUnderlap (DepthFirstCompaction.java:123-136) against its verbatim twin.
describe('DepthFirstCompaction.getMinUnderlap: explicit stack equals the verbatim recursion', () => {
  for (const orthogonal of [false, true]) {
    it(
      `${TREES_PER_MODE} seeded trees over all shapes, orthogonal=${orthogonal}: equal results at raw bits and equal minUnderlapWithSubtree calls`,
      TIMEOUT,
      () => {
        const mismatches: string[] = [];
        let runs = 0;
        let lowered = 0;
        for (const [i, spec] of specs(orthogonal ? 7_600_001 : 7_600_002).entries()) {
          for (let ci = 1; ci < spec.rects.length; ci++) {
            const port = runGetMinUnderlap(spec, ci, orthogonal, portGetMinUnderlap);
            const twin = runGetMinUnderlap(spec, ci, orthogonal, twinGetMinUnderlap);
            if (JSON.stringify(port) !== JSON.stringify(twin)) {
              mismatches.push(`${i}/${ci}`);
            }
            runs++;
            lowered += twin.value === twin.current ? 0 : 1;
          }
        }
        expect(mismatches).toEqual([]);
        // the comparison has power: the walk lowers the initial value in a large share of the runs
        expect(lowered).toBeGreaterThan(runs / 10);
      },
    );
  }

  it('a single-node tree and a star: equal results and calls', () => {
    const single = { shape: 'path', rects: [[0, 0, 10, 10]], parents: [] } as const satisfies TreeSpec;
    const loneChild = new Tree(new Node(new KVector(50, 5), new ElkRectangle(45, 0, 10, 10)));
    const v = new KVector(-1, 0);
    expect(portGetMinUnderlap(buildTree(single).root, loneChild, 7, v)).toBe(7);
    expect(twinGetMinUnderlap(buildTree(single).root, loneChild, 7, v)).toBe(7);
    const star = randomSpec('star', 12, seededRandom(76));
    for (let ci = 1; ci < 12; ci++) {
      expect(runGetMinUnderlap(star, ci, false, portGetMinUnderlap)).toEqual(
        runGetMinUnderlap(star, ci, false, twinGetMinUnderlap),
      );
    }
  });

  it(`a ${DEEP_PATH_LENGTH}-node path completes on the default stack; the twin is equal or overflows`, TIMEOUT, () => {
    const result = portThenTwin((useTwin) => {
      const built = buildTree(pathSpec(DEEP_PATH_LENGTH, PATH_SPACING));
      // the leaf as `child`: every other node opens one activation, each on the previous one
      const run = useTwin ? twinGetMinUnderlap : portGetMinUnderlap;
      return doubleBits(run(built.root, built.trees[DEEP_PATH_LENGTH - 1]!, 3, new KVector(-1, 0)));
    });
    // the leaf has no subtree, so nothing lowers the initial value
    expect(result).toBe(doubleBits(3));
  });

  it(`a ${LIMIT_PATH_LENGTH}-node path throws Java's StackOverflowError as a RangeError (D7)`, TIMEOUT, () => {
    const built = buildTree(pathSpec(LIMIT_PATH_LENGTH, PATH_SPACING));
    expect(() => portGetMinUnderlap(built.root, built.trees[LIMIT_PATH_LENGTH - 1]!, 3, new KVector(-1, 0))).toThrow(
      STACK_OVERFLOW,
    );
  });
});

//--- minUnderlapWithSubtree --------------------------------------

/** One `minUnderlapWithSubtree(r, subtree)` run: the result and the children `r.touches` met, in order. */
function runMinUnderlapWithSubtree(
  spec: TreeSpec,
  rIndex: number,
  treeIndex: number,
  orthogonal: boolean,
  run: typeof portMinUnderlapWithSubtree,
): { value: string; touched: number[] } {
  const built = buildTree(spec);
  const r = built.trees[rIndex]!.node;
  const tree = built.trees[treeIndex]!;
  const v = compactionVector(r, tree.node, orthogonal);
  const spy = vi.spyOn(r, 'touches');
  const value = run(r, tree, v.length(), v);
  const touched = spy.mock.calls.map(([c]) => nodeIndex(built, c));
  spy.mockRestore();
  return { value: doubleBits(value), touched };
}

/** `r` at `[0, 0, 10, 10]`; a far child with a far grandchild, then `B` touching `r` at `b`, then `C` with a child. */
function touchingSpec(b: readonly [number, number]): TreeSpec {
  return {
    shape: 'random',
    rects: [
      [0, 0, 10, 10],
      [200, 200, 10, 10],
      [50, 0, 10, 10],
      [50, 50, 10, 10],
      [b[0], b[1], 10, 10],
      [100, 0, 10, 10],
      [100, 50, 10, 10],
    ],
    // r (0) stands alone; 1 is the subtree root, with children 2 (child 3), B = 4 and 5 (child 6)
    parents: [0, 1, 2, 1, 1, 5],
  };
}

const SIDES = [
  { side: 'right', b: [10, 0], toward: new KVector(-1, 0) },
  { side: 'left', b: [-10, 0], toward: new KVector(1, 0) },
  { side: 'bottom', b: [0, 10], toward: new KVector(0, -1) },
  { side: 'top', b: [0, -10], toward: new KVector(0, 1) },
] as const;

function runTouching(b: readonly [number, number], v: KVector, run: typeof portMinUnderlapWithSubtree) {
  const built = buildTree(touchingSpec(b));
  const r = built.trees[0]!.node;
  const spy = vi.spyOn(r, 'touches');
  const value = run(r, built.trees[1]!, 1000, v);
  const touched = spy.mock.calls.map(([c]) => nodeIndex(built, c));
  spy.mockRestore();
  return { value: doubleBits(value), touched };
}

// AC6 (#76): minUnderlapWithSubtree (DepthFirstCompaction.java:138-171) against its verbatim twin.
describe('DepthFirstCompaction.minUnderlapWithSubtree: explicit stack equals the verbatim recursion', () => {
  for (const orthogonal of [false, true]) {
    it(
      `${TREES_PER_MODE} seeded trees over all shapes, orthogonal=${orthogonal}, every (r, subtree) pair: equal results at raw bits and equal children met`,
      TIMEOUT,
      () => {
        const mismatches: string[] = [];
        let stoppedEarly = 0;
        for (const [i, spec] of specs(orthogonal ? 7_600_003 : 7_600_004).entries()) {
          for (let ri = 0; ri < spec.rects.length; ri++) {
            for (let ti = 0; ti < spec.rects.length; ti++) {
              if (ri === ti) {
                continue;
              }
              const port = runMinUnderlapWithSubtree(spec, ri, ti, orthogonal, portMinUnderlapWithSubtree);
              const twin = runMinUnderlapWithSubtree(spec, ri, ti, orthogonal, twinMinUnderlapWithSubtree);
              if (JSON.stringify(port) !== JSON.stringify(twin)) {
                mismatches.push(`${i}/${ri}/${ti}`);
              }
              const size = subtreeSize(buildTree(spec).trees[ti]!);
              stoppedEarly += twin.touched.length < size - 1 ? 1 : 0;
            }
          }
        }
        expect(mismatches).toEqual([]);
        // the comparison has power: the `break` arm ends a walk early in some of the runs
        expect(stoppedEarly).toBeGreaterThan(0);
      },
    );
  }

  for (const { side, b, toward } of SIDES) {
    it(`touching on the ${side} side, moving into r: both return 0 and stop at the touching child`, () => {
      const port = runTouching(b, toward, portMinUnderlapWithSubtree);
      const twin = runTouching(b, toward, twinMinUnderlapWithSubtree);
      expect(port).toEqual({ value: doubleBits(0), touched: [2, 3, 4] });
      expect(twin).toEqual(port);
    });

    it(`touching on the ${side} side, moving apart: both walk on past the touching child`, () => {
      const away = toward.clone().scale(-1);
      const port = runTouching(b, away, portMinUnderlapWithSubtree);
      const twin = runTouching(b, away, twinMinUnderlapWithSubtree);
      expect(port.touched).toEqual([2, 3, 4, 5, 6]);
      expect(twin).toEqual(port);
    });
  }

  it('a single-node subtree returns the initial value', () => {
    const r = new Node(new KVector(5, 5), new ElkRectangle(0, 0, 10, 10));
    const lone = new Tree(new Node(new KVector(55, 5), new ElkRectangle(50, 0, 10, 10)));
    expect(portMinUnderlapWithSubtree(r, lone, 4, new KVector(-1, 0))).toBe(4);
    expect(twinMinUnderlapWithSubtree(r, lone, 4, new KVector(-1, 0))).toBe(4);
  });

  /** `r` 90 below a path, as wide as the path, clear of every node; the nodes move down toward it. */
  const belowPath = (length: number): Node =>
    new Node(new KVector((length * PATH_SPACING) / 2, 105), new ElkRectangle(0, 100, length * PATH_SPACING, 10));
  // a ray reaches only as far as the vector is long (ElkMath.distance), so the vector spans the 90 gap
  const DOWN = new KVector(0, 200);

  /** The walk over the whole path from `r` below it: nothing touches `r`, so the `break` arm never runs. */
  function deepUnderlap(length: number, run: typeof portMinUnderlapWithSubtree): { built: BuiltTree; value: number } {
    const built = buildTree(pathSpec(length, PATH_SPACING));
    return { built, value: run(belowPath(length), built.root, Number.POSITIVE_INFINITY, DOWN) };
  }

  it(`a ${DEEP_PATH_LENGTH}-node path completes on the default stack; the twin is equal or overflows`, TIMEOUT, () => {
    const value = portThenTwin((useTwin) =>
      doubleBits(
        deepUnderlap(DEEP_PATH_LENGTH, useTwin ? twinMinUnderlapWithSubtree : portMinUnderlapWithSubtree).value,
      ),
    );
    // nothing touches r, so the walk is the running minimum of r.distance over every node below the root
    const r = belowPath(DEEP_PATH_LENGTH);
    const built = buildTree(pathSpec(DEEP_PATH_LENGTH, PATH_SPACING));
    let expected = Number.POSITIVE_INFINITY;
    for (const t of built.trees.slice(1)) {
      expected = Math.min(expected, r.distance(t.node, DOWN));
    }
    expect(value).toBe(doubleBits(expected));
    expect(Number.isFinite(expected)).toBe(true);
  });

  it(`a ${LIMIT_PATH_LENGTH}-node path throws Java's StackOverflowError as a RangeError (D7)`, TIMEOUT, () => {
    expect(() => deepUnderlap(LIMIT_PATH_LENGTH, portMinUnderlapWithSubtree)).toThrow(STACK_OVERFLOW);
  });
});

//--- whole compact --------------------------------------

/** `compact` on a fresh tree with debug output on, optionally with the four twins installed; positions and last SVG. */
function compactWith(spec: TreeSpec, orthogonal: boolean, useTwins: boolean): string[] {
  if (useTwins) {
    vi.spyOn(internals, 'getMinUnderlap').mockImplementation(twinGetMinUnderlap);
    vi.spyOn(internals, 'minUnderlapWithSubtree').mockImplementation(twinMinUnderlapWithSubtree);
    vi.spyOn(internals, 'translateSubtree').mockImplementation(twinTranslateSubtree);
    vi.spyOn(internals, 'drawTree').mockImplementation(twinDrawTree);
  }
  const built = buildTree(spec);
  try {
    DepthFirstCompaction.compact(built.root, orthogonal, SVG_FILE);
  } finally {
    vi.restoreAllMocks();
  }
  return [...snapshot(built), svgText(internals.svg)];
}

// AC6 (#76): the whole compaction with the four twins of DepthFirstCompaction.java:123-195 installed.
describe('DepthFirstCompaction.compact: the converted walks equal the four verbatim twins', () => {
  for (const orthogonal of [false, true]) {
    it(
      `${TREES_PER_MODE} seeded trees over all shapes, orthogonal=${orthogonal}: every node at raw bits and the last SVG equal`,
      TIMEOUT,
      () => {
        const mismatches: number[] = [];
        let moved = 0;
        for (const [i, spec] of specs(orthogonal ? 7_600_010 : 7_600_011).entries()) {
          const twins = compactWith(spec, orthogonal, true);
          const port = compactWith(spec, orthogonal, false);
          if (port.join('|') !== twins.join('|')) {
            mismatches.push(i);
          }
          moved += snapshot(buildTree(spec)).join('|') === twins.slice(0, -1).join('|') ? 0 : 1;
        }
        expect(mismatches).toEqual([]);
        // the comparison has power: compaction moves nodes in most of the trees
        expect(moved).toBeGreaterThan(TREES_PER_MODE / 2);
      },
    );
  }
});
