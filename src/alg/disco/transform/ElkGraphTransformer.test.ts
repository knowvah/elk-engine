// SPDX-License-Identifier: EPL-2.0
// Branches and methods of ElkGraphTransformer the rows of disco.json do not reach; each expectation is derived from reading
// ElkGraphTransformer.java (the line is in the test name).
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { ElkShape } from '../../../graph/ElkShape.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { DCDirection } from '../graph/DCDirection.js';
import { DCElement } from '../graph/DCElement.js';
import { DCGraph } from '../graph/DCGraph.js';
import { ElkGraphTransformer } from './ElkGraphTransformer.js';
import { OffsetApplier } from './OffsetApplier.js';

const HALF_PI_SIN_PI = Math.sin(Math.PI);

describe('ElkGraphTransformer', () => {
  it('importElkShape rejects anything but a node, label or port (java:294)', () => {
    const transformer = new ElkGraphTransformer();
    expect(() => transformer['importElkShape']({} as ElkShape, true, 0, 0)).toThrow(IllegalArgumentException);
    expect(() => transformer['importElkShape']({} as ElkShape, true, 0, 0)).toThrow(
      'Method only works for ElkNode-, ElkLabel and ElkPort-objects.',
    );
  });

  it('the no-argument constructor spaces components by 0.0 (java:84-86, the no-argument constructor)', () => {
    const root = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(root);
    node.setDimensions(10, 20);
    const graph = new ElkGraphTransformer().importGraph(root);
    const element = [...[...graph.getComponents()][0]!.getElements()][0]!;
    expect(element.getBounds().x).toBe(0);
    expect(element.getBounds().width).toBe(10);
    expect(element.getBounds().height).toBe(20);
    expect(graph.getInset()).toBe(0);
  });

  it('getOrthogonalPoints of a rightwards segment gives the points above and below (java:627-642)', () => {
    const [ccw, cw] = new ElkGraphTransformer()['getOrthogonalPoints'](0, 0, 10, 0, 2);
    // atan2(10, 0) = PI/2: ccw angle PI (sin ~ 1.22e-16, cos -1), cw angle 0 (sin 0, cos 1)
    expect(ccw!.x).toBe(2 * HALF_PI_SIN_PI);
    expect(ccw!.y).toBe(-2);
    expect(cw!.x).toBe(0);
    expect(cw!.y).toBe(2);
  });

  it('computeIntersection of the two diagonals of a square is its center (java:645-663)', () => {
    const p = new ElkGraphTransformer()['computeIntersection'](
      new KVector(0, 0),
      new KVector(2, 2),
      new KVector(0, 2),
      new KVector(2, 0),
    );
    expect(p.x).toBe(1);
    expect(p.y).toBe(1);
  });

  it('computeIntersection of parallel lines is not finite, so getContour keeps the current point (java:645, 580)', () => {
    const p = new ElkGraphTransformer()['computeIntersection'](
      new KVector(0, 0),
      new KVector(2, 0),
      new KVector(0, 1),
      new KVector(2, 1),
    );
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(false);
  });

  it('OffsetApplier moves an edge section by the element offset and and its junction points (java:729-738)', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    const edge = ElkGraphUtil.createSimpleEdge(a, b);
    const section = ElkGraphUtil.firstEdgeSection(edge, false, false);
    section.setStartLocation(1, 2);
    section.setEndLocation(3, 4);
    edge.setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(5, 6)));
    const shape = new DCElement(new KVectorChain(new KVector(0, 0), new KVector(1, 1)));
    const graph = new DCGraph([[shape]]);
    [...graph.getComponents()][0]!.setOffset(new KVector(10, 20));
    new OffsetApplier().accept(edge, shape);
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([11, 22, 13, 24]);
    const junction = edge.getProperty(CoreOptions.JUNCTION_POINTS).getFirst();
    expect([junction.x, junction.y]).toEqual([15, 26]);
  });
  it('adjustRelatedPort centers a horizontal extension port on the edge point in y and a vertical one in x (java:259-266)', () => {
    const root = ElkGraphUtil.createGraph();
    const port = ElkGraphUtil.createPort(root);
    port.setDimensions(8, 6);
    const transformer = new ElkGraphTransformer();
    transformer['adjustRelatedPort'](port, new KVector(100, 50), DCDirection.EAST);
    expect([port.getX(), port.getY()]).toEqual([0, 47]);
    transformer['adjustRelatedPort'](port, new KVector(100, 50), DCDirection.NORTH);
    expect([port.getX(), port.getY()]).toEqual([96, 47]);
  });

  it('adjustFirstSegment moves the first point onto the side the extension faces (java:691-709)', () => {
    const root = ElkGraphUtil.createGraph();
    root.setDimensions(30, 40);
    const transformer = new ElkGraphTransformer();
    const chain = (): KVectorChain => new KVectorChain(new KVector(5, 6), new KVector(7, 8));
    expect(transformer['adjustFirstSegment'](root, chain(), DCDirection.NORTH).getFirst().y).toBe(0);
    expect(transformer['adjustFirstSegment'](root, chain(), DCDirection.SOUTH).getFirst().y).toBe(40);
    expect(transformer['adjustFirstSegment'](root, chain(), DCDirection.WEST).getFirst().x).toBe(0);
    expect(transformer['adjustFirstSegment'](root, chain(), DCDirection.EAST).getFirst().x).toBe(30);
  });
});
