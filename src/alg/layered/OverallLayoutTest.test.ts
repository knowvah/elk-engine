// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test OverallLayoutTest: the overall layout process including graph import and
 * layout transfer, on one hand-built two-node graph laid out by `LayeredLayoutProvider` before each test (`@Before`).
 * Scope: complete (hand-built graph); the Java has 4 tests, so 4 cases (4 oracle runs).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/OverallLayoutTest.java
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { KVector } from '../../core/math/KVector.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { LayeredLayoutProvider } from './LayeredLayoutProvider.js';
import { LayeredOptions } from './options/LayeredOptions.js';

const NODE_SIZE = 30;

/**
 * Create a simple test graph. The graph has at least two nodes and an edge, the nodes have predefined sizes with fixed
 * size constraint, but neither nodes nor edges have predefined coordinates, i.e. they are all set to (0,0). The graph
 * size is initially 0 as well.
 */
function createSimpleGraph(): ElkNode {
  const graph = ElkGraphUtil.createGraph();

  const node1 = ElkGraphUtil.createNode(graph);
  node1.setWidth(NODE_SIZE);
  node1.setHeight(NODE_SIZE);
  node1.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());

  const node2 = ElkGraphUtil.createNode(graph);
  node2.setWidth(NODE_SIZE);
  node2.setHeight(NODE_SIZE);
  node2.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());

  ElkGraphUtil.createSimpleEdge(node1, node2);

  return graph;
}

describe('OverallLayoutTest', () => {
  let simpleGraph: ElkNode;

  // @Before setUp
  beforeEach(() => {
    registerLayered();
    const layoutProvider = new LayeredLayoutProvider();
    simpleGraph = createSimpleGraph();
    layoutProvider.layout(simpleGraph, new BasicProgressMonitor());
  });

  /** Tests if the coordinates of the graph's nodes are positive. Doesn't work for hierarchical graphs. */
  it('testNodeCoordinates', () => {
    for (const node of simpleGraph.getChildren()) {
      expect(node.getX() > 0).toBe(true);
      expect(node.getY() > 0).toBe(true);
    }
  });

  /** Tests if the source and target coordinates of all edges are > 0. Doesn't work for hierarchical graphs. */
  it('testEdgeCoordinates', () => {
    for (const edge of simpleGraph.getContainedEdges()) {
      for (const section of edge.getSections()) {
        expect(section.getStartX() > 0).toBe(true);
        expect(section.getStartY() > 0).toBe(true);
        expect(section.getEndX() > 0).toBe(true);
        expect(section.getEndY() > 0).toBe(true);
      }
    }
  });

  /** Tests if the graph size is positive. */
  it('testGraphSize', () => {
    expect(simpleGraph.getWidth() > 0).toBe(true);
    expect(simpleGraph.getHeight() > 0).toBe(true);
  });

  /**
   * Tests if the edge routing produced perfectly orthogonal edges. This test only makes sense if the orthogonal edge
   * router is used.
   */
  it('testEdgeOrthogonality', () => {
    for (const edge of simpleGraph.getContainedEdges()) {
      for (const section of edge.getSections()) {
        // Assemble list of bend points
        const bendPoints: KVector[] = [];
        bendPoints.push(new KVector(section.getStartX(), section.getStartY()));
        for (const bp of section.getBendPoints()) {
          bendPoints.push(new KVector(bp.getX(), bp.getY()));
        }
        bendPoints.push(new KVector(section.getEndX(), section.getEndY()));

        if (bendPoints.length >= 2) {
          // Check whether the bend points run orthogonally
          let prevBendPoint = bendPoints[0]!;
          for (const currBendPoint of bendPoints.slice(1)) {
            expect(prevBendPoint.x === currBendPoint.x || prevBendPoint.y === currBendPoint.y).toBe(true);
            prevBendPoint = currBendPoint;
          }
        }
      }
    }
  });
});
