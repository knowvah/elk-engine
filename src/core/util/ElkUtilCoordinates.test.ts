// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';
import { ContentAlignment } from '../options/ContentAlignment.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { ElkUtil } from './ElkUtil.js';

const CHAIN_TOO_SHORT = 'The vector chain must contain at least a source and a target point.';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

/** A section of `edge` from `start` over `bends` to `end`. */
function sectionOf(
  edge: ElkEdge,
  start: [number, number],
  bends: Array<[number, number]>,
  end: [number, number],
): ElkEdgeSection {
  const section = ElkGraphUtil.createEdgeSection(edge);
  section.setStartLocation(start[0], start[1]);
  section.setEndLocation(end[0], end[1]);
  bends.forEach(([x, y]) => ElkGraphUtil.createBendPoint(section, x, y));
  return section;
}

/** The points of a section as pairs: start, bend points, end. */
function pointsOf(section: ElkEdgeSection): Array<[number, number]> {
  return [
    [section.getStartX(), section.getStartY()],
    ...section
      .getBendPoints()
      .toArray()
      .map((b): [number, number] => [b.getX(), b.getY()]),
    [section.getEndX(), section.getEndY()],
  ];
}

describe('ElkUtil.translate', () => {
  // ElkUtil.java:707-776 (node contents, edge, section): every coordinate moves by (+5, -3)
  it('shifts children, contained edges with sections, labels and junction points of a node', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    a.setLocation(10, 20);
    const b = ElkGraphUtil.createNode(root);
    b.setLocation(0, 0);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    sectionOf(edge, [0, 0], [[1, 2]], [10, 10]);
    const label = ElkGraphUtil.createLabelWithText('l', edge);
    label.setLocation(4, 4);
    edge.setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(1, 1)));

    ElkUtil.translate(root, 5, -3);

    expect([a.getX(), a.getY()]).toEqual([15, 17]);
    expect([b.getX(), b.getY()]).toEqual([5, -3]);
    expect(pointsOf(edge.getSections().get(0))).toEqual([
      [5, -3],
      [6, -1],
      [15, 7],
    ]);
    expect([label.getX(), label.getY()]).toEqual([9, 1]);
    expect(edge.getProperty(CoreOptions.JUNCTION_POINTS).get(0).equals(new KVector(6, -2))).toBe(true);
  });

  it('translates an edge without junction points property value', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const edge = ElkGraphUtil.createSimpleEdge(a, a);
    sectionOf(edge, [1, 1], [], [2, 2]);
    ElkUtil.translate(edge, 10, 10);
    expect(pointsOf(edge.getSections().get(0))).toEqual([
      [11, 11],
      [12, 12],
    ]);
  });

  it('translates a section by its start, bend points and end', () => {
    const edge = ElkGraphUtil.createEdge(ElkGraphUtil.createGraph());
    const section = sectionOf(
      edge,
      [0, 0],
      [
        [3, 0],
        [3, 4],
      ],
      [8, 4],
    );
    ElkUtil.translate(section, -1, 2);
    expect(pointsOf(section)).toEqual([
      [-1, 2],
      [2, 2],
      [2, 6],
      [7, 6],
    ]);
  });

  // ElkUtil.java:782-807: grows 100 -> 120 per axis (difference 20); centering moves by 20 / 2 = 10
  const alignedChild = (alignment: EnumSet<ContentAlignment>, grow: [number, number]): ElkNode => {
    const parent = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(parent);
    node.setProperty(CoreOptions.CONTENT_ALIGNMENT, alignment);
    const inner = ElkGraphUtil.createNode(node);
    ElkUtil.translate(node, new KVector(100 + grow[0], 100 + grow[1]), new KVector(100, 100));
    return inner;
  };

  it('aligns by exact amounts: center 10, right/bottom 20', () => {
    const centered = alignedChild(ContentAlignment.centerCenter(), [20, 20]);
    expect([centered.getX(), centered.getY()]).toEqual([10, 10]);
    const corner = alignedChild(ContentAlignment.bottomRight(), [20, 20]);
    expect([corner.getX(), corner.getY()]).toEqual([20, 20]);
  });

  it('does not move the content when the size does not grow', () => {
    const same = alignedChild(ContentAlignment.bottomRight(), [0, 0]);
    expect([same.getX(), same.getY()]).toEqual([0, 0]);
    const shrunk = alignedChild(ContentAlignment.centerCenter(), [-20, -20]);
    expect([shrunk.getX(), shrunk.getY()]).toEqual([0, 0]);
  });

  it('aligns each axis independently', () => {
    const inner = alignedChild(ContentAlignment.bottomRight(), [20, 0]);
    expect([inner.getX(), inner.getY()]).toEqual([20, 0]);
  });
});

describe('ElkUtil.absolutePosition, toAbsolute and toRelative', () => {
  // root (0,0) > n1 (10,20) > n2 (3,4) > port (1,2) > label (5,6)
  const root = ElkGraphUtil.createGraph();
  const n1 = ElkGraphUtil.createNode(root);
  n1.setLocation(10, 20);
  const n2 = ElkGraphUtil.createNode(n1);
  n2.setLocation(3, 4);
  const port = ElkGraphUtil.createPort(n2);
  port.setLocation(1, 2);
  const label = ElkGraphUtil.createLabelWithText('t', port);
  label.setLocation(5, 6);
  const edge = ElkGraphUtil.createSimpleEdge(n2, n2);

  it('adds up node positions along the hierarchy', () => {
    expect(ElkUtil.absolutePosition(n2)?.equals(new KVector(13, 24))).toBe(true);
    expect(ElkUtil.absolutePosition(root)?.equals(new KVector(0, 0))).toBe(true);
  });

  it('uses the parent chain for ports and labels', () => {
    expect(ElkUtil.absolutePosition(port)?.equals(new KVector(14, 26))).toBe(true);
    expect(ElkUtil.absolutePosition(label)?.equals(new KVector(19, 32))).toBe(true);
  });

  it('gives an edge the absolute position of its containing node', () => {
    expect(edge.getContainingNode()).toBe(n1);
    expect(ElkUtil.absolutePosition(edge)?.equals(new KVector(10, 20))).toBe(true);
  });

  it('returns null for an element of another kind', () => {
    expect(ElkUtil.absolutePosition({} as ElkGraphElement)).toBeNull();
  });

  it('converts to absolute and back, returning the same point', () => {
    const point = new KVector(3, 4);
    expect(ElkUtil.toAbsolute(point, n1)).toBe(point);
    expect([point.x, point.y]).toEqual([13, 24]);
    expect(ElkUtil.toRelative(point, n1)).toBe(point);
    expect([point.x, point.y]).toEqual([3, 4]);
  });

  it('leaves the point alone for a null parent', () => {
    const point = new KVector(7, 8);
    ElkUtil.toAbsolute(point, null);
    ElkUtil.toRelative(point, null);
    expect([point.x, point.y]).toEqual([7, 8]);
  });
});

describe('ElkUtil.createVectorChain and applyVectorChain', () => {
  const freshSection = (): ElkEdgeSection =>
    sectionOf(
      ElkGraphUtil.createEdge(ElkGraphUtil.createGraph()),
      [0, 0],
      [
        [5, 0],
        [5, 5],
      ],
      [10, 5],
    );
  const chainOf = (...points: Array<[number, number]>): KVectorChain =>
    new KVectorChain(...points.map(([x, y]) => new KVector(x, y)));

  it('creates a chain of start, bend points and end', () => {
    const chain = ElkUtil.createVectorChain(freshSection());
    expect(chain.toArray().map((v) => [v.x, v.y])).toEqual([
      [0, 0],
      [5, 0],
      [5, 5],
      [10, 5],
    ]);
  });

  it('does not tie the chain to the section', () => {
    const section = freshSection();
    ElkUtil.createVectorChain(section).getFirst().set(99, 99);
    expect(section.getStartX()).toBe(0);
  });

  it('round-trips a section and reuses its bend point objects', () => {
    const section = freshSection();
    const before = section.getBendPoints().toArray();
    ElkUtil.applyVectorChain(ElkUtil.createVectorChain(section), section);
    expect(pointsOf(section)).toEqual([
      [0, 0],
      [5, 0],
      [5, 5],
      [10, 5],
    ]);
    expect(section.getBendPoints().toArray()).toEqual(before);
  });

  it('removes bend points that the shorter chain does not use', () => {
    const section = freshSection();
    ElkUtil.applyVectorChain(chainOf([1, 1], [2, 2], [3, 3]), section);
    expect(pointsOf(section)).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(section.getBendPoints().size()).toBe(1);
  });

  it('drops every bend point for a two-point chain', () => {
    const section = freshSection();
    ElkUtil.applyVectorChain(chainOf([1, 1], [4, 4]), section);
    expect(pointsOf(section)).toEqual([
      [1, 1],
      [4, 4],
    ]);
  });

  it('creates contained bend points when the chain is longer', () => {
    const section = freshSection();
    ElkUtil.applyVectorChain(chainOf([0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]), section);
    const bends = section.getBendPoints().toArray();
    expect(bends.map((b) => b.getX())).toEqual([1, 2, 3, 4]);
    expect(bends[3].eContainer()).toBe(section);
  });

  it('throws IllegalArgumentException for fewer than two vectors', () => {
    const section = freshSection();
    expect(() => ElkUtil.applyVectorChain(chainOf([1, 1]), section)).toThrow(IllegalArgumentException);
    expect(() => ElkUtil.applyVectorChain(new KVectorChain(), section)).toThrow(CHAIN_TOO_SHORT);
    expect(section.getStartX()).toBe(0);
  });
});
