// SPDX-License-Identifier: EPL-2.0
// Port of BarycenterHeuristicTest (mission 7c-tests, T5).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/BarycenterHeuristicTest.java
//
// Java-to-TypeScript mapping:
//   - `extends TestGraphCreator` / `@Before` is `let creator` rebuilt in `beforeEach`. The Java test class hides the
//     creator's `random` with its own private `MockRandom random` (built in `setUp`), which is what the heuristic gets;
//     that is the file-level `let random`, separate from `creator.random`.
//   - `IInitializable.init(Arrays.asList(a, b), nodes)` is `init([a, b], nodes)`.
//   - Java `BarycenterHeuristic.minimizeCrossings(List<LNode>, preOrdered, randomize, forward)` (an overload, "only
//     public to be accessible by a test") is `minimizeCrossingsInLayer` in TypeScript; the TS constructor and
//     parameters are otherwise those of Java. The Java helper `minimizeCrossings(crossMin, nodes, ...)` wraps the array in
//     a list and writes the result back; the TS list is the array copy.
//   - `assertThat(array, is(array))` compares elements by identity: `expectSameElements`.
import { beforeAll, beforeEach, describe, it } from 'vitest';
import { expectSameElements } from '../../../../test/helpers/junit-asserts.js';
import { MockRandom, TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { PortType } from '../options/PortType.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import { init } from './counting/IInitializable.js';
import { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

// Java: `LayoutMetaDataService.initElkReflect()` in `@BeforeClass`, plus the layered registration (L5).
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

let creator: TestGraphCreator;
let random: MockRandom;

beforeEach(() => {
  creator = new TestGraphCreator();
  random = new MockRandom();
});

/** Helper method that wraps the nodes array in a list and applies the order back to the array. */
function minimizeCrossings(
  crossMin: BarycenterHeuristic,
  nodes: LNode[],
  preOrdered: boolean,
  randomized: boolean,
  forward: boolean,
): void {
  const nodeList = [...nodes];
  crossMin.minimizeCrossingsInLayer(nodeList, preOrdered, randomized, forward);
  let i = 0;
  for (const node of nodeList) {
    nodes[i++] = node;
  }
}

describe('BarycenterHeuristicTest', () => {
  /**
   * <pre>
   * *  *
   *  \/
   *  /\
   * *  *
   * .
   * </pre>
   */
  it('minimizeCrossings_removesCrossingInSimpleCross', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNodes[0]!);
    creator.setUpIds();
    const nodes = creator.getGraph().toNodeArray();

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);
    init([portDist, constraintResolver], nodes);

    portDist.calculatePortRanks(nodes[0]!, PortType.OUTPUT);
    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);

    const expectedOrder = creator.switchOrderInArray(0, 1, nodes[1]!);

    minimizeCrossings(crossMin, nodes[1]!, false, false, true);

    expectSameElements(nodes[1]!, expectedOrder);
  });

  /**
   * <pre>
   *
   * *  *
   *  \/
   *  /\
   * *  *
   * .
   * </pre>
   */
  it('mockRandomizeFirstLayer', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNodes[0]!);
    creator.setUpIds();

    const nodes = creator.getGraph().toNodeArray();
    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);
    portDist.calculatePortRanks(nodes[0]!, PortType.OUTPUT);
    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);

    const expectedOrder = [...nodes[0]!];
    const expectedSwitchedOrder = creator.switchOrderInArray(0, 1, nodes[0]!);

    minimizeCrossings(crossMin, nodes[0]!, false, true, true);
    expectSameElements(nodes[0]!, expectedOrder);

    random.setChangeBy(-0.01);
    minimizeCrossings(crossMin, nodes[0]!, false, true, true);
    expectSameElements(nodes[0]!, expectedSwitchedOrder);
  });

  /**
   * <pre>
   *   *  *
   *    \/
   *    /\
   * *-*  *
   * .
   * </pre>
   */
  it('fillingInUnknownBarycenters', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const middleNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);
    creator.setUpIds();

    const nodes = creator.getGraph().toNodeArray();
    const expectedSwitchedOrder = creator.switchOrderInArray(0, 1, nodes[2]!);
    const expectedOrderSecondLayer = [...nodes[1]!];

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);

    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);
    portDist.calculatePortRanks(nodes[0]!, PortType.OUTPUT);
    minimizeCrossings(crossMin, nodes[0]!, false, true, true);

    portDist.calculatePortRanks(nodes[1]!, PortType.OUTPUT);
    minimizeCrossings(crossMin, nodes[1]!, false, false, true);
    expectSameElements(nodes[1]!, expectedOrderSecondLayer);

    minimizeCrossings(crossMin, nodes[2]!, false, false, true);

    expectSameElements(nodes[2]!, expectedSwitchedOrder);
  });

  /**
   * <pre>
   * ____  *
   * |  |\/
   * |__|/\
   *       *
   * .
   * </pre>
   */
  it('assumingFixedPortOrder_givenSimplePortOrderCross_removesCrossingIndependentOfRandom', () => {
    const leftLayer = creator.makeLayer(creator.getGraph());
    const rightLayer = creator.makeLayer(creator.getGraph());

    const leftNode = creator.addNodeToLayer(leftLayer);

    const rightTopNode = creator.addNodeToLayer(rightLayer);
    const rightBottomNode = creator.addNodeToLayer(rightLayer);

    creator.eastWestEdgeFromTo(leftNode, rightBottomNode);
    creator.eastWestEdgeFromTo(leftNode, rightTopNode);

    creator.setFixedOrderConstraint(leftNode);

    creator.setUpIds();

    const nodes = creator.getGraph().toNodeArray();

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);

    portDist.calculatePortRanks(nodes[0]!, PortType.OUTPUT);
    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);

    const expectedOrder = creator.switchOrderInArray(0, 1, nodes[1]!);

    minimizeCrossings(crossMin, nodes[1]!, false, false, true);
    expectSameElements(nodes[1]!, expectedOrder);

    random.setChangeBy(-0.1);
    random.setNextBoolean(false);
    minimizeCrossings(crossMin, nodes[1]!, false, false, true);

    expectSameElements(nodes[1]!, expectedOrder);
  });

  /**
   * <pre>
   *
   * *  ___
   *  \/| |
   *  /\|_|
   * *
   * </pre>
   */
  it('assumingFixedPortOrder_givenSimplePortOrderCross_removesCrossingBackwards', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNode);
    creator.setFixedOrderConstraint(rightNode);
    creator.setUpIds();

    const nodes = creator.getGraph().toNodeArray();

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);

    portDist.calculatePortRanks(nodes[1]!, PortType.INPUT);
    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);

    const expectedOrder = creator.switchOrderInArray(0, 1, nodes[0]!);

    minimizeCrossings(crossMin, nodes[0]!, false, false, false);

    expectSameElements(nodes[0]!, expectedOrder);
  });

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
   */
  it('inLayerEdges', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer());
    creator.setFixedOrderConstraint(rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, rightNodes[0]!);
    creator.addInLayerEdge(rightNodes[0]!, rightNodes[2]!, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNode, rightNodes[1]!);
    creator.setUpIds();
    const nodes = creator.getGraph().toNodeArray();

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);

    portDist.calculatePortRanks(nodes[0]!, PortType.INPUT);
    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);

    const expectedOrder = creator.getArrayInIndexOrder(nodes[1]!, 2, 0, 1);

    minimizeCrossings(crossMin, nodes[1]!, false, false, true);

    expectSameElements(nodes[1]!, expectedOrder);
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
   * </pre>
   */
  it('northSouthEdges', () => {
    const leftNodes = creator.addNodesToLayer(1, creator.makeLayer());
    const middleNodes = creator.addNodesToLayer(4, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, middleNodes[2]!);
    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[2]!);
    creator.setAsLongEdgeDummy(middleNodes[2]!);
    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[3]!, middleNodes[0]!, rightNodes[0]!, false);
    creator.addNorthSouthEdge(PortSide.NORTH, middleNodes[3]!, middleNodes[1]!, rightNodes[1]!, false);
    creator.setUpIds();

    // Java: `Multimap<LNode, LNode> layoutUnits = LinkedListMultimap.create()`, filled here and never read.
    const layoutUnits = new Map<LNode, LNode[]>();
    const nodes = creator.getGraph().toNodeArray();
    for (const list of nodes) {
      for (const node of list) {
        const layoutUnit = node.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);
        if (layoutUnit !== null) {
          const units = layoutUnits.get(layoutUnit);
          if (units === undefined) {
            layoutUnits.set(layoutUnit, [node]);
          } else {
            units.push(node);
          }
        }
      }
    }

    const portDist = new NodeRelativePortDistributor(nodes.length);
    const constraintResolver = new ForsterConstraintResolver(nodes);
    init([portDist, constraintResolver], nodes);

    portDist.calculatePortRanks(nodes[0]!, PortType.INPUT);

    const crossMin = new BarycenterHeuristic(constraintResolver, random, portDist, nodes);
    init([crossMin], nodes);
    const expectedOrder = creator.getArrayInIndexOrder(nodes[1]!, 1, 0, 3, 2);

    random.setChangeBy(-0.01);
    minimizeCrossings(crossMin, nodes[1]!, false, false, true);

    expectSameElements(nodes[1]!, expectedOrder);
  });
});
