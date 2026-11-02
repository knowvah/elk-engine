// SPDX-License-Identifier: EPL-2.0
// Port of AbstractBarycenterPortDistributorTest (mission 7c-tests, T5).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/AbstractBarycenterPortDistributorTest.java
//
// Java-to-TypeScript mapping:
//   - `extends TestGraphCreator` / `@Before` is `let creator` rebuilt in `beforeEach`; `graph` is `creator.graph`.
//   - `new GraphInfoHolder(graph, CrossMinType.BARYCENTER, null)`: the TS constructor takes the list of all graph
//     holders and reads it only for a graph with a parent node, so the top-level graph passes `[]`.
//   - `IInitializable.init(Arrays.asList(portDist), nodeArray)` is `init([portDist], nodeArray)`.
//   - `assertThat(list, is(expected))` on ports is `expectSameElements` (identity per element).
import { beforeAll, beforeEach, describe, it } from 'vitest';
import { expectSameElements } from '../../../../test/helpers/junit-asserts.js';
import { TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { init } from './counting/IInitializable.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import type { ISweepPortDistributor } from './ISweepPortDistributor.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerTotalPortDistributor } from './LayerTotalPortDistributor.js';

// Java: `PlainJavaInitialization.initializePlainJavaLayout()`, plus `LayoutMetaDataService.initElkReflect()` for the
// list- and set-valued defaults the creator clones.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

let creator: TestGraphCreator;

beforeEach(() => {
  creator = new TestGraphCreator();
});

/** Java `distributePortsInCompleteGraph(int numberOfPorts)`; the parameter is unused in Java as well. */
function distributePortsInCompleteGraph(_numberOfPorts: number): void {
  const gd = new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []);
  const nodes = creator.graph.toNodeArray();
  for (let i = 0; i < nodes.length; i++) {
    gd.portDistributor().distributePortsWhileSweeping(nodes, i, true);
  }
  for (let i = nodes.length - 1; i >= 0; i--) {
    gd.portDistributor().distributePortsWhileSweeping(nodes, i, false);
  }
}

describe('AbstractBarycenterPortDistributorTest', () => {
  /**
   * <pre>
   * *  ___
   *  \/| |
   *  /\| |
   * *  |_|
   * </pre>
   */
  it('distributePortsOnSide_GivenCrossOnWesternSide_ShouldRemoveCrossing', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNode);

    const expectedPortOrderRightNode: LPort[] = [rightNode.getPorts()[1]!, rightNode.getPorts()[0]!];

    distributePortsInCompleteGraph(4);

    expectSameElements(rightNode.getPorts(), expectedPortOrderRightNode);
  });

  /**
   * <pre>
   * *  ___  *
   *  \/| |\/
   *  /\| |/\
   * *  |_|  *
   * </pre>
   */
  it('distributePortsOfGraph_GivenCrossOnBothSides_ShouldRemoveCrossin', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const middleNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(middleNode, rightNodes[1]!);
    creator.eastWestEdgeFromTo(middleNode, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, middleNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, middleNode);
    creator.setUpIds();
    const expectedPortOrderMiddleNode = creator.copyPortsInIndexOrder(middleNode, 1, 0, 3, 2);

    distributePortsInCompleteGraph(8);

    expectSameElements(middleNode.getPorts(), expectedPortOrderMiddleNode);
  });

  /**
   * <pre>
   * ___
   * | |\ /-*
   * | | x
   * |_|/ \-*
   * </pre>
   */
  it('distributePortsOfGraph_GivenCrossOnEasternSide_ShouldRemoveCrossing', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNode, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, rightNodes[0]!);

    const expectedPortOrderLeftNode = creator.copyPortsInIndexOrder(leftNode, 1, 0);

    distributePortsInCompleteGraph(4);

    expectSameElements(leftNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   *     *-----
   *     *-\  |
   *   ____ | |
   * * |  |-+--
   *   |__|-|
   * </pre>
   */
  it('distributePortsOfGraph_GivenInLayerEdgePortOrderCrossing_ShouldRemoveIt', () => {
    creator.addNodeToLayer(creator.makeLayer());
    const nodes = creator.addNodesToLayer(3, creator.makeLayer());
    creator.addInLayerEdge(nodes[0]!, nodes[2]!, PortSide.EAST);
    creator.addInLayerEdge(nodes[1]!, nodes[2]!, PortSide.EAST);

    const expectedPortOrderLowerNode = creator.copyPortsInIndexOrder(nodes[2]!, 1, 0);

    distributePortsInCompleteGraph(4);

    expectSameElements(nodes[2]!.getPorts(), expectedPortOrderLowerNode);
  });

  /**
   * <pre>
   *     *-->*
   *     |
   *   *-+-->*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   */
  it('distributePortsOfGraph_GivenNorthSouthPortOrderCrossing_ShouldSwitchPortOrder', () => {
    const leftNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));

    creator.addNorthSouthEdge(PortSide.NORTH, leftNodes[2]!, leftNodes[1]!, rightNodes[1]!, false);
    creator.addNorthSouthEdge(PortSide.NORTH, leftNodes[2]!, leftNodes[0]!, rightNodes[0]!, false);

    const expectedPortOrderLowerNode: LPort[] = [leftNodes[2]!.getPorts()[1]!, leftNodes[2]!.getPorts()[0]!];

    distributePortsInCompleteGraph(6);

    expectSameElements(leftNodes[2]!.getPorts(), expectedPortOrderLowerNode);
  });

  /**
   * <pre>
   * ___  ____
   * | |\/|  |
   * |_|/\|  |
   *      |--|
   * </pre>
   */
  it('distributePortsWhileSweeping_givenSimpleCross_ShouldRemoveCrossing', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNode, rightNode);
    creator.eastWestEdgeFromTo(leftNode, rightNode);
    const expectedPortRightNode = creator.copyPortsInIndexOrder(rightNode, 1, 0);
    creator.setUpIds();
    const nodeArray = creator.graph.toNodeArray();
    const portDist: ISweepPortDistributor = new LayerTotalPortDistributor(nodeArray.length);
    init([portDist], nodeArray);
    portDist.distributePortsWhileSweeping(nodeArray, 1, true);

    expectSameElements(rightNode.getPorts(), expectedPortRightNode);
  });

  /**
   * <pre>
   * ____
   * | *+--  *
   * |  |  \/
   * |  |\ /\
   * | *+-x  *
   * |__|  \
   *        -*
   * </pre>
   */
  // TODO this is a problem which currently cannot be solved by our algorithm :-(
  // Java: `@Ignore` without `@Test`, so JUnit never collects the method; `it.skip` keeps it reviewable.
  it.skip('distributePortsOnSide_partlyCrossHierarchicalEdges_CrossHierarchyStaysOuterChanges', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(3, leftOuterNode, PortSide.EAST);
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes: LNode[] = new Array<LNode>(2);
    const dummyLayer = creator.makeLayer();
    leftInnerDummyNodes[0] = creator.addExternalPortDummyNodeToLayer(dummyLayer, leftOuterPorts[0]!);
    leftInnerDummyNodes[1] = creator.addExternalPortDummyNodeToLayer(dummyLayer, leftOuterPorts[2]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, leftInnerDummyNodes[0]);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, leftInnerDummyNodes[1]);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[2]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[2]!, rightNodes[0]!);
    // leftOuterNode.setProperty(InternalProperties.HAS_HIERARCHICAL_AND_NORMAL_PORTS, true);
    creator.setPortOrderFixed(leftOuterNode);

    creator.setUpIds();

    const expectedOrder = [...creator.switchOrderInArray(1, 2, leftOuterPorts)];

    distributePortsInCompleteGraph(8);

    expectSameElements(leftOuterNode.getPorts(), expectedOrder);
  });
});
