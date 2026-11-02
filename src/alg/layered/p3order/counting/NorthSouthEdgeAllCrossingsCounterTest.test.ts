// SPDX-License-Identifier: EPL-2.0
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NorthSouthEdgeTestGraphCreator } from '../../../../../test/helpers/NorthSouthEdgeTestGraphCreator.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { CrossingsCounter } from './CrossingsCounter.js';

/**
 * Tests the north/south edge crossing counting of the {@link CrossingsCounter}.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/counting/NorthSouthEdgeAllCrossingsCounterTest.java
 */
describe('NorthSouthEdgeAllCrossingsCounterTest', () => {
  let creator: NorthSouthEdgeTestGraphCreator;

  // Java: `@Before setup()` calls `LayoutMetaDataService.getInstance()`; the builders also need the list- and set-valued
  // defaults cloned, which `initElkReflect()` provides (TestGraphCreator header).
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
    LayoutMetaDataService.initElkReflect();
  });

  // Java: the test class extends NorthSouthEdgeTestGraphCreator, so JUnit builds a fresh creator per test.
  beforeEach(() => {
    creator = new NorthSouthEdgeTestGraphCreator();
  });

  /** Java `initCounterForLayerWithIndexAndCountInLayer(layerIndex)`. */
  function initCounterForLayerWithIndexAndCountInLayer(layerIndex: number): number {
    creator.setUpIds();
    let numPorts = 0;
    for (const l of creator.getGraph()) {
      for (const lNode of l) {
        numPorts += lNode.getPorts().length;
      }
    }
    const counter = new CrossingsCounter(new Int32Array(numPorts));
    return counter.countNorthSouthPortCrossingsInLayer(creator.getGraph().toNodeArray()[layerIndex]!);
  }

  it('northernNorthSouthNodeSingleCrossing', () => {
    creator.getNorthSouthUpwardCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(1);
  });

  it('northernNorthSouthNodeMultipleCrossings', () => {
    creator.getNorthSouthUpwardMultipleCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(3);
  });

  it('southernTowEdgeEastCrossing', () => {
    creator.getNorthSouthDownwardCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(1);
  });

  it('southernNorthSouthMultipleNodeCrossing', () => {
    creator.getNorthSouthDownwardMultipleCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(3);
  });

  it('southernTwoWesternEdges', () => {
    creator.getNorthSouthSouthernTwoWesternEdges();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(1);
  });

  it('southernThreeWesternEdges', () => {
    creator.getNorthSouthSouthernThreeWesternEdges();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(3);
  });

  it('northSouthEdgesComeFromBothSidesDontCross', () => {
    creator.getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(0);
  });

  it('southernNorthSouthEdgesBothToEastDontCross', () => {
    creator.getSouthernNorthSouthEdgesBothToEast();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(0);
  });

  it('northSouthEdgesComeFromBothSidesDoCross', () => {
    creator.getNorthSouthEdgesFromEastAndWestAndCross();

    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);

    expect(crossingCount).toBe(1);
  });

  it('northernBothEdgesWestern', () => {
    creator.getNorthSouthNorthernWesternEdges();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(0);
  });

  it('northernEasternPortToWestWesternPortToEast', () => {
    creator.getNorthSouthNorthernEasternPortToWestWesternPortToEast();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);

    expect(crossingCount).toBe(1);
  });

  it('allSidesMultipleCrossings', () => {
    creator.getNorthSouthAllSidesMultipleCrossings();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(4);
  });

  it('oneEdgeDummyIsCrossedByOneSouthernNorthSouthPortEdge', () => {
    creator.getSouthernNorthSouthDummyEdgeCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(1);
  });

  it('oneEdgeDummyIsCrossedByTwoSouthernNorthSouthPortEdges', () => {
    creator.getSouthernNorthSouthDummyEdgeTwoCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(2);
  });

  it('southernTwoDummyEdgeAndTwoNorthSouthShouldCrossFourTimes', () => {
    creator.getSouthernTwoDummyEdgeAndNorthSouthCrossingGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(4);
  });

  it('normalNodesNorthSouthEdgesHaveCrossingsToLongEdgeDummyOnBothSides', () => {
    creator.getMultipleNorthSouthAndLongEdgeDummiesOnBothSides();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(4);
  });

  it('ignoresUnconnectedPortsForNormalNodeAndLongEdgeDummies', () => {
    creator.getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);
    expect(crossingCount).toBe(0);
  });

  it('noNorthSouthNode', () => {
    creator.getCrossFormedGraph();
    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(0);
    expect(crossingCount).toBe(0);
  });

  /**
   * <pre>
   * *---o
   *     +--*
   *    /|
   *   o-+--*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   */
  it('moreThanOneEdgeIntoNSNode_countsTheseToo', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const middleNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));

    creator.setFixedOrderConstraint(middleNodes[2]!);

    // ports are added in clockwise fashion!
    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[2]!, middleNodes[1]!, rightNodes[0]!, false);
    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[2]!, middleNodes[0]!, leftNode, true);
    // second edge on middle node
    const middleNodePort = middleNodes[1]!.getPorts()[0]!;
    creator.eastWestEdgeFromTo(middleNodePort, rightNodes[1]!);

    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);

    expect(crossingCount).toBe(2);
  });

  /**
   * <pre>
   * *--------o
   * *------o |
   * *----o | |
   * *--o | | |
   *    | | | |
   *   _|_|_|_|_
   *  |         |
   * </pre>
   */
  it('theOneThatFailedWithTheOldCounting', () => {
    const leftNodes = creator.addNodesToLayer(4, creator.makeLayer(creator.getGraph()));
    const middleNodes = creator.addNodesToLayer(5, creator.makeLayer(creator.getGraph()));

    creator.setFixedOrderConstraint(middleNodes[4]!);

    for (let i = 3; i >= 0; --i) {
      creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[4]!, middleNodes[i]!, leftNodes[i]!, false);
    }

    const crossingCount = initCounterForLayerWithIndexAndCountInLayer(1);

    expect(crossingCount).toBe(0);
  });
});
