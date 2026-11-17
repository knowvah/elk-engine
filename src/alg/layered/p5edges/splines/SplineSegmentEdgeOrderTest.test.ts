// SPDX-License-Identifier: EPL-2.0
/*
 * Port of SplineSegmentEdgeOrderTest: the edges of a spline hyperedge segment are kept in the order in which the
 * SplineEdgeRouter finds them at the hyperedge's port. The first of them represents the segment, for example as the edge
 * of its vertical segment during compaction. With hash-ordered sets, the representative edge depended on identity hashes.
 *
 * `@RunWith(LayoutTestRunner)`, `@Algorithm`, `@DefaultConfiguration()`, `@GraphProvider` and `@TestAfterProcessor` map to
 * `defineLayoutTest` (test/helpers/layout-test-runner.ts). `segment.edges` is a `Set` (insertion order, AD-10).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineSegmentEdgeOrderTest.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../../test/helpers/layout-test-runner.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { SplineEdgeRouter } from './SplineEdgeRouter.js';
import type { SplineSegment } from './SplineSegment.js';

/** Number of edges leaving the source port; about half of them run upwards and half downwards. */
const EDGE_COUNT = 10;

function node(graph: ElkNode): ElkNode {
  const result = ElkGraphUtil.createNode(graph);
  result.setDimensions(30, 30);
  return result;
}

/** Creates a node whose only port connects to `EDGE_COUNT` nodes of the next layer, routed as splines. */
function produceGraph(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.SPLINES);

  const source = node(graph);
  const sourcePort = ElkGraphUtil.createPort(source);
  for (let i = 0; i < EDGE_COUNT; i++) {
    ElkGraphUtil.createSimpleEdge(sourcePort, ElkGraphUtil.createPort(node(graph)));
  }

  return graph;
}

/** Collects the distinct segments of the graph's splines that represent more than one edge. */
function hyperedgeSegments(lGraph: LGraph): SplineSegment[] {
  const seen = new Set<SplineSegment>();
  const segments: SplineSegment[] = [];
  for (const layer of lGraph) {
    for (const lNode of layer) {
      for (const edge of lNode.getOutgoingEdges()) {
        const spline = edge.getProperty(InternalProperties.SPLINE_ROUTE_START);
        expect(spline !== null).toBe(true);
        for (const segment of spline) {
          if (segment.edges.size > 1 && !seen.has(segment)) {
            seen.add(segment);
            segments.push(segment);
          }
        }
      }
    }
  }
  return segments;
}

/**
 * Checks for each hyperedge segment that its edges iterate in the order of the port's connected edges, and so that the
 * representative edge is the first of them.
 */
function testHyperedgeSegmentEdgeOrder(graph: LGraph): void {
  let hyperedgeSegmentCount = 0;
  for (const segment of hyperedgeSegments(graph)) {
    const segmentEdges: LEdge[] = [...segment.edges];
    const port = segmentEdges[0]!.getSource()!;

    const expectedEdges: LEdge[] = [];
    for (const edge of port.getConnectedEdges()) {
      if (segment.edges.has(edge)) {
        expectedEdges.push(edge);
      }
    }

    expect(expectedEdges.length).toBe(segment.edges.size);
    expect(segment.edges.values().next().value).toBe(expectedEdges[0]);
    // List.equals compares the edges by identity (`LEdge` has no `equals`)
    expect(segmentEdges.length).toBe(expectedEdges.length);
    segmentEdges.forEach((edge, i) => {
      expect(edge).toBe(expectedEdges[i]);
    });
    hyperedgeSegmentCount++;
  }

  // The upward and the downward edges each form a hyperedge
  expect(hyperedgeSegmentCount).toBe(2);
}

defineLayoutTest({
  name: 'SplineSegmentEdgeOrderTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [produceGraph],
  afterProcessor: [
    { name: 'testHyperedgeSegmentEdgeOrder', cls: SplineEdgeRouter, check: testHyperedgeSegmentEdgeOrder },
  ],
});
