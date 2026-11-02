// SPDX-License-Identifier: EPL-2.0
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InLayerEdgeTestGraphCreator } from '../../../../../test/helpers/InLayerEdgeTestGraphCreator.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import { CrossingsCounter } from '../../p3order/counting/CrossingsCounter.js';

/**
 * Tests {@link InLayerEdgeTwoNodeCrossingCounter}.
 *
 * @author alan
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTwoNodeCrossingCounterTest.java
 */
describe('InLayerEdgeTwoNodeCrossingCounterTest', () => {
  let creator: InLayerEdgeTestGraphCreator;
  let leftCounter: CrossingsCounter;
  let rightCounter: CrossingsCounter;
  let lowerUpperCrossings: number;
  let upperLowerCrossings: number;
  let nodeOrder: LNode[];

  // The Java has no PlainJavaInitialization; the builders need the property defaults cloned (TestGraphCreator header).
  beforeAll(() => {
    LayoutMetaDataService.initElkReflect();
  });

  // Java: the test class extends InLayerEdgeTestGraphCreator, so JUnit builds a fresh creator per test.
  beforeEach(() => {
    creator = new InLayerEdgeTestGraphCreator();
  });

  function countCrossingsInLayerForUpperNodeLowerNode(
    layerIndex: number,
    upperNodeIndex: number,
    lowerNodeIndex: number,
  ): void {
    initCrossingCounterForLayerIndex(layerIndex);

    countCrossings(upperNodeIndex, lowerNodeIndex);
  }

  // `getFirst()`/`getSecond()` are `number | null` in TS; the counter always returns both (`!`).
  function countCrossings(upperNodeIndex: number, lowerNodeIndex: number): void {
    const leftCrossings = leftCounter.countInLayerCrossingsBetweenNodesInBothOrders(
      nodeOrder[upperNodeIndex]!,
      nodeOrder[lowerNodeIndex]!,
      PortSide.WEST,
    );
    const rightCrossings = rightCounter.countInLayerCrossingsBetweenNodesInBothOrders(
      nodeOrder[upperNodeIndex]!,
      nodeOrder[lowerNodeIndex]!,
      PortSide.EAST,
    );
    upperLowerCrossings = leftCrossings.getFirst()! + rightCrossings.getFirst()!;
    lowerUpperCrossings = leftCrossings.getSecond()! + rightCrossings.getSecond()!;
  }

  /**
   * Initializes Crossing counter, sets nodeOrder with the nodes from the layer being considered and numbers its in
   * ascending form as required by the counter.
   *
   * @param layerIndex
   */
  function initCrossingCounterForLayerIndex(layerIndex: number): void {
    const currentOrder = creator.getGraph().toNodeArray();
    nodeOrder = currentOrder[layerIndex]!;
    numberIdsAscendinglyIn(nodeOrder);
    leftCounter = new CrossingsCounter(new Int32Array(getNPorts(currentOrder)));
    rightCounter = new CrossingsCounter(new Int32Array(getNPorts(currentOrder)));
    leftCounter.initPortPositionsForInLayerCrossings(nodeOrder, PortSide.WEST);
    rightCounter.initPortPositionsForInLayerCrossings(nodeOrder, PortSide.EAST);
  }

  function getNPorts(currentOrder: LNode[][]): number {
    let nPorts = 0;
    for (const lNodes of currentOrder) {
      for (const n of lNodes) {
        nPorts += n.getPorts().length;
      }
    }
    return nPorts;
  }

  function numberIdsAscendinglyIn(nodes: LNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      nodes[i]!.id = i;
    }
  }

  function switchOrderAndNotifyCounter(indexOne: number, indexTwo: number): void {
    leftCounter.switchNodes(nodeOrder[indexOne]!, nodeOrder[indexTwo]!, PortSide.WEST);
    rightCounter.switchNodes(nodeOrder[indexOne]!, nodeOrder[indexTwo]!, PortSide.EAST);
    const one = nodeOrder[indexOne]!;
    nodeOrder[indexOne] = nodeOrder[indexTwo]!;
    nodeOrder[indexTwo] = one;
  }

  it('ignoresInBetweenLayerEdges', () => {
    creator.getCrossFormedGraph();
    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('countInLayerEdgeWithNormalEdgeCrossing', () => {
    creator.getInLayerEdgesGraph();
    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('crossingsWhenSwitched', () => {
    creator.getInLayerEdgesGraphWhichResultsInCrossingsWhenSwitched();

    countCrossingsInLayerForUpperNodeLowerNode(1, 1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
  });

  it('inLayerEdgeOnLowerNode', () => {
    creator.getInLayerEdgesGraph();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('switchNodeOrder', () => {
    creator.getInLayerEdgesGraph();

    initCrossingCounterForLayerIndex(1);
    switchOrderAndNotifyCounter(1, 2);

    countCrossings(0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('fixedPortOrderCrossingToInBetweenLayerEdge', () => {
    creator.getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder();
    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);
    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(2);
    switchOrderAndNotifyCounter(0, 1);

    countCrossings(0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
  });

  it('fixedPortOrderCrossingsAndNormalEdgeCrossings', () => {
    creator.getInLayerEdgesWithFixedPortOrderAndNormalEdgeCrossings();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);

    switchOrderAndNotifyCounter(0, 1);

    countCrossings(0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(2);
  });

  it('ignoresSelfLoops', () => {
    creator.getCrossWithManySelfLoopsGraph();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('crossingsOnBothSides', () => {
    creator.getInLayerCrossingsOnBothSides();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('fixedPortOrderInLayerNoCrossings', () => {
    creator.getFixedPortOrderInLayerEdgesDontCrossEachOther();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('fixedPortOrderInLayerWithAlwaysRemaingCrossingsAreNotCounted', () => {
    creator.getFixedPortOrderInLayerEdgesWithCrossings();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
  });

  it('oneNode', () => {
    creator.getOneNodeGraph();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 0);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('moreComplex', () => {
    creator.getMoreComplexInLayerGraph();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(6);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(6);
  });

  it('downwardInLayerEdgesOnLowerNode', () => {
    creator.getInLayerEdgesFixedPortOrderInLayerAndInBetweenLayerCrossing();
    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(2);
  });

  it('oneLayerInLayerCrossingShouldDisappearAfterAnySwitch', () => {
    creator.getOneLayerWithInLayerCrossings();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);

    countCrossingsInLayerForUpperNodeLowerNode(0, 1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);

    countCrossingsInLayerForUpperNodeLowerNode(0, 2, 3);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);

    switchOrderAndNotifyCounter(0, 1);

    countCrossings(0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);

    switchOrderAndNotifyCounter(0, 1);
    switchOrderAndNotifyCounter(1, 2);

    countCrossings(1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);

    switchOrderAndNotifyCounter(1, 2);
    switchOrderAndNotifyCounter(2, 3);

    countCrossings(2, 3);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
  });

  it('moreThanOneEdgeIntoAPort', () => {
    creator.getInLayerEdgesMultipleEdgesIntoSinglePort();

    countCrossingsInLayerForUpperNodeLowerNode(1, 1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('inBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings', () => {
    creator.multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings();

    countCrossingsInLayerForUpperNodeLowerNode(1, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);

    countCrossingsInLayerForUpperNodeLowerNode(1, 1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(2);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('inLayerEdgesPassEachOther', () => {
    creator.getInLayerOneLayerNoCrossings();
    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);
    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
    countCrossingsInLayerForUpperNodeLowerNode(0, 1, 2);
    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
    countCrossingsInLayerForUpperNodeLowerNode(0, 2, 3);
    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(1);
  });

  it('fixedPortOrderCrossingToInLayerEdge', () => {
    creator.getInLayerEdgesFixedPortOrderInLayerCrossing();

    countCrossingsInLayerForUpperNodeLowerNode(0, 1, 2);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  it('fixedPortOrderTwoInLayerEdgesCrossEachOther', () => {
    creator.getFixedPortOrderTwoInLayerEdgesCrossEachOther();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  /**
   * <pre>
   * *------
   * *---\ |
   * ___ | |
   * | |--/
   * |_|
   * </pre>
   */
  it('multipleEdgesIntoOnePort_ShouldNotCauseCrossing', () => {
    const nodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const portSide = PortSide.EAST;
    const portOne = creator.addPortOnSide(nodes[0]!, portSide);
    const portTwo = creator.addPortOnSide(nodes[1]!, portSide);
    const portThree = creator.addPortOnSide(nodes[2]!, portSide);
    creator.addEdgeBetweenPorts(portOne, portThree);
    creator.addEdgeBetweenPorts(portTwo, portThree);

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(0);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });

  // Java: `@Ignore` (no `@Test`): this case is not supported by the current algorithm
  it.skip('multipleEdgesIntoOnePortAndFreePortOrderCausesCrossings', () => {
    creator.multipleEdgesIntoOnePortAndFreePortOrder();

    countCrossingsInLayerForUpperNodeLowerNode(0, 0, 1);

    expect(upperLowerCrossings, 'upperLowerCrossings').toBe(1);
    expect(lowerUpperCrossings, 'lowerUpperCrossings').toBe(0);
  });
});
