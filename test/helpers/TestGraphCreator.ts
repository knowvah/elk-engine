// SPDX-License-Identifier: EPL-2.0
// Port of the hand-built graph creator of ELK's crossing-minimization JUnit suites (mission 7c-tests, T3). One TS
// class per Java class, Java names, every member public so that `InLayerEdgeTestGraphCreator` and
// `NorthSouthEdgeTestGraphCreator` can extend it (Java `protected`/`private` become public; decision T3). Use one
// fresh creator per test. A test that reads a list- or set-valued default (`IN_LAYER_SUCCESSOR_CONSTRAINTS`,
// `GRAPH_PROPERTIES`) through this creator (`addNorthSouthEdge`, `setPortOrderFixed`, `addExternalPortDummyNodeToLayer`)
// must run `LayoutMetaDataService.initElkReflect()` first (e.g. in `beforeAll`), else cloning the default throws.
//
// Java-to-TypeScript deviations, all forced by the language:
//
//   Java overload                                              TypeScript
//   makeLayer() / makeLayer(LGraph g)                          makeLayer(g = this.graph)
//   makeLayers(int) / makeLayers(int, LGraph g)                makeLayers(amount, g = this.graph)
//   setFixedOrderConstraint(LNode) -> MapPropertyHolder        setFixedOrderConstraint(node) -> MapPropertyHolder
//   setFixedOrderConstraint(LNode[]) -> void                   setFixedOrderConstraint(nodes) -> void (TS overload
//                                                              signatures, dispatch on Array.isArray)
//   addInLayerEdge(LNode, LNode, PortSide)                     addInLayerEdge(node, node, side)  (TS overload
//   addInLayerEdge(LNode, LPort, PortSide)                     addInLayerEdge(node, port, side)   signatures,
//   addInLayerEdge(LPort, LNode)                               addInLayerEdge(port, node)         dispatch on LPort)
//   eastWestEdgeFromTo(LNode, LNode)                           eastWestEdgeFromTo(node, node)    (TS overload
//   eastWestEdgeFromTo(LPort, LNode)                           eastWestEdgeFromTo(port, node)     signatures,
//   eastWestEdgeFromTo(LNode, LPort)                           eastWestEdgeFromTo(node, port)     dispatch on LPort)
//
// The merged overloads sit together at the position of the first Java overload; the later Java overloads
// (`setFixedOrderConstraint(LNode[])`, `addInLayerEdge` x2, `eastWestEdgeFromTo` x2) have no separate member.
//
//   Java field/member                                          TypeScript
//   MockRandom.nextBoolean (field, same name as the method)    MockRandom.nextBooleanValue
//   varargs `int... is` / `int... indices`                     rest parameter `...is` / `...indices`
//   `List.get(i)` out of range (IndexOutOfBoundsException)     `IndexOutOfBoundsException`, same condition
//   NullPointerException on `getLayer()`/`getGraph()` == null  `TypeError` (D10)
//   `Lists.newLinkedList()` used as Deque (add, pop)           array (push, shift)
//   `Lists.newArrayList(...)`, `Iterables.concat(graph)`       array literal, nested iteration over layers and nodes
//
// The id counters (`portId`, `nodeId`, `edgeId`) are small Java ints; none can reach 2^31 in a test.
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { GraphProperties } from '../../src/alg/layered/options/GraphProperties.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import type { MapPropertyHolder } from '../../src/graph/properties/MapPropertyHolder.js';
import { IndexOutOfBoundsException } from '../../src/java/lang/IndexOutOfBoundsException.js';
import { Random } from '../../src/java/util/Random.js';

/** Java `List.get(index)`: an index outside the list throws instead of yielding `undefined`. */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${index} out of bounds for length ${list.length}`);
  }
  return list[index] as T;
}

/** Java dereference of a possibly-null reference: `null` is a `NullPointerException` (D10: `TypeError`). */
function nonNull<T>(value: T | null, what: string): T {
  if (value === null) {
    throw new TypeError(`${what} is null`);
  }
  return value;
}

/**
 * Use to create test graphs. CAUTION: Layout algorithm assumes the ports to be ordered in a clockwise manner. You must
 * think about this yourself when constructing a test graph. This means that the methods for creating edges cannot be
 * used in every case.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java
 */
export class TestGraphCreator {
  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#portId */
  portId = 0;
  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#nodeId */
  nodeId = 0;
  /** the graph. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#graph */
  graph: LGraph;
  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#edgeId */
  edgeId = 0;
  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#random */
  random: MockRandom;

  /**
   * Makes a fancy test graph creator.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#TestGraphCreator
   */
  constructor() {
    this.graph = new LGraph();
    this.random = new MockRandom();
    this.setUpGraph(this.graph);
  }

  /**
   * @returns the graph
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getGraph
   */
  getGraph(): LGraph {
    this.setUpGraph(this.graph);
    return this.graph;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setUpGraph */
  setUpGraph(g: LGraph): LGraph {
    this.setUpIds();
    g.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
    g.setProperty(InternalProperties.RANDOM, this.random);
    g.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    return g;
  }

  /**
   * Creates empty graph.
   *
   * @returns return empty graph.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getEmptyGraph
   */
  getEmptyGraph(): LGraph {
    this.graph = new LGraph();
    this.setUpGraph(this.graph);
    return this.graph;
  }

  /**
   * Creates two nodes with no connection between them.
   *
   * @returns graph with two nodes with no connection between them.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getTwoNodesNoConnectionGraph
   */
  getTwoNodesNoConnectionGraph(): LGraph {
    const layer = this.makeLayer(this.graph);
    this.addNodeToLayer(layer);
    this.addNodeToLayer(layer);
    this.setUpIds();
    return this.graph;
  }

  /**
   * Set layer id globally, node id per layer and port id globally.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setUpIds
   */
  setUpIds(): void {
    // Java: `Deque<LGraph> graphs = Lists.newLinkedList()`; `add` appends, `pop` removes the head. The `for` form is
    // `while (!graphs.isEmpty()) { g = graphs.pop(); ... }`: `shift` yields `undefined` exactly when the deque is empty.
    const graphs: LGraph[] = [this.graph];
    for (let g = graphs.shift(); g !== undefined; g = graphs.shift()) {
      let lId = 0;
      let pId = 0;
      for (const l of g) {
        l.id = lId++;
        let i = 0;
        for (const n of l) {
          const nestedGraph = n.getNestedGraph();
          if (nestedGraph !== null) {
            graphs.push(nestedGraph);
          }
          n.id = i++;
          for (const p of n.getPorts()) {
            p.id = pId++;
          }
        }
      }
    }
  }

  /**
   * <pre>
   * *  *
   *  \/
   *  /\
   * *  *
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCrossFormedGraph
   */
  getCrossFormedGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(bottomLeft, topRight);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *
   *  \\
   *   \\
   * *---*
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#multipleEdgesAndSingleEdge
   */
  multipleEdgesAndSingleEdge(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(bottomLeft, bottomRight);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *  *  <- this node must be ...
   *  \/
   *  /\
   * *  *  <- before this node.
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCrossFormedGraphWithConstraintsInSecondLayer
   */
  getCrossFormedGraphWithConstraintsInSecondLayer(): LGraph {
    this.getCrossFormedGraph();
    const layerOne = listGet(this.graph.getLayers(), 1);
    const topNode = listGet(layerOne.getNodes(), 0);
    const secondNode = listGet(layerOne.getNodes(), 1);
    this.setInLayerOrderConstraint(topNode, secondNode);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * this node must be.. -> *  *  <- and this node must be ...
   *                         \/
   *                         /\
   *    before this node -> *  *  <- before this node.
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCrossFormedGraphConstraintsPreventAnySwitch
   */
  getCrossFormedGraphConstraintsPreventAnySwitch(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(bottomLeft, topRight);
    this.setInLayerOrderConstraint(topRight, bottomRight);
    this.setInLayerOrderConstraint(topLeft, bottomLeft);
    this.setUpIds();
    return this.graph;
  }

  /**
   * Creates graph with only one node.
   *
   * @returns graph with only one node.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getOneNodeGraph
   */
  getOneNodeGraph(): LGraph {
    const layer = this.makeLayer(this.graph);
    this.addNodeToLayer(layer);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *   --*
   *   |
   * *-+-*-*
   *   |
   *   --*
   * </pre>
   *
   * @returns graph of the form above
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getInLayerEdgesGraph
   */
  getInLayerEdgesGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const middleLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNode = this.addNodeToLayer(leftLayer);
    const middleNodes = this.addNodesToLayer(3, middleLayer);
    const rightNode = this.addNodeToLayer(rightLayer);

    // add east side ports first to get expected port ordering
    this.eastWestEdgeFromTo(middleNodes[1], rightNode);
    this.eastWestEdgeFromTo(leftNode, middleNodes[1]);
    this.addInLayerEdge(middleNodes[0], middleNodes[2], PortSide.WEST);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *   --*
   *   |
   *   --*
   *
   *  *--*
   * </pre>
   *
   * @returns graph of the form above
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getInLayerEdgesGraphWhichResultsInCrossingsWhenSwitched
   */
  getInLayerEdgesGraphWhichResultsInCrossingsWhenSwitched(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNode = this.addNodeToLayer(leftLayer);
    const rightNodes = this.addNodesToLayer(3, rightLayer);

    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNode, rightNodes[2]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * Constructs a cross formed graph with two edges between the corners
   *
   * <pre>
   * *    *
   *  \\//
   *  //\\
   * *    *
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getMultipleEdgesBetweenSameNodesGraph
   */
  getMultipleEdgesBetweenSameNodesGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(topLeft, bottomRight);
    this.eastWestEdgeFromTo(bottomLeft, topRight);
    this.eastWestEdgeFromTo(bottomLeft, topRight);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *   *
   *  \ /
   * *-+-*
   *  / \
   * *   *
   * </pre>
   *
   * @returns graph of the form above
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCrossWithExtraEdgeInBetweenGraph
   */
  getCrossWithExtraEdgeInBetweenGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNodes = this.addNodesToLayer(3, leftLayer);
    const rightNodes = this.addNodesToLayer(3, rightLayer);

    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[2]);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[2], rightNodes[0]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * Cross formed graph, but each node has three extra self loop edges.
   *
   * <pre>
   * *  *
   *  \/
   *  /\
   * *  *
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCrossWithManySelfLoopsGraph
   */
  getCrossWithManySelfLoopsGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    const topLeftPort = this.addPortOnSide(topLeft, PortSide.EAST);
    const bottomLeftPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    this.setUpIds();
    const selfLoopCrossGraph = this.graph;
    for (const layer of selfLoopCrossGraph) {
      for (const node of layer) {
        this.selfLoopOn(node, PortSide.EAST);
        this.selfLoopOn(node, PortSide.EAST);
        this.selfLoopOn(node, PortSide.EAST);
        this.selfLoopOn(node, PortSide.WEST);
        this.selfLoopOn(node, PortSide.WEST);
        this.selfLoopOn(node, PortSide.WEST);
      }
    }
    const topRightPort = this.addPortOnSide(topRight, PortSide.WEST);
    const bottomRightPort = this.addPortOnSide(bottomRight, PortSide.WEST);

    this.addEdgeBetweenPorts(topLeftPort, bottomRightPort);
    this.addEdgeBetweenPorts(bottomLeftPort, topRightPort);
    return selfLoopCrossGraph;
  }

  /**
   * Test for self loop.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#selfLoopOn
   */
  selfLoopOn(node: LNode, side: PortSide): void {
    this.addEdgeBetweenPorts(this.addPortOnSide(node, side), this.addPortOnSide(node, side));
  }

  /**
   * <pre>
   * *\  --*
   *   \/ /
   * *-*===*
   *  + /
   * * * --*
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getMoreComplexThreeLayerGraph
   */
  getMoreComplexThreeLayerGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const middleLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNodes = this.addNodesToLayer(3, leftLayer);
    const middleNodes = this.addNodesToLayer(2, middleLayer);
    const rightNodes = this.addNodesToLayer(3, rightLayer);

    const leftMiddleNodePort = this.addPortOnSide(leftNodes[1], PortSide.EAST);
    const middleLowerNodePortEast = this.addPortOnSide(middleNodes[1], PortSide.EAST);
    const middleUpperNodePortEast = this.addPortOnSide(middleNodes[0], PortSide.EAST);
    const rightUpperNodePort = this.addPortOnSide(rightNodes[0], PortSide.WEST);
    const rightMiddleNodePort = this.addPortOnSide(rightNodes[1], PortSide.WEST);
    this.setUpIds();

    this.addEdgeBetweenPorts(middleUpperNodePortEast, rightUpperNodePort);
    this.addEdgeBetweenPorts(middleUpperNodePortEast, rightMiddleNodePort);
    this.addEdgeBetweenPorts(middleUpperNodePortEast, rightMiddleNodePort);
    this.eastWestEdgeFromTo(middleLowerNodePortEast, rightNodes[2]);
    this.eastWestEdgeFromTo(leftMiddleNodePort, middleNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[1], rightUpperNodePort);
    this.eastWestEdgeFromTo(leftMiddleNodePort, middleNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[2], middleNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[0]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * ____  *
   * |  |\/
   * |__|/\
   *       *
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getFixedPortOrderGraph
   */
  getFixedPortOrderGraph(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNode = this.addNodeToLayer(leftLayer);
    leftNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);

    const rightTopNode = this.addNodeToLayer(rightLayer);
    const rightBottomNode = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(leftNode, rightBottomNode);
    this.eastWestEdgeFromTo(leftNode, rightTopNode);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * ____  *
   * |  |\/
   * |__|/\
   *       *
   * </pre>
   *
   * Port order not fixed
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getGraphNoCrossingsDueToPortOrderNotFixed
   */
  getGraphNoCrossingsDueToPortOrderNotFixed(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const leftNode = this.addNodeToLayer(leftLayer);

    const rightTopNode = this.addNodeToLayer(rightLayer);
    const rightBottomNode = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(leftNode, rightBottomNode);
    this.eastWestEdgeFromTo(leftNode, rightTopNode);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *  *---*
   *  \/
   *  /\
   * *  *---*
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getSwitchOnlyOneSided
   */
  getSwitchOnlyOneSided(): LGraph {
    const layers = this.makeLayers(3);

    const leftNodes = this.addNodesToLayer(2, layers[0]);
    const middleNodes = this.addNodesToLayer(2, layers[1]);
    const rightNodes = this.addNodesToLayer(2, layers[2]);

    this.eastWestEdgeFromTo(middleNodes[0], rightNodes[0]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[0]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *--*  *
   *     \/
   *     /\
   * *--*  *
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getSwitchOnlyEastOneSided
   */
  getSwitchOnlyEastOneSided(): LGraph {
    const layers = this.makeLayers(3);

    const leftNodes = this.addNodesToLayer(2, layers[0]);
    const middleNodes = this.addNodesToLayer(2, layers[1]);
    const rightNodes = this.addNodesToLayer(2, layers[2]);

    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * ____
   * |  |----
   * |__|\  |
   * ____ | |
   * |  |/  |
   * |__|---|
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getFixedPortOrderInLayerEdgesDontCrossEachOther
   */
  getFixedPortOrderInLayerEdgesDontCrossEachOther(): LGraph {
    const layer = this.makeLayer(this.graph);
    const nodes = this.addNodesToLayer(2, layer);
    this.setFixedOrderConstraint(nodes[0]);
    this.setFixedOrderConstraint(nodes[1]);
    // must add ports and edges manually, due to clockwise port ordering
    const upperPortUpperNode = this.addPortOnSide(nodes[0], PortSide.EAST);
    const lowerPortUpperNode = this.addPortOnSide(nodes[0], PortSide.EAST);
    const upperPortLowerNode = this.addPortOnSide(nodes[1], PortSide.EAST);
    const lowerPortLowerNode = this.addPortOnSide(nodes[1], PortSide.EAST);
    this.addEdgeBetweenPorts(upperPortUpperNode, lowerPortLowerNode);
    this.addEdgeBetweenPorts(lowerPortUpperNode, upperPortLowerNode);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * ____
   * |  |----
   * |__|\  |
   * ____ | |
   * |  |-+--
   * |__|-|
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getFixedPortOrderInLayerEdgesWithCrossings
   */
  getFixedPortOrderInLayerEdgesWithCrossings(): LGraph {
    const layer = this.makeLayer(this.graph);
    const nodes = this.addNodesToLayer(2, layer);
    this.setFixedOrderConstraint(nodes[0]);
    this.setFixedOrderConstraint(nodes[1]);
    this.addInLayerEdge(nodes[0], nodes[1], PortSide.EAST);
    this.addInLayerEdge(nodes[0], nodes[1], PortSide.EAST);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *      ____
   *    / |  |
   * *-+--|  |\
   *   | /|  |-+-*
   * *-++-|__| |
   *   ||      |
   *   || ___  |
   *   | \| | /
   * *-+--| |/
   * *-+--|_|
   *    \
   *     \
   *      *
   * </pre>
   *
   * Port order fixed.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getMoreComplexInLayerGraph
   */
  getMoreComplexInLayerGraph(): LGraph {
    const layers = this.makeLayers(3);
    const leftNodes = this.addNodesToLayer(4, layers[0]);
    const middleNodes = this.addNodesToLayer(3, layers[1]);
    const rightNode = this.addNodeToLayer(layers[2]);
    this.setFixedOrderConstraint(middleNodes[0]);
    this.setFixedOrderConstraint(middleNodes[1]);

    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[0]);

    this.eastWestEdgeFromTo(leftNodes[3], middleNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[2], middleNodes[1]);
    this.addInLayerEdge(middleNodes[0], middleNodes[1], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[0]);
    this.addInLayerEdge(middleNodes[0], middleNodes[2], PortSide.WEST);

    this.addInLayerEdge(middleNodes[0], middleNodes[1], PortSide.EAST);
    this.eastWestEdgeFromTo(middleNodes[0], rightNode);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *==*  *
   *     \/
   *     /\
   * *==*  *
   * </pre>
   *
   * First Layer and last layer in fixed order.
   *
   * @returns graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getGraphWhichCouldBeWorsenedBySwitch
   */
  getGraphWhichCouldBeWorsenedBySwitch(): LGraph {
    const layers = this.makeLayers(3);
    const leftNodes = this.addNodesToLayer(2, layers[0]);
    const middleNodes = this.addNodesToLayer(2, layers[1]);
    const rightNodes = this.addNodesToLayer(2, layers[2]);

    this.setInLayerOrderConstraint(leftNodes[0], leftNodes[1]);
    this.setInLayerOrderConstraint(rightNodes[0], rightNodes[1]);

    this.eastWestEdgeFromTo(middleNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(middleNodes[1], rightNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[0], middleNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[1], middleNodes[1]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *     * <-- this ...
   *    /
   * *-+-* <-- cannot switch with this
   *  / _|__
   * *  |  |
   *    |__|
   *
   * </pre>
   *
   * @returns graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getNodesInDifferentLayoutUnitsPreventSwitch
   */
  getNodesInDifferentLayoutUnitsPreventSwitch(): LGraph {
    const layers = this.makeLayers(2);
    const leftNodes = this.addNodesToLayer(2, layers[0]);
    const rightNodes = this.addNodesToLayer(3, layers[1]);

    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[0]);

    this.addNorthSouthEdge(PortSide.EAST, rightNodes[2], rightNodes[1], leftNodes[0], true);

    rightNodes[1].setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, rightNodes[2]);
    rightNodes[2].setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, rightNodes[2]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *  ---*
   *  |
   *  | ____
   * *+-|  |
   * *+-|  |
   *   \|__|
   * Port order not fixed.
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrder
   */
  multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrder(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const leftNodes = this.addNodesToLayer(2, leftLayer);
    const rightLayer = this.makeLayer(this.graph);
    const rightNodes = this.addNodesToLayer(2, rightLayer);

    this.addInLayerEdge(rightNodes[0], rightNodes[1], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   *  ---*
   *  |
   *  | ____
   * *+-|  |
   * *+-|  |
   *  | |__|
   *   \
   *    *
   * Port order not fixed.
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings
   */
  multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const leftNodes = this.addNodesToLayer(2, leftLayer);
    const rightLayer = this.makeLayer(this.graph);
    const rightNodes = this.addNodesToLayer(3, rightLayer);

    this.addInLayerEdge(rightNodes[0], rightNodes[2], PortSide.WEST);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *----*
   *  \\
   *   \--*
   *    --*
   * *---/
   *  \---*
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getSwitchedProblemGraph
   */
  getSwitchedProblemGraph(): LGraph {
    const leftNodes = this.addNodesToLayer(2, this.makeLayer(this.graph));
    const rightNodes = this.addNodesToLayer(4, this.makeLayer(this.graph));

    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[2]);
    this.eastWestEdgeFromTo(leftNodes[1], rightNodes[3]);

    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[0]);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[1]);
    this.eastWestEdgeFromTo(leftNodes[0], rightNodes[2]);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *   *<- Into same port
   *  \//
   *  //\
   * *   *
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#twoEdgesIntoSamePort
   */
  twoEdgesIntoSamePort(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.eastWestEdgeFromTo(topLeft, bottomRight);
    const bottomLeftFirstPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    const bottomLeftSecondPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    const topRightFirstPort = this.addPortOnSide(topRight, PortSide.WEST);
    const topRightSecondPort = this.addPortOnSide(topRight, PortSide.WEST);

    this.addEdgeBetweenPorts(bottomLeftFirstPort, topRightFirstPort);
    this.addEdgeBetweenPorts(bottomLeftSecondPort, topRightSecondPort);
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *---* <- Into same port
   *   /
   *  /
   * *---*
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#twoEdgesIntoSamePortCrossesWhenSwitched
   */
  twoEdgesIntoSamePortCrossesWhenSwitched(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    const topRightPort = this.addPortOnSide(topRight, PortSide.WEST);
    const bottomLeftPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    this.addEdgeBetweenPorts(bottomLeftPort, topRightPort);

    const topLeftPort = this.addPortOnSide(topLeft, PortSide.EAST);
    this.addEdgeBetweenPorts(topLeftPort, topRightPort);

    this.eastWestEdgeFromTo(bottomLeft, bottomRight);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *  *
   *  \/
   *  /\
   * *--*<- Into same port
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#twoEdgesIntoSamePortResolvesCrossingWhenSwitched
   */
  twoEdgesIntoSamePortResolvesCrossingWhenSwitched(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    const topLeftPort = this.addPortOnSide(topLeft, PortSide.EAST);
    const bottomLeftPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    const bottomRightPort = this.addPortOnSide(bottomRight, PortSide.WEST);

    this.addEdgeBetweenPorts(topLeftPort, bottomRightPort);
    this.addEdgeBetweenPorts(bottomLeftPort, bottomRightPort);

    this.eastWestEdgeFromTo(bottomLeft, topRight);

    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * *---* <- into same port
   *   /
   *  /
   * *---*
   * ^
   * |
   * Two edges into same port.
   * </pre>
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#twoEdgesIntoSamePortFromEastWithFixedPortOrder
   */
  twoEdgesIntoSamePortFromEastWithFixedPortOrder(): LGraph {
    const leftLayer = this.makeLayer(this.graph);
    const rightLayer = this.makeLayer(this.graph);

    const topLeft = this.addNodeToLayer(leftLayer);
    const bottomLeft = this.addNodeToLayer(leftLayer);
    const topRight = this.addNodeToLayer(rightLayer);
    const bottomRight = this.addNodeToLayer(rightLayer);

    this.setFixedOrderConstraint(bottomLeft);
    this.setFixedOrderConstraint(topRight);

    const topLeftPort = this.addPortOnSide(topLeft, PortSide.EAST);
    const bottomLeftPort = this.addPortOnSide(bottomLeft, PortSide.EAST);
    const topRightPort = this.addPortOnSide(topRight, PortSide.WEST);
    const bottomRightPort = this.addPortOnSide(bottomRight, PortSide.WEST);

    this.addEdgeBetweenPorts(bottomLeftPort, bottomRightPort);
    this.addEdgeBetweenPorts(bottomLeftPort, topRightPort);
    this.addEdgeBetweenPorts(topLeftPort, topRightPort);

    this.setUpIds();
    return this.graph;
  }

  /**
   * Return nodes as 2d array.
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCurrentOrder
   */
  getCurrentOrder(g: LGraph): LNode[][] {
    const layers = g.getLayers();
    const nodeOrder: LNode[][] = new Array<LNode[]>(layers.length);
    for (let i = 0; i < layers.length; i++) {
      const layer = listGet(layers, i);
      const nodes = layer.getNodes();
      nodeOrder[i] = new Array<LNode>(nodes.length);
      for (let j = 0; j < nodes.length; j++) {
        nodeOrder[i][j] = listGet(nodes, j);
      }
    }
    return nodeOrder;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setAsNorthSouthNode */
  setAsNorthSouthNode(node: LNode): void {
    node.setType(NodeType.NORTH_SOUTH_PORT);
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addNorthSouthEdge */
  addNorthSouthEdge(
    side: PortSide,
    nodeWithNSPorts: LNode,
    northSouthDummy: LNode,
    nodeWithEastWestPorts: LNode,
    nodeWithEastWestPortsIsOrigin: boolean,
  ): void {
    const normalNodeEastOfNsPortNode =
      nonNull(nodeWithEastWestPorts.getLayer(), 'nodeWithEastWestPorts.getLayer()').getIndex() <
      nonNull(nodeWithNSPorts.getLayer(), 'nodeWithNSPorts.getLayer()').getIndex();
    const direction = normalNodeEastOfNsPortNode ? PortSide.WEST : PortSide.EAST;

    const targetNodePortSide = direction.opposed();
    const normalNodePort = this.addPortOnSide(nodeWithEastWestPorts, targetNodePortSide);

    const dummyNodePort = this.addPortOnSide(northSouthDummy, direction);

    if (nodeWithEastWestPortsIsOrigin) {
      this.addEdgeBetweenPorts(normalNodePort, dummyNodePort);
    } else {
      this.addEdgeBetweenPorts(dummyNodePort, normalNodePort);
    }

    northSouthDummy.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, nodeWithNSPorts);
    northSouthDummy.setProperty(InternalProperties.ORIGIN, nodeWithNSPorts);

    this.setAsNorthSouthNode(northSouthDummy);

    const originPort = this.addPortOnSide(nodeWithNSPorts, side);
    dummyNodePort.setProperty(InternalProperties.ORIGIN, originPort);
    originPort.setProperty(InternalProperties.PORT_DUMMY, northSouthDummy);

    const baryAssoc: LNode[] = [northSouthDummy];

    // BARYCENTER_ASSOCIATES has no default: `getProperty` yields null when unset, which its `IProperty<LNode[]>` type
    // does not express.
    const otherBaryAssocs = nodeWithNSPorts.getProperty(InternalProperties.BARYCENTER_ASSOCIATES) as LNode[] | null;
    if (otherBaryAssocs === null) {
      nodeWithNSPorts.setProperty(InternalProperties.BARYCENTER_ASSOCIATES, baryAssoc);
    } else {
      otherBaryAssocs.push(...baryAssoc);
    }

    if (side === PortSide.NORTH) {
      northSouthDummy.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(nodeWithNSPorts);
    } else {
      nodeWithNSPorts.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(northSouthDummy);
    }
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setInLayerOrderConstraint */
  setInLayerOrderConstraint(thisNode: LNode, beforeThisNode: LNode): void {
    const scndNodeAsList: LNode[] = [beforeThisNode];
    thisNode.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, scndNodeAsList);
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setAsLongEdgeDummy */
  setAsLongEdgeDummy(node: LNode): void {
    node.setType(NodeType.LONG_EDGE);
    node.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, null);
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setPortOrderFixed */
  setPortOrderFixed(node: LNode): void {
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    nonNull(node.getGraph(), 'node.getGraph()')
      .getProperty(InternalProperties.GRAPH_PROPERTIES)
      .add(GraphProperties.NON_FREE_PORTS);
  }

  /** Java `makeLayers(amount)` and `makeLayers(amount, g)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#makeLayers */
  makeLayers(amount: number, g: LGraph = this.graph): Layer[] {
    const layers: Layer[] = new Array<Layer>(amount);
    for (let i = 0; i < layers.length; i++) {
      layers[i] = this.makeLayer(g);
    }
    return layers;
  }

  /** Java `setFixedOrderConstraint(LNode)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setFixedOrderConstraint */
  setFixedOrderConstraint(node: LNode): MapPropertyHolder;
  /** Java `setFixedOrderConstraint(LNode[])`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setFixedOrderConstraint */
  setFixedOrderConstraint(nodes: readonly LNode[]): void;
  setFixedOrderConstraint(nodeOrNodes: LNode | readonly LNode[]): MapPropertyHolder | undefined {
    if (nodeOrNodes instanceof LNode) {
      return nodeOrNodes.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    }
    for (const n of nodeOrNodes) {
      this.setFixedOrderConstraint(n);
    }
    return undefined;
  }

  /** Java `addInLayerEdge(LNode, LNode, PortSide)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addInLayerEdge */
  addInLayerEdge(nodeOne: LNode, nodeTwo: LNode, portSide: PortSide): void;
  /** Java `addInLayerEdge(LNode, LPort, PortSide)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addInLayerEdge */
  addInLayerEdge(nodeOne: LNode, portTwo: LPort, portSide: PortSide): void;
  /** Java `addInLayerEdge(LPort, LNode)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addInLayerEdge */
  addInLayerEdge(portOne: LPort, nodeTwo: LNode): void;
  addInLayerEdge(one: LNode | LPort, two: LNode | LPort, portSide?: PortSide): void {
    if (one instanceof LPort) {
      // (LPort portOne, LNode nodeTwo): the overloads exclude `two` being a port here
      const portOne = one;
      const side = portOne.getSide();
      const portTwo = this.addPortOnSide(two as LNode, side);
      this.addEdgeBetweenPorts(portOne, portTwo);
    } else if (two instanceof LPort) {
      // (LNode nodeOne, LPort portTwo, PortSide portSide): `portSide` is required by this overload
      const portOne = this.addPortOnSide(one, portSide as PortSide);
      this.addEdgeBetweenPorts(portOne, two);
    } else {
      // (LNode nodeOne, LNode nodeTwo, PortSide portSide): `portSide` is required by this overload
      const portOne = this.addPortOnSide(one, portSide as PortSide);
      const portTwo = this.addPortOnSide(two, portSide as PortSide);
      this.addEdgeBetweenPorts(portOne, portTwo);
    }
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addNodesToLayer */
  addNodesToLayer(amountOfNodes: number, leftLayer: Layer): LNode[] {
    const nodes: LNode[] = new Array<LNode>(amountOfNodes);
    for (let j = 0; j < amountOfNodes; j++) {
      nodes[j] = this.addNodeToLayer(leftLayer);
    }
    return nodes;
  }

  /** Java `makeLayer()` and `makeLayer(g)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#makeLayer */
  makeLayer(g: LGraph = this.graph): Layer {
    const layers = g.getLayers();
    const layer = new Layer(g);
    layers.push(layer);
    return layer;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addNodeToLayer */
  addNodeToLayer(layer: Layer): LNode {
    const node = new LNode(layer.getGraph());
    node.setType(NodeType.NORMAL);
    node.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, node);
    node.setLayer(layer);
    node.id = this.nodeId++;
    return node;
  }

  /** Java `eastWestEdgeFromTo(LNode, LNode)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#eastWestEdgeFromTo */
  eastWestEdgeFromTo(left: LNode, right: LNode): void;
  /** Java `eastWestEdgeFromTo(LPort, LNode)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#eastWestEdgeFromTo */
  eastWestEdgeFromTo(leftPort: LPort, rightNode: LNode): void;
  /** Java `eastWestEdgeFromTo(LNode, LPort)`. @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#eastWestEdgeFromTo */
  eastWestEdgeFromTo(left: LNode, rightPort: LPort): void;
  eastWestEdgeFromTo(left: LNode | LPort, right: LNode | LPort): void {
    if (left instanceof LPort) {
      // (LPort leftPort, LNode rightNode): the overloads exclude `right` being a port here
      this.addEdgeBetweenPorts(left, this.addPortOnSide(right as LNode, PortSide.WEST));
    } else if (right instanceof LPort) {
      this.addEdgeBetweenPorts(this.addPortOnSide(left, PortSide.EAST), right);
    } else {
      const leftPort = this.addPortOnSide(left, PortSide.EAST);
      const rightPort = this.addPortOnSide(right, PortSide.WEST);
      this.addEdgeBetweenPorts(leftPort, rightPort);
    }
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addEdgeBetweenPorts */
  addEdgeBetweenPorts(from: LPort, to: LPort): void {
    const edge = new LEdge();
    edge.setSource(from);
    edge.setTarget(to);
    edge.id = this.edgeId++;
  }

  /**
   * Sets port constraints to fixed!
   *
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addPortOnSide
   */
  addPortOnSide(node: LNode, portSide: PortSide): LPort {
    const port = this.addPortTo(node);
    port.setSide(portSide);
    if (!node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    }
    return port;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addPortsOnSide */
  addPortsOnSide(n: number, node: LNode, portSide: PortSide): LPort[] {
    const ps: LPort[] = new Array<LPort>(n);
    for (let i = 0; i < ps.length; i++) {
      ps[i] = this.addPortOnSide(node, portSide);
    }
    return ps;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addPortTo */
  addPortTo(node: LNode): LPort {
    const port = new LPort();
    port.setNode(node);
    port.id = this.portId++;
    return port;
  }

  /**
   * <pre>
   *     ____
   *     |  |
   * ----0  | <--- two edges into one port
   * | / |  |
   * | +-0  |
   * |/| |__|
   * ||\
   * ||  *
   * | \
   * ----*
   * </pre>
   *
   * Port order not fixed.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#multipleEdgesIntoOnePortAndFreePortOrder
   */
  multipleEdgesIntoOnePortAndFreePortOrder(): LGraph {
    const nodes = this.addNodesToLayer(3, this.makeLayer(this.graph));
    this.addInLayerEdge(nodes[0], nodes[2], PortSide.WEST);
    const portUpperNode = this.addPortOnSide(nodes[0], PortSide.WEST);
    this.addEdgeBetweenPorts(portUpperNode, this.addPortOnSide(nodes[2], PortSide.WEST));
    this.addEdgeBetweenPorts(portUpperNode, this.addPortOnSide(nodes[1], PortSide.WEST));
    this.setUpIds();
    return this.graph;
  }

  /**
   * <pre>
   * ___
   * | |\    *
   * | |\\  /
   * |_|-++-+*
   *     || \
   *     ====*
   * </pre>
   *
   * left Node has fixed Port Order.
   *
   * @returns Graph of the form above.
   * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getOnlyCorrectlyImprovedByBestOfForwardAndBackwardSweepsInSingleLayer
   */
  getOnlyCorrectlyImprovedByBestOfForwardAndBackwardSweepsInSingleLayer(): LGraph {
    const leftNode = this.addNodeToLayer(this.makeLayer(this.graph));
    this.setFixedOrderConstraint(leftNode);
    const rightNodes = this.addNodesToLayer(3, this.makeLayer(this.graph));
    this.eastWestEdgeFromTo(leftNode, rightNodes[2]);
    this.eastWestEdgeFromTo(leftNode, rightNodes[2]);
    this.eastWestEdgeFromTo(leftNode, rightNodes[1]);
    this.addInLayerEdge(rightNodes[0], rightNodes[2], PortSide.WEST);
    this.setUpIds();
    return this.graph;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getListCopyInIndexOrder */
  getListCopyInIndexOrder<T>(li: readonly T[], ...is: number[]): T[] {
    const list: T[] = [];
    for (const i of is) {
      list.push(listGet(li, i));
    }
    return list;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getArrayInIndexOrder */
  getArrayInIndexOrder<T>(arr: readonly T[], ...is: number[]): T[] {
    const copy: T[] = [...arr];
    let j = 0;
    for (const i of is) {
      copy[j++] = listGet(arr, i);
    }
    return copy;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#copyOfListSwitchingOrder */
  copyOfListSwitchingOrder<T>(i: number, j: number, list: readonly T[]): T[] {
    const listCopy: T[] = [...list];
    const first = listGet(listCopy, i);
    const second = listGet(listCopy, j);
    listCopy[i] = second;
    listCopy[j] = first;
    return listCopy;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#switchOrderInArray */
  switchOrderInArray<T>(i: number, j: number, arr: readonly T[]): T[] {
    const copy: T[] = [...arr];
    const first = listGet(arr, i);
    const snd = listGet(arr, j);
    copy[j] = first;
    copy[i] = snd;
    return copy;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addExternalPortDummyNodeToLayer */
  addExternalPortDummyNodeToLayer(layer: Layer, port: LPort): LNode {
    const node = this.addNodeToLayer(layer);
    node.setProperty(InternalProperties.ORIGIN, port);
    node.setType(NodeType.EXTERNAL_PORT);
    node.setProperty(InternalProperties.EXT_PORT_SIDE, port.getSide());
    port.setProperty(InternalProperties.PORT_DUMMY, node);
    port.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
    const ps = nonNull(node.getGraph(), 'node.getGraph()').getProperty(InternalProperties.GRAPH_PROPERTIES);
    ps.add(GraphProperties.EXTERNAL_PORTS);
    return node;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#addExternalPortDummiesToLayer */
  addExternalPortDummiesToLayer(layer: Layer, ports: readonly LPort[]): LNode[] {
    const nodes: LNode[] = new Array<LNode>(ports.length);
    const side = listGet(ports, 0).getSide();
    for (let i = 0; i < ports.length; i++) {
      const portIndex = side === PortSide.EAST ? i : ports.length - 1 - i;
      nodes[i] = this.addExternalPortDummyNodeToLayer(layer, listGet(ports, portIndex));
    }
    return nodes;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#nestedGraph */
  nestedGraph(node: LNode): LGraph {
    node.setProperty(InternalProperties.COMPOUND_NODE, true);
    let nestedGraph = node.getNestedGraph();
    if (nestedGraph === null) {
      nestedGraph = new LGraph();
      this.setUpGraph(nestedGraph);
      node.setNestedGraph(nestedGraph);
      nestedGraph.setParentNode(node);
    }
    return nestedGraph;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#switchOrderOfNodesInLayer */
  switchOrderOfNodesInLayer(nodeOne: number, nodeTwo: number, layer: Layer): LNode[] {
    const nodes = layer.getNodes();
    const firstNode = listGet(nodes, nodeOne);
    const secondNode = listGet(nodes, nodeTwo);
    const switchedList: LNode[] = [...nodes];
    switchedList[nodeOne] = secondNode;
    switchedList[nodeTwo] = firstNode;
    return switchedList;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#copyOfNodesInLayer */
  copyOfNodesInLayer(layerIndex: number): LNode[] {
    return [...listGet(this.graph.getLayers(), layerIndex).getNodes()];
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#copyOfSwitchOrderOfNodesInLayer */
  copyOfSwitchOrderOfNodesInLayer(nodeOne: number, nodeTwo: number, layerIndex: number): LNode[] {
    const layer = this.copyOfNodesInLayer(layerIndex);
    return this.getCopyWithSwitchedOrder(nodeOne, nodeTwo, layer);
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getCopyWithSwitchedOrder */
  getCopyWithSwitchedOrder(nodeOne: number, nodeTwo: number, layer: readonly LNode[]): LNode[] {
    const firstNode = listGet(layer, nodeOne);
    const secondNode = listGet(layer, nodeTwo);
    const switchedList: LNode[] = [...layer];
    switchedList[nodeOne] = secondNode;
    switchedList[nodeTwo] = firstNode;
    return switchedList;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#eastWestEdgesFromTo */
  eastWestEdgesFromTo(numberOfNodes: number, left: LNode, right: LNode): void {
    for (let i = 0; i < numberOfNodes; i++) {
      this.eastWestEdgeFromTo(left, right);
    }
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#copyPortsInIndexOrder */
  copyPortsInIndexOrder(node: LNode, ...indices: number[]): LPort[] {
    const res: LPort[] = [];
    for (const i of indices) {
      res.push(listGet(node.getPorts(), i));
    }
    return res;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#getRandom */
  getRandom(): MockRandom {
    return this.random;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setRandom */
  setRandom(random: MockRandom): void {
    this.random = random;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setOnAllGraphs */
  setOnAllGraphs<T>(prop: IProperty<T>, val: T, graph: LGraph): void {
    graph.setProperty(prop, val);
    // Java: `Iterables.concat(graph)`, the nodes of all layers in order
    for (const layer of graph) {
      for (const node of layer) {
        const nestedGraph = node.getNestedGraph();
        if (nestedGraph !== null) {
          this.setOnAllGraphs(prop, val, nestedGraph);
        }
      }
    }
  }
}

/**
 * Deterministic `Random` for the tests: the boolean is a fixed value and every float/double draw advances a running
 * counter by a fixed step. The seed is never consulted, so the inherited unseeded `Random()` is harmless. Java's
 * `serialVersionUID` is dropped (no serialization); the `nextBoolean` field is `nextBooleanValue` since a TypeScript
 * class cannot hold a field and a method of the same name.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#MockRandom
 */
export class MockRandom extends Random {
  /** a Java `float`: kept at single precision with `Math.fround`. */
  private current = 0;
  private changeBy = 0.0001;
  private nextBooleanValue = true;

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#MockRandom */
  constructor() {
    super();
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#nextBoolean */
  override nextBoolean(): boolean {
    return this.nextBooleanValue;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#nextFloat */
  override nextFloat(): number {
    // Java `current += changeBy` is `float += double`: the sum is a double narrowed back to float
    this.current = Math.fround(this.current + this.changeBy);
    return this.current;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#nextDouble */
  override nextDouble(): number {
    return this.nextFloat();
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setNextBoolean */
  setNextBoolean(nextBoolean: boolean): void {
    this.nextBooleanValue = nextBoolean;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setChangeBy */
  setChangeBy(changeBy: number): void {
    this.changeBy = changeBy;
  }

  /** @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/TestGraphCreator.java#setCurrent */
  setCurrent(current: number): void {
    // the Java parameter is a `float`
    this.current = Math.fround(current);
  }
}
