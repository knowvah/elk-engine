// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { Ordinal } from '../../java/util/EnumSet.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkNode } from '../ElkNode.js';
import { markAdvanced } from '../properties/AdvancedPropertyValue.js';
import { markExperimental } from '../properties/ExperimentalPropertyValue.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from './ElkGraphUtil.js';

/**
 * Creates an edge which connects the two shapes, but does not do so in a way that automatically sets the
 * edge's containment.
 *
 * @see org.eclipse.elk.graph.test/src/org/eclipse/elk/graph/util/ElkGraphUtilTest.java
 */
function createEdgeWithoutContainment(source: ElkConnectableShape | null, target: ElkConnectableShape | null): ElkEdge {
  const edge = ElkGraphUtil.createEdge(null);

  if (source !== null) {
    edge.getSources().add(source);
  }

  if (target !== null) {
    edge.getTargets().add(target);
  }

  return edge;
}

/**
 * The setup of `testFindBestEdgeContainment`, split out for the 30-NLOC limit: a basic hierarchical
 * graph that covers all possibilities, plus a second graph to test special cases.
 *
 * @see org.eclipse.elk.graph.test/src/org/eclipse/elk/graph/util/ElkGraphUtilTest.java
 */
function createBasicHierarchicalGraph(): Record<
  'graph1' | 'node1' | 'node2' | 'node3' | 'node3_1' | 'node3_1_1' | 'node4' | 'node4_1' | 'graph2' | 'nodeA',
  ElkNode
> {
  // Create a basic hierarchical graph that covers all possibilities
  const graph1 = ElkGraphUtil.createGraph();

  const node1 = ElkGraphUtil.createNode(graph1);
  const node2 = ElkGraphUtil.createNode(graph1);
  const node3 = ElkGraphUtil.createNode(graph1);
  const node3_1 = ElkGraphUtil.createNode(node3);
  const node3_1_1 = ElkGraphUtil.createNode(node3_1);
  const node4 = ElkGraphUtil.createNode(graph1);
  const node4_1 = ElkGraphUtil.createNode(node4);

  // Create a second graph to test special cases later
  const graph2 = ElkGraphUtil.createGraph();

  const nodeA = ElkGraphUtil.createNode(graph2);
  return { graph1, node1, node2, node3, node3_1, node3_1_1, node4, node4_1, graph2, nodeA };
}

/**
 * Tests for the {@link ElkGraphUtil} class. JUnit's `@Test(expected = NullPointerException.class)`
 * asserts `TypeError` (D10).
 *
 * @see org.eclipse.elk.graph.test/src/org/eclipse/elk/graph/util/ElkGraphUtilTest.java
 */
describe('ElkGraphUtilTest', () => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // connectableShapeToX

  it('testConnectableShapeToNode', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(ElkGraphUtil.connectableShapeToNode(node)).toBe(node);

    const port = ElkGraphUtil.createPort(node);
    expect(ElkGraphUtil.connectableShapeToNode(port)).toBe(node);
  });

  it('testConnectableShapeToNodeWithNullPointer', () => {
    expect(() => ElkGraphUtil.connectableShapeToNode(null)).toThrow(TypeError);
  });

  it('testConnectableShapeToPort', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(ElkGraphUtil.connectableShapeToPort(node)).toBeNull();

    const port = ElkGraphUtil.createPort(node);
    expect(ElkGraphUtil.connectableShapeToPort(port)).toBe(port);
  });

  it('testConnectableShapeToPortWithNullPointer', () => {
    expect(() => ElkGraphUtil.connectableShapeToPort(null)).toThrow(TypeError);
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // findBestEdgeContainment

  it('testFindBestEdgeContainment', () => {
    const { graph1, node1, node2, node3, node3_1, node3_1_1, node4_1, nodeA } = createBasicHierarchicalGraph();

    // Edge which connects two top-level nodes
    const sameLevelEdge = createEdgeWithoutContainment(node1, node2);
    expect(ElkGraphUtil.findBestEdgeContainment(sameLevelEdge)).toBe(graph1);

    // Self loop
    const selfLoopEdge = createEdgeWithoutContainment(node1, node1);
    expect(ElkGraphUtil.findBestEdgeContainment(selfLoopEdge)).toBe(graph1);

    // Edge which connects a source on a higher level to a target on a lower level
    const downLevelEdge = createEdgeWithoutContainment(node1, node3_1);
    expect(ElkGraphUtil.findBestEdgeContainment(downLevelEdge)).toBe(graph1);

    // Edge which connects a source on a lower level to a target on a higher level
    const upLevelEdge = createEdgeWithoutContainment(node3_1, node2);
    expect(ElkGraphUtil.findBestEdgeContainment(upLevelEdge)).toBe(graph1);

    // Edge which connects a hierarchical node to its child
    const toChildEdge = createEdgeWithoutContainment(node3, node3_1);
    expect(ElkGraphUtil.findBestEdgeContainment(toChildEdge)).toBe(node3);

    // Edge which connects a node to its parent
    const toParentEdge = createEdgeWithoutContainment(node3_1, node3);
    expect(ElkGraphUtil.findBestEdgeContainment(toParentEdge)).toBe(node3);

    // Edge which connects a hierarchical node to its grand child
    const toGrandChildEdge = createEdgeWithoutContainment(node3, node3_1_1);
    expect(ElkGraphUtil.findBestEdgeContainment(toGrandChildEdge)).toBe(node3);

    // Edge which connects a node to its grand parent
    const toGrandParentEdge = createEdgeWithoutContainment(node3_1_1, node3);
    expect(ElkGraphUtil.findBestEdgeContainment(toGrandParentEdge)).toBe(node3);

    // Edge which connects to nodes on different branches of the inclusion tree
    const crossHierarchyEdge = createEdgeWithoutContainment(node3_1, node4_1);
    expect(ElkGraphUtil.findBestEdgeContainment(crossHierarchyEdge)).toBe(graph1);

    // Edge that connects nodes of different graphs
    const crossGraphEdge = createEdgeWithoutContainment(node1, nodeA);
    expect(ElkGraphUtil.findBestEdgeContainment(crossGraphEdge)).toBeNull();

    // Partially specified edges
    const sourceMissingEdge = createEdgeWithoutContainment(null, node1);
    expect(ElkGraphUtil.findBestEdgeContainment(sourceMissingEdge)).toBe(graph1);

    const targetMissingEdge = createEdgeWithoutContainment(node1, null);
    expect(ElkGraphUtil.findBestEdgeContainment(targetMissingEdge)).toBe(graph1);
  });

  it('testFindBestEdgeContainmentWithUnconnectedEdge', () => {
    const edge = ElkGraphUtil.createEdge(null);
    expect(() => ElkGraphUtil.findBestEdgeContainment(edge)).toThrow(IllegalArgumentException);
  });

  it('testFindBestEdgeContainmentWithNullPointer', () => {
    expect(() => ElkGraphUtil.findBestEdgeContainment(null)).toThrow(TypeError);
  });
});

/** A Java enum constant stand-in (`Ordinal`) for the annotation registries. */
function enumConstant(ordinal: number): Ordinal {
  return { ordinal: () => ordinal };
}

describe('ElkGraphUtil (statics not exercised by ElkGraphUtilTest or graph.json)', () => {
  it('creates uncontained elements for a null parent', () => {
    expect(ElkGraphUtil.createPort(null).getParent()).toBeNull();
    expect(ElkGraphUtil.createEdgeSection(null).getParent()).toBeNull();
    expect(ElkGraphUtil.createBendPoint(null, 1, 2).eContainer()).toBeNull();
  });

  it('createBendPoint(section) delegates with (0, 0); createBendPoint(section, x, y) sets the location', () => {
    const section = ElkGraphUtil.createEdgeSection(null);
    const origin = ElkGraphUtil.createBendPoint(section);
    const point = ElkGraphUtil.createBendPoint(section, 3.5, -4);
    expect([origin.getX(), origin.getY(), point.getX(), point.getY()]).toEqual([0, 0, 3.5, -4]);
    expect(section.getBendPoints().toArray()).toEqual([origin, point]);
  });

  it('throws TypeError with the requireNonNull messages (D10)', () => {
    const node = ElkGraphUtil.createGraph();
    expect(() => ElkGraphUtil.createSimpleEdge(null, node)).toThrow(new TypeError('source cannot be null'));
    expect(() => ElkGraphUtil.createSimpleEdge(node, null)).toThrow(new TypeError('target cannot be null'));
    expect(() => ElkGraphUtil.createHyperedge(null, [node])).toThrow(new TypeError('sources cannot be null'));
    expect(() => ElkGraphUtil.createHyperedge([node], null)).toThrow(new TypeError('targets cannot be null'));
    expect(() => ElkGraphUtil.updateContainment(null)).toThrow(new TypeError('edge cannot be null'));
    expect(() => ElkGraphUtil.findBestEdgeContainment(null)).toThrow(new TypeError('edge cannot be null'));
    expect(() => ElkGraphUtil.connectableShapeToNode(null)).toThrow(new TypeError('connectableShape cannot be null'));
    expect(() => ElkGraphUtil.connectableShapeToPort(null)).toThrow(new TypeError('connectableShape cannot be null'));
  });

  it('connectableShapeToNode rejects a shape that is neither node nor port', () => {
    const label = ElkGraphUtil.createLabel(null) as unknown as ElkConnectableShape;
    expect(() => ElkGraphUtil.connectableShapeToNode(label)).toThrow(
      new UnsupportedOperationException('Only support nodes and ports.'),
    );
  });

  it('gathers incident edges of a node through its ports, and of a port directly', () => {
    const graph = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(graph);
    const b = ElkGraphUtil.createNode(graph);
    const p = ElkGraphUtil.createPort(a);
    const aToB = ElkGraphUtil.createSimpleEdge(a, b);
    const pToB = ElkGraphUtil.createSimpleEdge(p, b);
    const bToA = ElkGraphUtil.createSimpleEdge(b, a);
    const bToP = ElkGraphUtil.createSimpleEdge(b, p);
    expect([...ElkGraphUtil.allOutgoingEdges(a)]).toEqual([aToB, pToB]);
    expect([...ElkGraphUtil.allIncomingEdges(a)]).toEqual([bToA, bToP]);
    expect([...ElkGraphUtil.allIncidentEdges(a)]).toEqual([aToB, pToB, bToA, bToP]);
    expect([...ElkGraphUtil.allIncidentEdges(p)]).toEqual([bToP, pToB]);
    expect([...ElkGraphUtil.allIncidentShapes(pToB)]).toEqual([p, b]);
  });

  it('gathers incident sections: incoming, then outgoing', () => {
    const s1 = ElkGraphUtil.createEdgeSection(null);
    const s2 = ElkGraphUtil.createEdgeSection(null);
    const s3 = ElkGraphUtil.createEdgeSection(null);
    s2.getIncomingSections().add(s1);
    s2.getOutgoingSections().add(s3);
    expect([...ElkGraphUtil.allIncidentSections(s2)]).toEqual([s1, s3]);
    expect([...ElkGraphUtil.allIncidentSections(s1)]).toEqual([s2]);
  });

  it('reads the endpoints of a simple edge and rejects other edges', () => {
    const graph = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(graph);
    const b = ElkGraphUtil.createNode(graph);
    const p = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(p, b);
    expect(ElkGraphUtil.getSourceNode(edge)).toBe(a);
    expect(ElkGraphUtil.getTargetNode(edge)).toBe(b);
    expect(ElkGraphUtil.getSourcePort(edge)).toBe(p);
    expect(ElkGraphUtil.getTargetPort(edge)).toBeNull();
    const notSimple = new IllegalArgumentException("Passed edge is not 'simple'.");
    const hyperedge = ElkGraphUtil.createHyperedge([a, b], [b]);
    const noTarget = ElkGraphUtil.createHyperedge([a], []);
    for (const get of [
      ElkGraphUtil.getSourceNode,
      ElkGraphUtil.getTargetNode,
      ElkGraphUtil.getSourcePort,
      ElkGraphUtil.getTargetPort,
    ]) {
      expect(() => get(hyperedge)).toThrow(notSimple);
      expect(() => get(noTarget)).toThrow(notSimple);
    }
  });

  it('walks the tree in pre-order without property entries, with or without the root', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(new Property<string>('org.test.a'), 'v');
    const label = ElkGraphUtil.createLabel(graph);
    const node = ElkGraphUtil.createNode(graph);
    node.setProperty(new Property<string>('org.test.b'), 'w');
    const port = ElkGraphUtil.createPort(node);
    const edge = ElkGraphUtil.createSimpleEdge(port, node);
    const section = ElkGraphUtil.createEdgeSection(edge);
    const bendPoint = ElkGraphUtil.createBendPoint(section);
    const contents = [label, node, port, edge, section, bendPoint];
    expect([...ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)]).toEqual([graph, ...contents]);
    expect([...ElkGraphUtil.propertiesSkippingIteratorFor(graph, false)]).toEqual(contents);
    expect([...ElkGraphUtil.propertiesSkippingIteratorFor(bendPoint, false)]).toEqual([]);
    expect([...graph.eAllContents()]).toHaveLength(contents.length + 2);
  });

  it('reads the advanced and experimental markers from the D7 registries', () => {
    const advanced = enumConstant(0);
    const experimental = enumConstant(1);
    const plain = enumConstant(2);
    markAdvanced(advanced);
    markExperimental(experimental);
    expect([advanced, experimental, plain, null].map(ElkGraphUtil.isAdvancedPropertyValue)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect([advanced, experimental, plain, null].map(ElkGraphUtil.isExperimentalPropertyValue)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});

describe('ElkGraphUtil.containingGraph', () => {
  it('returns null for a null element', () => {
    expect(ElkGraphUtil.containingGraph(null)).toBeNull();
  });
});
