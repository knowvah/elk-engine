<!-- SPDX-License-Identifier: EPL-2.0 -->

# Census: corpus-sweeps-asserts (issue #116, 2026-11-25)

Tree: the content of `fb4b906a` (the mission changes no file under `src/` or `test/`). Oracle data: the recorded sweep
results the journal's `start` row lists. Node v26.3.1, vitest 5.0.3. Every figure below is from the runs of 2026-11-25
01:06-02:06 on this machine.

## 1. Firing sites

**None.** Thirteen sweeps at stride 1 with assertions on: thirteen `exit 0`, none skipped, no verdict line and no
`throw-pairs:` entry with an `AssertionError`. The second pass through the probe (§ 4) counted 45,661,377 evaluated
`devAssert` calls and 0 that threw.

## 2. What each sweep evaluates

A green sweep shows that no assert fired. It does not show how many asserts the sweep reached. The probe counted the
`devAssert` calls each sweep evaluates with assertions on, by calling site.

| Sweep | Layouts through `withEndLabelRule`: assertions off / suite setting | `devAssert` sites evaluated | Evaluations with assertions on | Fired | Calls skipped inside an assertions-off layout |
| ----- | ---: | ---: | ---: | ---: | ---: |
| `labels` | 135 / 815 | 44 | 138,150 | 0 | 6,576 |
| `label-sizing` | 0 / 0 | 1 | 3 | 0 | 0 |
| `loops` | 0 / 105 | 61 | 10,730,460 | 0 | 0 |
| `phase` | 0 / 0 | 16 | 115,635 | 0 | 0 |
| `pipeline` | 0 / 0 | 25 | 20,757,573 | 0 | 0 |
| `compound` | 10 / 135 | 52 | 8,517,521 | 0 | 1,538 |
| `order` | 0 / 0 | 19 | 1,094,789 | 0 | 0 |
| `placement` | 0 / 0 | 23 | 138,363 | 0 | 0 |
| `routing` | 0 / 6,280 | 22 | 4,168,868 | 0 | 0 |
| `json` | 0 / 0 | 1 | 3 | 0 | 0 |
| `elkj` | 0 / 0 | 1 | 3 | 0 | 0 |
| `elkt` | 0 / 0 | 1 | 3 | 0 | 0 |
| `dot-export` | 0 / 0 | 1 | 6 | 0 | 0 |

Reading the table:

- **The four format sweeps and `label-sizing` evaluate one site**, `src/core/util/InstancePool.ts:37`, three to six
  times. They parse, convert and write; they lay nothing out. Their green runs say almost nothing about the restored
  asserts.
- **`withEndLabelRule` turns assertions off for 145 layouts**: 135 of the 950 `labels` cases and 10 of the 145
  `compound` layouts that go through `replayCase`. That is #127's count (68 + 67 and 4 + 6). No `routing` prefix and
  no part b case of `loops` has an unsized end label. Inside those 145 layouts 8,114 `devAssert` calls return without
  a check.
- **`EndLabelPreprocessorPlacement.ts:117`** (`EndLabelPreprocessor.java:377`, the #32 site) is never evaluated with
  assertions on by any sweep. The line runs only for a port with an end-label cell on an overlap-removal side, and
  every sweep layout that gets there is one the rule runs with assertions off (72 of them fired in #127's run before
  the wrap). So the corpus has no case where that assert is checked and holds, which bears on the narrowing in #138.

## 3. Sites reached and not reached

`grep -rn "devAssert(" src` outside the test files and `DevAssert.ts` lists 140 call lines in 79 files (125 lines under
`src/alg/layered`). The sweeps evaluate **79** of them with assertions on (78 under `src/alg/layered`, plus
`InstancePool.ts:37`). **61** are never evaluated with assertions on: 47 under `src/alg/layered` and 14 in other
bundles. The 14 are outside what these sweeps lay out (#137). A site that reads `devAssert(() => false)` is in this
list whenever its arm is not entered, which is the correct result.

### Evaluated (79)

| Site | Evaluations | Sweeps |
| ---- | ---: | ------ |
| `src/alg/layered/components/ComponentGroupGraphPlacer.ts:61` | 11,523 | labels, loops, pipeline |
| `src/alg/layered/components/SimpleRowGraphPlacer.ts:30` | 2,362 | labels, loops, pipeline, compound |
| `src/alg/layered/compound/CompoundGraphPreprocessorSegments.ts:363` | 5 | compound |
| `src/alg/layered/graph/LGraphUtilExternalPorts.ts:154` | 126,384 | labels, loops, phase, pipeline, compound, order, placement, routing |
| `src/alg/layered/graph/LNode.ts:133` | 517,123 | labels, loops, pipeline, compound |
| `src/alg/layered/graph/transform/ElkGraphImporterEntryPoints.ts:80` | 245 | labels, loops, compound |
| `src/alg/layered/graph/transform/ElkGraphImporterExternalPorts.ts:216` | 114,171 | labels, loops, phase, pipeline, order, placement, routing |
| `src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:296` | 5,973 | compound |
| `src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:297` | 5,973 | compound |
| `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.ts:263` | 9,085 | labels, loops, phase, pipeline, compound, order, routing |
| `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.ts:305` | 18,423 | labels, loops, phase, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/EndLabelPostprocessor.ts:45` | 20 | labels |
| `src/alg/layered/intermediate/EndLabelPostprocessor.ts:49` | 20 | labels |
| `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:34` | 20 | labels |
| `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts:35` | 20 | labels |
| `src/alg/layered/intermediate/FinalSplineBendpointsCalculatorControlPoints.ts:246` | 23,469 | labels, loops, pipeline, compound, routing |
| `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouterRestore.ts:63` | 219 | labels, loops, compound |
| `src/alg/layered/intermediate/InvertedPortProcessor.ts:137` | 21,995 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/InvertedPortProcessor.ts:206` | 20,505 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/LabelDummySwitcher.ts:148` | 15 | labels |
| `src/alg/layered/intermediate/LabelDummySwitcher.ts:220` | 1,278 | labels, loops, compound |
| `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:146` | 20 | labels |
| `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:168` | 40 | labels |
| `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:169` | 40 | labels |
| `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts:170` | 40 | labels |
| `src/alg/layered/intermediate/LabelSideSelector.ts:205` | 1,020 | labels, loops, compound |
| `src/alg/layered/intermediate/LabelSideSelector.ts:277` | 1,761 | labels, loops, compound |
| `src/alg/layered/intermediate/LabelSideSelector.ts:378` | 1,969 | labels, loops, compound |
| `src/alg/layered/intermediate/LabelSideSelector.ts:379` | 1,969 | labels, loops, compound |
| `src/alg/layered/intermediate/LongEdgeSplitter.ts:61` | 218,814 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessor.ts:165` | 43,620 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessor.ts:201` | 63,091 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessorDummies.ts:243` | 67,905 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessorDummies.ts:264` | 39,409 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/intermediate/PartitionPreprocessor.ts:54` | 145 | labels, loops |
| `src/alg/layered/intermediate/SelfLoopPreProcessor.ts:98` | 1,391 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfHyperLoop.ts:80` | 4,626 | loops, compound |
| `src/alg/layered/intermediate/loops/SelfHyperLoop.ts:92` | 9,264 | loops, compound |
| `src/alg/layered/intermediate/loops/SelfHyperLoopLabels.ts:72` | 693 | loops |
| `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:32` | 5,188 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:33` | 5,188 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:34` | 5,188 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfLoopEdge.ts:61` | 5,188 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfLoopHolder.ts:56` | 4,631 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/SelfLoopPort.ts:32` | 10,364 | loops, phase, compound |
| `src/alg/layered/intermediate/loops/ordering/PortRestorer.ts:269` | 4,293 | loops, compound |
| `src/alg/layered/intermediate/loops/ordering/PortRestorerPortList.ts:51` | 317 | loops, compound |
| `src/alg/layered/intermediate/loops/ordering/PortRestorerPortList.ts:52` | 317 | loops, compound |
| `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts:27` | 236 | loops, compound |
| `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts:46` | 236 | loops, compound |
| `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:78` | 558 | loops |
| `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts:180` | 45 | loops |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:138` | 3,912 | loops, compound |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts:146` | 2,506 | loops, compound |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts:57` | 8,186 | loops, compound |
| `src/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouter.ts:51` | 310 | loops |
| `src/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouter.ts:69` | 1,193 | loops |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:151` | 3,912 | loops, compound |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:223` | 4 | loops |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts:224` | 4 | loops |
| `src/alg/layered/intermediate/loops/routing/RoutingSlotAssigner.ts:116` | 891 | loops |
| `src/alg/layered/intermediate/loops/routing/SplineSelfLoopRouter.ts:67` | 779 | loops, compound |
| `src/alg/layered/p1cycles/BFSNodeOrderCycleBreaker.ts:142` | 81 | phase |
| `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.ts:141` | 84 | phase |
| `src/alg/layered/p1cycles/DepthFirstCycleBreaker.ts:124` | 84 | phase |
| `src/alg/layered/p1cycles/GreedyCycleBreaker.ts:208` | 18,699 | labels, loops, phase, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/ForsterConstraintResolver.ts:300` | 29,565,182 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/ForsterConstraintResolver.ts:361` | 1,109,971 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/ForsterConstraintResolver.ts:366` | 1,109,971 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/ForsterConstraintResolverConstraintGroup.ts:230` | 9,948,636 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/SweepCopy.ts:141` | 141,939 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p3order/counting/CrossingsCounterNorthSouth.ts:74` | 2,197,389 | labels, loops, pipeline, compound, order, placement, routing |
| `src/alg/layered/p4nodes/LinearSegmentsNodePlacerBalancing.ts:314` | 12,113 | placement |
| `src/alg/layered/p4nodes/LinearSegmentsNodePlacerCreation.ts:75` | 2,418 | placement |
| `src/alg/layered/p4nodes/NetworkSimplexPlacerGraphBuilding.ts:253` | 1,901 | labels, loops, placement |
| `src/alg/layered/p4nodes/NetworkSimplexPlacerStraightEdges.ts:221` | 75 | labels, placement |
| `src/alg/layered/p4nodes/bk/ThresholdStrategySimpleThresholdStrategy.ts:215` | 154,571 | labels, loops, pipeline, compound, placement, routing |
| `src/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitterFreeArea.ts:20` | 122 | labels, loops, pipeline, compound, routing |
| `src/core/util/InstancePool.ts:37` | 50 | labels, label-sizing, loops, phase, pipeline, compound, order, placement, routing, json, elkj, elkt, dot-export |

### Never evaluated with assertions on (61)

| File | Lines |
| ---- | ----- |
| `src/alg/common/nodespacing/internal/NodeContext.ts` | 244 |
| `src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.ts` | 272 |
| `src/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculatorSimpleInside.ts` | 238 |
| `src/alg/common/overlaps/RectangleStripOverlapRemover.ts` | 134 |
| `src/alg/force/stress/StressMajorization.ts` | 225 |
| `src/alg/layered/components/ComponentGroupModelOrderGraphPlacer.ts` | 33 |
| `src/alg/layered/components/ComponentsCompactor.ts` | 361 |
| `src/alg/layered/graph/LGraphUtilExternalPorts.ts` | 193 |
| `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts` | 65, 90, 117 |
| `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.ts` | 254, 291 |
| `src/alg/layered/intermediate/InteractiveExternalPortPositioner.ts` | 132 |
| `src/alg/layered/intermediate/InvertedPortProcessor.ts` | 254 |
| `src/alg/layered/intermediate/LabelDummySwitcherSpaceEfficient.ts` | 111 |
| `src/alg/layered/intermediate/LabelDummySwitcherTargets.ts` | 65 |
| `src/alg/layered/intermediate/LabelSideSelector.ts` | 489, 490, 491 |
| `src/alg/layered/intermediate/LayerConstraintPostprocessor.ts` | 162 |
| `src/alg/layered/intermediate/SelfLoopPortRestorer.ts` | 66 |
| `src/alg/layered/intermediate/loops/ordering/PortRestorer.ts` | 189, 308 |
| `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts` | 43 |
| `src/alg/layered/intermediate/loops/routing/LabelPlacer.ts` | 122, 174, 256, 291, 382, 420 |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.ts` | 44, 208, 293, 410 |
| `src/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts` | 20, 128 |
| `src/alg/layered/intermediate/loops/routing/RoutingDirector.ts` | 95, 212, 233 |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.ts` | 142 |
| `src/alg/layered/intermediate/wrapping/SingleEdgeGraphWrapper.ts` | 157, 158, 176 |
| `src/alg/layered/options/EdgeLabelSideSelection.ts` | 85 |
| `src/alg/layered/options/LayeredSpacingsLayeredSpacingsBuilder.ts` | 55, 60 |
| `src/alg/layered/p5edges/orthogonal/HyperEdgeCycleDetector.ts` | 31 |
| `src/alg/layered/p5edges/splines/NubsSelfLoop.ts` | 199, 239, 277 |
| `src/alg/layered/p5edges/splines/SplineEdgeRouterSegments.ts` | 339 |
| `src/alg/mrtree/intermediate/RootProcessor.ts` | 55 |
| `src/core/comments/AbstractNormalizedMatcher.ts` | 77 |
| `src/core/debug/grandom/generators/RandVal.ts` | 73 |
| `src/core/debug/grandom/generators/RandomGraphGenerator.ts` | 426 |
| `src/core/math/KVector.ts` | 291 |
| `src/core/util/BasicProgressMonitor.ts` | 265 |
| `src/core/util/ElkSpacingsElkCoreSpacingsBuilder.ts` | 50, 55 |
| `src/core/util/ElkUtilJunctions.ts` | 196 |

The five comment sites (`Not a devAssert yet`: `BoxLayoutProviderGroup.ts:66, 81`, `SingleEdgeGraphWrapper.ts:173`,
`ThresholdStrategySimpleThresholdStrategy.ts:237, 247`) are not `devAssert` calls and are in neither list.

## 4. The probe

A temporary test file, `test/corpus/assert-site-probe.test.ts`, deleted before the gates and never committed (D3). It
mocks two modules for one imported sweep file and leaves the sweep's own `it` blocks and expectations as they are, so
each probe run is also a second green run of that sweep:

```ts
const state = vi.hoisted(() => ({ wrapped: 0, plain: 0, skippedOff: 0, sites: new Map() }));

vi.mock('../../src/java/lang/DevAssert.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    devAssert: (check, detail) => {
      if (!actual.assertionsEnabled()) {
        state.skippedOff++;
        return;
      }
      const site = siteOf(); // the frame above this function: raw position as key, mapped frame as label
      site.evaluated++;
      try {
        actual.devAssert(check, detail);
      } catch (error) {
        site.fired++;
        throw error;
      }
    },
  };
});

vi.mock('../helpers/unsized-end-labels.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    withEndLabelRule: (root, body) => {
      if (actual.hasUnsizedEndLabel(root)) state.wrapped++;
      else state.plain++;
      return actual.withEndLabelRule(root, body);
    },
  };
});

await import(process.env['PROBE_TARGET']); // './labels-sweep.test.ts', …
afterAll(() => writeFileSync(process.env['PROBE_OUT'], JSON.stringify(/* state */)));
```

`siteOf` sets `Error.stackTraceLimit = 3` and swaps `Error.prepareStackTrace` for one call to read the structured
frames. It calls the runner's own `prepareStackTrace` once per new raw position to get the source-mapped
`file:line`. The raw line of a transformed module is not the source line (`InstancePool.ts` reads 36 raw, 37 mapped).
All 79 mapped lines are lines of the `grep` list, which checks the mapping. Run per sweep:

```sh
LABELS_SWEEP_STRIDE=1 PROBE_TARGET=./labels-sweep.test.ts PROBE_OUT=$TMPDIR/probe-labels.json \
  nice -n 10 npx vitest run test/corpus/assert-site-probe.test.ts --reporter=verbose
```

Wall time with the probe: `labels` 9 s, `label-sizing` 5 s, `loops` 162 s, `phase` 471 s, `pipeline` 214 s, `compound`
85 s, `order` 114 s, `placement` 35 s, `routing` 138 s, `json` 6 s, `elkj` 12 s, `elkt` 61 s, `dot-export` 11 s.
