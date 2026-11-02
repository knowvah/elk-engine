// SPDX-License-Identifier: EPL-2.0
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/LayerSweepCrossingMinimizerTest.java
//
// Mission 7c-tests (T4). One `it` per Java `@Test`, in Java order; the Java `@Parameters` become `describe.each` over
// the same two `CrossMinType`s. The four Java methods that carry `@Ignore` and no `@Test` become `it.skip`.
//
// Java-to-TypeScript mapping, all forced by the language:
//   - `extends TestGraphCreator` becomes `creator: TestGraphCreator`; `graph`/`random` are `creator.graph`/`creator.random`.
//   - `PlainJavaInitialization.initializePlainJavaLayout()` becomes the explicit layered registration plus
//     `initElkReflect()` in `beforeAll`.
//   - `assertThat(list, is(list))` on `LNode`/`LPort`/`Layer` lists becomes `expectSameElements` (identity per element).
//   - `list.get(i)` becomes `list[i]!` (the index is in range in every test); a null `getNestedGraph()` is `!`.
//   - `crossMin.getGraphData()` is `GraphInfoHolder[] | null` here (null before the first run); `graphData()` throws on
//     null, where Java would throw a NullPointerException on the dereference.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { Random } from '../../../java/util/Random.js';
import { expectSameElements } from '../../../../test/helpers/junit-asserts.js';
import { TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizer } from './LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';

// Java: `@Parameters(name = "{0}")` over `{ BARYCENTER }, { ONE_SIDED_GREEDY_SWITCH }`; the label is the enum's toString.
const CROSS_MIN_TYPES: ReadonlyArray<readonly [string, CrossMinType]> = [
  [CrossMinType.BARYCENTER.toString(), CrossMinType.BARYCENTER],
  [CrossMinType.ONE_SIDED_GREEDY_SWITCH.toString(), CrossMinType.ONE_SIDED_GREEDY_SWITCH],
];

// Java: `@BeforeClass init()` runs `PlainJavaInitialization.initializePlainJavaLayout()`.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

/** Assumes both nodes to actually be in layer. */
function inOrder(firstNode: LNode, secondNode: LNode, layer: Layer): boolean {
  for (const node of layer) {
    if (node === firstNode) {
      return true;
    } else if (node === secondNode) {
      return false;
    }
  }
  return false;
}

function reverse(rightOuterPorts: readonly LPort[]): LPort[] {
  const res: LPort[] = [];
  for (let i = 0; i < rightOuterPorts.length; i++) {
    res[rightOuterPorts.length - 1 - i] = rightOuterPorts[i]!;
  }
  return res;
}

/** Java `graph.getLayers().get(index)`. */
function layerOf(graph: LGraph, index: number): Layer {
  return graph.getLayers()[index]!;
}

describe.each(CROSS_MIN_TYPES)('LayerSweepCrossingMinimizerTest %s', (_label, crossMinType) => {
  let creator: TestGraphCreator;
  let crossMin: LayerSweepCrossingMinimizer;

  beforeEach(() => {
    creator = new TestGraphCreator();
    crossMin = new LayerSweepCrossingMinimizer(crossMinType);
  });

  function setUpAndMinimizeCrossings(): void {
    if (crossMinType === CrossMinType.BARYCENTER) {
      creator.getGraph().setProperty(LayeredOptions.THOROUGHNESS, 1);
    }
    crossMin.process(creator.getGraph(), new BasicProgressMonitor());
  }

  function graphData(): GraphInfoHolder[] {
    const data = crossMin.getGraphData();
    if (data === null) {
      throw new TypeError('getGraphData() is null: the minimizer has not run');
    }
    return data;
  }

  function makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode: LNode, rightOuterPorts: readonly LPort[]): LGraph {
    const rightInnerGraph = creator.nestedGraph(rightOuterNode);
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(rightInnerGraph),
      rightOuterPorts,
    );
    const rightInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(rightInnerGraph));
    creator.eastWestEdgeFromTo(rightInnerDummyNodes[0]!, rightInnerNodes[0]!);
    creator.eastWestEdgeFromTo(rightInnerDummyNodes[1]!, rightInnerNodes[1]!);
    return rightInnerGraph;
  }

  function makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode: LNode, leftOuterPorts: readonly LPort[]): LGraph {
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, leftInnerDummyNodes[1]!);
    return leftInnerGraph;
  }

  it('givenOneNode_ShouldntCrash', () => {
    creator.getOneNodeGraph();

    setUpAndMinimizeCrossings();
    // should cause no errors
  });

  it('givenNoNode_ShouldntCrash', () => {
    setUpAndMinimizeCrossings();
    // should cause no errors
  });

  /**
   * ```
   * ________
   * |___  *|
   * || |\/ |
   * || |/\ |
   * ||_|  *|
   * |------|
   * ```
   * Sweep backward first.
   */
  it('givenCompoundGraphWhereOrderIsOnlyCorrectedOnForwardSweep_RemovesCrossing', () => {
    const node = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const innerGraph = creator.nestedGraph(node);
    const leftInnerNode = creator.addNodeToLayer(creator.makeLayer(innerGraph));
    creator.setFixedOrderConstraint(leftInnerNode);
    const rightInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    creator.eastWestEdgeFromTo(leftInnerNode, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNode, rightInnerNodes[0]!);

    const rightInnerLayer = innerGraph.getLayers()[1]!;
    const expectedOrderRightInner = creator.switchOrderOfNodesInLayer(0, 1, rightInnerLayer);
    const expectedPortOrderLeft = creator.copyPortsInIndexOrder(leftInnerNode, 0, 1);

    creator.getRandom().setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(leftInnerNode.getPorts(), expectedPortOrderLeft);
    expectSameElements(rightInnerLayer.getNodes(), expectedOrderRightInner);
  });

  /**
   * ```
   * ______
   * |*  *|
   * | \/ |
   * | /\ |
   * |*  *|
   * |----|
   * ```
   */
  it('givenSingleHierarchicalNodeWithCross_RemovesCrossing', () => {
    const node = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const innerGraph = creator.nestedGraph(node);
    const innerNodesleft = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    const innerNodesRight = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    creator.eastWestEdgeFromTo(innerNodesleft[0]!, innerNodesRight[1]!);
    creator.eastWestEdgeFromTo(innerNodesleft[1]!, innerNodesRight[0]!);

    const expectedOrderRightBaryCenter = creator.switchOrderOfNodesInLayer(0, 1, layerOf(innerGraph, 1));

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(innerGraph, 1).getNodes(), expectedOrderRightBaryCenter);
  });

  /**
   * ```
   * ____  ____
   * |*-+  +-*|
   * |  |\/|  |
   * |*-+/\+-*|
   * |--|  |--|
   * ```
   */
  it('givenSimpleHierarchicalCross_ShouldResultInNoCrossing', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);

    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);

    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    const rightInnerGraph = makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    const expectedExternalDummyOrderRight = creator.switchOrderOfNodesInLayer(0, 1, layerOf(rightInnerGraph, 0));
    const expectedNormalNodeOrderRight = creator.switchOrderOfNodesInLayer(0, 1, layerOf(rightInnerGraph, 1));

    const expectedOrderOfPortsRight = [rightOuterPorts[1]!, rightOuterPorts[0]!];

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.1, creator.graph);
    setUpAndMinimizeCrossings();
    const actualExternalDummyOrderRight = layerOf(rightInnerGraph, 0).getNodes();
    expectSameElements(actualExternalDummyOrderRight, expectedExternalDummyOrderRight);
    expectSameElements(rightOuterNode.getPorts(), expectedOrderOfPortsRight);

    const actualNormalOrderRight = layerOf(rightInnerGraph, 1).getNodes();
    expectSameElements(actualNormalOrderRight, expectedNormalNodeOrderRight);
  });

  /**
   * ```
   * ____  ____
   * |*-+  +-*|
   * |  |\/|  |
   * |*-+/\+-*|
   * |--|  |--|
   * ```
   */
  it('givenSimpleHierarchicalCrossSweepingFromRightToLeft_ShouldResultInNoCrossing', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);

    const leftInnerGraph = makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    const expectedNodeOrderLeft = creator.switchOrderOfNodesInLayer(0, 1, layerOf(leftInnerGraph, 0));

    const expectedOrderOfPortsLeft = [leftOuterPorts[1]!, leftOuterPorts[0]!];

    creator.getRandom().setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(leftOuterNode.getPorts(), expectedOrderOfPortsLeft);
    expectSameElements(layerOf(leftInnerGraph, 0).getNodes(), expectedNodeOrderLeft);
  });

  /**
   * ```
   * ___        ___
   * | |===*  --| |
   * | |    \/  | |
   * | |    /\  | |
   * |_|===*  --|_|
   *       ___  ___
   *       | |\/| |
   *       |_|/\|_|
   * .           ^
   *           port orders fixed
   * ```
   * First Layer and last layer in fixed order.
   */
  it('althoughBackwardSweepNotTakenStillCorrectsPortOrder', () => {
    const layers = creator.makeLayers(3);
    const leftNode = creator.addNodeToLayer(layers[0]!);
    const middleNodes = creator.addNodesToLayer(3, layers[1]!);
    const rightNodes = creator.addNodesToLayer(2, layers[2]!);

    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightNodes[0]!);

    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);

    creator.setFixedOrderConstraint(rightNodes[1]!);
    creator.setFixedOrderConstraint(rightNodes[0]!);
    creator.setFixedOrderConstraint(leftNode);

    creator.setUpIds();
    const expectedPortOrderBottomMiddleNode = creator.copyPortsInIndexOrder(middleNodes[2]!, 1, 0);

    setUpAndMinimizeCrossings();

    const middleLayer = creator.getGraph().getLayers()[1]!;
    expect(inOrder(middleNodes[0]!, middleNodes[1]!, middleLayer), middleLayer.toString()).toBe(true);
    expectSameElements(middleNodes[2]!.getPorts(), expectedPortOrderBottomMiddleNode);
  });

  /**
   * ```
   * ___        ___
   * | |---*  --| |
   * | |    \/  | |
   * | |    /\  | |
   * |_|---*  --|_|
   *       ___  ___
   *       | |\/| |
   *       |_|/\|_|
   *             ^
   *           port orders fixed
   * ```
   * First Layer and last layer in fixed order. Should leave this order, since the fixable port order is already
   * corrected before counting.
   */
  it('doesNotCountRemovablePortCrossing', () => {
    const layers = creator.makeLayers(3);
    const leftNode = creator.addNodeToLayer(layers[0]!);
    const middleNodes = creator.addNodesToLayer(3, layers[1]!);
    const rightNodes = creator.addNodesToLayer(2, layers[2]!);

    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightNodes[0]!);

    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);

    creator.setFixedOrderConstraint(rightNodes[1]!);
    creator.setFixedOrderConstraint(rightNodes[0]!);
    creator.setFixedOrderConstraint(leftNode);

    creator.setUpIds();

    const expectedPortOrderBottomMiddleNode = creator.copyPortsInIndexOrder(middleNodes[2]!, 1, 0);

    setUpAndMinimizeCrossings();

    const middleLayer = creator.getGraph().getLayers()[1]!;
    expect(inOrder(middleNodes[0]!, middleNodes[1]!, middleLayer), middleLayer.toString()).toBe(true);
    expectSameElements(middleNodes[2]!.getPorts(), expectedPortOrderBottomMiddleNode);
  });

  /**
   * ```
   * *   ___
   *  \  | |
   * *-+-| |
   *   |/|_|
   *   |\
   *   --*
   * ```
   */
  it('resolvesInLayerPortOrderCrossingsAfterSwitch', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const middleNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));

    creator.eastWestEdgeFromTo(leftNodes[0]!, middleNodes[1]!);
    creator.addInLayerEdge(middleNodes[1]!, middleNodes[0]!, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNodes[1]!, middleNodes[0]!);
    creator.setUpIds();

    const expectedNodeOrderMiddleLayer = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    const expectedPortOrderMiddleTopNode = creator.copyPortsInIndexOrder(middleNodes[0]!, 1, 0);

    setUpAndMinimizeCrossings();

    if (crossMinType === CrossMinType.BARYCENTER) {
      expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedNodeOrderMiddleLayer);
      expectSameElements(middleNodes[0]!.getPorts(), expectedPortOrderMiddleTopNode);
    }
  });

  /**
   * ```
   * ____  ____
   * |*-+  | *|
   * |  |\/|  |
   * |*-+/\| *|
   * |--|  |--|
   * ```
   */
  it('givenCrossWithNoExternalPortDummiesOnOneNestedGraph_ShouldRemoveCrossing', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    const rightInnerGraph = creator.nestedGraph(rightOuterNode);
    creator.addNodesToLayer(2, creator.makeLayer(rightInnerGraph));

    const expectedPortOrderRight = [rightOuterPorts[1]!, rightOuterPorts[0]!];

    setUpAndMinimizeCrossings();

    expectSameElements(rightOuterNode.getPorts(), expectedPortOrderRight);
  });

  /**
   * ```
   * ____
   * |*-+  *
   * |  |\/
   * |*-+/\
   * |--|  *
   * ```
   */
  it('givenCrossBetweenCompoundAndNonCompoundNodes_ShouldRemoveCrossing', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[0]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    const expectedOrderRight = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedOrderRight);
  });

  /**
   * ```
   * ______
   * |*  *+-*
   * | \/ |
   * | /\ |
   * |*  *+-*
   * |----|
   * ```
   */
  it('givenCrossInFirstLevelCompoundNode_ShouldRemoveCrossing', () => {
    // parent graph
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[1]!);

    // child graph
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodesleft = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerNodesRight = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodesRight[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodesRight[1]!, leftInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[0]!, leftInnerNodesRight[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[1]!, leftInnerNodesRight[0]!);

    const expectedOrderRight = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedOrderRight);
  });

  /**
   * ```
   *    ___
   * *  | |
   *  \/| |
   *  /\| |
   * *  |_|
   * ```
   * port order fixed.
   */
  it('givenGraphWithoutNesting_ShouldImproveOnBackwardSweep', () => {
    const leftLayer = creator.makeLayer(creator.getGraph());
    const rightLayer = creator.makeLayer(creator.getGraph());
    const leftTopNode = creator.addNodeToLayer(leftLayer);
    const leftBottomNode = creator.addNodeToLayer(leftLayer);
    const rightNode = creator.addNodeToLayer(rightLayer);
    rightNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    creator.eastWestEdgeFromTo(leftTopNode, rightNode);
    creator.eastWestEdgeFromTo(leftBottomNode, rightNode);

    const expectedOrderLayerOne = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);

    creator.getRandom().setNextBoolean(false); // sweeps backward
    setUpAndMinimizeCrossings();

    // Java message: "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
  });

  /**
   * ```
   *    *
   *   /
   *  /
   * *  *
   *  \/
   *  /\
   * *  *
   * ```
   */
  it('givenSimpleGraph_ShouldNotBeReorderedRandomlyOnBackwardSweep', () => {
    const layers = creator.makeLayers(2);
    const leftNodes = creator.addNodesToLayer(2, layers[0]!);
    const rightNodes = creator.addNodesToLayer(3, layers[1]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftNodes[0]!, rightNodes[2]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, rightNodes[1]!);

    const expectedOrderLayerTwo = creator.copyOfSwitchOrderOfNodesInLayer(1, 2, 1);
    const expectedOrderLayerOne = creator.copyOfNodesInLayer(0);

    setUpAndMinimizeCrossings();

    // Java messages: "Layer two", "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
  });

  /**
   * ```
   * ___     ___
   * | |\ /*-| |
   * | |\x/  | |
   * | |/x\  | |
   * |_|/ \*-|_|
   * ```
   * port order fixed.
   */
  it('givenGraphWhichWorsensOnBackwardSweep_ShouldTakeResultOfForwardSweep', () => {
    const layers = creator.makeLayers(3);
    const leftNode = creator.addNodeToLayer(layers[0]!);
    creator.setFixedOrderConstraint(leftNode);
    const middleNodes = creator.addNodesToLayer(2, layers[1]!);
    const rightNode = creator.addNodeToLayer(layers[2]!);
    creator.setFixedOrderConstraint(rightNode);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightNode);
    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNode);

    const expectedOrderLayerTwo = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();

    // Java message: "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  /**
   * ```
   * ____  ____
   * |*-+  +-*|
   * |  |\/|  |
   * |*-+/\+-*|
   * |--|  |--|
   * ```
   * With external origins of port dummies on right node wrong way around.
   */
  it('givenNestedGraphWithWronglySortedDummyNodes_ShouldSortAndResolveCrossing', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);

    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    const rightInnerGraph = creator.nestedGraph(rightOuterNode);
    const reversedRightPorts = reverse(rightOuterPorts);
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(rightInnerGraph),
      reversedRightPorts,
    );
    const rightInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(rightInnerGraph));
    creator.eastWestEdgeFromTo(rightInnerDummyNodes[1]!, rightInnerNodes[0]!);
    creator.eastWestEdgeFromTo(rightInnerDummyNodes[0]!, rightInnerNodes[1]!);

    const expectedNormalNodeOrderRight = creator.switchOrderOfNodesInLayer(0, 1, layerOf(rightInnerGraph, 1));

    const expectedOrderOfPortsRight = [rightOuterPorts[1]!, rightOuterPorts[0]!];

    setUpAndMinimizeCrossings();
    const actualExternalDummyOrderRight = layerOf(rightInnerGraph, 0).getNodes();
    expectSameElements(actualExternalDummyOrderRight, [...rightInnerDummyNodes]);

    expectSameElements(rightOuterNode.getPorts(), expectedOrderOfPortsRight);

    const actualNormalOrderRight = layerOf(rightInnerGraph, 1).getNodes();
    expectSameElements(actualNormalOrderRight, expectedNormalNodeOrderRight);
  });

  /**
   * ```
   *       /*
   *      / ____
   * *   *==|  |
   * \\ //  |  |
   *  xx    |  |
   * // \\  |  |
   * *   *==|__|
   * ```
   * This test was used in development and can be reused if there is a problem with the thoroughness value. It is
   * deactivated because it depends on a random value and is slow.
   */
  // Java: `@Ignore` without `@Test` (JUnit never collects it). The body keeps Java's unseeded `new Random()`.
  it.skip('givenGraphWhichCanBeRepairedGivenGoodRandomStart_ShouldFindBestSolution', () => {
    const layers = creator.makeLayers(3);
    const leftNodes = creator.addNodesToLayer(2, layers[0]!);
    const middleNodes = creator.addNodesToLayer(2, layers[1]!);
    const rightNodes = creator.addNodesToLayer(3, layers[2]!);
    creator.setFixedOrderConstraint(rightNodes[1]!);
    creator.eastWestEdgesFromTo(2, leftNodes[0]!, middleNodes[1]!);
    creator.eastWestEdgesFromTo(2, leftNodes[1]!, middleNodes[0]!);
    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgesFromTo(2, middleNodes[1]!, rightNodes[1]!);
    creator.eastWestEdgesFromTo(2, middleNodes[0]!, rightNodes[1]!);

    const expectedWrongOrder = creator.copyOfNodesInLayer(0);
    const expectedCorrectOrder = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 0).getNodes(), expectedWrongOrder);

    creator.getGraph().setProperty(InternalProperties.RANDOM, new Random()); // AAA! Random in Test!!!
    creator.getGraph().setProperty(LayeredOptions.THOROUGHNESS, 100);
    for (let i = 0; i < 100; i++) {
      setUpAndMinimizeCrossings();
      expectSameElements(layerOf(creator.getGraph(), 0).getNodes(), expectedCorrectOrder);
      const nodes = layerOf(creator.getGraph(), 0).getNodes();
      nodes.length = 0;
      nodes.push(...expectedWrongOrder);
    }
  });

  /**
   * ```
   * ____
   * |  |\ /-*
   * |  | x
   * |*-+/ \-*
   * |--|
   * ```
   */
  it('givenGraphWithNormalEdgeAndHierarchicalEdgeCrossing_ShouldRemoveCrossing', () => {
    const layers = creator.makeLayers(2);
    const leftOuterNode = creator.addNodeToLayer(layers[0]!);
    const rightNodes = creator.addNodesToLayer(2, layers[1]!);
    creator.eastWestEdgeFromTo(leftOuterNode, rightNodes[1]!);

    const innerLayers = creator.makeLayers(2, creator.nestedGraph(leftOuterNode));
    const innerNormalNode = creator.addNodeToLayer(innerLayers[0]!);
    const hierarchPort = creator.addPortOnSide(leftOuterNode, PortSide.EAST);
    const innerDummyNode = creator.addExternalPortDummyNodeToLayer(innerLayers[1]!, hierarchPort);
    creator.eastWestEdgeFromTo(innerNormalNode, innerDummyNode);

    const rightTopPort = creator.addPortOnSide(rightNodes[0]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(hierarchPort, rightTopPort);

    const expectedCorrectOrder = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedCorrectOrder);
  });

  /**
   * ```
   * ____
   * |  |\ /-*
   * |  | x
   * |*-+/ \-*
   * |  p
   * |--|
   * ```
   * p is a port with no edge.
   */
  it('givenGraphWithPortWithoutEdge_ShouldRemoveCrossing', () => {
    const layers = creator.makeLayers(2);
    const leftOuterNode = creator.addNodeToLayer(layers[0]!);
    const rightNodes = creator.addNodesToLayer(2, layers[1]!);
    creator.eastWestEdgeFromTo(leftOuterNode, rightNodes[1]!);

    const innerLayers = creator.makeLayers(2, creator.nestedGraph(leftOuterNode));
    const innerNormalNode = creator.addNodeToLayer(innerLayers[0]!);
    const hierarchPort = creator.addPortOnSide(leftOuterNode, PortSide.EAST);
    const innerDummyNode = creator.addExternalPortDummyNodeToLayer(innerLayers[1]!, hierarchPort);
    creator.eastWestEdgeFromTo(innerNormalNode, innerDummyNode);

    creator.addPortOnSide(leftOuterNode, PortSide.EAST);

    const rightTopPort = creator.addPortOnSide(rightNodes[0]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(hierarchPort, rightTopPort);

    const expectedCorrectOrder = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();
    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedCorrectOrder);
  });

  /**
   * ```
   * ___   ____
   * | o---o  |
   * | |\  |  |
   * |_o-+-o  |
   *     | |__|
   *      \
   *       *
   * ```
   * Right layer has fixed port order, left has free.
   */
  // Java: `@Ignore` without `@Test` (JUnit never collects it).
  it.skip('showsErrorInCrossingCountingAlgorithmsForFreePortOrder', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    creator.setFixedOrderConstraint(rightNodes[0]!);
    creator.setFixedOrderConstraint(rightNodes[1]!);
    // setFixedOrderConstraint(leftNode);
    const leftTopPort = creator.addPortOnSide(leftNode, PortSide.EAST);
    const leftLowerPort = creator.addPortOnSide(leftNode, PortSide.EAST);
    const rightUpperNodeLowerPort = creator.addPortOnSide(rightNodes[0]!, PortSide.WEST);
    const rightUpperNodeTopPort = creator.addPortOnSide(rightNodes[0]!, PortSide.WEST);
    const rightLowerPort = creator.addPortOnSide(rightNodes[1]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftTopPort, rightUpperNodeTopPort);
    creator.addEdgeBetweenPorts(leftTopPort, rightLowerPort);
    creator.addEdgeBetweenPorts(leftLowerPort, rightUpperNodeLowerPort);

    const expectedCorrectOrder = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedCorrectOrder);
  });

  /**
   * ```
   * ___  ____
   * | |\/+-*|
   * |_|/\|  |
   *      |--|
   * ```
   */
  it('nonRecursive_givenGraphWithCrossingWithFixedPortOrderToHierarchicalGraph_ShouldRemoveCrossing', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.setFixedOrderConstraint(leftNode);
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.eastWestEdgeFromTo(leftNode, rightOuterNode);
    const rightOuterPort = creator.addPortOnSide(rightOuterNode, PortSide.WEST);
    const leftLowerPort = creator.addPortOnSide(leftNode, PortSide.EAST);
    creator.addEdgeBetweenPorts(leftLowerPort, rightOuterPort);

    const rightInnerGraph = creator.nestedGraph(rightOuterNode);
    const rightInnerDummyNode = creator.addExternalPortDummyNodeToLayer(
      creator.makeLayer(rightInnerGraph),
      rightOuterPort,
    );
    const rightInnerNode = creator.addNodeToLayer(creator.makeLayer(rightInnerGraph));
    creator.eastWestEdgeFromTo(rightInnerDummyNode, rightInnerNode);

    const expectedPortOrderRight = [rightOuterNode.getPorts()[1]!, rightOuterNode.getPorts()[0]!];

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 1.0, creator.graph);

    setUpAndMinimizeCrossings();
    expectSameElements(layerOf(creator.getGraph(), 1).getNodes()[0]!.getPorts(), expectedPortOrderRight);
  });

  /**
   * ```
   * ____  _____
   * |  |  +-*-+-*
   * |  |\/|   |
   * |  |/\+-*-+-*
   * |--|  |---|
   * ```
   */
  it('givenGraphWhichMustTransportSwitchedPortOrderThroughHierarchy_ShouldContainNoCrossing', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.setFixedOrderConstraint(leftNode);
    const middleOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));

    const middleOuterRightPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(middleOuterRightPorts[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(middleOuterRightPorts[1]!, rightNodes[1]!);

    const leftPorts = creator.addPortsOnSide(2, leftNode, PortSide.EAST);
    const middleOuterLeftPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftPorts[0]!, middleOuterLeftPorts[0]!);
    creator.addEdgeBetweenPorts(leftPorts[1]!, middleOuterLeftPorts[1]!);

    const innerGraph = creator.nestedGraph(middleOuterNode);
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(innerGraph),
      middleOuterLeftPorts,
    );
    const innerNodes = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(innerGraph),
      middleOuterRightPorts,
    );

    creator.eastWestEdgeFromTo(innerNodes[0]!, rightInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(innerNodes[1]!, rightInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[0]!, innerNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[1]!, innerNodes[1]!);

    const expextedPorts = creator.copyPortsInIndexOrder(middleOuterNode, 1, 0, 3, 2);

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes()[0]!.getPorts(), expextedPorts);
  });

  /**
   * ```
   *    _____  ____
   * *--+-*-+  |  |
   *    |   |\/|  |
   * *--+-*-+/\|  |
   *    |---|  |--|
   * ```
   */
  it('givenGraphTransportsSwitchedPortsThroughHierarchyFromEastToWest_ShouldContainNoCrossing', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const middleOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    creator.setFixedOrderConstraint(rightNode);

    const leftPortsRightNode = creator.addPortsOnSide(2, rightNode, PortSide.WEST);
    const middleOuterRightPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.EAST);
    creator.addEdgeBetweenPorts(middleOuterRightPorts[0]!, leftPortsRightNode[0]!);
    creator.addEdgeBetweenPorts(middleOuterRightPorts[1]!, leftPortsRightNode[1]!);

    const middleOuterLeftPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNodes[0]!, middleOuterLeftPorts[1]!);
    creator.eastWestEdgeFromTo(leftNodes[1]!, middleOuterLeftPorts[0]!);

    const innerGraph = creator.nestedGraph(middleOuterNode);
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(innerGraph),
      middleOuterLeftPorts,
    );
    const innerNodes = creator.addNodesToLayer(2, creator.makeLayer(innerGraph));
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(innerGraph),
      middleOuterRightPorts,
    );

    creator.eastWestEdgeFromTo(innerNodes[0]!, rightInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(innerNodes[1]!, rightInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[0]!, innerNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[1]!, innerNodes[1]!);

    const expectedPortOrderMiddleNode = creator.copyPortsInIndexOrder(middleOuterNode, 1, 0, 3, 2);

    // sweep backward
    creator.getRandom().setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes()[0]!.getPorts(), expectedPortOrderMiddleNode);
  });

  /**
   * ```
   *  *-------
   * ____  __|_
   * |*-+  +-*|
   * |  |\/|  |
   * |*-+/\+-*|
   * |--|  |--|
   *   |_____*
   * ```
   */
  it('givenSimpleHierarchicalCrossWithNorthSouthEdge_ShouldResultInNoCrossing', () => {
    const leftNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const leftOuterNode = leftNodes[1]!;
    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer(creator.getGraph()));
    const rightOuterNode = rightNodes[1]!;

    // adds first port, so must be before other edges.
    creator.addNorthSouthEdge(PortSide.NORTH, rightOuterNode, rightNodes[0]!, leftNodes[0]!, true);
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);

    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    creator.addNorthSouthEdge(PortSide.SOUTH, leftOuterNode, leftNodes[2]!, rightNodes[2]!, false);

    const rightInnerGraph = makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    const expectedExternalDummyOrderRight = creator.switchOrderOfNodesInLayer(0, 1, layerOf(rightInnerGraph, 0));
    const expectedNormalNodeOrderRight = creator.switchOrderOfNodesInLayer(0, 1, layerOf(rightInnerGraph, 1));

    const expectedOrderOfPortsRight = [rightOuterNode.getPorts()[0]!, rightOuterPorts[1]!, rightOuterPorts[0]!];

    setUpAndMinimizeCrossings();
    const actualExternalDummyOrderRight = layerOf(rightInnerGraph, 0).getNodes();
    expectSameElements(actualExternalDummyOrderRight, expectedExternalDummyOrderRight);

    expectSameElements(rightOuterNode.getPorts(), expectedOrderOfPortsRight);

    const actualNormalOrderRight = layerOf(rightInnerGraph, 1).getNodes();
    expectSameElements(actualNormalOrderRight, expectedNormalNodeOrderRight);
  });

  /**
   * ```
   * ____  _____
   * |*-+  +-* |
   * |  |\/|   |
   * |*-+/\+-* |
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |  |  |*-*|
   * |--|  |---|
   * ```
   */
  it('givenSimpleHierarchicalNodeWithLowConnectivity_DoesNotUseHierarchySweep', () => {
    if (crossMinType === CrossMinType.BARYCENTER) {
      const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
      const rightOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
      const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
      const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);

      creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[0]!);
      creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[1]!);
      const leftInnerGraph = makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
      const rightInnerGraph = makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);
      const leftLayer = layerOf(rightInnerGraph, 1);
      const leftNodes = creator.addNodesToLayer(7, leftLayer);
      const rightNodes = creator.addNodesToLayer(7, creator.makeLayer(rightInnerGraph));
      for (let i = 0; i < 7; i++) {
        creator.eastWestEdgeFromTo(leftNodes[i]!, rightNodes[i]!);
      }

      creator.getGraph().setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.2);

      const expectedExternalDummyOrderRight = [...layerOf(rightInnerGraph, 0)];
      const expectedOrderOfPortsRight = [...rightOuterPorts];
      const expectedNodeOrderLeftInner = creator.switchOrderOfNodesInLayer(0, 1, layerOf(leftInnerGraph, 0));

      setUpAndMinimizeCrossings();
      const actualExternalDummyOrderRight = layerOf(rightInnerGraph, 0).getNodes();
      expectSameElements(actualExternalDummyOrderRight, expectedExternalDummyOrderRight);

      expectSameElements(rightOuterNode.getPorts(), expectedOrderOfPortsRight);

      const actualNormalOrderLeft = layerOf(leftInnerGraph, 0).getNodes();
      expectSameElements(actualNormalOrderLeft, expectedNodeOrderLeftInner);
    }
  });

  /**
   * ```
   *
   * __________________
   * |___        ___  |
   * || |===*  --| |  |    ______
   * || |    \/  | |  |    |*  *|
   * || |    /\  | |  |----| \/ |
   * ||_|===*  --|_|  |    | /\ |
   * |      ___  ___  |    |*  *|
   * |      | |\/| |  |    |____|
   * |      |_|/\|_|  |
   * |____________^___|
   * .            |
   *           port orders fixed
   * ```
   * First Layer and last layer in fixed order.
   */
  it('inRecursiveLayout_althoughBackwardSweepNotTakenStillCorrectsPortOrder', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());

    creator.eastWestEdgeFromTo(leftOuterNode, rightOuterNode);

    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const layers = creator.makeLayers(3, leftInnerGraph);
    const leftNode = creator.addNodeToLayer(layers[0]!);
    const middleNodes = creator.addNodesToLayer(3, layers[1]!);
    const rightNodes = creator.addNodesToLayer(2, layers[2]!);

    creator.eastWestEdgeFromTo(middleNodes[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightNodes[0]!);

    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[2]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);
    creator.eastWestEdgeFromTo(leftNode, middleNodes[1]!);

    creator.setFixedOrderConstraint(rightNodes[1]!);
    creator.setFixedOrderConstraint(rightNodes[0]!);
    creator.setFixedOrderConstraint(leftNode);

    const rightInnerGraph = creator.nestedGraph(rightOuterNode);
    const rightGraphLeftNodes = creator.addNodesToLayer(2, creator.makeLayer(rightInnerGraph));
    const rightGraphRightNodes = creator.addNodesToLayer(2, creator.makeLayer(rightInnerGraph));

    creator.eastWestEdgeFromTo(rightGraphLeftNodes[0]!, rightGraphRightNodes[1]!);
    creator.eastWestEdgeFromTo(rightGraphLeftNodes[1]!, rightGraphRightNodes[0]!);
    creator.setUpIds();

    if (crossMinType === CrossMinType.BARYCENTER) {
      const expectedPortOrderBottomMiddleNode = creator.copyPortsInIndexOrder(middleNodes[2]!, 1, 0);

      setUpAndMinimizeCrossings();

      const middleLayer = layerOf(leftInnerGraph, 1);
      expect(inOrder(middleNodes[0]!, middleNodes[1]!, middleLayer), middleLayer.toString()).toBe(true);
      expectSameElements(middleNodes[2]!.getPorts(), expectedPortOrderBottomMiddleNode);
    }
  });

  /**
   * ```
   * _______
   * |*  *-|--*
   * | \/  |
   * | /\  |
   * |*  *-|--*
   * |*--* |
   * |*--* |
   * |*--* |
   * |*--* |
   * |*--* |
   * |*--* |
   * |-----|
   * ```
   */
  it('recursiveLayout_givenCrossInFirstLevelCompoundNode_sortsPortsAccordingly', () => {
    // parent graph
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[1]!);

    // child graph
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodesLeft = creator.addNodesToLayer(9, creator.makeLayer(leftInnerGraph));
    const leftInnerNodesRight = creator.addNodesToLayer(9, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodesRight[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodesRight[1]!, leftInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesLeft[0]!, leftInnerNodesRight[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesLeft[1]!, leftInnerNodesRight[0]!);

    for (let i = 2; i < leftInnerNodesLeft.length; i++) {
      creator.eastWestEdgeFromTo(leftInnerNodesLeft[i]!, leftInnerNodesRight[i]!);
    }

    const expectedOrderRight = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    const expectedPortOrderLeft = creator.copyPortsInIndexOrder(leftOuterNode, 1, 0);

    setUpAndMinimizeCrossings();

    if (crossMinType === CrossMinType.BARYCENTER) {
      expectSameElements(leftOuterNode.getPorts(), expectedPortOrderLeft);
      expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedOrderRight);
    }
  });

  /**
   * ```
   * ___
   * | |==|
   * | |  |
   * | |--+--*
   * |_|--|--*
   *  ^
   *fixed port order
   * ```
   */
  it('doesNotChangeLayoutDueToHyperedgeCounter', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const lowerRightNodePort = creator.addPortOnSide(rightNodes[1]!, PortSide.WEST);
    const lowerRightNodePort2 = creator.addPortOnSide(rightNodes[1]!, PortSide.WEST);
    const leftNodePorts = creator.addPortsOnSide(3, leftNode, PortSide.EAST);

    creator.addEdgeBetweenPorts(leftNodePorts[0]!, lowerRightNodePort2);
    creator.addEdgeBetweenPorts(leftNodePorts[0]!, lowerRightNodePort2);
    creator.eastWestEdgeFromTo(leftNodePorts[1]!, rightNodes[0]!);
    creator.addEdgeBetweenPorts(leftNodePorts[2]!, lowerRightNodePort);
    creator.setPortOrderFixed(leftNode);

    const expectedOrderRight = [...rightNodes];

    creator.getRandom().setNextBoolean(false);
    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedOrderRight);
  });

  /**
   * ```
   *   --*
   *   |    ____
   *   //*--|-*|
   * //|    |  |
   *|| --*--|-*|
   *||      |__|
   * \\
   *  \\
   *   \\
   *     *
   * ```
   */
  it('inLayerCrossingsInLeftMostLayer', () => {
    const nodes = creator.addNodesToLayer(4, creator.makeLayer());
    const rightNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterPorts = creator.addPortsOnSide(2, rightNode, PortSide.WEST);
    makeNestedTwoNodeGraphWithWesternPorts(rightNode, rightOuterPorts);
    creator.eastWestEdgeFromTo(nodes[1]!, rightOuterPorts[1]!);
    creator.eastWestEdgeFromTo(nodes[2]!, rightOuterPorts[0]!);
    creator.addInLayerEdge(nodes[0]!, nodes[2]!, PortSide.WEST);
    const portSide = PortSide.WEST;
    const portOne = creator.addPortOnSide(nodes[1]!, portSide);
    const portTwo = creator.addPortOnSide(nodes[3]!, portSide);
    creator.addEdgeBetweenPorts(portOne, portTwo);
    creator.addEdgeBetweenPorts(portOne, portTwo);
    creator.setFixedOrderConstraint(rightNode);
    const actualOrder = layerOf(creator.getGraph(), 0).getNodes();

    const expectedOrder = creator.getListCopyInIndexOrder(actualOrder, 1, 0, 2, 3);

    setUpAndMinimizeCrossings();
    expectSameElements(actualOrder, expectedOrder);
  });

  /**
   * ```
   *       *
   *      ||
   *   ----*
   *   |  ____
   *   /-|-*|
   * / | |  |
   *|  --|-*| *
   *|    |__|
   * \
   *  \
   *   \
   *     --*
   *      ||
   *       *
   * ```
   */
  it('inLayerCrossHierarchyCrossingsInLeftMostLayer', () => {
    const nodes = creator.addNodesToLayer(5, creator.makeLayer());
    creator.addPortsOnSide(2, nodes[0]!, PortSide.WEST);
    creator.addNodeToLayer(creator.makeLayer());
    const topNodePorts = creator.addPortsOnSide(2, nodes[0]!, PortSide.WEST);
    const secondNodePorts = creator.addPortsOnSide(3, nodes[1]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(topNodePorts[0]!, secondNodePorts[2]!);
    creator.addEdgeBetweenPorts(topNodePorts[1]!, secondNodePorts[1]!);

    const outerPorts = creator.addPortsOnSide(2, nodes[2]!, PortSide.WEST);
    const inner = makeNestedTwoNodeGraphWithWesternPorts(nodes[2]!, outerPorts);

    const fifthNodePorts = creator.addPortsOnSide(3, nodes[3]!, PortSide.WEST);
    const sixthNodePorts = creator.addPortsOnSide(2, nodes[4]!, PortSide.WEST);
    creator.addEdgeBetweenPorts(fifthNodePorts[0]!, sixthNodePorts[1]!);
    creator.addEdgeBetweenPorts(fifthNodePorts[1]!, sixthNodePorts[0]!);

    creator.addEdgeBetweenPorts(outerPorts[0]!, fifthNodePorts[2]!);

    const actualPortOrder = nodes[2]!.getPorts();
    const expectedPortOrder = creator.getListCopyInIndexOrder(actualPortOrder, 1, 0);
    const actualNodeOrder = layerOf(creator.graph, 0).getNodes();
    const expectedNodeOrder = [...actualNodeOrder];
    const actualInnerNodeOrder = layerOf(inner, 1).getNodes();
    const expectedInnerNodeOrder = creator.getListCopyInIndexOrder(actualInnerNodeOrder, 1, 0);

    creator.graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 1.0);
    setUpAndMinimizeCrossings();
    expectSameElements(actualNodeOrder, expectedNodeOrder);
    expectSameElements(actualPortOrder, expectedPortOrder);
    expectSameElements(actualInnerNodeOrder, expectedInnerNodeOrder);
  });

  /**
   * ```
   * ______
   * |*  *+-*
   * | \/ |
   * | /\ |
   * |*  *+-*
   * |----|
   * ```
   */
  it('allRecursive_crossInFirstLevelCompoundNode_ShouldRemoveCrossing', () => {
    // parent graph
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, rightNodes[1]!);

    // child graph
    const leftInnerGraph = creator.nestedGraph(leftOuterNode);
    const leftInnerNodesleft = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerNodesRight = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(
      creator.makeLayer(leftInnerGraph),
      leftOuterPorts,
    );
    creator.eastWestEdgeFromTo(leftInnerNodesRight[0]!, leftInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodesRight[1]!, leftInnerDummyNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[0]!, leftInnerNodesRight[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodesleft[1]!, leftInnerNodesRight[0]!);
    creator.getGraph().setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1.0);

    const expectedOrderRight = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    const expectedInnerOrderRight = [leftInnerNodesRight[1]!, leftInnerNodesRight[0]!];

    setUpAndMinimizeCrossings();

    expectSameElements(layerOf(leftInnerGraph, 1).getNodes(), expectedInnerOrderRight);
    expectSameElements(layerOf(creator.getGraph(), 1).getNodes(), expectedOrderRight);
  });

  /**
   * ```
   * _______  _____
   * |   *-+--+-* |
   * |   *-+--+-* |
   * |_____|  |___|
   * ```
   */
  it('needsHierarchical_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[0]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    creator.graph.setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.1);

    setUpAndMinimizeCrossings();

    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   * _______   _____
   * |   *-+-*-+-* |
   * |   *-+-*-+-* |
   * |_____|   |___|
   *         ^
   *   fixed port order
   * ```
   */
  it('fixedOrderMustTransfer_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const middleNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.setFixedOrderConstraint(middleNodes[0]!);
    creator.setFixedOrderConstraint(middleNodes[1]!);
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, middleNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[0]!, rightOuterPorts[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightOuterPorts[1]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    setUpAndMinimizeCrossings();

    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   * _______ ___ _____
   * |   *-+-|*|-+-* |
   * |     | |_| |   |
   * |     | ___ |   |
   * |   *-+-|*|-+-* |
   * |     | |_| |   |
   * |_____|     |___|
   * ```
   */
  it('hierarchicalMustTransfer_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const middleNodes = creator.addNodesToLayer(2, creator.makeLayer());
    creator.addNodeToLayer(creator.makeLayer(creator.nestedGraph(middleNodes[0]!)));
    creator.addNodeToLayer(creator.makeLayer(creator.nestedGraph(middleNodes[1]!)));

    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftOuterPorts[0]!, middleNodes[0]!);
    creator.eastWestEdgeFromTo(leftOuterPorts[1]!, middleNodes[1]!);
    creator.eastWestEdgeFromTo(middleNodes[0]!, rightOuterPorts[0]!);
    creator.eastWestEdgeFromTo(middleNodes[1]!, rightOuterPorts[1]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    setUpAndMinimizeCrossings();

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1.0, creator.graph);
    const data = graphData();
    expect(data[leftOuterNode.getNestedGraph()!.id]!.dontSweepInto()).toBe(false);
    expect(data[rightOuterNode.getNestedGraph()!.id]!.dontSweepInto()).toBe(false);
  });

  /**
   * ```
   * _______  _____
   * |   *-+--+   |
   * |   *-+--+   |
   * |_____|  |___|
   *            ^
   *      fixed port order
   * ```
   */
  it('needsHierarchicalBecauseOfFixedOrder_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    creator.setFixedOrderConstraint(rightOuterNode);
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[0]!);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);

    setUpAndMinimizeCrossings();

    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   * _______  _____
   * |     +--+-* |
   * |     +--+-* |
   * |_____|  |___|
   *    ^
   * fixed port order
   * ```
   */
  it('needsHierarchicalBecauseOfFixedOrder2_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    creator.setFixedOrderConstraint(leftOuterNode);
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[0]!);
    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    setUpAndMinimizeCrossings();

    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   * _______  _____
   * |   * +--+ * |
   * |   * +--+ * |
   * |_____|  |___|
   * ```
   */
  // Java: `@Ignore // TODO case where bottom up has sortable ports.` without `@Test` (JUnit never collects it).
  it.skip('needsCrossHierarchy_checkWhetherMarked', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    creator.setFixedOrderConstraint(rightOuterNode);
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, rightOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, rightOuterPorts[0]!);

    const leftNestedGraph = creator.nestedGraph(leftOuterNode);
    creator.addNodesToLayer(2, creator.makeLayer(leftNestedGraph));
    creator.addExternalPortDummiesToLayer(creator.makeLayer(leftNestedGraph), leftOuterPorts);
    const rightNestedGraph = creator.nestedGraph(rightOuterNode);
    creator.addNodesToLayer(2, creator.makeLayer(rightNestedGraph));
    creator.addExternalPortDummiesToLayer(creator.makeLayer(rightNestedGraph), rightOuterPorts);

    setUpAndMinimizeCrossings();
    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   *    _____
   * *--+-* |
   *    p-* |
   *    |___|
   * ```
   * p is unconnected port.
   */
  it('singleCrossHierarchEdge_needsNoCrossHierarchy', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterPorts = creator.addPortsOnSide(2, rightOuterNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNode, rightOuterPorts[1]!);
    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.1, creator.graph);
    makeNestedTwoNodeGraphWithWesternPorts(rightOuterNode, rightOuterPorts);

    setUpAndMinimizeCrossings();
    for (const data of graphData()) {
      if (data.hasParent()) {
        expect(data.dontSweepInto()).toBe(false);
      }
    }
  });

  /**
   * ```
   *_____   _______
   *| *-+---p *\  |
   *|   |   | *-* |
   *|   |   |  x  |
   *|   |   | * | |
   *| *-+---+-*-*-+-*
   *|   |   |     |
   *|___|   |_____|
   * ```
   * p is unconnected port.
   */
  it('moreRandomThanHierarchicalPaths_ShouldNotCrossHierarchy', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    const middleOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterPorts = creator.addPortsOnSide(1, middleOuterNode, PortSide.EAST);
    const middleNodeLeftOuterPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, middleNodeLeftOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, middleNodeLeftOuterPorts[0]!);
    creator.eastWestEdgeFromTo(rightOuterPorts[0]!, rightNode);

    const nestedGraph = creator.nestedGraph(middleOuterNode);
    const leftDummies = creator.addExternalPortDummiesToLayer(creator.makeLayer(nestedGraph), middleNodeLeftOuterPorts);
    const leftInnerNodes = creator.addNodesToLayer(4, creator.makeLayer(nestedGraph));
    const rightInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(nestedGraph));
    const rightDummies = creator.addExternalPortDummiesToLayer(creator.makeLayer(nestedGraph), rightOuterPorts);
    creator.eastWestEdgeFromTo(leftDummies[0]!, leftInnerNodes[3]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, rightInnerNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, rightInnerNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[2]!, rightInnerNodes[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[3]!, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(rightInnerNodes[1]!, rightDummies[0]!);

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.0, nestedGraph);
    setUpAndMinimizeCrossings();
    const data = graphData();
    if (crossMinType === CrossMinType.BARYCENTER) {
      expect(data[nestedGraph.id]!.dontSweepInto()).toBe(true);
    }
  });

  /**
   * ```
   *_____   _______
   *| *-+---p *-| |
   *|   |   | *-* |
   *|   |   |  x  |
   *|   |   | * | |
   *| *-+---+-*-*-+-*
   *|   |   |     |
   *|___|   |_____|
   * ```
   * p is unconnected port.
   */
  it('moreRandomThanHierarchicalWithNorthSout_ShouldNotCrossHierarchy', () => {
    const leftOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const leftOuterPorts = creator.addPortsOnSide(2, leftOuterNode, PortSide.EAST);
    makeNestedTwoNodeGraphWithEasternPorts(leftOuterNode, leftOuterPorts);
    const middleOuterNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNode = creator.addNodeToLayer(creator.makeLayer());
    const rightOuterPorts = creator.addPortsOnSide(1, middleOuterNode, PortSide.EAST);
    const middleNodeLeftOuterPorts = creator.addPortsOnSide(2, middleOuterNode, PortSide.WEST);
    creator.addEdgeBetweenPorts(leftOuterPorts[0]!, middleNodeLeftOuterPorts[1]!);
    creator.addEdgeBetweenPorts(leftOuterPorts[1]!, middleNodeLeftOuterPorts[0]!);
    creator.eastWestEdgeFromTo(rightOuterPorts[0]!, rightNode);

    const nestedGraph = creator.nestedGraph(middleOuterNode);
    const leftDummies = creator.addExternalPortDummiesToLayer(creator.makeLayer(nestedGraph), middleNodeLeftOuterPorts);
    const leftInnerNodes = creator.addNodesToLayer(4, creator.makeLayer(nestedGraph));
    const rightInnerNodes = creator.addNodesToLayer(3, creator.makeLayer(nestedGraph));
    const rightDummies = creator.addExternalPortDummiesToLayer(creator.makeLayer(nestedGraph), rightOuterPorts);
    creator.eastWestEdgeFromTo(leftDummies[0]!, leftInnerNodes[3]!);
    creator.addNorthSouthEdge(PortSide.NORTH, rightInnerNodes[1]!, rightInnerNodes[0]!, leftInnerNodes[0]!, true);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, rightInnerNodes[2]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[2]!, rightInnerNodes[1]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[3]!, rightInnerNodes[2]!);
    creator.eastWestEdgeFromTo(rightInnerNodes[1]!, rightDummies[0]!);

    setUpAndMinimizeCrossings();
    const data = graphData();
    if (crossMinType === CrossMinType.BARYCENTER) {
      expect(data[nestedGraph.id]!.dontSweepInto()).toBe(true);
    }
  });

  /**
   * ```
   *       -*
   *____  / *
   *|*-0-x /
   *|  |/ x
   *|*-1-/ \
   *|__|    *
   * ^
   * port 0 before 1
   * ```
   */
  // Java: `// TODO This problem can currently not be solved by our algorithm :-(` and `@Ignore` without `@Test`.
  it.skip('sortOneWrongPort', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const ports = creator.addPortsOnSide(3, leftNode, PortSide.EAST);
    const leftInnerGraph = creator.nestedGraph(leftNode);
    const leftInnerNodes = creator.addNodesToLayer(2, creator.makeLayer(leftInnerGraph));
    const dummies = creator.addExternalPortDummiesToLayer(creator.makeLayer(leftInnerGraph), ports);
    creator.eastWestEdgeFromTo(leftInnerNodes[0]!, dummies[0]!);
    creator.eastWestEdgeFromTo(leftInnerNodes[1]!, dummies[2]!);

    const rightNodes = creator.addNodesToLayer(3, creator.makeLayer());
    creator.eastWestEdgeFromTo(ports[0]!, rightNodes[2]!);
    creator.eastWestEdgeFromTo(ports[1]!, rightNodes[0]!);
    creator.eastWestEdgeFromTo(ports[2]!, rightNodes[1]!);

    const expectedPortOrder = [leftNode.getPorts()[1]!, leftNode.getPorts()[0]!, leftNode.getPorts()[2]!];

    creator.random.setNextBoolean(false);
    creator.getGraph().setProperty(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1.0);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(creator.graph, new BasicProgressMonitor());

    expectSameElements(leftNode.getPorts(), expectedPortOrder);
  });
});
