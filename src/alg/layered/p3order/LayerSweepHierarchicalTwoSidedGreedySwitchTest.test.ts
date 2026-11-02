// SPDX-License-Identifier: EPL-2.0
// Port of LayerSweepHierarchicalTwoSidedGreedySwitchTest (mission 7c-tests, T5).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/LayerSweepHierarchicalTwoSidedGreedySwitchTest.java
//
// Java-to-TypeScript mapping:
//   - `extends TestGraphCreator` / `@Before` is `let creator` rebuilt in `beforeEach`; `graph` is `creator.graph`,
//     `random` is `creator.random`.
//   - `Lists.newArrayList(layer)` is `[...layer]` (a `Layer` iterates its nodes); `Layer.getNodes().get(i)` is an index.
//   - `assertThat(list, is(expected))` on nodes and ports is `expectSameElements` (identity per element).
import { beforeAll, beforeEach, describe, it } from 'vitest';
import { expectSameElements } from '../../../../test/helpers/junit-asserts.js';
import { TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayerSweepCrossingMinimizer } from './LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';

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

function setUpAndMinimizeCrossings(): void {
  const crossMin = new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
  crossMin.process(creator.getGraph(), new BasicProgressMonitor());
}

describe('LayerSweepHierarchicalTwoSidedGreedySwitchTest', () => {
  /**
   * <pre>
   * ______
   * |*  *+-*
   * | \/ |
   * | /\ |
   * |*  *+-*
   * |----|
   * </pre>
   */
  it('givencrossInFirstLevelCompoundNodeUsingTwoSidedGreedySwitch_LeavesCrossing', () => {
    // parent graph
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[1]!);

    // child graph
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodesleft = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerNodesRight = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodesRight[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodesRight[1]!, leftInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[0]!, leftInnerNodesRight[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[1]!, leftInnerNodesRight[0]!);
    creator.getGraph().setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1.0);

    const expectedSameOrder = creator.copyOfNodesInLayer(1);

    setUpAndMinimizeCrossings();

    expectSameElements(creator.getGraph().getLayers()[1]!.getNodes(), expectedSameOrder);
  });

  /**
   * <pre>
   * ________
   * |___  *|
   * || |\/ |
   * || |/\ |
   * ||_|  *|
   * |------|
   * </pre>
   *
   * Sweep backward first.
   */
  it('givenCompoundGraphWhereOrderIsOnlyCorrectedOnForwardSweep_RemovesCrossing', () => {
    const node = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const innerGraph = creator.nestedGraph(node);
    const leftInnerNode = creator.addNodeToLayer(creator.makeLayer(innerGraph));
    creator.setFixedOrderConstraint(leftInnerNode);
    const rightInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    creator.eastWestEdgeFromTo(leftInnerNode, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNode, rightInnerNodes[0]!);

    const rightInnerLayer = innerGraph.getLayers()[1]!;
    const expectedOrderRightInner = creator.switchOrderOfNodesInLayer(0, 1, rightInnerLayer);
    const expectedPortOrderLeft = creator.copyPortsInIndexOrder(leftInnerNode, 0, 1);

    creator.getRandom().setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(leftInnerNode.getPorts(), expectedPortOrderLeft);
    expectSameElements(rightInnerLayer.getNodes(), expectedOrderRightInner);
  });

  /**
   * <pre>
   * ______
   * |*  *|
   * | \/ |
   * | /\ |
   * |*  *|
   * |----|
   * </pre>
   */
  it('givenSingleHierarchicalNodeWithCross_RemovesCrossing', () => {
    const node = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const innerGraph = creator.nestedGraph(node);
    const innerNodesleft = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    const innerNodesRight = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    creator.eastWestEdgeFromTo(innerNodesleft[0]!, innerNodesRight[1]!);
    creator.eastWestEdgeFromTo(innerNodesleft[1]!, innerNodesRight[0]!);

    const expectedOrderLeft = creator.switchOrderOfNodesInLayer(0, 1, innerGraph.getLayers()[0]!);

    setUpAndMinimizeCrossings();

    expectSameElements(innerGraph.getLayers()[0]!.getNodes(), expectedOrderLeft);
  });

  /**
   * <pre>
   * _________
   * | ___   |  ___
   * | | |--*p _| |
   * | | |   |x | |
   * | |_|--*p -|_|
   * |po fix | po fix
   * |_______|
   * </pre>
   */
  it('onlyTwoSidedGreedySwitchReturnsNoChange', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const leftPorts = creator.addPortsOnSide(2, leftNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftPorts[0]!, rightNode);
    creator.eastWestEdgeFromTo(leftPorts[1]!, rightNode);
    creator.setFixedOrderConstraint(rightNode);
    const innerGraph = creator.nestedGraph(leftNode);
    const innerLayers = creator.makeLayers(2, innerGraph);
    const innerLeftNode = creator.addNodeToLayer(innerLayers[0]!);
    creator.setFixedOrderConstraint(innerLeftNode);
    const dummies = creator.addExternalPortDummiesToLayer(innerLayers[1]!, leftPorts);
    creator.eastWestEdgeFromTo(innerLeftNode, dummies[0]!);
    creator.eastWestEdgeFromTo(innerLeftNode, dummies[1]!);
    const expectedOrderDummies = [...innerGraph.getLayers()[1]!];
    // sweep backward
    creator.random.setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(innerGraph.getLayers()[1]!.getNodes(), expectedOrderDummies);
  });

  /**
   * <pre>
   * _________
   * | ___   |  ___
   * | | |\ *p__| |
   * | | | x |  | |
   * | |_|/ *p--|_|
   * |po fix | po fix
   * |_______|
   * </pre>
   */
  it('crossingBeforeLastLayerCausesCrossingOutside_TwoSidedPrevents', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const leftPorts = creator.addPortsOnSide(2, leftNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftPorts[1]!, rightNode);
    creator.eastWestEdgeFromTo(leftPorts[0]!, rightNode);
    creator.setFixedOrderConstraint(rightNode);
    const innerGraph = creator.nestedGraph(leftNode);
    const innerLayers = creator.makeLayers(2, innerGraph);
    const innerLeftNode = creator.addNodeToLayer(innerLayers[0]!);
    creator.setFixedOrderConstraint(innerLeftNode);
    const dummies = creator.addExternalPortDummiesToLayer(innerLayers[1]!, leftPorts);
    creator.eastWestEdgeFromTo(innerLeftNode, dummies[1]!);
    creator.eastWestEdgeFromTo(innerLeftNode, dummies[0]!);
    const expectedOrderDummies = [...innerGraph.getLayers()[1]!];

    setUpAndMinimizeCrossings();

    expectSameElements(innerGraph.getLayers()[1]!.getNodes(), expectedOrderDummies);
  });

  /**
   * <pre>
   *        _________
   * ___   |   ___ |
   * | |---p* /| | |
   * | |   | x | | |
   * |_|---p* \|_| |
   * po fix| po fix|
   *       |_______|
   * </pre>
   */
  it('crossingBeforeFirstLayerCausesCrossingOutside_TwoSidedPrevents', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.graph));
    const rightPorts = creator.addPortsOnSide(2, rightNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNode, rightPorts[1]!);
    creator.eastWestEdgeFromTo(leftNode, rightPorts[0]!);
    creator.setFixedOrderConstraint(leftNode);
    const innerGraph = creator.nestedGraph(rightNode);
    const innerLayers = creator.makeLayers(2, innerGraph);
    const innerRightNode = creator.addNodeToLayer(innerLayers[1]!);
    creator.setFixedOrderConstraint(innerRightNode);
    const dummies = creator.addExternalPortDummiesToLayer(innerLayers[0]!, rightPorts);
    creator.eastWestEdgeFromTo(dummies[0]!, innerRightNode);
    creator.eastWestEdgeFromTo(dummies[1]!, innerRightNode);
    const expectedOrderDummies = [...innerGraph.getLayers()[0]!];
    // backwardSweep
    creator.random.setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(innerGraph.getLayers()[0]!.getNodes(), expectedOrderDummies);
  });
});
