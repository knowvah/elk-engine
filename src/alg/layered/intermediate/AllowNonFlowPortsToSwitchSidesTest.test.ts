// SPDX-License-Identifier: EPL-2.0
/*
 * Port of AllowNonFlowPortsToSwitchSidesTest (mission 7f, T12a): ports switch sides only when permitted and an edge
 * crossing can be prevented. The Java is `@RunWith(Parameterized)` with the six parameter rows below, one
 * `testOnlySwitchPortSidesIfPermitted` run each (6 runs); the layout goes through `LayeredLayoutProvider` directly.
 * `Line2D.intersectsLine` is the segment test of its Javadoc: two segments intersect if they share any point.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/AllowNonFlowPortsToSwitchSidesTest.java
 */
import { describe, expect, it } from 'vitest';
import { layout } from '../../../../test/helpers/layout-test-runner.js';
import { createVectorChain } from '../../../core/util/ElkUtilCoordinates.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Arguments: port constraints, node1MaySwitchPortSides, node2MaySwitchPortSides, expected: edgesIntersect. */
const PARAMETERS: readonly (readonly [PortConstraints, boolean, boolean, boolean])[] = [
  [PortConstraints.FIXED_SIDE, false, false, true],
  [PortConstraints.FIXED_POS, true, true, true],

  // As soon as one port is allowed to switch sides, the edge crossing can be prevented
  [PortConstraints.FIXED_SIDE, true, false, false],
  [PortConstraints.FIXED_SIDE, false, true, false],
  [PortConstraints.FIXED_SIDE, true, true, false],

  // TODO The behavior for FIXED_ORDER is not clearly defined, currently ports will switch if allowed
  [PortConstraints.FIXED_ORDER, true, true, false],
];

/** A node of 30x30 with a north and a south port at the middle; port positions are set for the case FIXED_POS. */
function createNodeWithPorts(graph: ElkNode, portConstraints: PortConstraints, maySwitchPortSides: boolean) {
  const node = ElkGraphUtil.createNode(graph);
  node.setWidth(30);
  node.setHeight(30);
  node.setProperty(LayeredOptions.PORT_CONSTRAINTS, portConstraints);
  const north = ElkGraphUtil.createPort(node);
  north.setX(15.0);
  north.setY(-1.0);
  north.setProperty(LayeredOptions.PORT_SIDE, PortSide.NORTH);
  north.setProperty(LayeredOptions.ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES, maySwitchPortSides);
  const south = ElkGraphUtil.createPort(node);
  south.setX(15.0);
  south.setY(30.0);
  south.setProperty(LayeredOptions.PORT_SIDE, PortSide.SOUTH);
  south.setProperty(LayeredOptions.ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES, maySwitchPortSides);
  return { north, south };
}

/** Creates a simple test graph. */
function createSimpleGraph(
  portConstraints: PortConstraints,
  node1MaySwitchPortSides: boolean,
  node2MaySwitchPortSides: boolean,
): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  const node1 = createNodeWithPorts(graph, portConstraints, node1MaySwitchPortSides);
  const node2 = createNodeWithPorts(graph, portConstraints, node2MaySwitchPortSides);

  // Create two edges that, with fixed port sides, will have to cross.
  ElkGraphUtil.createSimpleEdge(node1.north, node2.south);
  ElkGraphUtil.createSimpleEdge(node1.south, node2.north);

  return graph;
}

function edgeToSegments(e: ElkEdge): Segment[] {
  const points = [...createVectorChain(ElkGraphUtil.firstEdgeSection(e, false, false))];
  const segments: Segment[] = [];
  for (let i = 1; i < points.length; i++) {
    segments.push({ x1: points[i - 1].x, y1: points[i - 1].y, x2: points[i].x, y2: points[i].y });
  }
  return segments;
}

/** The sign of the turn from (a, b) to c; 0 for collinear points. */
function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
}

/** Whether c, known to be collinear with the segment (a, b), lies within its bounding box. */
function within(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return cx >= Math.min(ax, bx) && cx <= Math.max(ax, bx) && cy >= Math.min(ay, by) && cy <= Math.max(ay, by);
}

/** `Line2D.intersectsLine`: the segments share at least one point (touching ends and overlaps count). */
function intersectsLine(s1: Segment, s2: Segment): boolean {
  // Measured on the JVM (JDK 21.0.1, 65,536 pairs on a 4x4 grid; never read from its source, AD-9): two zero-length segments
  // intersect even at distinct points; a segment with length agrees with the rest of this function.
  if (s1.x1 === s1.x2 && s1.y1 === s1.y2 && s2.x1 === s2.x2 && s2.y1 === s2.y2) {
    return true;
  }
  const o1 = orientation(s1.x1, s1.y1, s1.x2, s1.y2, s2.x1, s2.y1);
  const o2 = orientation(s1.x1, s1.y1, s1.x2, s1.y2, s2.x2, s2.y2);
  const o3 = orientation(s2.x1, s2.y1, s2.x2, s2.y2, s1.x1, s1.y1);
  const o4 = orientation(s2.x1, s2.y1, s2.x2, s2.y2, s1.x2, s1.y2);
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  return (
    (o1 === 0 && within(s1.x1, s1.y1, s1.x2, s1.y2, s2.x1, s2.y1)) ||
    (o2 === 0 && within(s1.x1, s1.y1, s1.x2, s1.y2, s2.x2, s2.y2)) ||
    (o3 === 0 && within(s2.x1, s2.y1, s2.x2, s2.y2, s1.x1, s1.y1)) ||
    (o4 === 0 && within(s2.x1, s2.y1, s2.x2, s2.y2, s1.x2, s1.y2))
  );
}

/** Whether the two edges' paths cross at some point; assumes straight edge segments, not splines. */
function intersect(e1: ElkEdge, e2: ElkEdge): boolean {
  const segments2 = edgeToSegments(e2);
  return edgeToSegments(e1).some((s1) => segments2.some((s2) => intersectsLine(s1, s2)));
}

describe('AllowNonFlowPortsToSwitchSidesTest', () => {
  for (const [portConstraints, node1, node2, edgesIntersect] of PARAMETERS) {
    it(`testOnlySwitchPortSidesIfPermitted [${portConstraints} ${node1} ${node2} -> ${edgesIntersect}]`, () => {
      const graph = createSimpleGraph(portConstraints, node1, node2);
      const e1 = graph.getContainedEdges().get(0);
      const e2 = graph.getContainedEdges().get(1);
      layout(graph);
      expect(intersect(e1, e2)).toBe(edgesIntersect);
    });
  }
});
