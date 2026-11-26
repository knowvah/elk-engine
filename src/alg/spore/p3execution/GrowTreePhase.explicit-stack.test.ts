// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `growAt` (mission 8c, T14, PK6) against a verbatim transcription of the recursive Java
// (`GrowTreePhase.java:68` `growAt`) on seeded random trees, compared at raw bits, plus a depth no recursion survives.
import { describe, expect, it, vi } from 'vitest';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../../java/lang/StackDepth.js';
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

// Mission spore-recursion-depth (#76, AC6): the explicit-stack `drawTree` against a verbatim transcription of the
// recursive Java (`GrowTreePhase.java:108-114`), compared on the SVG document and the call log of an enabled image.

/** The private members the `drawTree` proof drives (test-only access). */
interface DrawInternals extends Internals {
  drawTree(t: Tree<Node>, img: SVGImage): void;
}

/** `SVGImage.buildDocument` is private; the cast is the only access to the document text. */
interface DocumentInternals {
  buildDocument(): string[];
}

const DRAW_TREES = 120;
const DRAW_MAX_NODES = 40;
const DRAW_PROCESS_TREES = 20;
const DRAW_DEEP_LENGTH = 20_000;
const DRAW_SPACING = 20;
/** A non-null, non-`null`-prefixed name enables the image (`SVGImage` constructor). */
const DRAW_FILE = 'drawTree';

/** An enabled image that logs every group selection and element, in call order. */
class RecordingImage extends SVGImage {
  readonly log: string[] = [];

  constructor() {
    super(DRAW_FILE);
  }

  override g(key: string): SVGImage {
    this.log.push(`g ${key}`);
    return super.g(key);
  }

  override addElementStr(element: string): void {
    this.log.push(element);
    super.addElementStr(element);
  }
}

/** Verbatim transcription of the recursive Java `drawTree` (`GrowTreePhase.java:108-114`). */
function referenceDrawTree(t: Tree<Node>, img: SVGImage): void {
  img.g('n').addRect(t.node.rect, 'fill="none" stroke="black"');
  t.children.forEach((c) => {
    img.g('e').addLine(t.node.vertex.x, t.node.vertex.y, c.node.vertex.x, c.node.vertex.y, 'stroke="blue"');
    referenceDrawTree(c, img);
  });
}

function documentOf(img: SVGImage): string {
  return (img as unknown as DocumentInternals).buildDocument().join('\n');
}

interface Drawing {
  readonly document: string;
  readonly log: string[];
}

/** Draws the tree of `spec` into a fresh enabled image with the groups `process` adds, by the port or the twin. */
function draw(spec: TreeSpec, twin: boolean): Drawing {
  const built = buildTree(spec);
  // Justification: `drawTree` is private; the cast is the only access to it.
  const internals = new GrowTreePhase() as unknown as DrawInternals;
  const img = new RecordingImage();
  img.addGroups('n', 'e', 'o');
  if (twin) {
    referenceDrawTree(built.root, img);
  } else {
    internals.drawTree(built.root, img);
  }
  return { document: documentOf(img), log: img.log };
}

/** `process` with an enabled svg, as `DEBUG_SVG` sets it: the first `debugOut`, then `growAt`, with either drawTree. */
function growWithSvg(spec: TreeSpec, twin: boolean): { nodes: string[]; overlapsExisted: boolean; document: string } {
  const built = buildTree(spec);
  const { internals } = prepare(built);
  const drawing = internals as DrawInternals;
  if (twin) {
    drawing.drawTree = referenceDrawTree;
  }
  internals.svg = new SVGImage(DRAW_FILE);
  internals.svg.addGroups('n', 'e', 'o');
  internals.debugOut();
  internals.growAt(built.root);
  return { nodes: snapshot(built), overlapsExisted: internals.overlapsExisted, document: documentOf(internals.svg) };
}

describe('GrowTreePhase.drawTree: explicit stack equals the verbatim recursion (#76)', () => {
  it(`${DRAW_TREES} seeded trees over every shape: the SVG document and the call log are equal`, () => {
    const rnd = seededRandom(20_261_124);
    const mismatches: number[] = [];
    const shapes = new Set<string>();
    let edges = 0;
    for (let i = 0; i < DRAW_TREES; i++) {
      const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * DRAW_MAX_NODES), rnd);
      shapes.add(spec.shape);
      const expected = draw(spec, true);
      if (JSON.stringify(draw(spec, false)) !== JSON.stringify(expected)) {
        mismatches.push(i);
      }
      edges += expected.log.filter((entry) => entry.startsWith('<line')).length;
    }
    expect(mismatches).toEqual([]);
    expect([...shapes].sort()).toEqual([...SHAPES].sort());
    // the comparison has power: the trees have edges, and every element is logged
    expect(edges).toBeGreaterThan(DRAW_TREES);
  });

  it('a single node draws its rectangle only; a star draws every edge from the centre, children in list order', () => {
    const single = draw(pathSpec(1, DRAW_SPACING), false);
    expect(single).toEqual(draw(pathSpec(1, DRAW_SPACING), true));
    expect(single.log).toEqual([
      'g n',
      '<rect x="0.0" y="0.0" width="10.0" height="10.0" fill="none" stroke="black" />',
    ]);

    const star = randomSpec('star', 9, seededRandom(7));
    const drawn = draw(star, false);
    expect(drawn).toEqual(draw(star, true));
    expect(drawn.log.filter((entry) => entry.startsWith('<line'))).toHaveLength(8);
    expect(drawn.log.slice(0, 4)).toEqual(['g n', drawn.log[1], 'g e', drawn.log[3]]);
    expect(drawn.log[3]).toMatch(/^<line /);
  });

  it(`${DRAW_PROCESS_TREES} trees grown with an enabled svg: nodes at raw bits and the last debugOut's SVG are equal`, () => {
    const rnd = seededRandom(76);
    for (let i = 0; i < DRAW_PROCESS_TREES; i++) {
      const spec = randomSpec(SHAPES[i % SHAPES.length]!, 2 + Math.floor(rnd() * MAX_NODES), rnd);
      const expected = growWithSvg(spec, true);
      expect(growWithSvg(spec, false)).toEqual(expected);
      expect(expected.document).toContain('stroke="blue"');
    }
  });

  it(`draws a ${DRAW_DEEP_LENGTH}-node path without overflowing the call stack; the twin is equal or overflows`, () => {
    // under --jitless or a small stack the recursive twin itself may overflow (B8); the port must not
    const spec = pathSpec(DRAW_DEEP_LENGTH, DRAW_SPACING);
    const port = draw(spec, false);
    expect(port.log.filter((entry) => entry.startsWith('<rect'))).toHaveLength(DRAW_DEEP_LENGTH);
    expect(port.log.filter((entry) => entry.startsWith('<line'))).toHaveLength(DRAW_DEEP_LENGTH - 1);
    let twin: Drawing | null = null;
    try {
      twin = draw(spec, true);
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (twin !== null) {
      expect(twin).toEqual(port);
    }
  });

  it(`a path of MAX_STACK_DEPTH + 2 nodes throws RangeError(${STACK_OVERFLOW_MESSAGE})`, () => {
    // Java's StackOverflowError (checkStackDepth). The tree is acyclic (addNode builds it from NaiveMinST's output), so
    // the walk cannot run without end; the limit is only the depth check every loop of the AC6 ruling carries.
    const built = buildTree(pathSpec(MAX_STACK_DEPTH + 2, DRAW_SPACING));
    const internals = new GrowTreePhase() as unknown as DrawInternals;
    expect(() => internals.drawTree(built.root, new SVGImage(null))).toThrow(new RangeError(STACK_OVERFLOW_MESSAGE));
  });
});
