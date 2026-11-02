// SPDX-License-Identifier: EPL-2.0
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/SwitchDeciderTest.java
//
// Mission 7c-tests (T8). One `it` per Java `@Test`, in Java order; the Java `@Parameters` become `describe.each` over
// the same two `CrossMinType`s.
//
// Java-to-TypeScript mapping, all forced by the language:
//   - `extends TestGraphCreator` becomes `creator: TestGraphCreator`; the Java field `graph` is `creator.graph`. The
//     test's own fields `decider`, `currentNodeOrder` and `freeLayerIndex` are `let`s reset in `beforeEach`.
//   - `PlainJavaInitialization.initializePlainJavaLayout()` becomes the explicit layered registration plus
//     `initElkReflect()` in `beforeAll`.
//   - `new SwitchDecider(freeLayerIndex, graph, crossingMatrixFiller, portPositions, graphData, oneSided)` (six
//     positional arguments in Java) becomes `new SwitchDecider(freeLayerIndex, graph, crossingMatrixFiller,
//     portPositions, { graphData, oneSided })` (7c: a record for the last two under the five-parameter limit);
//     `new int[n]` becomes `new Int32Array(n)`.
//   - `new GraphInfoHolder(g, type, new ArrayList<>())` (top-level graph, Java passes an empty list) becomes
//     `new GraphInfoHolder(g, type, [])`; `Lists.newArrayList(parentGraphData)` becomes `[parentGraphData]`.
//   - `assertThat(boolean, is(boolean))` becomes `toBe`; `list.get(i)` becomes `list[i]!` (in range in every test).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { NorthSouthEdgeTestGraphCreator } from '../../../../../test/helpers/NorthSouthEdgeTestGraphCreator.js';
import { TestGraphCreator } from '../../../../../test/helpers/TestGraphCreator.js';
import type { LNode } from '../../graph/LNode.js';
import { LayeredMetaDataProvider } from '../../options/LayeredMetaDataProvider.js';
import { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingMatrixFiller } from './CrossingMatrixFiller.js';
import { SwitchDecider } from './SwitchDecider.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

// Java: `@Parameters(name = "{0}")` over `{ ONE_SIDED_GREEDY_SWITCH }, { TWO_SIDED_GREEDY_SWITCH }`; the label is the
// enum's toString.
const GREEDY_TYPES: ReadonlyArray<readonly [string, CrossMinType]> = [
  [CrossMinType.ONE_SIDED_GREEDY_SWITCH.toString(), CrossMinType.ONE_SIDED_GREEDY_SWITCH],
  [CrossMinType.TWO_SIDED_GREEDY_SWITCH.toString(), CrossMinType.TWO_SIDED_GREEDY_SWITCH],
];

// Java: `@BeforeClass initPlainJavaLayout()` runs `PlainJavaInitialization.initializePlainJavaLayout()`.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

function getNPorts(currentOrder: readonly (readonly LNode[])[]): number {
  let nPorts = 0;
  for (const lNodes of currentOrder) {
    for (const n of lNodes) {
      nPorts += n.getPorts().length;
    }
  }
  return nPorts;
}

describe.each(GREEDY_TYPES)('SwitchDeciderTest %s', (_label, greedyType) => {
  let creator: TestGraphCreator;
  let decider: SwitchDecider;
  let currentNodeOrder: LNode[][];
  let freeLayerIndex: number;

  beforeEach(() => {
    creator = new TestGraphCreator();
  });

  function switchNodes(upperNodeIndex: number, lowerNodeIndex: number): void {
    const order = currentNodeOrder[freeLayerIndex]!;
    const upperNode = order[upperNodeIndex]!;
    order[upperNodeIndex] = order[lowerNodeIndex]!;
    order[lowerNodeIndex] = upperNode;
  }

  function givenDeciderForFreeLayer(layerIndex: number, direction: CrossingCountSide): SwitchDecider {
    freeLayerIndex = layerIndex;
    currentNodeOrder = creator.graph.toNodeArray();
    const crossingMatrixFiller = new CrossingMatrixFiller(greedyType, currentNodeOrder, layerIndex, direction);
    return new SwitchDecider(
      layerIndex,
      currentNodeOrder,
      crossingMatrixFiller,
      new Int32Array(getNPorts(currentNodeOrder)),
      {
        graphData: new GraphInfoHolder(creator.graph, CrossMinType.ONE_SIDED_GREEDY_SWITCH, []),
        oneSided: greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH,
      },
    );
  }

  it('crossFormed', () => {
    creator.graph = creator.getCrossFormedGraph();
    creator.setUpIds();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  it('oneNode', () => {
    creator.graph = creator.getOneNodeGraph();

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 0)).toBe(false);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 0)).toBe(false);
  });

  /**
   * ```
   *   --*
   *   |
   * *-+-*-*
   *   |
   *   --*
   * ```
   */
  it('inLayerSwitchable', () => {
    creator.graph = creator.getInLayerEdgesGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  it('multipleEdgesBetweenSameNodes', () => {
    creator.graph = creator.getMultipleEdgesBetweenSameNodesGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  it('selfLoops', () => {
    creator.graph = creator.getCrossWithManySelfLoopsGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  /**
   * Graph:
   *
   * ```
   *     ______
   * *---|____|
   *      |  |  ____
   *      *--+--|  |
   *         |  |  |
   *         *--|__|
   * ```
   *
   * The one-side decider should switch north-south port crossings in the center layer.
   */
  it('northSouthPortCrossing', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getThreeLayerNorthSouthCrossingGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(true);
    } else {
      expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
    }
  });

  it('moreComplex', () => {
    creator.graph = creator.getMoreComplexThreeLayerGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);

    decider = givenDeciderForFreeLayer(2, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);

    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(true);
  });

  it('switchOnlyTrueForOneSided', () => {
    creator.graph = creator.getSwitchOnlyOneSided();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
    } else {
      expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    }
  });

  it('switchOnlyTrueForOneSidedEasternSide', () => {
    creator.graph = creator.getSwitchOnlyEastOneSided();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.EAST);
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
    } else {
      expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    }
  });

  it('constraintsPreventSwitch', () => {
    creator.graph = creator.getCrossFormedGraphWithConstraintsInSecondLayer();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('inLayerUnitConstraintsPreventSwitch', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getGraphWhereLayoutUnitPreventsSwitch();
    decider = givenDeciderForFreeLayer(0, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
  });

  it('switchAndRecount', () => {
    creator.graph = creator.getCrossFormedGraph();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    switchNodes(0, 1);
    decider.notifyOfSwitch(creator.copyOfNodesInLayer(0)[0]!, creator.copyOfNodesInLayer(0)[1]!);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('switchAndRecountCounterBug', () => {
    const leftNodes = creator.addNodesToLayer(2, creator.makeLayer(creator.getGraph()));
    const rightNodes = creator.addNodesToLayer(4, creator.makeLayer(creator.getGraph()));
    const leftTopPort = creator.addPortOnSide(leftNodes[0]!, PortSide.EAST);
    const leftLowerPort = creator.addPortOnSide(leftNodes[1]!, PortSide.EAST);
    const rightTopPort = creator.addPortOnSide(rightNodes[0]!, PortSide.WEST);

    creator.addEdgeBetweenPorts(leftLowerPort, rightTopPort);
    creator.eastWestEdgeFromTo(leftLowerPort, rightNodes[2]!);

    creator.addEdgeBetweenPorts(leftTopPort, rightTopPort);
    creator.eastWestEdgeFromTo(leftTopPort, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftTopPort, rightNodes[3]!);

    creator.setUpIds();
    creator.graph = creator.getGraph();
    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(2, 3)).toBe(true);

    decider.notifyOfSwitch(currentNodeOrder[freeLayerIndex]![0]!, currentNodeOrder[freeLayerIndex]![1]!);
    switchNodes(0, 1);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(2, 3)).toBe(true);

    decider.notifyOfSwitch(currentNodeOrder[freeLayerIndex]![2]!, currentNodeOrder[freeLayerIndex]![3]!);
    switchNodes(2, 3);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(true);
    expect(decider.doesSwitchReduceCrossings(2, 3)).toBe(false);

    decider.notifyOfSwitch(currentNodeOrder[freeLayerIndex]![1]!, currentNodeOrder[freeLayerIndex]![2]!);
    switchNodes(1, 2);
    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
    expect(decider.doesSwitchReduceCrossings(2, 3)).toBe(false);
  });

  it('switchAndRecountReducedCounterBug', () => {
    creator.graph = creator.getSwitchedProblemGraph();
    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);
    for (let i = 0; i < creator.copyOfNodesInLayer(1).length - 1; i++) {
      expect(decider.doesSwitchReduceCrossings(i, i + 1), `attempted switch ${i} with ${i + 1}`).toBe(false);
    }
  });

  it('shouldSwitchWithLongEdgeDummies', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getNorthernNorthSouthDummyEdgeCrossingGraph();
    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);

    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(true);

    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
    }

    creator.graph = new NorthSouthEdgeTestGraphCreator().getSouthernNorthSouthDummyEdgeCrossingGraph();
    decider = givenDeciderForFreeLayer(1, CrossingCountSide.WEST);

    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);

    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(true);
    }
  });

  it('layoutUnitConstraintPreventsSwitchWithNodeWithNorthernPorts', () => {
    creator.graph =
      new NorthSouthEdgeTestGraphCreator().getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithNorthernEdges();

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);

    expect(decider.doesSwitchReduceCrossings(1, 2)).toBe(false);
  });

  it('layoutUnitConstraintPreventsSwitchWithNodeWithSouthernPorts', () => {
    creator.graph =
      new NorthSouthEdgeTestGraphCreator().getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithSouthernEdges();

    decider = givenDeciderForFreeLayer(0, CrossingCountSide.EAST);

    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(false);
  });

  it('layoutUnitConstraintDoesNotPreventSwitchWithWhenOtherNodeIsLongEdgeDummy', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getGraphLayoutUnitDoesNotPreventSwitchWithLongEdgeDummy();

    decider = givenDeciderForFreeLayer(1, CrossingCountSide.EAST);

    expect(decider.doesSwitchReduceCrossings(0, 1)).toBe(true);
  });

  /**
   * ```
   * ____
   * | *p\ /-*
   * |  | x
   * | *p/ \-*
   * |__|
   * ```
   */
  it('switchingDummyNodesNotifiesPortSwitch', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNodes = creator.addNodesToLayer(2, creator.makeLayer());
    const leftPorts = creator.addPortsOnSide(2, leftNode, PortSide.EAST);
    const nestedGraph = creator.nestedGraph(leftNode);
    const nestedLayer = creator.makeLayer(nestedGraph);
    const dummies = creator.addExternalPortDummiesToLayer(nestedLayer, leftPorts);
    creator.eastWestEdgeFromTo(leftPorts[0]!, rightNodes[1]!);
    creator.eastWestEdgeFromTo(leftPorts[1]!, rightNodes[0]!);

    const crossingMatrixFiller = new CrossingMatrixFiller(
      greedyType,
      nestedGraph.toNodeArray(),
      0,
      CrossingCountSide.EAST,
    );
    const parentGraphData = new GraphInfoHolder(creator.graph, greedyType, []);
    const graphData = new GraphInfoHolder(nestedGraph, greedyType, [parentGraphData]);
    const switchDecider = new SwitchDecider(
      0,
      nestedGraph.toNodeArray(),
      crossingMatrixFiller,
      new Int32Array(getNPorts(nestedGraph.toNodeArray())),
      { graphData, oneSided: false },
    );
    if (greedyType === CrossMinType.TWO_SIDED_GREEDY_SWITCH) {
      expect(switchDecider.doesSwitchReduceCrossings(0, 1)).toBe(true);
      switchDecider.notifyOfSwitch(dummies[0]!, dummies[1]!);
      expect(switchDecider.doesSwitchReduceCrossings(0, 1)).toBe(false);
    }
  });
});
