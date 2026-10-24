// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { ElkGraphBoundsProvider } from './ElkGraphBoundsProvider.js';
import { ElkGraphDataProvider } from './ElkGraphDataProvider.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

function buildGraph() {
  const root = ElkGraphUtil.createGraph();
  const comment1 = ElkGraphUtil.createNode(root);
  const node1 = ElkGraphUtil.createNode(root);
  const comment2 = ElkGraphUtil.createNode(root);
  const hier = ElkGraphUtil.createNode(root);
  const node3 = ElkGraphUtil.createNode(root);
  ElkGraphUtil.createNode(hier);
  comment1.setProperty(CoreOptions.COMMENT_BOX, true);
  comment2.setProperty(CoreOptions.COMMENT_BOX, true);
  return { root, comment1, comment2, node1, hier, node3 };
}

describe('ElkGraphDataProvider', () => {
  it('rejects a null graph with Java requireNonNull message', () => {
    expect(() => new ElkGraphDataProvider(null)).toThrow(new TypeError('Comment attachment must be run on a graph.'));
  });

  it('provides comments, targets and sub-hierarchies in child order', () => {
    const g = buildGraph();
    const dp = new ElkGraphDataProvider(g.root);
    expect(dp.provideComments()).toEqual([g.comment1, g.comment2]);
    expect(dp.provideComments()[1]).toBe(g.comment2);
    expect(dp.provideTargets()).toHaveLength(3);
    expect(dp.provideTargets()[0]).toBe(g.node1);
    expect(dp.provideTargets()[1]).toBe(g.hier);
    expect(dp.provideTargets()[2]).toBe(g.node3);
    const subs = dp.provideSubHierarchies();
    expect(subs).toHaveLength(1);
    expect(subs[0]).toBeInstanceOf(ElkGraphDataProvider);
    expect(subs[0]?.provideTargets()).toHaveLength(1);
  });

  it('provideTargetsFor defaults to all targets', () => {
    const g = buildGraph();
    const dp = new ElkGraphDataProvider(g.root);
    expect([...dp.provideTargetsFor(g.comment1)]).toEqual([...dp.provideTargets()]);
  });

  it('attach creates a simple edge from comment to target', () => {
    const g = buildGraph();
    new ElkGraphDataProvider(g.root).attach(g.comment1, g.node1);
    const edges = g.root.getContainedEdges();
    expect(edges.size()).toBe(1);
    const edge = edges.get(0);
    expect(edge.getSources().get(0)).toBe(g.comment1);
    expect(edge.getTargets().get(0)).toBe(g.node1);
  });
});

describe('ElkGraphBoundsProvider', () => {
  it('returns node geometry for comments and targets', () => {
    const node = ElkGraphUtil.createNode(null);
    node.setX(1.5);
    node.setY(2.5);
    node.setWidth(30);
    node.setHeight(40);
    const bp = new ElkGraphBoundsProvider();
    for (const r of [bp.boundsForComment(node), bp.boundsForTarget(node)]) {
      expect(r).toBeInstanceOf(Rectangle2D.Double);
      expect([r.x, r.y, r.width, r.height]).toEqual([1.5, 2.5, 30, 40]);
    }
    expect(bp.boundsForComment(node)).not.toBe(bp.boundsForTarget(node));
  });
});
