// SPDX-License-Identifier: EPL-2.0
// Port of GreedyPortDistributorTest (mission 7c-tests, T5).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/GreedyPortDistributorTest.java
//
// Java-to-TypeScript mapping:
//   - `extends TestGraphCreator` / `@Before` is `let creator` rebuilt in `beforeEach`; `graph` is `creator.graph`;
//     the Java field `portDist` is the file-level `let portDist`.
//   - `IInitializable.init(Arrays.asList(portDist), nodeArray)` is `init([portDist], nodeArray)`.
//   - `portsOrderedAs(node, int... indices)` is a local function with a rest parameter.
//   - `assertThat(list, is(expected))` on ports is `expectSameElements` (identity per element).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { expectSameElements } from '../../../../test/helpers/junit-asserts.js';
import { TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { init } from './counting/IInitializable.js';
import { GreedyPortDistributor } from './GreedyPortDistributor.js';

// Java: `PlainJavaInitialization.initializePlainJavaLayout()`, plus `LayoutMetaDataService.initElkReflect()` for the
// list- and set-valued defaults the creator clones.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

let creator: TestGraphCreator;
let portDist: GreedyPortDistributor;

beforeEach(() => {
  creator = new TestGraphCreator();
});

function setUpDistributor(): void {
  portDist = new GreedyPortDistributor();
  const nodeArray = creator.graph.toNodeArray();
  init([portDist], nodeArray);
}

function portsOrderedAs(rightNode: LNode, ...indices: number[]): LPort[] {
  const ordered: LPort[] = [];
  for (const i of indices) {
    ordered.push(rightNode.getPorts()[i]!);
  }
  return ordered;
}

describe('GreedyPortDistributorTest', () => {
  /**
   * <pre>
   * *  ___
   *  \/| |
   *  /\| |
   * *  |_|
   * </pre>
   */
  it('distributePorts_GivenCrossOnWesternSide_RemoveCrossing', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNode);

    const expectedPortOrderRightNode = portsOrderedAs(rightNode, 1, 0);

    setUpDistributor();
    const improved = portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 1, true);

    expect(improved).toBe(true);
    expectSameElements(rightNode.getPorts(), expectedPortOrderRightNode);
  });

  /**
   * <pre>
   * *  ___
   *  \/| | *
   *  /\| | *
   * *  |_|
   * </pre>
   */
  it('distributePorts_GivenNoPortsOnRightSide_NothingHappens', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const middleNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, middleNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, middleNode);

    const expectedPortOrderRightNode = portsOrderedAs(middleNode, 0, 1);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 1, false);

    expectSameElements(middleNode.getPorts(), expectedPortOrderRightNode);
  });

  /**
   * <pre>
   * *    ___
   *  \/--| |
   *  /\ /| |
   * *  x | |
   * *-/ \|_|
   * </pre>
   */
  it('distributePorts_GivenMultipleCrossingsOnWesternSide_RemoveCrossing', () => {
    const leftNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNode);
    creator.eastWestEdgeFromTo(leftNodes[2]!, rightNode);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNode);

    const expectedPortOrderRightNode = portsOrderedAs(rightNode, 1, 2, 0);

    setUpDistributor();

    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 1, true);

    expectSameElements(rightNode.getPorts(), expectedPortOrderRightNode);
  });

  /**
   * <pre>
   * ___
   * | |\/*
   * |_|/\*
   * </pre>
   */
  it('distributePorts_GivenCrossingsOnEasternSide_RemoveThem', () => {
    const leftNodes = creator.addNodesToLayer(1, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);

    const expectedPortOrderLeftNode = portsOrderedAs(leftNodes[0]!, 1, 0);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftNodes[0]!.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ___
   * | |\/*
   * |_|/\*
   * </pre>
   */
  it('distributePorts_fixedPortOrder_NoChange', () => {
    const leftNodes = creator.addNodesToLayer(1, creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);
    creator.setFixedOrderConstraint(leftNodes[0]!);

    const expectedPortOrderLeftNode = portsOrderedAs(leftNodes[0]!, 0, 1);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftNodes[0]!.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ____
   * |*-+   *
   * |  |\\/
   * |*-+/\\
   * |--|   *
   * </pre>
   */
  it('givenDoubleCrossBetweenCompoundAndNonCompoundNodes_SwitchesPorts', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[0]!);
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, leftInnerDummyNodes[1]!);
    creator.setUpIds();

    const expectedPortOrderLeftNode = portsOrderedAs(leftOuterNode, 1, 0);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ____
   * |*-+  *
   * |  |\/
   * |*-+/\
   * |--|  *
   * </pre>
   */
  it('givenSingleCrossBetweenCompoundAndNonCompoundNodes_DoesNotSwitchPorts', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[0]!);
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, leftInnerDummyNodes[1]!);

    // Order stays the same.
    const expectedPortOrderLeftNode = portsOrderedAs(leftOuterNode, 0, 1);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ____
   * |*-+  *
   * |  |\/
   * |*-+/\
   * |  |  *
   * |*-+--*
   * |--|
   * </pre>
   */
  it('givenMoreHierarchicalNodes_DoesNotSwitchPorts', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(3, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[2]!, rightNodes[2]!);
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodes = creator.addNodesToLayer(3, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, leftInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[2]!, leftInnerDummyNodes[2]!);

    // Order stays the same.
    const expectedPortOrderLeftNode = portsOrderedAs(leftOuterNode, 0, 1, 2);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * _______
   * |   *-+  *
   * |     |\/
   * |   *-+/\
   * |     |  *
   * |*--*-+--*
   * |-----|
   * </pre>
   */
  it('givenMoreHierarchicalNodes2_DoesNotSwitchPorts', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(3, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[2]!, rightNodes[2]!);
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNode = creator.addNodeToLayer(creator.makeLayer(leftInnerGraph));
    const rightInnerNodes = creator.addNodesToLayer(3, creator.makeLayer(leftInnerGraph));
    const dummyNodes = creator.addExternalPortDummiesToLayer(creator.makeLayer(leftInnerGraph), leftOuterPorts);
    creator.eastWestEdgeFromTo(leftInnerNode, rightInnerNodes[2]!);
    creator.eastWestEdgeFromTo(rightInnerNodes[0]!, dummyNodes[0]!);
    creator.eastWestEdgeFromTo(rightInnerNodes[1]!, dummyNodes[1]!);
    creator.eastWestEdgeFromTo(rightInnerNodes[2]!, dummyNodes[2]!);

    // Order stays the same.
    const expectedPortOrderLeftNode = portsOrderedAs(leftOuterNode, 0, 1, 2);

    setUpDistributor();
    portDist.distributePortsWhileSweeping(creator.graph.toNodeArray(), 0, false);

    expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ___
   * | |\/*
   * |_|/\*
   * ___
   * | |\/*
   * |_|/\*
   * </pre>
   */
  it('distributePortsWhileSweeping_givenTwoHierarchicalNodesInOneLayer', () => {
    const leftLayer = creator.makeLayer(creator.getGraph());
    const rightLayer = creator.makeLayer(creator.getGraph());

    for (let i = 0; i < 2; i++) {
      const leftNodes = creator.addNodesToLayer(1, leftLayer);
      const rightNodes = creator.addNodesToLayer(2, rightLayer);
      creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
      creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);
    }

    // Order stays the same.
    const leftOuterNode = leftLayer.getNodes()[0]!;
    const expectedPortOrderLeftNode = portsOrderedAs(leftOuterNode, 1, 0);

    const nodeOrder = creator.getGraph().toNodeArray();
    setUpDistributor();
    portDist.distributePortsWhileSweeping(nodeOrder, 0, false);

    expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeftNode);
  });

  /**
   * <pre>
   * ___
   * | |--*
   * |_|--*
   * </pre>
   */
  it('noChange', () => {
    const leftLayer = creator.makeLayer(creator.getGraph());
    const rightLayer = creator.makeLayer(creator.getGraph());
    const leftNodes = creator.addNodesToLayer(1, leftLayer);
    const rightNodes = creator.addNodesToLayer(2, rightLayer);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[1]!);
    const nodeOrder = creator.getGraph().toNodeArray();
    setUpDistributor();
    const improved = portDist.distributePortsWhileSweeping(nodeOrder, 0, false);

    expect(improved).toBe(false);
  });
});
