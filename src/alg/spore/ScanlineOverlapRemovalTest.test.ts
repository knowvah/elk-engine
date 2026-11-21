// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CompareFuzzy } from '../common/compaction/oned/CompareFuzzy.js';
import { Node } from '../common/spore/Node.js';
import { ScanlineOverlapCheck } from '../common/spore/ScanlineOverlapCheck.js';
import { SVGImage } from '../common/utils/SVGImage.js';
import { SporeMetaDataProvider } from './options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from './options/SporeOverlapRemovalOptions.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkMath } from '../../core/math/ElkMath.js';
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { copyGraph } from '../../graph/util/ElkGraphCopy.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import * as Maps from '../../guava/Maps.js';
import * as Sets from '../../guava/Sets.js';
import { compareTo } from '../../java/lang/JavaString.js';

/** @see org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test/ScanlineOverlapRemovalTest.java */
describe('ScanlineOverlapRemovalTest', () => {
  /**
   * Test whether the ScanlineOverlapCheck supports the overlap removal to find all overlaps in a special case.
   *
   * @see ScanlineOverlapRemovalTest.java:57 scanlineTest
   */
  it('scanlineTest', () => {
    // build test graphs
    const graph1 = ElkGraphUtil.createGraph();
    const n0 = ElkGraphUtil.createNode(graph1);
    const n1 = ElkGraphUtil.createNode(graph1);
    const n2 = ElkGraphUtil.createNode(graph1);
    const n3 = ElkGraphUtil.createNode(graph1);
    n0.setDimensions(160, 20);
    n1.setDimensions(160, 20);
    n2.setDimensions(20, 20);
    n3.setDimensions(20, 20);
    n0.setLocation(0, 30);
    n1.setLocation(150, 40);
    n2.setLocation(150, 0);
    n3.setLocation(150, 70);
    graph1.setProperty(CoreOptions.ALGORITHM, SporeOverlapRemovalOptions.ALGORITHM_ID);
    const graph2 = copyGraph(graph1);
    graph2.setProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false);

    // execute overlap removal with and without ScanlineOverlapCheck
    const lService = LayoutMetaDataService.getInstance();
    lService.registerLayoutMetaDataProviders(new SporeMetaDataProvider());
    const lEngine = new RecursiveGraphLayoutEngine();
    lEngine.layout(graph1, new BasicProgressMonitor());
    lEngine.layout(graph2, new BasicProgressMonitor());

    // test
    expect(hasOverlaps(graph1)).toBe(false);
    expect(hasOverlaps(graph2)).toBe(true);
  });

  /**
   * Overlap removal must not fail with an IllegalStateException from the ScanlineOverlapCheck on three overlapping
   * nodes, and must remove their overlaps.
   *
   * @see ScanlineOverlapRemovalTest.java:94 scanlineThreeOverlappingNodesTest
   */
  it('scanlineThreeOverlappingNodesTest', () => {
    const graph = ElkGraphUtil.createGraph();
    const n0 = ElkGraphUtil.createNode(graph);
    const n1 = ElkGraphUtil.createNode(graph);
    const n2 = ElkGraphUtil.createNode(graph);
    n0.setDimensions(40, 30);
    n1.setDimensions(10, 20);
    n2.setDimensions(10, 30);
    n0.setLocation(10, 10);
    n1.setLocation(10, 0);
    n2.setLocation(20, 5);
    graph.setProperty(CoreOptions.ALGORITHM, SporeOverlapRemovalOptions.ALGORITHM_ID);
    expect(hasOverlaps(graph)).toBe(true);

    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new SporeMetaDataProvider());
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());

    expect(hasOverlaps(graph)).toBe(false);
  });

  /**
   * The {@link ScanlineOverlapCheck} must report an overlap with a node that lies, in the order of left sides, behind
   * a node that does not overlap the inserted node: here the narrow node b between the wide node a and the node c,
   * which both overlap the inserted node p.
   *
   * @see ScanlineOverlapRemovalTest.java:120 scanlineOverlapBehindNarrowNodeTest
   */
  it('scanlineOverlapBehindNarrowNodeTest', () => {
    const nodes = Maps.newLinkedHashMap<string, Node>();
    nodes.set('a', node(0, 0, 100, 10));
    nodes.set('b', node(10, 0, 5, 10));
    nodes.set('c', node(55, 0, 10, 10));
    nodes.set('p', node(50, 5, 10, 10));

    expect([...findOverlaps(nodes)]).toEqual([...Sets.newTreeSet(['a-b', 'a-c', 'a-p', 'c-p'])]);
  });

  /**
   * The {@link ScanlineOverlapCheck} must report an overlap with a node whose left side lies right of the inserted
   * node's left side, after an overlap with a node left of the inserted node.
   *
   * @see ScanlineOverlapRemovalTest.java:135 scanlineOverlapRightOfInsertedNodeTest
   */
  it('scanlineOverlapRightOfInsertedNodeTest', () => {
    const nodes = Maps.newLinkedHashMap<string, Node>();
    nodes.set('a', node(0, 0, 100, 10));
    nodes.set('c', node(55, 0, 10, 10));
    nodes.set('p', node(50, 5, 10, 10));

    expect([...findOverlaps(nodes)]).toEqual([...Sets.newTreeSet(['a-c', 'a-p', 'c-p'])]);
  });

  /**
   * Sweeps the given nodes and returns the overlapping pairs the {@link ScanlineOverlapCheck} reports, each as the two
   * node names in alphabetical order, joined by a dash.
   *
   * @see ScanlineOverlapRemovalTest.java:148 findOverlaps
   */
  function findOverlaps(nodes: Map<string, Node>): Set<string> {
    // Java: a HashMap keyed by Node, which has no equals/hashCode of its own (identity); it is only read by key.
    const names = new Map<Node, string>();
    nodes.forEach((n, name) => names.set(n, name));
    // Java adds to a TreeSet as the sweep reports; Sets.newTreeSet is a snapshot, so it is built once the sweep is over.
    const overlaps: string[] = [];
    new ScanlineOverlapCheck(
      {
        handle: (n1, n2) => {
          const name1 = names.get(n1) as string;
          const name2 = names.get(n2) as string;
          overlaps.push(compareTo(name1, name2) < 0 ? `${name1}-${name2}` : `${name2}-${name1}`);
        },
      },
      new SVGImage(null),
    ).sweep([...nodes.values()]);
    return Sets.newTreeSet(overlaps);
  }

  /** @see ScanlineOverlapRemovalTest.java:160 node */
  function node(x: number, y: number, width: number, height: number): Node {
    return new Node(new KVector(x + width / 2, y + height / 2), new ElkRectangle(x, y, width, height));
  }

  /** @see ScanlineOverlapRemovalTest.java:164 hasOverlaps */
  function hasOverlaps(graph: ElkNode): boolean {
    for (const na of graph.getChildren()) {
      for (const nb of graph.getChildren()) {
        if (na !== nb) {
          const r1 = new ElkRectangle(na.getX(), na.getY(), na.getWidth(), na.getHeight());
          const r2 = new ElkRectangle(nb.getX(), nb.getY(), nb.getWidth(), nb.getHeight());
          if (CompareFuzzy.lt(ElkMath.shortestDistance(r1, r2), 0)) {
            return true;
          }
        }
      }
    }

    return false;
  }
});
