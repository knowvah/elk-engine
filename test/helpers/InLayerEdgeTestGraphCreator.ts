// SPDX-License-Identifier: EPL-2.0
// Port of the in-layer-edge graph builders of ELK's crossing-minimization JUnit suites (mission 7c-tests, T3a). The Java
// class declares no constructor, so neither does this one: the base constructor makes the fresh graph and `MockRandom`.
// Every Java method keeps its name and order; no overload is merged here. A builder that reaches `setPortOrderFixed`
// (`getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder`) needs `LayoutMetaDataService.initElkReflect()`
// run first (e.g. in `beforeAll`), see `TestGraphCreator.ts`. Use one fresh creator per test.
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { TestGraphCreator } from './TestGraphCreator.js';

/**
 * Builds the in-layer-edge test graphs.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java
 */
export class InLayerEdgeTestGraphCreator extends TestGraphCreator {
  /**
   * <pre>
   * ____   _____
   * |  |---|   |
   * |  |---|   |
   * |  |   |   |
   * |  |  /|   |
   * |__|--+|___|
   *       |
   *       \
   *        *
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder
   */
  getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder(): LGraph {
    const layers = this.makeLayers(2);

    const leftNode = this.addNodeToLayer(layers[0]);
    const rightNodes = this.addNodesToLayer(2, layers[1]);

    this.setPortOrderFixed(rightNodes[0]);

    // since we expect bottom up ordering of western ports, the order of
    // adding edges is
    // important
    this.eastWestEdgeFromTo(leftNode, rightNodes[0]);
    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNode, rightNodes[0]);
    this.eastWestEdgeFromTo(leftNode, rightNodes[0]);
    return this.getGraph();
  }

  /**
   * <pre>
   *       ___
   *    ---| |
   *    |  | |  <- switch this
   * ---+--|_|
   * |  |
   * *--|--*  <- with this
   *    |
   *    ---*
   * .
   * </pre>
   *
   * With fixed Port PortOrder.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesWithFixedPortOrderAndNormalEdgeCrossings
   */
  getInLayerEdgesWithFixedPortOrderAndNormalEdgeCrossings(): LGraph {
    const layer = this.makeLayers(2);
    const leftNode = this.addNodeToLayer(layer[0]);
    const rightNodes = this.addNodesToLayer(3, layer[1]);
    this.setFixedOrderConstraint(rightNodes[0]);
    this.eastWestEdgeFromTo(leftNode, rightNodes[0]);
    this.addInLayerEdge(rightNodes[0], rightNodes[2], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNode, rightNodes[1]);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ____
   *    /|  |
   * *-+-|__|
   *   | ____
   * *-+-|  |
   *    \|__|
   * .
   * </pre>
   *
   * Port order not fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesCrossingsButNoFixedOrder
   */
  getInLayerEdgesCrossingsButNoFixedOrder(): LGraph {
    const layer = this.makeLayers(2);
    const leftNodes = this.addNodesToLayer(2, layer[0]);
    const rightNodes = this.addNodesToLayer(2, layer[1]);

    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[0]);
    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[1]);

    return this.getGraph();
  }

  /**
   * <pre>
   *      *
   *   //
   * *-++-*
   *   || ____
   * *-++-|  |
   *    \\|  |
   *      |__|
   *
   * .
   * </pre>
   *
   * Port order not fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLower
   */
  getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLower(): LGraph {
    const layer = this.makeLayers(2);
    const leftNodes = this.addNodesToLayer(2, layer[0]);
    const rightNodes = this.addNodesToLayer(3, layer[1]);

    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[1]);
    this.addInLayerEdge(rightNodes[0], rightNodes[2], PortSide.WEST);
    this.addInLayerEdge(rightNodes[0], rightNodes[2], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[2]);

    return this.getGraph();
  }

  /**
   * <pre>
   *      *
   *     /____
   *     \|  |
   *    //|  |
   * *-++-|  |
   *   || |__|
   *   ||
   * *-++-*
   *    \\
   *      *
   * .
   * </pre>
   *
   * Port order not fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLowerUpsideDown
   */
  getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLowerUpsideDown(): LGraph {
    const layer = this.makeLayers(2);
    const leftNodes = this.addNodesToLayer(2, layer[0]);
    const rightNodes = this.addNodesToLayer(4, layer[1]);

    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.addInLayerEdge(rightNodes[1], rightNodes[3], PortSide.WEST);
    this.addInLayerEdge(rightNodes[1], rightNodes[3], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[2]);

    return this.getGraph();
  }

  /**
   * <pre>
   *   --*--
   *   |   |
   * *-+-*-+-*
   *   |   |
   *   --*--
   * .
   * </pre>
   *
   * @returns getGraph() of the form above
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerCrossingsOnBothSides
   */
  getInLayerCrossingsOnBothSides(): LGraph {
    const layers = this.makeLayers(3);
    const leftNode = this.addNodeToLayer(layers[0]);
    const middleNodes = this.addNodesToLayer(3, layers[1]);
    const rightNode = this.addNodeToLayer(layers[2]);

    this.addInLayerEdge(middleNodes[0], middleNodes[2], PortSide.EAST);
    this.addInLayerEdge(middleNodes[0], middleNodes[2], PortSide.WEST);
    this.eastWestEdgeFromTo(middleNodes[1], rightNode);
    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    return this.getGraph();
  }

  /**
   * <pre>
   *
   *   --*
   *   | ____
   *   |/|  |
   *   /\|  |
   *   | |  |
   * *-+-|__|
   *   |
   *    \
   *     *
   * .
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesFixedPortOrderInLayerAndInBetweenLayerCrossing
   */
  getInLayerEdgesFixedPortOrderInLayerAndInBetweenLayerCrossing(): LGraph {
    const layers = this.makeLayers(2);
    const leftNode = this.addNodeToLayer(layers[0]);
    const rightNodes = this.addNodesToLayer(3, layers[1]);

    this.setFixedOrderConstraint(rightNodes[1]);

    this.eastWestEdgeFromTo(leftNode, rightNodes[1]);
    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.addInLayerEdge(rightNodes[1], rightNodes[2], PortSide.WEST);

    return this.getGraph();
  }

  /**
   * <pre>
   *
   *   --*
   *   | ____
   *   |/|  |
   *   /\|  |
   *   | |  |
   *   | |__|
   *   |
   *    \
   *     *
   * .
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesFixedPortOrderInLayerCrossing
   */
  getInLayerEdgesFixedPortOrderInLayerCrossing(): LGraph {
    const nodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(nodes[1]);

    this.addInLayerEdge(nodes[0], nodes[1], PortSide.WEST);
    this.addInLayerEdge(nodes[1], nodes[2], PortSide.WEST);

    return this.getGraph();
  }

  /**
   * <pre>
   *     ____
   *    /|  |
   *   / |  |
   * --+-|  |
   * | | |__|
   * | |
   * \  \
   *  \  *
   *   \
   *     *
   * .
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getFixedPortOrderTwoInLayerEdgesCrossEachOther
   */
  getFixedPortOrderTwoInLayerEdgesCrossEachOther(): LGraph {
    const nodes = this.addNodesToLayer(3, this.makeLayer(this.getGraph()));

    this.setFixedOrderConstraint(nodes[0]);

    this.addInLayerEdge(nodes[0], nodes[2], PortSide.WEST);
    this.addInLayerEdge(nodes[0], nodes[1], PortSide.WEST);

    return this.getGraph();
  }

  /**
   * <pre>
   *
   *   --*
   *   | ____
   *   |/|  |
   *   /\|  |
   *   | |  |
   * *-+-|__|
   *   |
   *    \
   *     *
   * .
   * </pre>
   *
   * Port order not fixed.
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesDownwardGraphNoFixedOrder
   */
  getInLayerEdgesDownwardGraphNoFixedOrder(): LGraph {
    const layers = this.makeLayers(2);
    const leftNode = this.addNodeToLayer(layers[0]);
    const rightNodes = this.addNodesToLayer(3, layers[1]);

    this.eastWestEdgeFromTo(leftNode, rightNodes[1]);
    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.addInLayerEdge(rightNodes[1], rightNodes[2], PortSide.WEST);

    return this.getGraph();
  }

  /**
   * <pre>
   *    --*
   *    |
   *    |/*
   *   /|
   * *+--*  <-In-layer and normal edge into port.
   *   \
   *    \
   *     \
   *      *
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerEdgesMultipleEdgesIntoSinglePort
   */
  getInLayerEdgesMultipleEdgesIntoSinglePort(): LGraph {
    const layerTwo = this.makeLayer(this.getGraph());
    const leftNode = this.addNodeToLayer(layerTwo);
    const layerOne = this.makeLayer(this.getGraph());
    const rightNodes = this.addNodesToLayer(4, layerOne);

    this.addInLayerEdge(rightNodes[1], rightNodes[3], PortSide.WEST);

    const leftPort = this.addPortOnSide(leftNode, PortSide.EAST);
    const rightTopPort = this.addPortOnSide(rightNodes[0], PortSide.WEST);
    const rightMiddlePort = this.addPortOnSide(rightNodes[2], PortSide.WEST);
    this.addEdgeBetweenPorts(leftPort, rightMiddlePort);
    this.addEdgeBetweenPorts(rightTopPort, rightMiddlePort);
    return this.getGraph();
  }

  /**
   * <pre>
   *   --*
   *   |
   *   |/*
   *  /|
   * | --*
   *  \
   *   \
   *    \
   *     *
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getOneLayerWithInLayerCrossings
   */
  getOneLayerWithInLayerCrossings(): LGraph {
    const layer = this.makeLayer(this.getGraph());
    const nodes = this.addNodesToLayer(4, layer);
    this.addInLayerEdge(nodes[0], nodes[2], PortSide.WEST);
    this.addInLayerEdge(nodes[1], nodes[3], PortSide.WEST);
    return this.getGraph();
  }

  /**
   * <pre>
   * |---*
   * |
   * | --*
   * | |
   * | --*
   *  \
   *   \
   *    \
   *     *
   * .
   * </pre>
   *
   * @returns Graph of the form above.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java#getInLayerOneLayerNoCrossings
   */
  getInLayerOneLayerNoCrossings(): LGraph {
    const layer = this.makeLayer(this.getGraph());
    const nodes = this.addNodesToLayer(4, layer);
    this.addInLayerEdge(nodes[0], nodes[3], PortSide.WEST);
    this.addInLayerEdge(nodes[1], nodes[2], PortSide.WEST);
    return this.getGraph();
  }
}
