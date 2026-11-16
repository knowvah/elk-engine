// SPDX-License-Identifier: EPL-2.0
// Seeded random spanning trees of spore `Node`s for the explicit-stack proofs of mission 8c, T14 (PK6): the same spec builds two
// independent trees, one per implementation under comparison.
import { ElkRectangle } from '../../src/core/math/ElkRectangle.js';
import { KVector } from '../../src/core/math/KVector.js';
import { Tree } from '../../src/alg/common/Tree.js';
import { Node } from '../../src/alg/common/spore/Node.js';

/** Test-local seeded generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The tree shapes a spec cycles through. */
export const SHAPES = ['path', 'star', 'random', 'binary', 'caterpillar'] as const;
export type Shape = (typeof SHAPES)[number];

/** Rectangles `[x, y, width, height]` and the parent index of every node but the first. */
export interface TreeSpec {
  readonly shape: Shape;
  readonly rects: readonly (readonly [number, number, number, number])[];
  readonly parents: readonly number[];
}

const GRID = 5;
const GRID_CELLS = 20;
const SIZES = [10, 20, 30] as const;
const JITTER_PROBABILITY = 0.3;
const JITTER_RANGE = 3;

function parentOf(shape: Shape, i: number, rnd: () => number): number {
  switch (shape) {
    case 'path':
      return i - 1;
    case 'star':
      return 0;
    case 'random':
      return Math.floor(rnd() * i);
    case 'binary':
      return (i - 1) >> 1;
    case 'caterpillar':
      return i % 2 === 0 ? Math.max(i - 2, 0) : Math.max(i - 1, 0);
  }
}

function coordinate(rnd: () => number): number {
  const base = GRID * Math.floor(rnd() * GRID_CELLS);
  return rnd() < JITTER_PROBABILITY ? base + rnd() * JITTER_RANGE : base;
}

/** A random spec of `size` nodes; coarse grid coordinates make touching rectangles common, jitter breaks exact ties. */
export function randomSpec(shape: Shape, size: number, rnd: () => number): TreeSpec {
  const rects: [number, number, number, number][] = [];
  const parents: number[] = [];
  for (let i = 0; i < size; i++) {
    const w = SIZES[Math.floor(rnd() * SIZES.length)]!;
    const h = SIZES[Math.floor(rnd() * SIZES.length)]!;
    rects.push([coordinate(rnd), coordinate(rnd), w, h]);
    if (i > 0) {
      parents.push(parentOf(shape, i, rnd));
    }
  }
  return { shape, rects, parents };
}

/** A built tree and its nodes in creation order. */
export interface BuiltTree {
  readonly root: Tree<Node>;
  readonly trees: Tree<Node>[];
}

/** Builds the tree of a spec, node centres at the rectangle centres. Iterative: the path specs can be 50,000 deep. */
export function buildTree(spec: TreeSpec): BuiltTree {
  const trees = spec.rects.map(
    ([x, y, w, h]) => new Tree<Node>(new Node(new KVector(x + w / 2, y + h / 2), new ElkRectangle(x, y, w, h))),
  );
  spec.parents.forEach((parent, i) => trees[parent]!.children.push(trees[i + 1]!));
  return { root: trees[0]!, trees };
}

/** A path of `length` nodes spaced `spacing` apart (nodes 10 wide and high, so a spacing above 10 never overlaps). */
export function pathSpec(length: number, spacing: number): TreeSpec {
  const rects: [number, number, number, number][] = [];
  const parents: number[] = [];
  for (let i = 0; i < length; i++) {
    rects.push([i * spacing, 0, 10, 10]);
    if (i > 0) {
      parents.push(i - 1);
    }
  }
  return { shape: 'path', rects, parents };
}

const view = new DataView(new ArrayBuffer(8));

/** The raw bits of a double as 16 hex digits. */
export function doubleBits(value: number): string {
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(16).padStart(16, '0');
}

/** Raw bits of every node's vertex, original vertex and rectangle, in creation order. */
export function snapshot(built: BuiltTree): string[] {
  return built.trees.map(({ node }) =>
    [
      node.vertex.x,
      node.vertex.y,
      node.originalVertex.x,
      node.originalVertex.y,
      node.rect.x,
      node.rect.y,
      node.rect.width,
      node.rect.height,
    ]
      .map(doubleBits)
      .join(' '),
  );
}
