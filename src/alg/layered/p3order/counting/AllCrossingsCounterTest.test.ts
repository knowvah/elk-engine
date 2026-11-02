// SPDX-License-Identifier: EPL-2.0
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InLayerEdgeTestGraphCreator } from '../../../../../test/helpers/InLayerEdgeTestGraphCreator.js';
import { NorthSouthEdgeTestGraphCreator } from '../../../../../test/helpers/NorthSouthEdgeTestGraphCreator.js';
import { TestGraphCreator } from '../../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import { LayeredMetaDataProvider } from '../../options/LayeredMetaDataProvider.js';
import { GraphInfoHolder } from '../GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../LayerSweepCrossingMinimizerCrossMinType.js';

/**
 * Test for extracted and modified AllCrossingsCounter.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/counting/AllCrossingsCounterTest.java
 */
describe('AllCrossingsCounterTest', () => {
  let creator: TestGraphCreator;

  // Java: `@Before initPlainJavaLayout()` runs `PlainJavaInitialization.initializePlainJavaLayout()`; here the explicit
  // layered registration, plus `initElkReflect()` for the list- and set-valued defaults the creators clone.
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
    LayoutMetaDataService.initElkReflect();
  });

  // Java: the test class extends TestGraphCreator, so JUnit builds a fresh creator per test.
  beforeEach(() => {
    creator = new TestGraphCreator();
  });

  /** Java `allCrossings()`; the `null` of `new GraphInfoHolder(graph, BARYCENTER, null)` is `[]` (top-level graph). */
  function allCrossings(): number {
    const nodeArray = creator.graph.toNodeArray();
    let portId = 0;
    for (const lNodes of nodeArray) {
      for (const lNode of lNodes) {
        for (const port of lNode.getPorts()) {
          port.id = portId;
          portId++;
        }
      }
    }
    const gd = new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []);
    return gd.crossCounter().countAllCrossings(nodeArray);
  }

  /** Java `switchNodesInLayer(upperNodeIndex, lowerNodeIndex, layerIndex)`. */
  function switchNodesInLayer(upperNodeIndex: number, lowerNodeIndex: number, layerIndex: number): LNode[][] {
    const layer = creator.graph.getLayers()[layerIndex]!;
    const nodes = layer.getNodes();
    const upperNode = nodes[upperNodeIndex]!;
    // counter.notifyOfSwitch(upperNode, nodes.get(lowerNodeIndex),
    // layerIndex);

    nodes[upperNodeIndex] = nodes[lowerNodeIndex]!;
    nodes[lowerNodeIndex] = upperNode;
    return creator.getCurrentOrder(creator.graph);
  }

  it('countOneCrossing', () => {
    creator.graph = creator.getCrossFormedGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('countInLayerCrossing', () => {
    creator.graph = creator.getInLayerEdgesGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('countInLayerCrossingAndSwitch', () => {
    creator.graph = creator.getInLayerEdgesGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('countNorthSouthCrossing', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getNorthSouthDownwardCrossingGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('countNorthernNorthSouthCrossing', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getNorthSouthUpwardCrossingGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('northSouthDummyEdgeCrossing', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getSouthernNorthSouthDummyEdgeCrossingGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('switchAndCountTwice', () => {
    creator.graph = creator.getCrossFormedGraph();
    let amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
    switchNodesInLayer(0, 1, 1);
    amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(0);
  });

  it('tooManyInLayerCrossingsWithTheOldMethod', () => {
    creator.graph = new InLayerEdgeTestGraphCreator().getInLayerOneLayerNoCrossings();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(0);
  });

  /**
   * <pre>
   * *    *
   *  \\//
   *  //\\
   * *    *
   * </pre>
   */
  it('countCrossingsWithMultipleEdgesBetweenSameNodes', () => {
    const left = creator.addNodesToLayer(2, creator.makeLayer());
    const right = creator.addNodesToLayer(2, creator.makeLayer());

    const rightLowerPorts = creator.addPortsOnSide(2, right[1]!, PortSide.WEST);
    creator.eastWestEdgeFromTo(left[0]!, rightLowerPorts[1]!);
    creator.eastWestEdgeFromTo(left[0]!, rightLowerPorts[0]!);
    const rightUpperPorts = creator.addPortsOnSide(2, right[0]!, PortSide.WEST);
    creator.eastWestEdgeFromTo(left[1]!, rightUpperPorts[1]!);
    creator.eastWestEdgeFromTo(left[1]!, rightUpperPorts[0]!);

    expect(allCrossings()).toBe(4);
  });

  it('countCrossingsInEmptyGraph', () => {
    creator.graph = creator.getEmptyGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(0);
  });

  it('oneNodeIsLongEdgeDummy', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getSouthernNorthSouthDummyEdgeCrossingGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  it('oneNodeIsLongEdgeDummyNorthern', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getNorthernNorthSouthDummyEdgeCrossingGraph();
    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });

  /**
   * <pre>
   *   ----*
   *   |---*
   *   ||
   * *-++--*
   *   ||
   *  ----
   *  |__|
   *   ||
   * *-++--*
   *   ||--*
   *   |---*
   * </pre>
   */
  it('multipleNorthSouthAndLongEdgeDummiesOnBothSides', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const middleNodes = creator.addNodesToLayer(7, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(6, creator.makeLayer());

    creator.eastWestEdgeFromTo(leftNodes[0]!, middleNodes[2]!);
    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[2]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, middleNodes[4]!);
    creator.eastWestEdgeFromTo(middleNodes[4]!, rightNodes[3]!);

    creator.setAsLongEdgeDummy(middleNodes[2]!);
    creator.setAsLongEdgeDummy(middleNodes[4]!);

    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[3]!, middleNodes[0]!, rightNodes[0]!, false);
    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[3]!, middleNodes[1]!, rightNodes[1]!, false);
    creator.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3]!, middleNodes[5]!, rightNodes[4]!, false);
    creator.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3]!, middleNodes[6]!, rightNodes[5]!, false);

    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(4);
  });

  /**
   * <pre>
   *   --*
   *   | ____
   *   |/|  |
   *   /\|  |
   *   | |  |
   *   | |__|
   *   |
   *    \
   *     *
   * </pre>
   */
  it('inLayerCrossingsOnFarLeft', () => {
    const nodes = creator.addNodesToLayer(3, creator.makeLayer(creator.graph));

    creator.setFixedOrderConstraint(nodes[1]!);

    creator.addInLayerEdge(nodes[0]!, nodes[1]!, PortSide.WEST);
    creator.addInLayerEdge(nodes[1]!, nodes[2]!, PortSide.WEST);

    const amountOfCrossings = allCrossings();
    expect(amountOfCrossings).toBe(1);
  });
});
