// SPDX-License-Identifier: EPL-2.0
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestGraphCreator } from '../../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import type { Layer } from '../../graph/Layer.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounter } from './BetweenLayerEdgeTwoNodeCrossingsCounter.js';

/**
 * Tests counting crosses of edges in between layers for neighbouring nodes.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterTest.java
 */
describe('BetweenLayerEdgeTwoNodeCrossingsCounterTest', () => {
  let creator: TestGraphCreator;
  let crossingCounter: BetweenLayerEdgeTwoNodeCrossingsCounter;
  let upperNode: LNode;
  let lowerNode: LNode;
  let layerToCountIn: Layer;
  let nodeOrder: LNode[][];

  // The Java has no PlainJavaInitialization; the builders need the property defaults cloned (TestGraphCreator header).
  beforeAll(() => {
    LayoutMetaDataService.initElkReflect();
  });

  // Java: the test class extends TestGraphCreator, so JUnit builds a fresh creator per test.
  beforeEach(() => {
    creator = new TestGraphCreator();
  });

  /** Java: `getGraph().toNodeArray()`, the layer to count in, the counter and the two nodes. */
  function setUp(layerIndex: number, upperIndex: number, lowerIndex: number): void {
    nodeOrder = creator.getGraph().toNodeArray();
    layerToCountIn = creator.getGraph().getLayers()[layerIndex] as Layer;
    crossingCounter = new BetweenLayerEdgeTwoNodeCrossingsCounter(nodeOrder, layerIndex);
    setUpperNode(upperIndex);
    setLowerNode(lowerIndex);
  }

  it('twoNodeNoEdges', () => {
    creator.getTwoNodesNoConnectionGraph();

    setUp(0, 0, 1);

    assertBothSideUpperLowerCrossingsIs(0);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('crossFormed', () => {
    creator.getCrossFormedGraph();

    setUp(1, 0, 1);

    assertBothSideUpperLowerCrossingsIs(1);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(1);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('oneNode', () => {
    creator.getOneNodeGraph();

    setUp(0, 0, 0);

    assertBothSideUpperLowerCrossingsIs(0);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('crossFormedMultipleEdgesBetweenSameNodes', () => {
    creator.getMultipleEdgesBetweenSameNodesGraph();

    setUp(1, 0, 1);

    assertBothSideUpperLowerCrossingsIs(4);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(4);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('crossWithExtraEdgeInBetween', () => {
    creator.getCrossWithExtraEdgeInBetweenGraph();

    setUp(1, 0, 2);

    assertBothSideUpperLowerCrossingsIs(1);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(1);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('ignoreInLayerEdges', () => {
    creator.getInLayerEdgesGraph();

    setUp(1, 0, 2);

    assertBothSideUpperLowerCrossingsIs(0);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('ignoreSelfLoops', () => {
    creator.getCrossWithManySelfLoopsGraph();

    setUp(1, 0, 1);

    assertBothSideUpperLowerCrossingsIs(1);
    assertBothSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(1);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
  });

  it('moreComplexThreeLayerGraph', () => {
    creator.getMoreComplexThreeLayerGraph();

    setUp(1, 0, 1);

    assertWesternSideUpperLowerCrossingsIs(1);
    assertWesternSideLowerUpperCrossingsIs(1);
    assertEasternSideUpperLowerCrossingsIs(2);
    assertEasternSideLowerUpperCrossingsIs(3);
    assertBothSideUpperLowerCrossingsIs(3);
    assertBothSideLowerUpperCrossingsIs(4);
  });

  it('fixedPortOrder', () => {
    creator.getFixedPortOrderGraph();

    setUp(1, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(1);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(1);
    assertBothSideLowerUpperCrossingsIs(0);
  });

  it('switchThreeTimes', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(4, creator.makeLayer(creator.getGraph()));
    const leftTopPort = creator.addPortOnSide(leftNodes[0] as LNode, PortSide.EAST);
    const leftLowerPort = creator.addPortOnSide(leftNodes[1] as LNode, PortSide.EAST);
    const rightTopPort = creator.addPortOnSide(rightNodes[0] as LNode, PortSide.WEST);

    creator.addEdgeBetweenPorts(leftLowerPort, rightTopPort);
    creator.eastWestEdgeFromTo(leftLowerPort, rightNodes[2] as LNode);

    creator.addEdgeBetweenPorts(leftTopPort, rightTopPort);
    creator.eastWestEdgeFromTo(leftTopPort, rightNodes[1] as LNode);
    creator.eastWestEdgeFromTo(leftTopPort, rightNodes[3] as LNode);

    creator.setUpIds();
    setUp(0, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(3);
    assertEasternSideLowerUpperCrossingsIs(2);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(3);
    assertBothSideLowerUpperCrossingsIs(2);
  });

  it('intoSamePort', () => {
    creator.twoEdgesIntoSamePort();
    setUp(1, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(2);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(2);
    assertBothSideLowerUpperCrossingsIs(0);
  });

  it('intoSamePortCausesCrossingsOnSwitch', () => {
    creator.twoEdgesIntoSamePortCrossesWhenSwitched();
    setUp(0, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(1);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(0);
    assertBothSideLowerUpperCrossingsIs(1);
  });

  it('intoSamePortReducesCrossingsOnSwitch', () => {
    creator.twoEdgesIntoSamePortResolvesCrossingWhenSwitched();
    setUp(0, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(1);
    assertEasternSideLowerUpperCrossingsIs(0);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(1);
    assertBothSideLowerUpperCrossingsIs(0);
  });

  it('intoSamePortFromEastSwitchWithFixedPortOrder', () => {
    creator.twoEdgesIntoSamePortFromEastWithFixedPortOrder();
    setUp(0, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(0);
    assertEasternSideLowerUpperCrossingsIs(1);
    assertWesternSideUpperLowerCrossingsIs(0);
    assertWesternSideLowerUpperCrossingsIs(0);
    assertBothSideUpperLowerCrossingsIs(0);
    assertBothSideLowerUpperCrossingsIs(1);
  });

  it('multipleEdgesIntoSamePort_causesNoCrossings', () => {
    const leftLayer = creator.makeLayer(creator.graph);
    const rightLayer = creator.makeLayer(creator.graph);

    const topLeft = creator.addNodeToLayer(leftLayer);
    const bottomLeft = creator.addNodeToLayer(leftLayer);
    const bottomRight = creator.addNodeToLayer(rightLayer);

    const bottomRightPort = creator.addPortOnSide(bottomRight, PortSide.WEST);

    creator.eastWestEdgeFromTo(topLeft, bottomRightPort);
    creator.eastWestEdgeFromTo(topLeft, bottomRightPort);
    creator.eastWestEdgeFromTo(bottomLeft, bottomRightPort);
    creator.setUpIds();
    setUp(0, 0, 1);

    assertEasternSideUpperLowerCrossingsIs(0);
    // Java asserts the same eastern upper-lower count twice (a copy of the line, not the lower-upper one).
    assertEasternSideUpperLowerCrossingsIs(0);
  });

  /**
   * This behavior is not supported by the BetweenLayerEdgeTwoNodeCrossingsCounter.
   *
   * <pre>
   * ___   ____
   * | o---o  |
   * | |\  |  |
   * |_o-+-o  |
   *     | |__|
   *      \
   *       *
   * </pre>
   *
   * Right layer has fixed port order, left has free.
   *
   * Java: `@Ignore` without `@Test`, so JUnit never collects the method.
   */
  it.skip('partlyFixedPartlyUnfixedPortOrder', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.setFixedOrderConstraint(rightNodes[0] as LNode);
    creator.setFixedOrderConstraint(rightNodes[1] as LNode);
    const leftTopPort = creator.addPortOnSide(leftNode, PortSide.EAST);
    const leftLowerPort = creator.addPortOnSide(leftNode, PortSide.EAST);
    const rightUpperNodeLowerPort = creator.addPortOnSide(rightNodes[0] as LNode, PortSide.WEST);
    const rightUpperNodeTopPort = creator.addPortOnSide(rightNodes[0] as LNode, PortSide.WEST);
    const rightLowerPort = creator.addPortOnSide(rightNodes[1] as LNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftTopPort, rightUpperNodeTopPort);
    creator.addEdgeBetweenPorts(leftTopPort, rightLowerPort);
    creator.addEdgeBetweenPorts(leftLowerPort, rightUpperNodeLowerPort);

    setUp(1, 0, 1);

    assertBothSideUpperLowerCrossingsIs(1);
  });

  function assertEasternSideLowerUpperCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countEasternEdgeCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getLowerUpperCrossings();
    expect(crossings, failMessage(' east, lower upper ')).toBe(expectedCrossings);
  }

  function assertEasternSideUpperLowerCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countEasternEdgeCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getUpperLowerCrossings();
    expect(crossings, failMessage(' east, upper lower ')).toBe(expectedCrossings);
  }

  function assertWesternSideLowerUpperCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countWesternEdgeCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getLowerUpperCrossings();
    expect(crossings, failMessage(' west, lower upper ')).toBe(expectedCrossings);
  }

  function assertWesternSideUpperLowerCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countWesternEdgeCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getUpperLowerCrossings();
    expect(crossings, failMessage(' west, upper lower ')).toBe(expectedCrossings);
  }

  function assertBothSideLowerUpperCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countBothSideCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getLowerUpperCrossings();
    expect(crossings, failMessage(' both, lower upper ')).toBe(expectedCrossings);
  }

  function assertBothSideUpperLowerCrossingsIs(expectedCrossings: number): void {
    crossingCounter.countBothSideCrossings(upperNode, lowerNode);
    const crossings = crossingCounter.getUpperLowerCrossings();
    expect(crossings, failMessage(' both, upper lower ')).toBe(expectedCrossings);
  }

  function setUpperNode(nodeIndex: number): void {
    const nodes = layerToCountIn.getNodes();
    upperNode = nodes[nodeIndex] as LNode;
  }

  function setLowerNode(nodeIndex: number): void {
    const nodes = layerToCountIn.getNodes();
    lowerNode = nodes[nodeIndex] as LNode;
  }

  function failMessage(configuration: string): string {
    return `With configuration: ${configuration} in Layer ${layerToCountIn.toString()} between the nodes: Upper node ${upperNode.getIndex()} and lower Node ${lowerNode.getIndex()}`;
  }
});
