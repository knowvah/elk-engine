// SPDX-License-Identifier: EPL-2.0
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounterTest.java
//
// Mission 7c-tests (T8). One `it` per Java `@Test`, in Java order (the private helpers sit where they do in Java).
//
// Java-to-TypeScript mapping, all forced by the language:
//   - `extends NorthSouthEdgeTestGraphCreator` becomes `creator: NorthSouthEdgeTestGraphCreator`; the test's own
//     fields `counter` and `layer` are `let`s reset in `beforeEach` (JUnit builds a fresh instance per `@Test`, so
//     `layer` starts null and `setLayerIfNotSet` fills it only once per test, as in Java).
//   - `PlainJavaInitialization.initializePlainJavaLayout()` becomes the explicit layered registration plus
//     `initElkReflect()` in `beforeAll`.
//   - `assertThat(int, is(int))` becomes `toBe`; `list.get(i)` becomes `getPorts()[i]!`, `array[i]` becomes `array[i]!`
//     (the index is in range in every test).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { NorthSouthEdgeTestGraphCreator } from '../../../../../test/helpers/NorthSouthEdgeTestGraphCreator.js';
import type { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredMetaDataProvider } from '../../options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { NorthSouthEdgeNeighbouringNodeCrossingsCounter } from './NorthSouthEdgeNeighbouringNodeCrossingsCounter.js';

// Java: `@BeforeClass initPlainJavaLayout()` runs `PlainJavaInitialization.initializePlainJavaLayout()`.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

describe('NorthSouthEdgeNeighbouringNodeCrossingsCounterTest', () => {
  let creator: NorthSouthEdgeTestGraphCreator;
  let counter: NorthSouthEdgeNeighbouringNodeCrossingsCounter;
  let layer: LNode[] | null;

  beforeEach(() => {
    creator = new NorthSouthEdgeTestGraphCreator();
    layer = null;
  });

  function switchNodes(upper: number, lower: number): void {
    const nodes = layer!;
    const upperNode = nodes[upper]!;
    const lowerNode = nodes[lower]!;
    nodes[upper] = lowerNode;
    nodes[lower] = upperNode;
  }

  function setLayerIfNotSet(layerIndex: number): void {
    if (layer === null) {
      layer = creator.getGraph().toNodeArray()[layerIndex]!;
    }
  }

  function countCrossingsInLayerBetweenNodes(layerIndex: number, upperNodeIndex: number, lowerNodeIndex: number): void {
    setLayerIfNotSet(layerIndex);
    counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter(layer!);
    counter.countCrossings(layer![upperNodeIndex]!, layer![lowerNodeIndex]!);
  }

  function switchAndRecount(upperNodeIndex: number, lowerNodeIndex: number): void {
    switchNodes(upperNodeIndex, lowerNodeIndex);
    counter.countCrossings(layer![upperNodeIndex]!, layer![lowerNodeIndex]!);
  }

  it('noNorthSouthNode', () => {
    creator.getCrossFormedGraph();
    countCrossingsInLayerBetweenNodes(0, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('southernNorthSouthNodeCrossing', () => {
    creator.getNorthSouthDownwardCrossingGraph();
    countCrossingsInLayerBetweenNodes(0, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('northernNorthSouthNodeCrossings', () => {
    creator.getNorthSouthUpwardCrossingGraph();

    countCrossingsInLayerBetweenNodes(0, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('oneNodeIsLongEdgeDummy', () => {
    creator.getSouthernNorthSouthDummyEdgeCrossingGraph();
    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    switchNodes(1, 2);

    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('oneNodeIsLongEdgeDummyNorthern', () => {
    creator.getNorthernNorthSouthDummyEdgeCrossingGraph();
    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    switchNodes(0, 1);

    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('withNormalNode', () => {
    creator.getNorthSouthDownwardCrossingGraph();
    countCrossingsInLayerBetweenNodes(0, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('northSouthEdgesComeFromBothSidesDontCross', () => {
    creator.getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings();
    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    creator.getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings();
    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('southernNorthSouthEdgesBothToEast', () => {
    creator.getSouthernNorthSouthEdgesBothToEast();
    countCrossingsInLayerBetweenNodes(0, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('crossingsWithNorthSouthPortsBelongingToDifferentNodesShouldNotBeCounted', () => {
    creator.getGraphWhereLayoutUnitPreventsSwitch();
    countCrossingsInLayerBetweenNodes(0, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('northSouthEdgesComeFromBothSidesDoCross', () => {
    creator.getNorthSouthEdgesFromEastAndWestAndCross();
    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('switchNodesAndRecount', () => {
    creator.getNorthSouthUpwardCrossingGraph();
    countCrossingsInLayerBetweenNodes(0, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
    switchAndRecount(0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('southPortOndNormalNodeBelowLongEdgeDummy', () => {
    creator.getSouthPortOnNormalNodeBelowLongEdgeDummy();

    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
    switchAndRecount(0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('northPortOndNormalNodeAboveLongEdgeDummy', () => {
    creator.getNorthPortOndNormalNodeAboveLongEdgeDummy();

    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
    switchAndRecount(1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('southernTwoWesternEdges', () => {
    creator.getNorthSouthSouthernTwoWesternEdges();
    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
    switchAndRecount(1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('southernWesternPortToEastAndEasternPortToWest', () => {
    creator.getNorthSouthSouthernWesternPortToEastAndEasternPortToWest();
    countCrossingsInLayerBetweenNodes(1, 1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(1);
    switchAndRecount(1, 2);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('northernBothEdgesWestern', () => {
    creator.getNorthSouthNorthernWesternEdges();
    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(1);
    switchAndRecount(0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('northernEasternPortToWestWesternPortToEast', () => {
    creator.getNorthSouthNorthernEasternPortToWestWesternPortToEast();
    countCrossingsInLayerBetweenNodes(1, 0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(1);
    switchAndRecount(0, 1);
    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  it('normalNodesNorthSouthEdgesHaveCrossingsToLongEdgeDummy', () => {
    creator.getNorthernNorthSouthDummyEdgeCrossingGraph();

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    countCrossingsInLayerBetweenNodes(1, 1, 2);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    creator.getSouthernNorthSouthDummyEdgeCrossingGraph();

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);

    countCrossingsInLayerBetweenNodes(1, 1, 2);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('normalNodesNorthSouthEdgesHaveCrossingsToLongEdgeDummyOnBothSides', () => {
    creator.getMultipleNorthSouthAndLongEdgeDummiesOnBothSides();
    countCrossingsInLayerBetweenNodes(1, 2, 3);

    expect(counter.getUpperLowerCrossings()).toBe(2);
    expect(counter.getLowerUpperCrossings()).toBe(2);
  });

  it('ignoresUnconnectedPortsForNormalNodeAndLongEdgeDummies', () => {
    creator.getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide();
    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(0);

    creator.getLongEdgeDummyAndNormalNodeWithUnusedPortsOnNorthernSide();
    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(0);
  });

  it('oneEdgeWestOneEdgeEastDontCross', () => {
    creator.getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings();
    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  it('oneEdgeEastOneEdgeWestDontCross', () => {
    creator.getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossingsUpperEdgeEast();

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(0);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  /**
   * ```
   *
   * *----
   *    /+--*
   *   --+--*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * ```
   */
  it('givenPolylineRoutingWhenMoreThanOneEdgeIntoNSNode_countsTheseToo', () => {
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
    creator.getGraph().setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.POLYLINE);

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(2);
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  /**
   * ```
   *     .--*
   *     |
   * *-.-+--*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   * ```
   */
  it('givenMultipleEdgesInOneNSNodeCountsCrossings', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const middleLayer = creator.addNodesToLayer(3, creator.makeLayer());
    const rightLayer = creator.addNodesToLayer(2, creator.makeLayer());

    creator.setFixedOrderConstraint(middleLayer[2]!);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[1]!, leftNode, true);

    const normalNodePort = creator.addPortOnSide(rightLayer[1]!, PortSide.WEST);
    const dummyNodePort = creator.addPortOnSide(middleLayer[1]!, PortSide.EAST);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    const originPort = middleLayer[2]!.getPorts()[0]!;
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[0]!, rightLayer[0]!, false);

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    expect(counter.getLowerUpperCrossings()).toBe(0);
  });

  /**
   * ```
   * *---.--*
   *     |
   * *-.-+--*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   * ```
   */
  it('edgesInBothDirections', () => {
    const leftLayer = creator.addNodesToLayer(2, creator.makeLayer());
    const middleLayer = creator.addNodesToLayer(3, creator.makeLayer());
    const rightLayer = creator.addNodesToLayer(2, creator.makeLayer());

    creator.setFixedOrderConstraint(middleLayer[2]!);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[1]!, leftLayer[1]!, true);

    let normalNodePort = creator.addPortOnSide(rightLayer[1]!, PortSide.WEST);
    let dummyNodePort = creator.addPortOnSide(middleLayer[1]!, PortSide.EAST);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    let originPort = middleLayer[2]!.getPorts()[0]!;
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[0]!, leftLayer[0]!, true);

    normalNodePort = creator.addPortOnSide(rightLayer[0]!, PortSide.WEST);
    dummyNodePort = creator.addPortOnSide(middleLayer[0]!, PortSide.EAST);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    originPort = middleLayer[2]!.getPorts()[1]!;
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(1);
    // Note that the two other crossings which result from this switch are counted by a different crossings counter.
    expect(counter.getLowerUpperCrossings()).toBe(1);
  });

  /**
   * ```
   * *===.--*
   *     |
   * *-.====*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   * ```
   */
  it('multipleEdgesInBothDirectionsNSNode', () => {
    const leftLayer = creator.addNodesToLayer(2, creator.makeLayer());
    const middleLayer = creator.addNodesToLayer(3, creator.makeLayer());
    const rightLayer = creator.addNodesToLayer(2, creator.makeLayer());

    creator.setFixedOrderConstraint(middleLayer[2]!);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[1]!, leftLayer[1]!, true);

    let normalNodePort = creator.addPortOnSide(rightLayer[1]!, PortSide.WEST);
    let dummyNodePort = creator.addPortOnSide(middleLayer[1]!, PortSide.EAST);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    let originPort = middleLayer[2]!.getPorts()[0]!;
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);

    creator.addNorthSouthEdge(PortSide.NORTH, middleLayer[2]!, middleLayer[0]!, rightLayer[0]!, false);

    normalNodePort = creator.addPortOnSide(rightLayer[0]!, PortSide.EAST);
    dummyNodePort = creator.addPortOnSide(middleLayer[0]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    creator.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    originPort = middleLayer[2]!.getPorts()[1]!;
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);

    countCrossingsInLayerBetweenNodes(1, 0, 1);

    expect(counter.getUpperLowerCrossings()).toBe(2);
    // Note that the three other crossings which result from this switch are counted by a different crossings counter.
    expect(counter.getLowerUpperCrossings()).toBe(2);
  });
});
