// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import { DepthFirstCompaction } from './DepthFirstCompaction.js';
import { InternalProperties } from './InternalProperties.js';
import { Node } from './Node.js';
import { ScanlineOverlapCheck } from './ScanlineOverlapCheck.js';

const SIDE = 10;
const HALF = SIDE / 2;

/** A node with the given rectangle and its center as vertex. */
function node(x: number, y: number, w = SIDE, h = SIDE): Node {
  return new Node(new KVector(x + w / 2, y + h / 2), new ElkRectangle(x, y, w, h));
}

describe('Node', () => {
  it('copies the vertex and the rectangle on construction', () => {
    const v = new KVector(1, 2);
    const r = new ElkRectangle(0, 0, 2, 4);
    const n = new Node(v, r);
    n.translate(new KVector(5, 6));
    expect(n.originalVertex).toBe(v);
    expect([v.x, v.y]).toEqual([1, 2]);
    expect([r.x, r.y]).toEqual([0, 0]);
    expect([n.vertex.x, n.vertex.y]).toEqual([6, 8]);
    expect([n.rect.x, n.rect.y]).toEqual([5, 6]);
  });

  it('setCenterPosition moves vertex and rectangle together', () => {
    const n = node(0, 0);
    n.setCenterPosition(new KVector(20, 30));
    expect([n.vertex.x, n.vertex.y]).toEqual([20, 30]);
    expect([n.rect.x, n.rect.y]).toEqual([20 - HALF, 30 - HALF]);
  });

  it('underlap is the free gap along the center line', () => {
    expect(node(0, 0).underlap(node(30, 0))).toBeCloseTo(20, 12);
    // diagonal: both scales are 1 - 20/30, so the underlap is 2/3 of the center distance
    expect(node(0, 0).underlap(node(30, 30))).toBeCloseTo((2 / 3) * Math.sqrt(1800), 12);
  });

  it('underlap is 0 for overlapping nodes', () => {
    expect(node(0, 0).underlap(node(5, 5))).toBe(0);
  });

  it('distance is measured along v (a ray of the length of v) from the other node to this one', () => {
    expect(node(0, 0).distance(node(30, 0), new KVector(-25, 0))).toBe(20);
    expect(node(0, 0).distance(node(0, 30), new KVector(0, -25))).toBe(20);
    // a ray that is too short does not reach
    expect(node(0, 0).distance(node(30, 0), new KVector(-5, 0))).toBe(Number.POSITIVE_INFINITY);
    expect(node(0, 0).distance(node(30, 0), new KVector(0, -25))).toBe(Number.POSITIVE_INFINITY);
  });

  it('touches within the fuzziness only', () => {
    const f = InternalProperties.FUZZINESS;
    expect(node(0, 0).touches(node(SIDE, 0))).toBe(true);
    expect(node(0, 0).touches(node(SIDE + f / 2, 0))).toBe(true);
    expect(node(0, 0).touches(node(SIDE + 2 * f, 0))).toBe(false);
    expect(node(0, 0).touches(node(0, SIDE + 2 * f))).toBe(false);
    expect(node(0, 0).touches(node(5, 5))).toBe(true);
  });
});

describe('ScanlineOverlapCheck', () => {
  function sweep(nodes: Node[]): Node[][] {
    const pairs: Node[][] = [];
    new ScanlineOverlapCheck({ handle: (a, b) => pairs.push([a, b]) }, new SVGImage(null)).sweep(nodes);
    return pairs;
  }

  it('reports the inserted node first, then the node it overlaps', () => {
    const a = node(0, 0);
    const b = node(5, 5);
    expect(sweep([a, b])).toEqual([[b, a]]);
  });

  it('reports nothing for disjoint nodes', () => {
    expect(sweep([node(0, 0), node(0, 20), node(20, 0)])).toEqual([]);
  });

  it('does not report a node that only ends where the next one starts', () => {
    // the high point precedes the low point at an equal coordinate
    expect(sweep([node(0, 0), node(0, SIDE)])).toEqual([]);
  });

  it('finds the wide node behind a non-overlapping one', () => {
    const wide = node(0, 0, 100, SIDE);
    const left = node(0, 0, 2, 20);
    const probe = node(50, 5, 2, 2);
    const pairs = sweep([wide, left, probe]);
    expect(pairs.some(([p, o]) => p === probe && o === wide)).toBe(true);
    expect(pairs.some(([p, o]) => p === probe && o === left)).toBe(false);
  });

  it('throws on nodes that are indistinguishable by rectangle and center', () => {
    const a = node(0, 0);
    const b = node(0, 0);
    expect(() => sweep([a, b])).toThrow(IllegalStateException);
  });
});

describe('DepthFirstCompaction', () => {
  function pair(childX: number, childY: number): { root: Node; child: Node; tree: Tree<Node> } {
    const root = node(0, 0);
    const child = node(childX, childY);
    const tree = new Tree<Node>(root);
    tree.children.push(new Tree<Node>(child));
    return { root, child, tree };
  }

  it('moves a child along the center line by the underlap (non-orthogonal)', () => {
    const { child, tree } = pair(30, 30);
    DepthFirstCompaction.compact(tree, false);
    expect(child.rect.x).toBeCloseTo(10, 12);
    expect(child.rect.y).toBeCloseTo(10, 12);
    expect(child.vertex.x).toBeCloseTo(10 + HALF, 12);
  });

  it('moves a child along its larger axis only (orthogonal) and keeps the distance when the rows do not overlap', () => {
    const { child, tree } = pair(30, 30);
    DepthFirstCompaction.compact(tree, true, null);
    expect([child.rect.x, child.rect.y]).toEqual([0, 30]);
    expect([child.vertex.x, child.vertex.y]).toEqual([HALF, 30 + HALF]);
  });

  it('closes the orthogonal gap exactly when the nodes overlap in the other dimension', () => {
    const { child, tree } = pair(30, 0);
    DepthFirstCompaction.compact(tree, true);
    expect([child.rect.x, child.rect.y]).toEqual([SIDE, 0]);
  });

  it('uses the vertical axis when the vertical offset is larger', () => {
    const { child, tree } = pair(0, 30);
    DepthFirstCompaction.compact(tree, true);
    expect([child.rect.x, child.rect.y]).toEqual([0, SIDE]);
  });

  it('does not move a child that already touches the root in the compaction direction', () => {
    const { child, tree } = pair(SIDE, 0);
    DepthFirstCompaction.compact(tree, false);
    expect([child.rect.x, child.rect.y]).toEqual([SIDE, 0]);
  });

  it('translates the whole subtree of a moved child', () => {
    const root = node(0, 0);
    const child = node(30, 0);
    const grandchild = node(60, 0);
    const tree = new Tree<Node>(root);
    const sub = new Tree<Node>(child);
    sub.children.push(new Tree<Node>(grandchild));
    tree.children.push(sub);
    DepthFirstCompaction.compact(tree, false);
    // the grandchild closes its gap to the child first (60 -> 40), then moves with the child by -20
    expect(child.rect.x).toBe(SIDE);
    expect(grandchild.rect.x).toBe(2 * SIDE);
  });
});
