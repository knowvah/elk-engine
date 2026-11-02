// SPDX-License-Identifier: EPL-2.0
// Port of the north/south-edge hand-built graph creator of ELK's crossing-minimization JUnit suites (mission
// 7c-tests, T3). One TS class per Java class, Java names and order, every member public (decision T3). The Java class
// declares no constructor, so none is declared here. The builders call `addNorthSouthEdge`, so a test that uses this
// creator must run `LayoutMetaDataService.initElkReflect()` first (e.g. in `beforeAll`), else cloning the list-valued
// `IN_LAYER_SUCCESSOR_CONSTRAINTS` default throws. Java-to-TypeScript deviations are the ones listed in
// `TestGraphCreator.ts`; the only ones used here are `makeLayer(g = this.graph)` and the `eastWestEdgeFromTo` /
// `setFixedOrderConstraint` overload signatures (a builder calls the `LNode` forms).
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { TestGraphCreator } from './TestGraphCreator.js';

/**
 * Creates getGraph()s for north south edge testing.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java
 */
export class NorthSouthEdgeTestGraphCreator extends TestGraphCreator {
  // CHECKSTYLEOFF MagicNumber
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
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthUpwardCrossingGraph
   */
  getNorthSouthUpwardCrossingGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[2], leftNodes[1], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[2], leftNodes[0], rightNodes[0], false);

    this.setFixedOrderConstraint(leftNodes[2]);
    return this.getGraph();
  }

  /**
   * <pre>
   *      ---*
   *      |
   *    --+--*
   *    | |
   *  --+-+--*
   * _|_|_|_
   * |_____|.
   * </pre>
   *
   *
   * @returns getGraph() of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthUpwardMultipleCrossingGraph
   */
  getNorthSouthUpwardMultipleCrossingGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[3], leftNodes[2], rightNodes[2], false);
    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[3], leftNodes[1], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[3], leftNodes[0], rightNodes[0], false);

    this.setFixedOrderConstraint(leftNodes[3]);
    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   * *---|____|
   *      |  |  ____
   *      *--+--|  |
   *         |  |  |
   *         *--|__|
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getThreeLayerNorthSouthCrossingGraph
   */
  getThreeLayerNorthSouthCrossingGraph(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);
    this.setFixedOrderConstraint(rightNode);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNode, false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], rightNode, false);

    this.eastWestEdgeFromTo(leftNode, middleNodes[0]);

    return this.getGraph();
  }

  /**
   * <pre>
   *      ______
   *  *   |____|
   *       |  |
   *       *--+--*
   *          |
   *          *--*
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getThreeLayerNorthSouthCrossingShouldSwitchGraph
   */
  getThreeLayerNorthSouthCrossingShouldSwitchGraph(): LGraph {
    this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    this.setAsNorthSouthNode(middleNodes[1]);
    this.setAsNorthSouthNode(middleNodes[2]);
    middleNodes[2].setProperty(InternalProperties.ORIGIN, middleNodes[0]);
    middleNodes[1].setProperty(InternalProperties.ORIGIN, middleNodes[0]);

    // ports are added in clockwise fashion, so add bottom port first.
    const leftBottomNodeRightPort = this.addPortOnSide(middleNodes[2], PortSide.EAST);
    const rightNodeBottomPort = this.addPortOnSide(rightNodes[1], PortSide.WEST);
    this.addEdgeBetweenPorts(leftBottomNodeRightPort, rightNodeBottomPort);
    const leftTopNodeRightPort = this.addPortOnSide(middleNodes[0], PortSide.SOUTH);
    leftBottomNodeRightPort.setProperty(InternalProperties.ORIGIN, leftTopNodeRightPort);

    const leftMiddleNodeRightPort = this.addPortOnSide(middleNodes[1], PortSide.EAST);
    const rightNodeTopPort = this.addPortOnSide(rightNodes[0], PortSide.WEST);
    this.addEdgeBetweenPorts(leftMiddleNodeRightPort, rightNodeTopPort);
    const leftTopNodeLeftPort = this.addPortOnSide(middleNodes[0], PortSide.SOUTH);
    leftMiddleNodeRightPort.setProperty(InternalProperties.ORIGIN, leftTopNodeLeftPort);

    return this.getGraph();
  }

  /**
   * <pre>
   *   *
   *   |
   * *-+*--*
   *   |
   *   *---*
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthernNorthSouthDummyEdgeCrossingGraph
   */
  getSouthernNorthSouthDummyEdgeCrossingGraph(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.setAsLongEdgeDummy(middleNodes[1]);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNodes[1], true);
    return this.getGraph();
  }

  /**
   * <pre>
   *  _____
   *  |___|
   *   ||
   * *-++---*
   *   ||
   *   |----*
   *   -----*
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthernNorthSouthDummyEdgeTwoCrossingGraph
   */
  getSouthernNorthSouthDummyEdgeTwoCrossingGraph(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.setAsLongEdgeDummy(middleNodes[1]);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNodes[1], true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[3], rightNodes[2], true);

    return this.getGraph();
  }

  /**
   * <pre>
   *  _____
   *  |___|
   *   ||
   * *-++---*
   *   -+---*
   * *--+---*
   *    |---*
   *
   * </pre>
   *
   * fixed PortOrder on top node.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthernTwoDummyEdgeAndNorthSouthCrossingGraph
   */
  getSouthernTwoDummyEdgeAndNorthSouthCrossingGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(5, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.setAsLongEdgeDummy(middleNodes[1]);

    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[3]);
    this.eastWestEdgeFromTo(middleNodes[3], rightNodes[2]);
    this.setAsLongEdgeDummy(middleNodes[3]);

    this.setFixedOrderConstraint(middleNodes[0]);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[4], rightNodes[3], true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNodes[1], true);

    return this.getGraph();
  }

  /**
   * <pre>
   *   *---*
   *   |
   * *-+*--*
   *   |
   *   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthernNorthSouthDummyEdgeCrossingGraph
   */
  getNorthernNorthSouthDummyEdgeCrossingGraph(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[1]);
    this.setAsLongEdgeDummy(middleNodes[1]);

    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[0], rightNodes[0], true);
    return this.getGraph();
  }

  /**
   * <pre>
   * *-----*-------*
   *    ______
   *    |     |
   *    |_____|
   *       |
   * .     *-------*
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthPortOnNormalNodeBelowLongEdgeDummy
   */
  getSouthPortOnNormalNodeBelowLongEdgeDummy(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[0], rightNodes[0]);
    middleNodes[0].setType(NodeType.LONG_EDGE);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[1], middleNodes[2], rightNodes[1], false);

    return this.getGraph();
  }

  /**
   * <pre>
   * .     *-------*
   *       |
   *    ___|___
   *    |     |
   *    |_____|
   *
   * *-----*-------*
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthPortOndNormalNodeAboveLongEdgeDummy
   */
  getNorthPortOndNormalNodeAboveLongEdgeDummy(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[2]);
    this.eastWestEdgeFromTo(middleNodes[2], rightNodes[1]);
    middleNodes[2].setType(NodeType.LONG_EDGE);

    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[1], middleNodes[0], rightNodes[0], false);

    return this.getGraph();
  }

  /**
   * <pre>
   *    ______
   *    |     |
   *    |_p_p_|
   *
   * *-----*-------*
   *
   * p is port. The node in the middle is a long edge dummy.
   * Fixed port order constraint on upper node.
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide
   */
  getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNode);
    this.setAsLongEdgeDummy(middleNodes[1]);

    this.addPortOnSide(middleNodes[0], PortSide.SOUTH);
    this.addPortOnSide(middleNodes[0], PortSide.SOUTH);
    return this.getGraph();
  }

  /**
   * <pre>
   * *-----*-------*
   *    __p_p__
   *    |     |
   *    |_____|
   *
   *
   * p is port. The node in the middle is a long edge dummy.
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getLongEdgeDummyAndNormalNodeWithUnusedPortsOnNorthernSide
   */
  getLongEdgeDummyAndNormalNodeWithUnusedPortsOnNorthernSide(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNode, middleNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[0], rightNode);
    middleNodes[0].setType(NodeType.LONG_EDGE);

    this.addPortOnSide(middleNodes[1], PortSide.NORTH);
    this.addPortOnSide(middleNodes[1], PortSide.NORTH);
    return this.getGraph();
  }

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
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getMultipleNorthSouthAndLongEdgeDummiesOnBothSides
   */
  getMultipleNorthSouthAndLongEdgeDummiesOnBothSides(): LGraph {
    const leftNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(7, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(6, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[2]);
    this.eastWestEdgeFromTo(middleNodes[2], rightNodes[2]);
    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[4]);
    this.eastWestEdgeFromTo(middleNodes[4], rightNodes[4]);

    this.setAsLongEdgeDummy(middleNodes[2]);
    this.setAsLongEdgeDummy(middleNodes[4]);

    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[3], middleNodes[0], rightNodes[0], false);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[3], middleNodes[1], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3], middleNodes[5], rightNodes[4], false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3], middleNodes[6], rightNodes[5], false);
    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |
   *      *--+--*
   *         |
   *         *--*
   * .
   * </pre>
   *
   * Port order fixed on top left node.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthDownwardCrossingGraph
   */
  getNorthSouthDownwardCrossingGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[2], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[1], rightNodes[0], false);

    this.setFixedOrderConstraint(leftNodes[0]);
    return this.getGraph();
  }

  /**
   * <pre>
   *     _______
   *     |_____|
   *      | | |
   *      *-+-+-*
   *        | |
   *        *-+-*
   *          |
   *          *-*
   * </pre>
   *
   * Port order fixed on top left node.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthDownwardMultipleCrossingGraph
   */
  getNorthSouthDownwardMultipleCrossingGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[3], rightNodes[2], false);
    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[2], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[1], rightNodes[0], false);

    this.setFixedOrderConstraint(leftNodes[0]);
    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |___
   *   ___|      *
   *  *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings
   */
  getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], rightNode, false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], leftNode, true);
    return this.getGraph();
  }

  /**
   * <pre>
   * *--
   *   | ---*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings
   */
  getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[2]);

    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[0], leftNode, true);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[1], rightNode, false);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ---*
   * *-- |
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossingsUpperEdgeEast
   */
  getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossingsUpperEdgeEast(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[2]);

    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[1], leftNode, true);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[0], rightNode, false);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |
   *   *--+--|
   *      |_____*
   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthEdgesFromEastAndWestAndCross
   */
  getNorthSouthEdgesFromEastAndWestAndCross(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], leftNode, true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNode, false);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |
   *      |  ---*
   *      |_____*
   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getSouthernNorthSouthEdgesBothToEast
   */
  getSouthernNorthSouthEdgesBothToEast(): LGraph {
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], rightNodes[0], false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], rightNodes[1], false);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |
   *   *--+--|
   *   *--|
   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthSouthernTwoWesternEdges
   */
  getNorthSouthSouthernTwoWesternEdges(): LGraph {
    const leftNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], leftNodes[0], true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], leftNodes[1], true);

    return this.getGraph();
  }

  /**
   * <pre>
   *     _______
   *     |_____|
   *      | | |
   *   *--+-+--
   *   *--+-|
   *   *--|
   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthSouthernThreeWesternEdges
   */
  getNorthSouthSouthernThreeWesternEdges(): LGraph {
    const leftNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], leftNodes[0], true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], leftNodes[1], true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[3], leftNodes[2], true);

    return this.getGraph();
  }

  /**
   * <pre>
   *
   * *---|
   *     |
   * *-- |
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthNorthernWesternEdges
   */
  getNorthSouthNorthernWesternEdges(): LGraph {
    const leftNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[2]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[1], leftNodes[1], true);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[0], leftNodes[0], true);

    return this.getGraph();
  }

  /**
   * <pre>
   *
   * *----
   *     |
   *   --+--*
   *   | |
   *  _|_|_
   *  |   |
   *  |___|
   *  .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthNorthernEasternPortToWestWesternPortToEast
   */
  getNorthSouthNorthernEasternPortToWestWesternPortToEast(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[2]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[1], rightNode, false);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[2], middleNodes[0], leftNode, true);

    return this.getGraph();
  }

  /**
   * <pre>
   *       ---*
   * *---- |
   *     | |
   *   --+-+--*
   *  _|_|_|__
   *  |      |
   *  |______|
   *    | | |
   *    | --+-*
   *    ----+-*
   *        |-*
   *  .
   * </pre>
   *
   * Port order fixed on middle node.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthAllSidesMultipleCrossings
   */
  getNorthSouthAllSidesMultipleCrossings(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(7, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(5, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[3]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[3], middleNodes[1], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[3], middleNodes[2], leftNode, true);
    this.addNorthSouthEdge(PortSide.NORTH, middleNodes[3], middleNodes[0], rightNodes[0], false);

    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3], middleNodes[6], rightNodes[4], false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3], middleNodes[4], rightNodes[2], false);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[3], middleNodes[5], rightNodes[3], false);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ______
   *     |____|
   *      |  |
   *      |--+--*
   *         |
   *   *-----|
   *
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getNorthSouthSouthernWesternPortToEastAndEasternPortToWest
   */
  getNorthSouthSouthernWesternPortToEastAndEasternPortToWest(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(middleNodes[0]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[2], leftNode, true);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[0], middleNodes[1], rightNode, false);

    return this.getGraph();
  }

  /**
   * <pre>
   *  ______
   *  |____|
   *    |   *
   *    *-\/
   *   *--/\
   *  _|___ *
   *  |   |
   *  |___|
   *  .
   * </pre>
   *
   * .
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getGraphWhereLayoutUnitPreventsSwitch
   */
  getGraphWhereLayoutUnitPreventsSwitch(): LGraph {
    const leftNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(2, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(leftNodes[0]);
    this.setFixedOrderConstraint(leftNodes[3]);

    // ports are added in clockwise fashion!
    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[0], leftNodes[1], rightNodes[1], false);
    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[3], leftNodes[2], rightNodes[0], false);
    return this.getGraph();
  }

  /**
   * <pre>
   *   *------*
   *   |
   *   |     -*
   *  _|__  /
   *  |__|-+--*
   *      /
   *    *-
   * </pre>
   *
   * Lower north/south port dummy and normal node can't be switched.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithNorthernEdges
   */
  getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithNorthernEdges(): LGraph {
    const leftNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.addNorthSouthEdge(PortSide.NORTH, leftNodes[1], leftNodes[0], rightNodes[0], false);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[2]);
    this.eastWestEdgeFromTo(leftNodes[2], rightNodes[1]);

    return this.getGraph();
  }

  /**
   * <pre>
   *    *-
   *  ____\
   *  |__|-+--*
   *    |   \
   *    |    -*
   *    *-----*
   * </pre>
   *
   * Lower north/south port dummy and normal node can't be switched.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithSouthernEdges
   */
  getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithSouthernEdges(): LGraph {
    const leftNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[0]);
    this.addNorthSouthEdge(PortSide.SOUTH, leftNodes[1], leftNodes[2], rightNodes[2], false);

    return this.getGraph();
  }

  /**
   * <pre>
   * *--*-   <- is long edge dummy
   *  ____\
   *  |__|=+==*
   *    |   \
   *    |     *
   *    *-----*
   * </pre>
   *
   * Lower north/south port dummy and normal node can't be switched.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java#getGraphLayoutUnitDoesNotPreventSwitchWithLongEdgeDummy
   */
  getGraphLayoutUnitDoesNotPreventSwitchWithLongEdgeDummy(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.getGraph()));
    const middleNodes = this.addNodesToLayer(4, this.makeLayer(this.getGraph()));
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.setAsLongEdgeDummy(middleNodes[0]);
    this.eastWestEdgeFromTo(leftNode, middleNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.addNorthSouthEdge(PortSide.SOUTH, middleNodes[1], middleNodes[2], rightNodes[2], false);

    return this.getGraph();
  }
}
