<!-- SPDX-License-Identifier: EPL-2.0 -->

# Coverage of the 7c classes by the ported JUnit suites (T9)

Measured 2026-11-03 on `feature/layered-crossing-min-tests` after T8, with 7c's T9 include list
(`plans/layered-crossing-min/unreached.md` header: `p3order/**`, `intermediate/greedyswitch/**`,
`intermediate/preserveorder/**`, the eight C2 processors' files; test files excluded; v8, json reporter) and the
untaken arms extracted per file as `file:line type[arm]` (branches) and `file:line fn name` (functions), the
numbering of 7c's map. Coverage is load-independent.

## Count audit (stop 7)

`bash tools/oracle/java-tests.sh` over the fourteen suites (280 runs, 0 failures) against
`npx vitest run --reporter=json` over the fourteen ported files (280 passed, 12 skipped). Java `@Ignore` methods are
counted times the suite's parameters, as the [baseline](decisions.md#baseline) does.

| Suite (`org.eclipse.elk.alg.layered.`) | Java runs | TS passed | `@Ignore` × params | TS skipped | |
| -------------------------------------- | --------: | --------: | -----------------: | ---------: | - |
| `p3order.AbstractBarycenterPortDistributorTest` | 6 | 6 | 1 | 1 | equal |
| `p3order.BarycenterHeuristicTest` | 7 | 7 | 0 | 0 | equal |
| `p3order.GreedyPortDistributorTest` | 11 | 11 | 0 | 0 | equal |
| `p3order.LayerSweepCrossingMinimizerTest` | 74 | 74 | 8 | 8 | equal |
| `p3order.LayerSweepHierarchicalTwoSidedGreedySwitchTest` | 6 | 6 | 0 | 0 | equal |
| `p3order.LayerSweepTypeDeciderTest` | 3 | 3 | 0 | 0 | equal |
| `p3order.counting.AllCrossingsCounterTest` | 14 | 14 | 0 | 0 | equal |
| `p3order.counting.CrossingsCounterTest` | 13 | 13 | 1 | 1 | equal |
| `p3order.counting.NorthSouthEdgeAllCrossingsCounterTest` | 20 | 20 | 0 | 0 | equal |
| `intermediate.greedyswitch.BetweenLayerEdgeTwoNodeCrossingsCounterTest` | 15 | 15 | 1 | 1 | equal |
| `intermediate.greedyswitch.GreedySwitchProcessorTest` | 26 | 26 | 0 | 0 | equal |
| `intermediate.greedyswitch.InLayerEdgeTwoNodeCrossingCounterTest` | 21 | 21 | 1 | 1 | equal |
| `intermediate.greedyswitch.NorthSouthEdgeNeighbouringNodeCrossingsCounterTest` | 26 | 26 | 0 | 0 | equal |
| `intermediate.greedyswitch.SwitchDeciderTest` | 38 | 38 | 0 | 0 | equal |
| **Total** | **280** | **280** | **12** | **12** | equal |

## Totals

Two runs over the include list (69 files): **before** = the generic order replay (`LayeredOrderVectors.test.ts`, 813
rows) plus every test file already in the included directories (7c's unit and T12 anchored cases): 61 test files; **now** = the
same plus the fourteen ported suites: 75 test files.

| Run | Statements | Branches | Functions | Lines |
| --- | ---------- | -------- | --------- | ----- |
| before (7c after T12) | 97.56 % (3312/3395) | 95.70 % (1425/1489) | 99.49 % (587/590) | 97.56 % (3237/3318) |
| now (with the fourteen suites) | 97.56 % (3312/3395) | 95.90 % (1428/1489) | 99.49 % (587/590) | 97.56 % (3237/3318) |

Untaken arms: 67 before (64 branch arms, 3 functions), 64 now
(61 branch arms, 3 functions). The suites newly reach **3 branch arms**, all in 7c's "U
nested" group (unreachable through the flat 7c rows, `unreached.md` § U); no "U dead by construction" arm and no J arm
is reached, so 7c's classification needs no correction.

## Arms the suites newly reach

| Arm (7c category) | Java semantics | Reached by (suite · test) |
| ----------------- | -------------- | ------------------------- |
| `LayerSweepCrossingMinimizer.ts:163 if[1]` (U nested) | `setPortOrderOnParentGraph`: a child graph without external ports, or with no best sweep, after its sweep (`LayerSweepCrossingMinimizer.java:162-170`) | `LayerSweepCrossingMinimizerTest` · `givenCompoundGraphWhereOrderIsOnlyCorrectedOnForwardSweep_RemovesCrossing`, `givenSingleHierarchicalNodeWithCross_RemovesCrossing`, `givenCrossWithNoExternalPortDummiesOnOneNestedGraph_ShouldRemoveCrossing`, `inRecursiveLayout_althoughBackwardSweepNotTakenStillCorrectsPortOrder`, `hierarchicalMustTransfer_checkWhetherMarked` (both parameters); `LayerSweepHierarchicalTwoSidedGreedySwitchTest` · `givenCompoundGraphWhereOrderIsOnlyCorrectedOnForwardSweep_RemovesCrossing`, `givenSingleHierarchicalNodeWithCross_RemovesCrossing` |
| `SwitchDecider.ts:94 cond-expr[0]` (U nested) | hierarchical greedy switch: the parent node's layer has a left neighbour layer (`SwitchDecider.java:92`) | `LayerSweepHierarchicalTwoSidedGreedySwitchTest` · `crossingBeforeFirstLayerCausesCrossingOutside_TwoSidedPrevents` |
| `SwitchDecider.ts:97 cond-expr[0]` (U nested) | hierarchical greedy switch: the parent node's layer has a right neighbour layer (`SwitchDecider.java:95`) | `LayerSweepHierarchicalTwoSidedGreedySwitchTest` · `givencrossInFirstLevelCompoundNodeUsingTwoSidedGreedySwitch_LeavesCrossing`, `crossingBeforeLastLayerCausesCrossingOutside_TwoSidedPrevents`; `SwitchDeciderTest` · `switchingDummyNodesNotifiesPortSwitch` (both parameters) |

Attribution: one coverage run per ported suite (which suites reach an arm), then one run per `it` of those suites with
`-t` (which tests). The other eleven suites reach no arm the before run left untaken: their paths were already taken
by 7c's unit and anchored cases.

## What stays untaken (61 branch arms, 3 functions)

By file: `intermediate/LongEdgeSplitter.ts` 2, `intermediate/NorthSouthPortPreprocessor.ts` 2, `intermediate/NorthSouthPortPreprocessorDummies.ts` 6, `intermediate/PortListSorter.ts` 2, `intermediate/PortSideProcessor.ts` 1, `intermediate/SortByInputModelProcessor.ts` 3, `intermediate/preserveorder/ModelOrderNodeComparator.ts` 2, `intermediate/preserveorder/ModelOrderNodeComparatorAssociations.ts` 1, `intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.ts` 10, `intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.ts` 3, `intermediate/preserveorder/ModelOrderNodeComparatorState.ts` 1, `intermediate/preserveorder/ModelOrderPortComparator.ts` 2, `intermediate/preserveorder/ModelOrderPortComparatorIncoming.ts` 4, `intermediate/preserveorder/ModelOrderPortComparatorOutgoing.ts` 1, `p3order/AbstractBarycenterPortDistributor.ts` 1, `p3order/BarycenterHeuristic.ts` 5, `p3order/GreedyPortDistributor.ts` 1, `p3order/LayerSweepCrossingMinimizer.ts` 2, `p3order/LayerSweepCrossingMinimizerCounting.ts` 1, `p3order/LayerSweepTypeDecider.ts` 1, `p3order/MedianHeuristic.ts` 7, `p3order/ModelOrderBarycenterHeuristic.ts` 2, `p3order/SweepCopy.ts` 1, `p3order/counting/CrossMinUtil.ts` 1, `p3order/counting/CrossingsCounterConvenience.ts` 1, `p3order/counting/CrossingsCounterNorthSouth.ts` 1. Every one of them is listed in 7c's map
(`plans/layered-crossing-min/unreached.md`): the U dead-by-construction arms (`MedianHeuristic` min/max seeding,
`BarycenterHeuristic.ts:407-411`, `LayerSweepCrossingMinimizer.ts:346`, the old-approach N/S dummies,
`PortListSorter.ts:89,195`, `CrossMinUtil`'s private constructor), the U nested arms the hand-built suites do not build
(an empty child graph at `LayerSweepCrossingMinimizer.ts:152 if[1]`, `GreedyPortDistributor.ts:123 if[1]`,
`LayerSweepCrossingMinimizerCounting.ts:161 if[1]`), the U label-dummy and processor arms (`LongEdgeSplitter`,
`NorthSouthPortPreprocessor`, `PortSideProcessor`, `SortByInputModelProcessor`), the `preserveorder` comparator arms
7c's rows left, and three S arms 7c's T11/T12 corrections discuss (`AbstractBarycenterPortDistributor.ts:272 if[1]`,
`CrossingsCounterConvenience.ts:31 if[1]`, `CrossingsCounterNorthSouth.ts:86 if[1]`). This mission reclassifies none of
them; 7h re-measures the nested group with recorded rows.
