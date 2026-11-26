<!-- SPDX-License-Identifier: EPL-2.0 -->

# Site inventory: dev-assert (issue #45)

One row per Java `assert` statement at `8bca22f4`, from
`grep -rnE '^\s*assert[ (]' plugins/org.eclipse.elk.{core,core.debug.grandom,alg.common,alg.layered,alg.mrtree,alg.force}/src`
(`*.java`, `*.xtend`; a multi-line statement is read to its `;`). No in-scope bundle outside these six has one, and
no `assert` sits anywhere but at the start of a line.

- **Java:** `<bundle>/…/<path under the bundle package>:<line>`; `…` stands for `src/org/eclipse/elk/<bundle path>/`.
- **TS site:** the `devAssert` line once restored; at T2 the omission comment or the start of the TS function that
  ports the Java method.
- **Found as (T2):** `comment` (an omission comment at or near the site, or in the header of its class or function),
  `silent` (no trace), `throw` (a `throw new Error` stands in for `assert false`), `no-arm` (the TS has no arm for
  the Java branch that only asserts).
- **Status:** `restored`, `restored (throw kept)` (D5.4), or `not-portable: <reason>`.

## Summary

| Lane | Directories | Sites |
| ---- | ----------- | ----- |
| T3 | `src/core`, `src/alg/common`, `src/alg/mrtree`, `src/alg/force` | 17 |
| T4 | `src/alg/layered/intermediate/loops` | 42 |
| T5 | `src/alg/layered/intermediate` outside `loops/` | 46 |
| T6 | `src/alg/layered` outside `intermediate/` | 38 |
| | **Total** | **143** |

| Found as (T2) | Sites |
| ------------- | ----- |
| `comment` | 120 |
| `silent` | 12 |
| `throw` | 6 |
| `no-arm` | 5 |

| Status | Sites |
| ------ | ----- |
| `not-portable` | 13 |
| `restored` | 124 |
| `restored (throw kept)` | 6 |

## Lane T3: `src/core`, `src/alg/common`, `src/alg/mrtree`, `src/alg/force`

| # | Java file:line | Expression | TS site | Found as | Status |
| - | -------------- | ---------- | ------- | -------- | ------ |
| 1 | `core/…/comments/AbstractNormalizedMatcher.java:127` | `assert false` | `src/core/comments/AbstractNormalizedMatcher.ts:77` | `comment` | restored |
| 2 | `core/…/math/KVector.java:378` | `assert length > 0` | `src/core/math/KVector.ts:291` | `comment` | restored |
| 3 | `core/…/util/BasicProgressMonitor.java:374` | `assert children != null` | `src/core/util/BasicProgressMonitor.ts:265` | `silent` | restored |
| 4 | `core/…/util/BoxLayoutProvider.java:738` | `assert w > getWidth()` | `src/core/util/BoxLayoutProviderGroup.ts:66` | `comment` | not-portable: pending #112 |
| 5 | `core/…/util/BoxLayoutProvider.java:754` | `assert h > getHeight()` | `src/core/util/BoxLayoutProviderGroup.ts:81` | `comment` | not-portable: pending #112 |
| 6 | `core/…/util/ElkSpacings.java:78` | `assert BASE_SPACING_OPTION.getDefault() != null : "Base spacing default value must be non-null."` | `src/core/util/ElkSpacingsElkCoreSpacingsBuilder.ts:50` | `comment` | restored |
| 7 | `core/…/util/ElkSpacings.java:80` | `assert !DoubleMath.fuzzyEquals(0.0d, BASE_SPACING_OPTION.getDefault(), DOUBLE_EQ_EPSILON) : "Base spacing default value must be different from 0.0d."` | `src/core/util/ElkSpacingsElkCoreSpacingsBuilder.ts:55` | `comment` | restored |
| 8 | `core/…/util/ElkUtil.java:519` | `assert edge.getSections().size() == 1` | `src/core/util/ElkUtilJunctions.ts:196` | `silent` | restored |
| 9 | `core/…/util/InstancePool.java:59` | `assert thefactory != null` | `src/core/util/InstancePool.ts:36` | `silent` | not-portable: pending #113 |
| 10 | `core.debug.grandom/…/generators/GeneratorOptions.java:286` | `assert max >= min` | `src/core/debug/grandom/generators/RandVal.ts:73` | `comment` | restored |
| 11 | `core.debug.grandom/…/generators/RandomGraphGenerator.java:1760` | `assert from <= to` | `src/core/debug/grandom/generators/RandomGraphGenerator.ts:426` | `comment` | restored |
| 12 | `alg.common/…/nodespacing/internal/NodeContext.java:277` | `assert false` | `src/alg/common/nodespacing/internal/NodeContext.ts:243` | `comment` | not-portable: pending #113 |
| 13 | `alg.common/…/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.java:212` | `assert secondRatio >= firstRatio` | `src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.ts:271` | `comment` | not-portable: pending #113 |
| 14 | `alg.common/…/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java:208` | `assert false` | `src/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculatorSimpleInside.ts:238` | `comment` | restored |
| 15 | `alg.common/…/overlaps/RectangleStripOverlapRemover.java:191` | `assert false` | `src/alg/common/overlaps/RectangleStripOverlapRemover.ts:134` | `comment` | restored |
| 142 | `alg.mrtree/…/intermediate/RootProcessor.java:59` | `assert tGraph.getNodes().isEmpty()` | `src/alg/mrtree/intermediate/RootProcessor.ts:55` | `comment` | restored |
| 143 | `alg.force/…/stress/StressMajorization.java:222` | `assert graph.getNodes().size() > 1` | `src/alg/force/stress/StressMajorization.ts:225` | `comment` | restored |

## Lane T4: `src/alg/layered/intermediate/loops`

| # | Java file:line | Expression | TS site | Found as | Status |
| - | -------------- | ---------- | ------- | -------- | ------ |
| 69 | `alg.layered/…/intermediate/loops/SelfHyperLoop.java:91` | `assert slPortsBySide == null` | `src/alg/layered/intermediate/loops/SelfHyperLoop.ts:80` | `comment` | restored |
| 70 | `alg.layered/…/intermediate/loops/SelfHyperLoop.java:97` | `assert portSide != PortSide.UNDEFINED` | `src/alg/layered/intermediate/loops/SelfHyperLoop.ts:92` | `comment` | restored |
| 71 | `alg.layered/…/intermediate/loops/SelfHyperLoopLabels.java:110` | `assert lLabels.get(lLabels.size() - 1) == newLLabel` | `src/alg/layered/intermediate/loops/SelfHyperLoopLabels.ts:72` | `comment` | restored |
| 72 | `alg.layered/…/intermediate/loops/SelfLoopEdge.java:41` | `assert lEdge.isSelfLoop()` | `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:32` | `comment` | restored |
| 73 | `alg.layered/…/intermediate/loops/SelfLoopEdge.java:42` | `assert slSource.getLPort() == lEdge.getSource()` | `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:33` | `comment` | restored |
| 74 | `alg.layered/…/intermediate/loops/SelfLoopEdge.java:43` | `assert slTarget.getLPort() == lEdge.getTarget()` | `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:34` | `comment` | restored |
| 75 | `alg.layered/…/intermediate/loops/SelfLoopEdge.java:75` | `assert this.slHyperLoop == null` | `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:61` | `comment` | restored |
| 76 | `alg.layered/…/intermediate/loops/SelfLoopHolder.java:71` | `assert needsSelfLoopProcessing(lNode)` | `src/alg/layered/intermediate/loops/SelfLoopHolder.ts:56` | `comment` | restored |
| 77 | `alg.layered/…/intermediate/loops/SelfLoopPort.java:44` | `assert lPort.getConnectedEdges().iterator().hasNext()` | `src/alg/layered/intermediate/loops/SelfLoopPort.ts:32` | `comment` | restored |
| 78 | `alg.layered/…/intermediate/loops/ordering/PortRestorer.java:150` | `assert false` | `src/alg/layered/intermediate/loops/ordering/PortRestorer.ts:189` | `comment` | restored |
| 79 | `alg.layered/…/intermediate/loops/ordering/PortRestorer.java:225` | `assert sides.length == 2` | `src/alg/layered/intermediate/loops/ordering/PortRestorer.ts:269` | `comment` | restored |
| 80 | `alg.layered/…/intermediate/loops/ordering/PortRestorer.java:269` | `assert false` | `src/alg/layered/intermediate/loops/ordering/PortRestorer.ts:308` | `comment` | restored |
| 81 | `alg.layered/…/intermediate/loops/ordering/PortRestorer.java:401` | `assert newPortList.size() >= oldPortList.size() && newPortList.size() >= slHolder.getSLPortMap().size()` | `src/alg/layered/intermediate/loops/ordering/PortRestorerPortList.ts:51` | `comment` | restored |
| 82 | `alg.layered/…/intermediate/loops/ordering/PortRestorer.java:402` | `assert !slHolder.arePortsHidden() \|\| newPortList.size() > oldPortList.size()` | `src/alg/layered/intermediate/loops/ordering/PortRestorerPortList.ts:52` | `comment` | restored |
| 83 | `alg.layered/…/intermediate/loops/ordering/PortSideAssigner.java:40` | `assert !slHolder.getLNode().getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS).isSideFixed()` | `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts:27` | `comment` | restored |
| 84 | `alg.layered/…/intermediate/loops/ordering/PortSideAssigner.java:56` | `assert false` | `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts:43` | `comment` | restored |
| 85 | `alg.layered/…/intermediate/loops/ordering/PortSideAssigner.java:59` | `assert slHolder.getSLPortMap().keySet().stream().noneMatch(lPort -> lPort.getSide() == PortSide.UNDEFINED)` | `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts:46` | `comment` | restored |
| 86 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:93` | `assert !slLabels.getLLabels().isEmpty()` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:78` | `comment` | restored |
| 87 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:126` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:122` | `comment` | restored |
| 88 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:174` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:174` | `comment` | restored |
| 89 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:179` | `assert !slLoops.isEmpty()` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:180` | `comment` | restored |
| 90 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:249` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:256` | `no-arm` | restored |
| 91 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:286` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:291` | `no-arm` | restored |
| 92 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:360` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:382` | `comment` | restored |
| 93 | `alg.layered/…/intermediate/loops/routing/LabelPlacer.java:399` | `assert false` | `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:420` | `comment` | restored |
| 94 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:122` | `assert sourcePortSide.opposed() == targetPortSide` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:134` | `comment` | restored |
| 95 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:130` | `assert slLoop.getOccupiedPortSides().contains(sourcePortSide.left())` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:142` | `comment` | restored |
| 96 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:180` | `assert false` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:203` | `throw` | restored (throw kept) |
| 97 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:245` | `assert portSide == PortSide.NORTH \|\| portSide == PortSide.SOUTH` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts:57` | `comment` | restored |
| 98 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:304` | `assert false` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts:122` | `throw` | restored (throw kept) |
| 99 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:367` | `assert false` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:287` | `throw` | restored (throw kept) |
| 100 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:441` | `assert false` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:401` | `throw` | restored (throw kept) |
| 101 | `alg.layered/…/intermediate/loops/routing/PolylineSelfLoopRouter.java:64` | `assert bendPoints.size() > 2` | `src/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouter.ts:51` | `comment` | restored |
| 102 | `alg.layered/…/intermediate/loops/routing/PolylineSelfLoopRouter.java:82` | `assert areOrthogonallyRouted(previous, corner, next)` | `src/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouter.ts:69` | `comment` | restored |
| 103 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:86` | `assert false` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:93` | `comment` | restored |
| 104 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:151` | `assert sides.length == 2` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:149` | `comment` | restored |
| 105 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:207` | `assert false` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:204` | `throw` | restored (throw kept) |
| 106 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:217` | `assert sides.size() == 3` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:215` | `comment` | restored |
| 107 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:218` | `assert !sides.contains(PortSide.UNDEFINED)` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:216` | `comment` | restored |
| 108 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:227` | `assert false` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:225` | `throw` | restored (throw kept) |
| 109 | `alg.layered/…/intermediate/loops/routing/RoutingSlotAssigner.java:121` | `assert slLoop1 != slLoop2` | `src/alg/layered/intermediate/loops/routing/RoutingSlotAssigner.ts:116` | `comment` | restored |
| 110 | `alg.layered/…/intermediate/loops/routing/SplineSelfLoopRouter.java:70` | `assert orthoBendPoints.size() >= 2` | `src/alg/layered/intermediate/loops/routing/SplineSelfLoopRouter.ts:67` | `comment` | restored |

## Lane T5: `src/alg/layered/intermediate` outside `loops/`

| # | Java file:line | Expression | TS site | Found as | Status |
| - | -------------- | ---------- | ------- | -------- | ------ |
| 28 | `alg.layered/…/intermediate/EdgeAndLayerConstraintEdgeReverser.java:283` | `assert sourceNodeLayerConstraint == edge.getSource().getNode() .getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)` | `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.ts:263` | `comment` | restored |
| 29 | `alg.layered/…/intermediate/EdgeAndLayerConstraintEdgeReverser.java:324` | `assert targetNodeLayerConstraint == edge.getTarget().getNode() .getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)` | `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.ts:305` | `comment` | restored |
| 30 | `alg.layered/…/intermediate/EndLabelPostprocessor.java:66` | `assert node.hasProperty(InternalProperties.END_LABELS)` | `src/alg/layered/intermediate/EndLabelPostprocessor.ts:45` | `comment` | restored |
| 31 | `alg.layered/…/intermediate/EndLabelPostprocessor.java:70` | `assert !endLabelCells.isEmpty()` | `src/alg/layered/intermediate/EndLabelPostprocessor.ts:49` | `comment` | restored |
| 32 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:377` | `assert labelCellRect.height > 0 && labelCellRect.width > 0` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:117` | `comment` | not-portable: pending #112 |
| 33 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:408` | `assert false` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:90` | `comment` | restored |
| 34 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:454` | `assert labelCell != null` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:34` | `comment` | restored |
| 35 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:455` | `assert labelCell.hasLabels()` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:35` | `comment` | restored |
| 36 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:482` | `assert false` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:65` | `comment` | restored |
| 37 | `alg.layered/…/intermediate/FinalSplineBendpointsCalculator.java:336` | `assert ei.normalSourceNode \|\| ei.normalTargetNode` | `src/alg/layered/intermediate/FinalSplineBendpointsCalculatorControlPoints.ts:246` | `comment` | restored |
| 38 | `alg.layered/…/intermediate/HierarchicalPortOrthogonalEdgeRouter.java:184` | `assert replacedDummy.getType() == NodeType.EXTERNAL_PORT` | `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouterRestore.ts:63` | `silent` | restored |
| 39 | `alg.layered/…/intermediate/HighDegreeNodeLayeringProcessor.java:226` | `assert layerIt.hasPrevious()` | `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.ts:254` | `silent` | restored |
| 40 | `alg.layered/…/intermediate/HighDegreeNodeLayeringProcessor.java:255` | `assert layers.size() > 0` | `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.ts:289` | `silent` | not-portable: pending #113 |
| 41 | `alg.layered/…/intermediate/InteractiveExternalPortPositioner.java:145` | `assert dummy.getPorts().size() == 1` | `src/alg/layered/intermediate/InteractiveExternalPortPositioner.ts:132` | `comment` | restored |
| 42 | `alg.layered/…/intermediate/InvertedPortProcessor.java:174` | `assert edge.getTarget() == eastwardPort` | `src/alg/layered/intermediate/InvertedPortProcessor.ts:137` | `comment` | restored |
| 43 | `alg.layered/…/intermediate/InvertedPortProcessor.java:244` | `assert edge.getSource() == westwardPort` | `src/alg/layered/intermediate/InvertedPortProcessor.ts:206` | `comment` | restored |
| 44 | `alg.layered/…/intermediate/InvertedPortProcessor.java:284` | `assert !label.hasProperty(InternalProperties.END_LABEL_EDGE)` | `src/alg/layered/intermediate/InvertedPortProcessor.ts:254` | `comment` | restored |
| 45 | `alg.layered/…/intermediate/LabelDummySwitcher.java:186` | `assert layerWidths.length == layeredGraph.getLayers().size()` | `src/alg/layered/intermediate/LabelDummySwitcher.ts:148` | `comment` | restored |
| 46 | `alg.layered/…/intermediate/LabelDummySwitcher.java:284` | `assert false` | `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:65` | `comment` | restored |
| 47 | `alg.layered/…/intermediate/LabelDummySwitcher.java:364` | `assert labelDummyInfo.placementStrategy == CenterEdgeLabelPlacementStrategy.HEAD_LAYER \|\| labelDummyInfo.placementStrategy == CenterEdgeLabelPlacementStrategy.TAIL_LAYER` | `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:146` | `comment` | restored |
| 48 | `alg.layered/…/intermediate/LabelDummySwitcher.java:381` | `assert labelDummyInfo.labelDummy.getType() == NodeType.LABEL` | `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:168` | `comment` | restored |
| 49 | `alg.layered/…/intermediate/LabelDummySwitcher.java:382` | `assert labelDummyInfo.labelDummy.getIncomingEdges().iterator().hasNext()` | `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:169` | `comment` | restored |
| 50 | `alg.layered/…/intermediate/LabelDummySwitcher.java:383` | `assert labelDummyInfo.labelDummy.getOutgoingEdges().iterator().hasNext()` | `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:170` | `comment` | restored |
| 51 | `alg.layered/…/intermediate/LabelDummySwitcher.java:481` | `assert labelIndex >= 0 && labelIndex < labelDummyInfos.size()` | `src/alg/layered/intermediate/LabelDummySwitcherSpaceEfficient.ts:111` | `comment` | restored |
| 52 | `alg.layered/…/intermediate/LabelDummySwitcher.java:534` | `assert targetLayerIndex < labelDummyInfo.labelDummy.getGraph().getLayers().size()` | `src/alg/layered/intermediate/LabelDummySwitcher.ts:220` | `comment` | restored |
| 53 | `alg.layered/…/intermediate/LabelSideSelector.java:201` | `assert !dummyNodes.isEmpty()` | `src/alg/layered/intermediate/LabelSideSelector.ts:205` | `comment` | restored |
| 54 | `alg.layered/…/intermediate/LabelSideSelector.java:252` | `assert currentDummy.getType() == NodeType.LABEL \|\| currentDummy.getType() == NodeType.LONG_EDGE` | `src/alg/layered/intermediate/LabelSideSelector.ts:277` | `comment` | restored |
| 55 | `alg.layered/…/intermediate/LabelSideSelector.java:346` | `assert !endLabelQueue.isEmpty()` | `src/alg/layered/intermediate/LabelSideSelector.ts:378` | `comment` | restored |
| 56 | `alg.layered/…/intermediate/LabelSideSelector.java:347` | `assert portSide != null` | `src/alg/layered/intermediate/LabelSideSelector.ts:379` | `comment` | restored |
| 57 | `alg.layered/…/intermediate/LabelSideSelector.java:452` | `assert labelDummy.getType() == NodeType.LABEL` | `src/alg/layered/intermediate/LabelSideSelector.ts:489` | `comment` | restored |
| 58 | `alg.layered/…/intermediate/LabelSideSelector.java:453` | `assert labelDummy.getIncomingEdges().iterator().hasNext()` | `src/alg/layered/intermediate/LabelSideSelector.ts:490` | `comment` | restored |
| 59 | `alg.layered/…/intermediate/LabelSideSelector.java:454` | `assert labelDummy.getOutgoingEdges().iterator().hasNext()` | `src/alg/layered/intermediate/LabelSideSelector.ts:491` | `comment` | restored |
| 60 | `alg.layered/…/intermediate/LayerConstraintPostprocessor.java:197` | `assert false` | `src/alg/layered/intermediate/LayerConstraintPostprocessor.ts:162` | `comment` | restored |
| 61 | `alg.layered/…/intermediate/LongEdgeSplitter.java:90` | `assert layerIter.hasNext()` | `src/alg/layered/intermediate/LongEdgeSplitter.ts:61` | `comment` | restored |
| 62 | `alg.layered/…/intermediate/NorthSouthPortPreprocessor.java:231` | `assert dummy.getPorts().size() >= 1` | `src/alg/layered/intermediate/NorthSouthPortPreprocessor.ts:165` | `comment` | restored |
| 63 | `alg.layered/…/intermediate/NorthSouthPortPreprocessor.java:278` | `assert dummy.getPorts().size() >= 1` | `src/alg/layered/intermediate/NorthSouthPortPreprocessor.ts:201` | `comment` | restored |
| 64 | `alg.layered/…/intermediate/NorthSouthPortPreprocessor.java:564` | `assert !(inPort.getIncomingEdges().isEmpty() && inPort.getOutgoingEdges().isEmpty())` | `src/alg/layered/intermediate/NorthSouthPortPreprocessorDummies.ts:243` | `comment` | restored |
| 65 | `alg.layered/…/intermediate/NorthSouthPortPreprocessor.java:587` | `assert !(outPort.getIncomingEdges().isEmpty() && outPort.getOutgoingEdges().isEmpty())` | `src/alg/layered/intermediate/NorthSouthPortPreprocessorDummies.ts:264` | `comment` | restored |
| 66 | `alg.layered/…/intermediate/PartitionPreprocessor.java:90` | `assert lEdge.getSource().getNode().hasProperty(LayeredOptions.PARTITIONING_PARTITION)` | `src/alg/layered/intermediate/PartitionPreprocessor.ts:54` | `silent` | restored |
| 67 | `alg.layered/…/intermediate/SelfLoopPortRestorer.java:80` | `assert false` | `src/alg/layered/intermediate/SelfLoopPortRestorer.ts:66` | `no-arm` | restored |
| 68 | `alg.layered/…/intermediate/SelfLoopPreProcessor.java:120` | `assert lPort.getProperty(InternalProperties.PORT_DUMMY) == null` | `src/alg/layered/intermediate/SelfLoopPreProcessor.ts:98` | `comment` | restored |
| 111 | `alg.layered/…/intermediate/preserveorder/ModelOrderNodeComparator.java:189` | `assert (false)` | `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.ts:142` | `silent` | restored |
| 112 | `alg.layered/…/intermediate/wrapping/SingleEdgeGraphWrapper.java:177` | `assert validCuts.get(0) == Integer.MIN_VALUE` | `src/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.ts:157` | `comment` | restored |
| 113 | `alg.layered/…/intermediate/wrapping/SingleEdgeGraphWrapper.java:178` | `assert validCuts.get(validCuts.size() - 1) == Integer.MAX_VALUE` | `src/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.ts:158` | `comment` | restored |
| 114 | `alg.layered/…/intermediate/wrapping/SingleEdgeGraphWrapper.java:193` | `assert validCuts.get(iIdx) <= current` | `src/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.ts:173` | `comment` | not-portable: pending #112 |
| 115 | `alg.layered/…/intermediate/wrapping/SingleEdgeGraphWrapper.java:194` | `assert current <= validCuts.get(iIdx + 1)` | `src/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.ts:176` | `comment` | restored |

## Lane T6: `src/alg/layered` outside `intermediate/`

| # | Java file:line | Expression | TS site | Found as | Status |
| - | -------------- | ---------- | ------- | -------- | ------ |
| 16 | `alg.layered/…/components/ComponentGroupGraphPlacer.java:73` | `assert !components.contains(target)` | `src/alg/layered/components/ComponentGroupGraphPlacer.ts:61` | `comment` | restored |
| 17 | `alg.layered/…/components/ComponentGroupModelOrderGraphPlacer.java:40` | `assert !components.contains(target)` | `src/alg/layered/components/ComponentGroupModelOrderGraphPlacer.ts:33` | `comment` | restored |
| 18 | `alg.layered/…/components/ComponentsCompactor.java:314` | `assert graph.getLayerlessNodes().size() == 1` | `src/alg/layered/components/ComponentsCompactor.ts:361` | `comment` | restored |
| 19 | `alg.layered/…/components/SimpleRowGraphPlacer.java:61` | `assert !components.contains(target)` | `src/alg/layered/components/SimpleRowGraphPlacer.ts:30` | `comment` | restored |
| 20 | `alg.layered/…/compound/CompoundGraphPreprocessor.java:513` | `assert targetExternalPort.type == PortType.INPUT` | `src/alg/layered/compound/CompoundGraphPreprocessorSegments.ts:363` | `comment` | restored |
| 21 | `alg.layered/…/graph/LGraphUtil.java:821` | `assert layoutDirection != Direction.UNDEFINED` | `src/alg/layered/graph/LGraphUtilExternalPorts.ts:153` | `comment` | not-portable: pending #113 |
| 22 | `alg.layered/…/graph/LGraphUtil.java:907` | `assert false : finalExternalPortSide` | `src/alg/layered/graph/LGraphUtilExternalPorts.ts:192` | `comment` | not-portable: pending #113 |
| 23 | `alg.layered/…/graph/LNode.java:165` | `assert layer == null` | `src/alg/layered/graph/LNode.ts:132` | `comment` | not-portable: pending #113 |
| 24 | `alg.layered/…/graph/transform/ElkGraphImporter.java:205` | `assert !sizeConstraints.isEmpty()` | `src/alg/layered/graph/transform/ElkGraphImporterEntryPoints.ts:80` | `comment` | restored |
| 25 | `alg.layered/…/graph/transform/ElkGraphImporter.java:620` | `assert source == origin \|\| ElkGraphUtil.isDescendant(source, origin)` | `src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:296` | `comment` | restored |
| 26 | `alg.layered/…/graph/transform/ElkGraphImporter.java:621` | `assert target == origin \|\| ElkGraphUtil.isDescendant(target, origin)` | `src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:297` | `comment` | restored |
| 27 | `alg.layered/…/graph/transform/ElkGraphImporter.java:789` | `assert portSide != PortSide.UNDEFINED` | `src/alg/layered/graph/transform/ElkGraphImporterExternalPorts.ts:216` | `comment` | restored |
| 116 | `alg.layered/…/options/EdgeLabelSideSelection.java:58` | `assert false` | `src/alg/layered/options/EdgeLabelSideSelection.ts:83` | `comment` | not-portable: pending #113 |
| 117 | `alg.layered/…/options/LayeredSpacings.java:85` | `assert BASE_SPACING_OPTION.getDefault() != null : "Base spacing default value must be non-null."` | `src/alg/layered/options/LayeredSpacingsLayeredSpacingsBuilder.ts:55` | `comment` | restored |
| 118 | `alg.layered/…/options/LayeredSpacings.java:87` | `assert !DoubleMath.fuzzyEquals(0.0d, BASE_SPACING_OPTION.getDefault(), DOUBLE_EQ_EPSILON) : "Base spacing default value must be different from 0.0d."` | `src/alg/layered/options/LayeredSpacingsLayeredSpacingsBuilder.ts:60` | `comment` | restored |
| 119 | `alg.layered/…/p1cycles/BFSNodeOrderCycleBreaker.java:138` | `assert n.id == i` | `src/alg/layered/p1cycles/BFSNodeOrderCycleBreaker.ts:142` | `silent` | restored |
| 120 | `alg.layered/…/p1cycles/DFSNodeOrderCycleBreaker.java:125` | `assert n.id == i` | `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.ts:141` | `silent` | restored |
| 121 | `alg.layered/…/p1cycles/DepthFirstCycleBreaker.java:113` | `assert n.id == i` | `src/alg/layered/p1cycles/DepthFirstCycleBreaker.ts:124` | `silent` | restored |
| 122 | `alg.layered/…/p1cycles/GreedyCycleBreaker.java:185` | `assert maxOutflow > Integer.MIN_VALUE` | `src/alg/layered/p1cycles/GreedyCycleBreaker.ts:208` | `silent` | restored |
| 123 | `alg.layered/…/p3order/ForsterConstraintResolver.java:239` | `assert group.getBarycenter() != null && group.getBarycenter() >= lastValue` | `src/alg/layered/p3order/ForsterConstraintResolver.ts:290` | `comment` | not-portable: pending #113 |
| 124 | `alg.layered/…/p3order/ForsterConstraintResolver.java:309` | `assert newNodeGroup.getBarycenter() + BARYCENTER_EQUALITY_DELTA >= secondNodeGroup.getBarycenter()` | `src/alg/layered/p3order/ForsterConstraintResolver.ts:354` | `comment` | restored |
| 125 | `alg.layered/…/p3order/ForsterConstraintResolver.java:310` | `assert newNodeGroup.getBarycenter() - BARYCENTER_EQUALITY_DELTA <= firstNodeGroup.getBarycenter()` | `src/alg/layered/p3order/ForsterConstraintResolver.ts:359` | `comment` | restored |
| 126 | `alg.layered/…/p3order/ForsterConstraintResolver.java:547` | `assert nodes.length == 1` | `src/alg/layered/p3order/ForsterConstraintResolverConstraintGroup.ts:229` | `comment` | restored |
| 127 | `alg.layered/…/p3order/SweepCopy.java:149` | `assert dummy.getType() == NodeType.NORTH_SOUTH_PORT` | `src/alg/layered/p3order/SweepCopy.ts:141` | `comment` | restored |
| 128 | `alg.layered/…/p3order/counting/CrossingsCounter.java:426` | `assert dummy != null` | `src/alg/layered/p3order/counting/CrossingsCounterNorthSouth.ts:74` | `comment` | restored |
| 129 | `alg.layered/…/p4nodes/LinearSegmentsNodePlacer.java:308` | `assert outgoing[i].isEmpty()` | `src/alg/layered/p4nodes/LinearSegmentsNodePlacerCreation.ts:75` | `comment` | restored |
| 130 | `alg.layered/…/p4nodes/LinearSegmentsNodePlacer.java:781` | `assert weightSum > 0` | `src/alg/layered/p4nodes/LinearSegmentsNodePlacerBalancing.ts:314` | `comment` | restored |
| 131 | `alg.layered/…/p4nodes/NetworkSimplexPlacer.java:592` | `assert DoubleMath.fuzzyEquals(srcOffset - tgtOffset, Math.round(srcOffset - tgtOffset), EPSILON) : "Port positions must be integral"` | `src/alg/layered/p4nodes/NetworkSimplexPlacerGraphBuilding.ts:253` | `comment` | restored |
| 132 | `alg.layered/…/p4nodes/NetworkSimplexPlacer.java:1131` | `assert centerOrigin instanceof LNode` | `src/alg/layered/p4nodes/NetworkSimplexPlacerStraightEdges.ts:221` | `comment` | restored |
| 133 | `alg.layered/…/p4nodes/bk/ThresholdStrategy.java:373` | `assert pp.edge != null` | `src/alg/layered/p4nodes/bk/ThresholdStrategySimpleThresholdStrategy.ts:216` | `comment` | restored |
| 134 | `alg.layered/…/p4nodes/bk/ThresholdStrategy.java:395` | `assert DoubleMath.fuzzyEquals(availableSpace, 0, EPSILON) \|\| availableSpace >= 0` | `src/alg/layered/p4nodes/bk/ThresholdStrategySimpleThresholdStrategy.ts:237` | `comment` | restored |
| 135 | `alg.layered/…/p4nodes/bk/ThresholdStrategy.java:403` | `assert DoubleMath.fuzzyEquals(availableSpace, 0, EPSILON) \|\| availableSpace >= 0` | `src/alg/layered/p4nodes/bk/ThresholdStrategySimpleThresholdStrategy.ts:244` | `comment` | restored |
| 136 | `alg.layered/…/p5edges/orthogonal/HyperEdgeCycleDetector.java:44` | `assert false` | `src/alg/layered/p5edges/orthogonal/HyperEdgeCycleDetector.ts:31` | `no-arm` | restored |
| 137 | `alg.layered/…/p5edges/orthogonal/HyperEdgeSegmentSplitter.java:440` | `assert endPosition >= startPosition` | `src/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitterFreeArea.ts:20` | `comment` | restored |
| 138 | `alg.layered/…/p5edges/splines/NubsSelfLoop.java:239` | `assert cornerBendPoints.size() == 2` | `src/alg/layered/p5edges/splines/NubsSelfLoop.ts:199` | `comment` | restored |
| 139 | `alg.layered/…/p5edges/splines/NubsSelfLoop.java:273` | `assert cornerBendPoints.size() == 3` | `src/alg/layered/p5edges/splines/NubsSelfLoop.ts:239` | `comment` | restored |
| 140 | `alg.layered/…/p5edges/splines/NubsSelfLoop.java:305` | `assert cornerBendPoints.size() == 4` | `src/alg/layered/p5edges/splines/NubsSelfLoop.ts:277` | `comment` | restored |
| 141 | `alg.layered/…/p5edges/splines/SplineEdgeRouter.java:582` | `assert false : "sideToProcess must be either LEFT or RIGHT."` | `src/alg/layered/p5edges/splines/SplineEdgeRouterSegments.ts:339` | `no-arm` | restored |

## Superseded by #127 (2026-11-20)

The rows above are as the dev-assert mission (#45) left them and are not edited. Mission `dev-assert-restore` (issue
#127; rulings on #112 row #32 and #113, all nine rows) restored the ten rows below as `devAssert` calls; their status
above (`not-portable: pending #112` / `pending #113`) is superseded by this table. The tests and JVM rows that drive
these sites on purpose run that step with assertions off (`plans/dev-assert-restore/census.md` lists them), and one
test per site pins the `AssertionError` with assertions on.

| # | Java file:line | TS `devAssert` line | Status |
| - | -------------- | ------------------- | ------ |
| 9 | `core/…/util/InstancePool.java:59` | `src/core/util/InstancePool.ts:37` | restored |
| 12 | `alg.common/…/nodespacing/internal/NodeContext.java:277` | `src/alg/common/nodespacing/internal/NodeContext.ts:244` | restored |
| 13 | `alg.common/…/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.java:212` | `src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.ts:272` | restored |
| 21 | `alg.layered/…/graph/LGraphUtil.java:821` | `src/alg/layered/graph/LGraphUtilExternalPorts.ts:154` | restored |
| 22 | `alg.layered/…/graph/LGraphUtil.java:907` | `src/alg/layered/graph/LGraphUtilExternalPorts.ts:193` | restored |
| 23 | `alg.layered/…/graph/LNode.java:165` | `src/alg/layered/graph/LNode.ts:133` | restored |
| 32 | `alg.layered/…/intermediate/EndLabelPreprocessor.java:377` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:117` | restored |
| 40 | `alg.layered/…/intermediate/HighDegreeNodeLayeringProcessor.java:255` | `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.ts:291` | restored |
| 116 | `alg.layered/…/options/EdgeLabelSideSelection.java:58` | `src/alg/layered/options/EdgeLabelSideSelection.ts:85` | restored |
| 123 | `alg.layered/…/p3order/ForsterConstraintResolver.java:239` | `src/alg/layered/p3order/ForsterConstraintResolver.ts:300` (with `lastValue`, `:297-301`) | restored |

Two more rows changed after #45 landed and before this mission, in `ec315bf5` (issue #112, comment of 2026-11-20):
rows 134 and 135 (`ThresholdStrategy.java:395`, `:403`) read `restored` above and are comments again
(`src/alg/layered/p4nodes/bk/ThresholdStrategySimpleThresholdStrategy.ts:236-239`, `:246-248`), pending the diagnosis of
issue #128.

Corrected status totals (143 statements):

| Status | Sites | Rows |
| ------ | ----- | ---- |
| `restored` | 132 | the 124 above, less 134 and 135, plus the ten of this section |
| `restored (throw kept)` | 6 | unchanged |
| comment naming an issue | 5 | 4, 5 (`BoxLayoutProvider.java:738`, `:754`; #112, knowvah/elk#27), 114 (`SingleEdgeGraphWrapper.java:193`; #112, knowvah/elk#28), 134, 135 (#128) |

## Superseded by #115 (2026-11-25)

The rows and sections above are not edited. Mission `self-loop-assert-arms` (issue #115) removed the six
`throw new Error(...)`s that dev-assert D5.4 kept after `devAssert(() => false)`. Each arm now does what the Java
statement after `assert false` does on a JVM without `-ea`, so the status `restored (throw kept)` of the rows below is
superseded by this table. One pair of tests per row pins the Java statement with assertions off and the
`AssertionError` with assertions on (`OrthogonalSelfLoopRouter.test.ts`, `RoutingDirector.test.ts`), and no valid
graph reaches any of the arms (`plans/self-loop-assert-arms/decision-journal.md`, the `evidence` rows).

| # | Java file:line | TS `devAssert` line | After it, as the Java | Status |
| - | -------------- | ------------------- | --------------------- | ------ |
| 96 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:180` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:208` | `break` | restored |
| 98 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:304` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts:128` | `return -1` | restored |
| 99 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:367` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:293` | `break`, then `bendPoints.add(result)` | restored |
| 100 | `alg.layered/…/intermediate/loops/routing/OrthogonalSelfLoopRouter.java:441` | `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:410` | `return null` | restored |
| 105 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:207` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:212` | `break` with both sides null; a null selector is a `TypeError` before the `switch` (`:185-189`) | restored |
| 108 | `alg.layered/…/intermediate/loops/routing/RoutingDirector.java:227` | `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:233` | `return null` | restored |

Corrected status totals (143 statements):

| Status | Sites | Rows |
| ------ | ----- | ---- |
| `restored` | 138 | the 132 of the section above, plus the six of this section |
| `restored (throw kept)` | 0 | none |
| comment naming an issue | 5 | unchanged: 4, 5, 114, 134, 135 |
