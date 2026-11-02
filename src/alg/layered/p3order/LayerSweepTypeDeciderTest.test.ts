// SPDX-License-Identifier: EPL-2.0
// Port of LayerSweepTypeDeciderTest (mission 7c-tests, T5).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/LayerSweepTypeDeciderTest.java
//
// Java-to-TypeScript mapping:
//   - `extends TestGraphCreator` / `@Before` is `let creator` rebuilt in `beforeEach`; `graph` is `creator.graph`.
//   - `new GraphInfoHolder(g, CrossMinType.BARYCENTER, null)` for the top-level graph passes `[]` (the TS constructor
//     takes the list of all holders and reads it only for a graph with a parent node);
//     `Arrays.asList(holder)` is the array `[holder]`.
//   - `IInitializable.init(Arrays.asList(td), innerGraph.toNodeArray())` is `init([td], innerGraph.toNodeArray())`.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestGraphCreator } from '../../../../test/helpers/TestGraphCreator.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LayeredMetaDataProvider } from '../options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { init } from './counting/IInitializable.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerSweepTypeDecider } from './LayerSweepTypeDecider.js';

// Java: `PlainJavaInitialization.initializePlainJavaLayout()`, plus `LayoutMetaDataService.initElkReflect()` for the
// list- and set-valued defaults the creator clones.
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  LayoutMetaDataService.initElkReflect();
});

let creator: TestGraphCreator;

beforeEach(() => {
  creator = new TestGraphCreator();
});

describe('LayerSweepTypeDeciderTest', () => {
  /**
   * <pre>
   *   __________
   *   | d--*   |
   *   | |  |   |
   *   | *  d-* |
   * *=+-*--*-*-+=*
   *   |________|
   * </pre>
   */
  it('northSouthPortsChangeDecision', () => {
    const layers = creator.makeLayers(3);
    const leftOuter = creator.addNodeToLayer(layers[0]!);
    const middleOuter = creator.addNodeToLayer(layers[1]!);
    const rightOuter = creator.addNodeToLayer(layers[2]!);
    const leftPortMiddleNode = creator.addPortOnSide(middleOuter, PortSide.WEST);
    const rightPortMiddleNode = creator.addPortOnSide(middleOuter, PortSide.EAST);
    creator.eastWestEdgeFromTo(middleOuter, rightOuter);
    creator.eastWestEdgeFromTo(rightPortMiddleNode, rightOuter);
    creator.eastWestEdgeFromTo(leftOuter, leftPortMiddleNode);
    creator.eastWestEdgeFromTo(leftOuter, middleOuter);

    const nestedGraph = creator.nestedGraph(middleOuter);
    const innerLayers = creator.makeLayers(5, nestedGraph);
    const leftDummy = creator.addExternalPortDummyNodeToLayer(innerLayers[0]!, leftPortMiddleNode);
    const firstLayer = creator.addNodesToLayer(3, innerLayers[1]!);
    const secondLayer = creator.addNodesToLayer(3, innerLayers[2]!);
    const thirdLayer = creator.addNodesToLayer(2, innerLayers[3]!);
    const rightDummy = creator.addExternalPortDummyNodeToLayer(innerLayers[4]!, rightPortMiddleNode);
    creator.eastWestEdgeFromTo(leftDummy, firstLayer[2]!);
    creator.eastWestEdgeFromTo(firstLayer[2]!, secondLayer[2]!);
    creator.eastWestEdgeFromTo(secondLayer[2]!, thirdLayer[1]!);
    creator.eastWestEdgeFromTo(thirdLayer[1]!, rightDummy);

    creator.addNorthSouthEdge(PortSide.NORTH, firstLayer[1]!, firstLayer[0]!, secondLayer[0]!, false);
    creator.addNorthSouthEdge(PortSide.SOUTH, secondLayer[0]!, secondLayer[1]!, thirdLayer[0]!, false);

    creator.graph.id = 0;
    nestedGraph.id = 1;
    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, 0.1, creator.graph);
    const gd = new GraphInfoHolder(nestedGraph, CrossMinType.BARYCENTER, [
      new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []),
    ]);
    expect(gd.dontSweepInto()).toBe(true);
  });

  /**
   * <pre>
   *   ____
   * *=|=*=|=*
   *   |___|
   *
   *
   * </pre>
   */
  it('allHierarchicalButMinusOne_StillReturnsBU', () => {
    const leftNode = creator.addNodeToLayer(creator.makeLayer());
    const middleNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNode = creator.addNodeToLayer(creator.makeLayer());
    const middlePortRight = creator.addPortsOnSide(2, middleNode, PortSide.EAST);
    const middlePortLeft = creator.addPortsOnSide(2, middleNode, PortSide.WEST);
    creator.eastWestEdgeFromTo(leftNode, middlePortLeft[1]!);
    creator.eastWestEdgeFromTo(leftNode, middlePortLeft[0]!);
    creator.eastWestEdgeFromTo(middlePortRight[0]!, rightNode);
    creator.eastWestEdgeFromTo(middlePortRight[1]!, rightNode);

    const innerGraph = creator.nestedGraph(middleNode);
    const layers = creator.makeLayers(3, innerGraph);
    const leftInnerDummyNodes = creator.addExternalPortDummiesToLayer(layers[2]!, middlePortRight);
    const node = creator.addNodeToLayer(layers[1]!);
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(layers[0]!, middlePortLeft);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[0]!, node);
    creator.eastWestEdgeFromTo(leftInnerDummyNodes[1]!, node);
    creator.eastWestEdgeFromTo(node, rightInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(node, rightInnerDummyNodes[1]!);

    creator.graph.id = 0;
    innerGraph.id = 1;

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -1.0, creator.graph);
    const gd = new GraphInfoHolder(innerGraph, CrossMinType.BARYCENTER, [
      new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []),
    ]);
    const td = new LayerSweepTypeDecider(gd);
    init([td], innerGraph.toNodeArray());
    expect(td.useBottomUp()).toBe(true);
  });

  /**
   * <pre>
   * _____
   * |p*=|=*
   * |___|
   *
   *
   * </pre>
   */
  it('portWithNoEdges_DoesNotCount', () => {
    const middleNode = creator.addNodeToLayer(creator.makeLayer());
    const rightNode = creator.addNodeToLayer(creator.makeLayer());
    const middlePortRight = creator.addPortsOnSide(2, middleNode, PortSide.EAST);
    creator.eastWestEdgeFromTo(middlePortRight[0]!, rightNode);
    creator.eastWestEdgeFromTo(middlePortRight[1]!, rightNode);

    const innerGraph = creator.nestedGraph(middleNode);
    const layers = creator.makeLayers(2, innerGraph);
    const node = creator.addNodeToLayer(layers[0]!);
    const rightInnerDummyNodes = creator.addExternalPortDummiesToLayer(layers[1]!, middlePortRight);
    creator.eastWestEdgeFromTo(node, rightInnerDummyNodes[0]!);
    creator.eastWestEdgeFromTo(node, rightInnerDummyNodes[1]!);
    creator.addPortOnSide(node, PortSide.WEST);

    creator.graph.id = 0;
    innerGraph.id = 1;

    creator.setOnAllGraphs(LayeredOptions.CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS, -0.1, creator.graph);
    const gd = new GraphInfoHolder(innerGraph, CrossMinType.BARYCENTER, [
      new GraphInfoHolder(creator.graph, CrossMinType.BARYCENTER, []),
    ]);
    expect(gd.dontSweepInto()).toBe(true);
  });
});
