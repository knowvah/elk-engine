// SPDX-License-Identifier: EPL-2.0
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/GreedySwitchProcessorTest.java
//
// Mission 7c-tests (T8). One `it` per Java `@Test`, in Java order; the Java `@Parameters` become `describe.each` over
// the same two `CrossMinType`s. Java has no `GreedySwitchProcessor` class at the pinned commit: the suite drives
// `LayerSweepCrossingMinimizer` with the two greedy-switch `CrossMinType`s.
//
// Java-to-TypeScript mapping, all forced by the language:
//   - `extends TestGraphCreator` becomes `creator: TestGraphCreator`; `graph` is `creator.graph`.
//   - `PlainJavaInitialization.initializePlainJavaLayout()` becomes the explicit layered registration plus
//     `initElkReflect()` in `beforeAll`.
//   - `assertThat("msg", list, is(list))` on `LNode` lists becomes `expectSameElements` (identity per element); the
//     Java message is kept as a comment because `expectSameElements` takes none.
//   - The Java constructor (greedy switcher and monitor per parameter) runs in `beforeEach`, so each test gets a fresh
//     minimizer and monitor.
import { beforeAll, beforeEach, describe, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { expectSameElements } from '../../../../../test/helpers/junit-asserts.js';
import { NorthSouthEdgeTestGraphCreator } from '../../../../../test/helpers/NorthSouthEdgeTestGraphCreator.js';
import { TestGraphCreator } from '../../../../../test/helpers/TestGraphCreator.js';
import { LayeredMetaDataProvider } from '../../options/LayeredMetaDataProvider.js';
import { LayerSweepCrossingMinimizer } from '../../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';

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

describe.each(GREEDY_TYPES)('GreedySwitchProcessorTest %s', (_label, greedyType) => {
  let creator: TestGraphCreator;
  let greedySwitcher: LayerSweepCrossingMinimizer;
  let monitor: BasicProgressMonitor;

  beforeEach(() => {
    creator = new TestGraphCreator();
    greedySwitcher = new LayerSweepCrossingMinimizer(greedyType);
    monitor = new BasicProgressMonitor();
  });

  function startGreedySwitcherWithCurrentType(): void {
    greedySwitcher.process(creator.getGraph(), monitor);
  }

  it('shouldSwitchCross', () => {
    creator.getCrossFormedGraph();

    let expectedOrderLayerOne;
    let expectedOrderLayerTwo;
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expectedOrderLayerOne = creator.copyOfNodesInLayer(0);
      expectedOrderLayerTwo = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    } else {
      expectedOrderLayerOne = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);
      expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);
    }

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  it('constraintsPreventSwitchInSecondLayer', () => {
    creator.getCrossFormedGraphWithConstraintsInSecondLayer();

    const expectedOrderLayerOne = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);
    const expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  it('constraintsPreventAnySwitch', () => {
    creator.getCrossFormedGraphConstraintsPreventAnySwitch();

    const expectedOrderLayerOne = creator.copyOfNodesInLayer(0);
    const expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  it('layoutUnitConstraintPreventsSwitch', () => {
    creator.getNodesInDifferentLayoutUnitsPreventSwitch();

    const expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);

    startGreedySwitcherWithCurrentType();

    // "Layer one" (sic; the Java message names layer one, the assertion reads layer index 1)
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  it('oneNode', () => {
    creator.getOneNodeGraph();
    const layerIndex = 0;
    creator.copyOfSwitchOrderOfNodesInLayer(0, 0, layerIndex);
    // should cause no errors
  });

  it('inLayerSwitchable', () => {
    creator.getInLayerEdgesGraph();

    const expectedOrder = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);

    startGreedySwitcherWithCurrentType();

    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrder);
  });

  it('multipleEdgesBetweenSameNodes', () => {
    creator.getMultipleEdgesBetweenSameNodesGraph();

    let expectedOrderLayerOne;
    let expectedOrderLayerTwo;
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expectedOrderLayerOne = creator.copyOfNodesInLayer(0);
      expectedOrderLayerTwo = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    } else {
      expectedOrderLayerOne = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);
      expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);
    }

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  it('selfLoops', () => {
    const leftLayer = creator.makeLayer(creator.getGraph());
    const rightLayer = creator.makeLayer(creator.getGraph());

    const topLeft = creator.addNodeToLayer(leftLayer);
    const bottomLeft = creator.addNodeToLayer(leftLayer);
    const topRight = creator.addNodeToLayer(rightLayer);
    const bottomRight = creator.addNodeToLayer(rightLayer);

    const topLeftPort = creator.addPortOnSide(topLeft, PortSide.EAST);
    const bottomLeftPort = creator.addPortOnSide(bottomLeft, PortSide.EAST);
    creator.setUpIds();
    const selfLoopCrossGraph = creator.getGraph();
    for (const layer of selfLoopCrossGraph) {
      for (const node of layer) {
        creator.selfLoopOn(node, PortSide.EAST);
        creator.selfLoopOn(node, PortSide.EAST);
        creator.selfLoopOn(node, PortSide.EAST);
        creator.selfLoopOn(node, PortSide.WEST);
        creator.selfLoopOn(node, PortSide.WEST);
        creator.selfLoopOn(node, PortSide.WEST);
      }
    }
    const topRightPort = creator.addPortOnSide(topRight, PortSide.WEST);
    const bottomRightPort = creator.addPortOnSide(bottomRight, PortSide.WEST);

    creator.addEdgeBetweenPorts(topLeftPort, bottomRightPort);
    creator.addEdgeBetweenPorts(bottomLeftPort, topRightPort);

    let expectedOrderLayerOne;
    let expectedOrderLayerTwo;
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expectedOrderLayerOne = creator.copyOfNodesInLayer(0);
      expectedOrderLayerTwo = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    } else {
      expectedOrderLayerOne = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);
      expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);
    }

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderLayerOne);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
  });

  // The one-side decider should switch north-south port crossings in the center layer.
  it('northSouthPortCrossing', () => {
    creator.graph = new NorthSouthEdgeTestGraphCreator().getNorthSouthDownwardCrossingGraph();

    const layerIndex = 0;
    const expectedOrderTwoSided = [...creator.copyOfNodesInLayer(layerIndex)];
    const expectedOrderOneSided = creator.copyOfSwitchOrderOfNodesInLayer(1, 2, layerIndex);

    startGreedySwitcherWithCurrentType();

    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expectSameElements(creator.copyOfNodesInLayer(layerIndex), expectedOrderOneSided);
    } else {
      expectSameElements(creator.copyOfNodesInLayer(layerIndex), expectedOrderTwoSided);
    }
  });

  // Port order not fixed.
  it('moreComplex', () => {
    creator.getMoreComplexThreeLayerGraph();
    const expectedOrderLayerTwo = creator.copyOfNodesInLayer(1);
    const expectedOrderLayerThree = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 2);
    startGreedySwitcherWithCurrentType();
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderLayerTwo);
    // "Layer three"
    expectSameElements(creator.copyOfNodesInLayer(2), expectedOrderLayerThree);
  });

  it('switchOnlyForOneSided', () => {
    creator.getSwitchOnlyOneSided();

    const layerIndex = 1;
    const expectedOrderOneSided = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, layerIndex);
    const expectedOrderTwoSided = [...creator.copyOfNodesInLayer(layerIndex)];

    startGreedySwitcherWithCurrentType();
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      expectSameElements(creator.copyOfNodesInLayer(layerIndex), expectedOrderOneSided);
    } else {
      expectSameElements(creator.copyOfNodesInLayer(layerIndex), expectedOrderTwoSided);
    }
  });

  it('doesNotWorsenCrossAmount', () => {
    creator.getGraphWhichCouldBeWorsenedBySwitch();
    const expectedOrderFirstLayer = [...creator.copyOfNodesInLayer(0)];
    const expectedOrderSecondLayer = [...creator.copyOfNodesInLayer(1)];

    startGreedySwitcherWithCurrentType();

    // "Layer one"
    expectSameElements(creator.copyOfNodesInLayer(0), expectedOrderFirstLayer);
    // "Layer two"
    expectSameElements(creator.copyOfNodesInLayer(1), expectedOrderSecondLayer);
  });

  it('switchMoreThanOnce', () => {
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

    const oneSidedFirstLayer = [...creator.copyOfNodesInLayer(0)];
    const oneSidedFirstSwitchSecondLayer = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 1);
    const oneSidedsecondSwitchSecondLayer = creator.getCopyWithSwitchedOrder(2, 3, oneSidedFirstSwitchSecondLayer);
    const oneSidedThirdSwitchSecondLayer = creator.getCopyWithSwitchedOrder(1, 2, oneSidedsecondSwitchSecondLayer);

    const twoSidedFirstLayer = creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0);
    const twoSidedFirstSwitchSecondLayer = creator.copyOfSwitchOrderOfNodesInLayer(1, 2, 1);
    const twoSidedsecondSwitchSecondLayer = creator.getCopyWithSwitchedOrder(0, 1, twoSidedFirstSwitchSecondLayer);
    startGreedySwitcherWithCurrentType();
    if (greedyType === CrossMinType.ONE_SIDED_GREEDY_SWITCH) {
      // "Layer one" + copyOfNodesInLayer(0)
      expectSameElements(creator.copyOfNodesInLayer(0), oneSidedFirstLayer);
      // "Layer two " + copyOfNodesInLayer(1)
      expectSameElements(creator.copyOfNodesInLayer(1), oneSidedThirdSwitchSecondLayer);
    } else {
      // "Layer one " + copyOfNodesInLayer(0)
      expectSameElements(creator.copyOfNodesInLayer(0), twoSidedFirstLayer);
      // "Layer two " + copyOfNodesInLayer(1)
      expectSameElements(creator.copyOfNodesInLayer(1), twoSidedsecondSwitchSecondLayer);
    }
  });
});
