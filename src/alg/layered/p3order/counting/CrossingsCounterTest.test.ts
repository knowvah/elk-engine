// SPDX-License-Identifier: EPL-2.0
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InLayerEdgeTestGraphCreator } from '../../../../../test/helpers/InLayerEdgeTestGraphCreator.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { Random } from '../../../../java/util/Random.js';
import type { LNode } from '../../graph/LNode.js';
import { GraphInfoHolder } from '../GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingsCounter } from './CrossingsCounter.js';

/**
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/counting/CrossingsCounterTest.java
 */
describe('CrossingsCounterTest', () => {
  let creator: InLayerEdgeTestGraphCreator;
  let counter: CrossingsCounter;

  // The Java has no PlainJavaInitialization; the builders need the property defaults cloned (TestGraphCreator header).
  beforeAll(() => {
    LayoutMetaDataService.initElkReflect();
  });

  // Java: the test class extends InLayerEdgeTestGraphCreator, so JUnit builds a fresh creator per test.
  beforeEach(() => {
    creator = new InLayerEdgeTestGraphCreator();
  });

  function order(): LNode[][] {
    return creator.getGraph().toNodeArray();
  }

  function getNumPorts(currentOrder: LNode[][]): number {
    let numPorts = 0;
    for (const lNodes of currentOrder) {
      for (const node of lNodes) {
        numPorts += node.getPorts().length;
      }
    }
    return numPorts;
  }

  /**
   * <pre>
   * ___  ___
   * | |\/| |
   * |_|/\|_|
   * </pre>
   */
  it('countCrossingsBetweenLayers_fixedPortOrderCrossingOnTwoNodes', () => {
    const left = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const right = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(left, right);
    creator.eastWestEdgeFromTo(left, right);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(1);
  });

  /**
   * <pre>
   * *
   *  \
   *  /
   * *
   *  \
   * *+--
   *  | |
   * * /
   * *
   * </pre>
   */
  it('longInLayerCrossings', () => {
    const nodes = creator.addNodesToLayer(5, creator.makeLayer());
    creator.addInLayerEdge(nodes[0]!, nodes[1]!, PortSide.EAST);
    creator.addInLayerEdge(nodes[1]!, nodes[3]!, PortSide.EAST);
    creator.addInLayerEdge(nodes[2]!, nodes[4]!, PortSide.EAST);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countInLayerCrossingsOnSide(order()[0]!, PortSide.EAST)).toBe(1);
  });

  it('countCrossingsBetweenLayers_crossFormed', () => {
    creator.getCrossFormedGraph();

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(1);
  });

  /**
   * Constructs a cross formed graph with two edges between the corners
   *
   * <pre>
   * *    *
   *  \\//
   *  //\\
   * *    *
   * .
   * </pre>
   */
  it('countCrossingsBetweenLayers_crossFormedMultipleEdgesBetweenSameNodes', () => {
    const leftLayer = creator.makeLayer(creator.graph);
    const rightLayer = creator.makeLayer(creator.graph);

    const topLeft = creator.addNodeToLayer(leftLayer);
    const bottomLeft = creator.addNodeToLayer(leftLayer);
    const topRight = creator.addNodeToLayer(rightLayer);
    const bottomRight = creator.addNodeToLayer(rightLayer);

    const topLeftTopPort = creator.addPortOnSide(topLeft, PortSide.EAST);
    const topLeftBottomPort = creator.addPortOnSide(topLeft, PortSide.EAST);
    const bottomRightBottomPort = creator.addPortOnSide(bottomRight, PortSide.WEST);
    const bottomRightTopPort = creator.addPortOnSide(bottomRight, PortSide.WEST);
    creator.addEdgeBetweenPorts(topLeftTopPort, bottomRightTopPort);
    creator.addEdgeBetweenPorts(topLeftBottomPort, bottomRightBottomPort);

    const bottomLeftTopPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    const bottomLeftBottomPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    const topRightBottomPort = creator.addPortOnSide(topRight, PortSide.WEST);
    const topRightTopPort = creator.addPortOnSide(topRight, PortSide.WEST);
    creator.addEdgeBetweenPorts(bottomLeftTopPort, topRightTopPort);
    creator.addEdgeBetweenPorts(bottomLeftBottomPort, topRightBottomPort);

    // Java passes `null` for the top-level graph; the TS constructor takes the (empty) list of all graphs.
    const gd = new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []);
    gd.portDistributor().distributePortsWhileSweeping(order(), 1, true);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(4);
  });

  it('countCrossingsBetweenLayers_crossWithExtraEdgeInBetween', () => {
    creator.getCrossWithExtraEdgeInBetweenGraph();

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(3);
  });

  it('countCrossingsBetweenLayers_ignoreSelfLoops', () => {
    creator.getCrossWithManySelfLoopsGraph();

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(1);
  });

  it('countCrossingsBetweenLayers_moreComplexThreeLayerGraph', () => {
    creator.getMoreComplexThreeLayerGraph();
    const gd = new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []);
    gd.portDistributor().distributePortsWhileSweeping(order(), 1, true);
    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(1);
  });

  it('countCrossingsBetweenLayers_fixedPortOrder', () => {
    creator.getFixedPortOrderGraph();

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(1);
  });

  /**
   * <pre>
   * *   *<- Into same port
   *  \//
   *  //\
   * *   *
   * </pre>
   */
  it('countCrossingsBetweenLayers_intoSamePort', () => {
    const leftLayer = creator.makeLayer(creator.graph);
    const rightLayer = creator.makeLayer(creator.graph);

    const topLeft = creator.addNodeToLayer(leftLayer);
    const bottomLeft = creator.addNodeToLayer(leftLayer);
    const topRight = creator.addNodeToLayer(rightLayer);
    const bottomRight = creator.addNodeToLayer(rightLayer);

    creator.eastWestEdgeFromTo(topLeft, bottomRight);
    const bottomLeftFirstPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    const bottomLeftSecondPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    const topRightFirstPort = creator.addPortOnSide(topRight, PortSide.WEST);

    creator.addEdgeBetweenPorts(bottomLeftFirstPort, topRightFirstPort);
    creator.addEdgeBetweenPorts(bottomLeftSecondPort, topRightFirstPort);
    creator.setUpIds();
    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));

    expect(counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!)).toBe(2);
  });

  /**
   * <pre>
   * *   /*
   * |  /
   * \ /____
   *  x/|  |
   * |/\|  |
   * *  |__|
   * </pre>
   */
  it('countCrossingsBetweenPorts_givenWesternCrossings_OnlyCountsForGivenPorts', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNodes[0]!);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    counter.initForCountingBetween(leftNodes, rightNodes);
    expect(
      counter
        .countCrossingsBetweenPortsInBothOrders(rightNodes[1]!.getPorts()[1]!, rightNodes[1]!.getPorts()[0]!)
        .getFirst(),
    ).toBe(1);
  });

  /**
   * <pre>
   * ___
   * | |\/*
   * |_|/\*
   * </pre>
   */
  it('countCrossingsBetweenPorts_GivenCrossingsOnEasternSide_', () => {
    const leftNodes = creator.addNodesToLayer(1, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    counter.initForCountingBetween(leftNodes, rightNodes);
    expect(
      counter
        .countCrossingsBetweenPortsInBothOrders(leftNodes[0]!.getPorts()[0]!, leftNodes[0]!.getPorts()[1]!)
        .getFirst(),
    ).toBe(1);
  });

  /**
   * <pre>
   * *---         *---
   * ___ \       ___  \
   * | |\/* and: | |--*
   * | |/\*      | |--*
   * |_|         |_|
   * </pre>
   */
  it('countingTwoDifferentGraphs_DoesNotInterfereWithEachOther', () => {
    const leftNodes = creator.addNodesToLayer(3, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer());
    const leftNode = leftNodes[1]!;
    const leftPorts = creator.addPortsOnSide(2, leftNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftPorts[1]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    counter.initForCountingBetween(leftNodes, rightNodes);
    expect(
      counter.countCrossingsBetweenPortsInBothOrders(leftNode.getPorts()[0]!, leftNode.getPorts()[1]!).getFirst(),
    ).toBe(1);

    counter.switchPorts(leftPorts[0]!, leftPorts[1]!);
    leftNode.getPorts()[0] = leftPorts[1]!;
    leftNode.getPorts()[1] = leftPorts[0]!;
    expect(
      counter.countCrossingsBetweenPortsInBothOrders(leftNode.getPorts()[0]!, leftNode.getPorts()[1]!).getFirst(),
    ).toBe(0);
  });

  /**
   * <pre>
   * *   *
   *  \//
   *  //\
   * *   *
   * ^Into same port
   * </pre>
   */
  it('countCrossingsBetweenPorts_twoEdgesIntoSamePort', () => {
    const leftLayer = creator.makeLayer();
    const rightLayer = creator.makeLayer();

    const topLeft = creator.addNodeToLayer(leftLayer);
    const bottomLeft = creator.addNodeToLayer(leftLayer);
    const topRight = creator.addNodeToLayer(rightLayer);
    const bottomRight = creator.addNodeToLayer(rightLayer);

    creator.eastWestEdgeFromTo(topLeft, bottomRight);
    const bottomLeftPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    const topRightPort = creator.addPortOnSide(topRight, PortSide.WEST);

    creator.addEdgeBetweenPorts(bottomLeftPort, topRightPort);
    creator.addEdgeBetweenPorts(bottomLeftPort, topRightPort);
    creator.setUpIds();

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    counter.initForCountingBetween(order()[0]!, order()[1]!);

    expect(counter.countCrossingsBetweenPortsInBothOrders(bottomLeftPort, topLeft.getPorts()[0]!).getFirst()).toBe(2);
  });

  // Java: `@Ignore // @Test` (timing only, no assertion); `new Date().getTime()` is `Date.now()`.
  it.skip('benchmark', () => {
    makeTwoLayerRandomGraphWithNodesPerLayer(6000, 6);

    counter = new CrossingsCounter(new Int32Array(getNumPorts(order())));
    console.log('Starting');
    const length = 400;
    const times: number[] = new Array<number>(length).fill(0);
    for (let i = 0; i < length; i++) {
      const tick = Date.now();
      counter.countCrossingsBetweenLayers(order()[0]!, order()[1]!);
      times[i] = Date.now() - tick;
    }
    console.log(Math.min(...times));
  });

  function makeTwoLayerRandomGraphWithNodesPerLayer(numNodes: number, edgesPerNode: number): void {
    const leftNodes = creator.addNodesToLayer(numNodes, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(numNodes, creator.makeLayer());
    const random = new Random(0);
    for (let i = 0; i < edgesPerNode * numNodes; i++) {
      if (random.nextBoolean()) {
        const left = leftNodes[random.nextInt(numNodes)]!;
        const right = rightNodes[random.nextInt(numNodes)]!;
        creator.eastWestEdgeFromTo(left, right);
      } else {
        creator.addInLayerEdge(
          leftNodes[random.nextInt(numNodes)]!,
          leftNodes[random.nextInt(numNodes)]!,
          PortSide.EAST,
        );
      }
    }
    for (const node of rightNodes) {
      node.cachePortSides();
    }
    for (const node of leftNodes) {
      node.cachePortSides();
    }
  }
});
