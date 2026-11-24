<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.mrtree, alg.radial, alg.vertiflex: the tree algorithms (mission 8a)

What mission 8a (`alg-trees`, roadmap row 8a, issue #37) ported: the three tree-style layout bundles
`org.eclipse.elk.alg.mrtree`, `org.eclipse.elk.alg.radial` and `org.eclipse.elk.alg.vertiflex`, with their generated option
classes and providers. From here `LayoutMetaDataService` can register `MrTreeMetaDataProvider`, `RadialMetaDataProvider` and
`VertiFlexMetaDataProvider`, and `RecursiveGraphLayoutEngine` lays out a graph with each. This page covers the structure, the
splits behind facades, the evidence, the hashed-container verdicts, the reference-comparison sites, two shims, the recursion
probe, the known divergences and a runbook. Decisions cited are `plans/alg-trees/decisions.md` (TR1-TR10); task ids T1-T20 are
in that mission's `decision-journal.md`; AD-n are `plans/elk-engine-skeleton/decisions.md`. Counts live in
[conformance.md](../conformance.md#alg-trees). The mission's diagrams are
[data-flow](../../plans/alg-trees/diagrams/data-flow.md) (how the evidence is recorded and replayed) and
[component-map](../../plans/alg-trees/diagrams/component-map.md) (which packages exist and what they import).

| Section                                                   | Answers                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [1. Structure](#alg-trees-structure)                      | The three bundles, their phases, the registration decision                         |
| [2. Splits behind facades](#alg-trees-splits)             | `EdgeRouter*`, `RelativeXPlacer*` and the smaller splits                           |
| [3. Evidence](#alg-trees-evidence)                        | Vector refs and row counts, replays, goldens, sweep, JUnit, unit vectors, coverage |
| [4. Hashed containers](#alg-trees-containers)             | The TR3 table with what the run found                                              |
| [5. Reference comparisons and boxes](#alg-trees-identity) | The boxed and `String` `==` sites, the null-unboxing shim                          |
| [6. Shims](#alg-trees-shims)                              | `DoubleStream.average`, `Unbox`                                                    |
| [7. Recursion](#alg-trees-recursion)                      | The recursion table and the probe                                                  |
| [8. Known divergences and open issues](#alg-trees-open)   | The classified rows, the last-ulp case, issues #64-#68                             |
| [9. Runbook](#alg-trees-runbook)                          | Re-recording, goldens, sweep, the Java baseline                                    |

## 1. Structure {#alg-trees-structure}

TS paths are under `src/alg/` (AD-7): one class per file, named as the Java class, `@see` per symbol. The option classes
(`{MrTree,Radial,VertiFlex}{Options,MetaDataProvider}.ts`) are generated unedited by `tools/melk` from
`tools/melk/sources/{Tree,Radial,VertiFlex}.melk`.

| Bundle      | Phases (the assembled list)                                                                                                                                                                                                                  | Provider                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `mrtree`    | `ElkGraphImporter`, `ComponentsProcessor.split`; per component `p1treeify/DFSTreeifyer`, `p2order/NodeOrderer`, `p3place/NodePlacer`, `p4route/EdgeRouter` with the intermediate processors below; `ComponentsProcessor.pack`; `applyLayout` | `TreeLayoutProvider` over `MrTree` (the assembly) |
| `radial`    | `NodeMicroLayout`, then `RootAndRadius`, `EadesRadial` (`p1position`), the overlap removal, compaction and rotation processors, `CalculateGraphSize`, `StraightLineEdgeRouter` (`p2routing`), `EdgeAngleCalculator`                          | `RadialLayoutProvider`                            |
| `vertiflex` | `NodeMicroLayout`, `p1yplacement/NodeYPlacer`, `p2relative/RelativeXPlacer`, `p3absolute/AbsoluteXPlacer`, `p4edgerouting/{StraightEdgeRouter,BendEdgeRouter}`, graph size                                                                   | `VertiFlexLayoutProvider`                         |

mrtree has its own graph model (`graph/{TGraph,TNode,TEdge,TLabel,TShape,TGraphElement}`); radial and vertiflex work on the
`ElkNode` model directly. The mrtree intermediate processors (`intermediate/`) are `RootProcessor`, `FanProcessor`,
`LevelProcessor`, `NeighborsProcessor`, `LevelHeightProcessor`, `NodePositionProcessor`, `CompactionProcessor`,
`LevelCoordinatesProcessor`, `DirectionProcessor`, `GraphBoundsProcessor` and `Untreeifyer`, named by
`IntermediateProcessorStrategy`. Radial's strategies are enums with a `create()` factory (`SortingStrategy`,
`AnnulusWedgeCriteria`, `CompactionStrategy`, `OverlapRemovalStrategy`, `RadialTranslationStrategy`); the ones that return
`null` for `NONE` do so as the Java does.

**Registration (TR5, deviated).** TR5 planned to hold the three providers back through `PENDING_TYPES`. The landed tripwire
`test/melk/model-algorithms.test.ts:121-123` asserts `PENDING_TYPES` equals `[]`, so T5 did not edit it (AD-13) and held the
providers back with the staging mechanism of TR4 instead: three staged classes (`// @staged 8a`, a non-throwing constructor,
a `layout` that throws) until T11 (vertiflex), T13 (radial) and T17 (mrtree) ported them. The options were therefore final from
T5 on and were never regenerated at wiring. `staged-classes.json` is `[]` again and `PENDING_TYPES` is `[]`.
`LayoutMetaDataService.getInstance()` is unchanged: a test, replay or tool registers a provider explicitly
(`registerLayoutMetaDataProviders(new MrTreeMetaDataProvider())`). `tools/corpus/ts-layout-compare.ts` registers the three
through `registerTreeAlgorithms()`; row 9 registers the rest.

**Staging (TR4).** The factory enums name every implementation in `create()` while every implementation imports the enum, so
neither side can land first. T5 and T6 ported the enums whole and staged 16 radial and 15 mrtree `create()` targets; each
porting task replaced a body and the wiring tasks removed the last markers. The fitness test's `MARKER` was widened by one
token (`8a`); no expected value changed. `NON_LEAF_DEFAULT_TYPES` gained `radial.SortingStrategy`,
`radial.CompactionStrategy` and `radial.OverlapRemovalStrategy` (the TDZ recipe; `RadialMetaDataProvider.ts` defaults are lazy).

## 2. Splits behind facades {#alg-trees-splits}

The 500-line file, 30-NLOC function, CCN 10 and 5-parameter limits force two Java classes into sections. Statement order is
the Java's, and every extracted function carries `@see <Class>.java:<line>`.

`EdgeRouter` (705 Java lines), under `mrtree/p4route/`:

| File                        | Holds                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EdgeRouter.ts`             | the facade: `process`, `middleToMiddle`, `avoidOverlap`                                                     |
| `EdgeRouterShared.ts`       | `middleToMiddleEdgeRoute` (`:113`), the constants (`:53-56`)                                                |
| `EdgeRouterSpecialEdges.ts` | `avoidOverlapSpecialEdges` (`:164`), `avoidOverlapHandleCycleInducingEdges` (`:303`)                        |
| `EdgeRouterStartPoints.ts`  | the start-point block (`:389`)                                                                              |
| `EdgeRouterEndPoints.ts`    | the end-point block (`:455`)                                                                                |
| `EdgeRouterCyrusBeck.ts`    | `cyrusBeck` (`:603`): private and without a caller at the pin, exported from its section (`noUnusedLocals`) |

The 5-parameter limit is met by the parameter bundles `SpecialEdgesContext`, `CycleInducingArguments` and `EndPointContext`;
the Java's duplicated x and y gap search shares one body over an axis. `MultiLevelEdgeNodeNodeGap` is its own class, as in the
Java.

`RelativeXPlacer` (675 Java lines), under `vertiflex/p2relative/`:

| File                              | Holds                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| `RelativeXPlacer.ts`              | the facade: `process` and the two recursive placements (recursion verbatim) |
| `RelativeXPlacerOutlines.ts`      | `outlineDistance`, `makeSimpleOutlines`                                     |
| `RelativeXPlacerBundling.ts`      | `bundleChildren`                                                            |
| `RelativeXPlacerSorting.ts`       | `sortSubTrees`, `splitNodesWithModelOrder`, `splitGroup`                    |
| `RelativeXPlacerStraightSteps.ts` | blocks of the straight-strategy recursion                                   |
| `RelativeXPlacerBentSteps.ts`     | blocks of the bend-strategy recursion                                       |
| `RelativeXPlacerChildren.ts`      | the `(ElkNode)` cast helper                                                 |

Two pairs of identical Java blocks share one helper each (`:478-480` and `:490-492`; the min and max loops `:275-285` and
`:388-398`).

Smaller splits at Java block boundaries (journal rows in parentheses): `ElkGraphImporter.applyLayout` and
`ComponentsProcessor.pack` into helpers (T9); `NodeOrderer`, `OrderBalance`, `NodePlacer` (T12); several mrtree processors
(T14, T16: `FanProcessor.calculateFan`, `CompactionProcessor.process`); `AngleRotation.rotate`,
`RadiusExtensionOverlapRemoval.overlap` into four predicates joined in the Java order (T7, T10); `CalculateGraphSize`,
`EadesRadial.positionNodes`, `StraightLineEdgeRouter.routeEdges` (T13); `VertiFlexLayoutProvider.layout` (T11).
`IntermediateProcessorStrategy.create` of mrtree is a map from constant to lazy constructor (CCN), the Java `default` throw
kept. `OrderBalanceSortTEdgeTargetProperty.ts` is the Java nested static class in its own file (the `ElkLayered.TestExecutionState`
precedent).

## 3. Evidence {#alg-trees-evidence}

Every row below was recorded from the oracle (ELK built from source with the two patches) under `-XX:hashCode=2` (TR1, TR3).
A row is `{ id, group, input, expected }`; `input` is the prepared graph as ELK JSON, re-imported by the recorder before the run
(round-trip self-check). Groups: `full` (the result of `RecursiveGraphLayoutEngine`), `stops` (the internal state after each
step), `throws` (class, message, first ELK frame).

| Ref (under `test/golden/refs/java/`) | Recorder                              | Rows | full | stops | throws |
| ------------------------------------ | ------------------------------------- | ---: | ---: | ----: | -----: |
| `mrtree.json`                        | `tools/vectors/MrTreeVectors.java`    |  188 |  122 |    54 |     12 |
| `mrtree-extra.json`                  | the same launcher, second output      |  213 |  140 |    68 |      5 |
| `mrtree-extra2.json`                 | the same launcher, third output       |    3 |    0 |     3 |      0 |
| `radial.json`                        | `tools/vectors/RadialVectors.java`    |  309 |  148 |   150 |     11 |
| `radial-extra.json`                  | the same launcher, second output      |    7 |    5 |     2 |      0 |
| `vertiflex.json`                     | `tools/vectors/VertiFlexVectors.java` |  471 |  247 |   216 |      8 |
| `vertiflex-extra.json`               | the same launcher, second output      |    4 |    3 |     1 |      0 |

`mrtree-units.json` (recorder `tools/vectors/MrTreeUnitVectors.java`, `mrtree-unit-vectors.sh`) holds 2,656 rows of code the
pipeline rows cannot reach or isolate: `edgeRouter` 422 (hand-built `TGraph`s through the oracle's `EdgeRouter`,
`Random(8161)`), `cyrusBeck` 46 (by reflection on the private method), `orderBalance` 18 (`Random(12)`), `average` 2,170
(`Random(8163)`). `mrtree-extra.json` and the vertiflex ref's extra scenarios were added in the same mission, additively: the
committed rows are JSON-identical and in place (`fix(T3)`, T1 `fix`), and `mrtree.json` is byte-identical because committed tests
pin its counts. `mrtree-extra.json` holds the scenarios the first ref did not reach: compaction x five directions x two routing
modes, MIDDLE_TO_MIDDLE x four directions, multi-level gaps, cycle-inducing edges, node-order constraints with priorities 2-4,
fans of 11, 12 and 100, BFS two-parent shapes (4 complete and 4 throwing), `deepLevel` (a same-level edge at level 130), debug
logs, `omitNodeMicroLayout`. `radial-extra.json`, `vertiflex-extra.json` and `mrtree-extra2.json` (issue #66) are separate
files because committed tests pin the row counts of `radial.json`, `vertiflex.json` and `mrtree.json`, and `mrtree-extra.json`
is at its 8 MiB cap. Each recorder writes its new file after the earlier ones from a plan of its own, so the earlier files stay
byte-identical. Their rows take the `tau` arm of `EadesRadial` and the `sorter != null` arms of `RadialCompaction`, give stops
rows to four multi-level gap arms of the mrtree `EdgeRouter`, and kill eight mutants the earlier rows let survive (a node at
exactly angle 0 in the polar sorter, exactly touching boxes in the radial compaction, an outline tie in `RelativeXPlacer`, the
`BendEdgeRouter` epsilon, a compaction into level 0). `RadialExtraVectors.test.ts` and `VertiFlexExtraVectors.test.ts` replay
the first two; `MrTreeVectors.test.ts` replays all three mrtree files.

**Replays (TR1 exit).** `src/alg/mrtree/MrTreeVectors.test.ts`, `src/alg/radial/RadialVectors.test.ts` and
`src/alg/vertiflex/VertiFlexVectors.test.ts` replay every row through the real provider (a `full` row through
`RecursiveGraphLayoutEngine` with the provider registered; a `stops` row step by step with the recorder's monitor semantics; a
`throws` row by class, message unless a JVM NPE text, and the first ELK frame), at the AD-4 bar: **0 mismatches, except the two
radial rows classified in § 8**. Isolated per-phase transitions (each processor from its recorded "before" state to its "after"
stop, 88 per mrtree processor) back the whole-pipeline replays; helpers are in `test/helpers/{mrtree,radial,vertiflex}-replay-*.ts`.
mrtree states with a multi-parent node cannot be rebuilt from the dump (only a node's first parent is dumped); `buildTGraph`
refuses them, and the whole-pipeline replay covers those rows. The dump does not carry `DIRECTION` after `NodePlacer` writes it
(`NodePlacer.java:103-105`), so `buildBeforeGraphs` restores that one write. Replay times alone: mrtree 1.4 s, radial 5.9 s,
vertiflex 4.3 s (budget 30 s); every whole-ref loop carries an explicit 60 s timeout.

**Goldens (TR2).** `tools/oracle/regen-goldens.sh --set trees` writes `test/golden/refs/elk-trees/`: 37 refs (manifest
`test/golden/trees.json`, inputs under `test/golden/trees-inputs/`, `jvmFlags` in `_meta.json`): 34 from T4 (mrtree 13, radial
16, vertiflex 5) and 3 added later, `{mrtree,radial,vertiflex}-generated-retarget`, the generated corpus inputs retargeted to
each algorithm. T4 also recorded those three inputs without `retarget`; the corpus inputs set no algorithm and an entry
without `retarget` records the default algorithm, so those refs are layered layouts. Issue #68 moved them, byte-identical, to
the layered set as `generated-{mrtree,radial,vertiflex}-tree-small--default` (formerly `{mrtree,radial,vertiflex}-generated`;
see [alg-layered-compound.md](alg-layered-compound.md#part-i-goldens)). `test/golden/tree-goldens.test.ts` compares every
entry with its ref at AD-4 and checks that each ref records the algorithm its entry names. The refs of the `default`,
`algorithms` and `layered` sets regenerate byte-identically. Without the flag, 11 radial refs differ (the identity-hash
order, I30).

**Sweep (TR6).** Oracle `tools/oracle/sweep.sh --filter /<alg>/` under `-XX:hashCode=2`, 906 cases per algorithm (898 retarget
and 8 generated). Oracle throws: mrtree 89, radial 365, vertiflex 553 and 1 timeout. TS through
`tools/corpus/ts-layout-compare.ts`, in the two ways it can run:

| With layered registered (what row 9 will do) |  ok | mismatch | both-throw | excluded |
| -------------------------------------------- | --: | -------: | ---------: | -------: |
| mrtree                                       | 814 |        3 |         89 |        0 |
| radial                                       | 538 |        3 |        365 |        0 |
| vertiflex                                    | 350 |        2 |        553 |        1 |

| Tool as committed (core and the three tree providers) |  ok | mismatch | both-throw | ts-only | excluded |
| ----------------------------------------------------- | --: | -------: | ---------: | ------: | -------: |
| mrtree                                                | 657 |      153 |         89 |       7 |        0 |
| radial                                                | 417 |      131 |        358 |       0 |        0 |
| vertiflex                                             | 279 |       73 |        553 |       0 |        1 |

No `ts-only-throw` and no `oracle-only-throw` with layered registered. The 8 residual mismatches are 7 whose option keys belong
to the unported rectpacking and force providers (`hierarchicalLayoutMixing` for mrtree; `interactiveRectpacking_hierarchy` and
`interactiveRectpacking_oneBigNode` for each algorithm) and 1 last-ulp case (§ 8). Every mismatch of the tool as committed is
options-only (153 / 124 / 73) or one of seven models that need layered as the child default. The JSON exporter names an option
key by the shortest unique suffix over the registered providers, so a comparison depends on what is registered. `classify`
pairs an oracle `NullPointerException` with the port's `TypeError` and a `StackOverflowError` with `RangeError`; every other
class needs its Java name. Nothing from the sweep is committed (AD-5).

**JUnit (TR8).** `MrTreeGraphSizeTest` 6 of 6 (`src/alg/mrtree/MrTreeGraphSizeTest.test.ts`, `DOUBLE_EQ_EPSILON = 10e-5`) and
`CenterOnRootTest` 2 of 2 (`src/alg/radial/CenterOnRootTest.test.ts`, delta 0.1); the oracle runs at the start and at the end
of the mission are 6 / 0 and 2 / 0. vertiflex has no test bundle.

**Coverage.** Whole project 98.87 / 96.91 / 98.82 / 98.87 (lines / branches / functions / statements). Per bundle, from the
scoped runs of T19: mrtree 99.6 / 98.7 / 99.5 / 99.6, radial 99.3 / 96.7 / 98.8 / 99.3, vertiflex 99.5 / 97.4 / 100 / 99.5. The
recorded evidence alone reaches mrtree 86.7 / 81.8 / 83.0 / 86.6. What is left is in `plans/alg-trees/unreached.md`
(class D dead from the Java, P unreachable through the pipeline, R reachable but unrecorded; issue #66). Mutation spot check
(scratch copies, replay tests only): radial 5 of 11 killed, vertiflex 8 of 10, mrtree 8 of 10, then the mrtree re-check killed
M11 (the `FanProcessor` identity defect), M13, M14 and M15; survivors are equivalent code, dead code, or cases no recorded field
observes (issue #66).

## 4. Hashed containers {#alg-trees-containers}

TR3 named ten sites. What the run found, per site:

| Site (Java)                                                                                                                             | Keys                 | Iterated  | Port                                                                                                         | Finding                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 `ComponentsProcessor.java:240-262` `propMerge`, `debug`                                                                              | `IProperty`          | yes       | `JavaHashMap`, `PROPERTY` strategy over `getAllProperties()`                                                 | observable only in the order of the debug message                                                                                                                                                                                                                      |
| V4 `FanProcessor.java:39, 42, 123, 135` `gloFanMap`, `gloDescMap`, `locFanMap`                                                          | `String`             | yes       | `JavaHashMap`, `STRING` strategy                                                                             | 28 recorded iterations differ from insertion order; a reversed-order twin reproduces all 88 stops: **order unobservable**                                                                                                                                              |
| `ElkGraphImporter.java:60` `elemMap`                                                                                                    | `ElkNode` (identity) | lookup    | `Map`                                                                                                        | lookup only                                                                                                                                                                                                                                                            |
| `CompactionProcessor.java:250` `cand`                                                                                                   | `TNode` (identity)   | lookup    | `Map`                                                                                                        | lookup only                                                                                                                                                                                                                                                            |
| `EdgeRouter.java:167` `nodeGaps`                                                                                                        | `Long`               | lookup    | `Map<bigint, MultiLevelEdgeNodeNodeGap>`                                                                     | `HashStrategy.ts` has no `Long` strategy; the key `TreeUtil.getUniqueLong` is `curLevel * 2^32 + i`, above 2^53 from level 2^21, hence `bigint`                                                                                                                        |
| `LevelProcessor.java:36` `gloLevelMap`                                                                                                  | `Integer`            | lookup    | `JavaHashMap`, `INTEGER` strategy                                                                            | order unobservable                                                                                                                                                                                                                                                     |
| I30 `RadialUtil.java:224-231` (`getNextLevelNodeSet`), `:77` (`getSuccessorSet`) iterated by `RadiusExtensionOverlapRemoval.java:79-93` | `ElkNode` (identity) | yes       | insertion-ordered `Set`, with the twin `nextLevelOrder: 'java' \| 'reversed'` (never set by production code) | 152 rows reach it, 85 have a several-parent set; insertion order equals the oracle on 151, reversed also on 149; 1 is order-observable and matches in insertion order (`stops/shapes/binary4-sym`, treeified); **1 matches neither** (`stops/i30/rand-chain-big`, § 8) |
| `RadialUtil.java:56, 78` `children`                                                                                                     | `ElkNode` (identity) | lookup    | `Set`                                                                                                        | lookup only                                                                                                                                                                                                                                                            |
| `AnnulusWedgeCompaction.java:37, 40` contours                                                                                           | `ElkNode` (identity) | any-match | `LinkedHashMultimap.create(identity, identity)`                                                              | `contourOverlap` is an any-match                                                                                                                                                                                                                                       |
| `CompactionProcessor.java:246` `TreeSet`                                                                                                | `TNode`              | yes       | the 6a stand-in `ScanlineConstraintCalculatorTreeSet`                                                        | no `src/java/util/TreeSet.ts` exists; the comparator-equal behaviour the Java relies on is kept (an element comparing 0 to a member is not added)                                                                                                                      |

The mrtree identity-hash twin of T1: two JVMs without `-XX:hashCode=2` differ from the pinned ref on 0 of 188 rows. The radial
twin of T2: without the flag 54 rows differ (27 full and 27 stops), the I30 rows. vertiflex has no hashed container; an
unpinned run is byte-identical. Insertion order is the faithful reading of an identity-hashed container only below the size at
which the JVM treeifies a bin: under `-XX:hashCode=2` a set of 11 or more identity-hashed elements shares one bin whose
iteration order is the bin's tree order, not insertion order. Three radial rows carry `treeified: true` in the ref header:
`shapes/binary4-sym`, `i30/four-parents-big-12`, `i30/rand-chain-big`. The order of a treeified bin is not established and not
read from OpenJDK (AD-9).

## 5. Reference comparisons and boxes {#alg-trees-identity}

Java compares boxed numbers and `String`s by reference at four sites. Each was proved from the Java before it was ported
(stop 13), and one proof was wrong.

| Site                             | Java compares                                          | Ported as                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TreeUtil.java:115-116, 163-164` | `TREE_LEVEL` of source against target, boxed `Integer` | numeric inequality for values in -128..127 (the `Integer.valueOf` cache, JLS 5.1.7) and "different" for equal values outside it (a fresh object per `setProperty`)                                           |
| `ComponentsProcessor.java:249`   | `entry.getKey().getDefault() != entry.getValue()`      | `!==`: exact for every property that can differ between components; `GRAPH_{X,Y}{MIN,MAX}` (`Double`, never cached) differ from Java only in a case `GraphBoundsProcessor.java:34-40` overwrites right after |
| `FanProcessor.java:105`          | `pId != tNode.getProperty(ID)`, `String` objects       | a per-run `Map<TNode, object>` of identity tokens beside `InternalProperties.ID`, which stays a plain string for every reader and the dump                                                                   |

The `TreeUtil` emulation is confirmed by the oracle: two 150-deep chains with one extra same-level edge at level 10, 127, 128
and 140 route that edge straight at 10 and 127 and with four bend points at 128 and 140; the port equals the oracle in all four
cases, and the `full/deepLevel/*` rows of `mrtree-extra.json` show the same.

**`FanProcessor.java:105` and its identity tokens.** A first port compared content, on the proof that equal references imply
equal content and two distinct objects never have equal content. The proof assumed one `(pId, index)` pair per level. With a
two-parent node (BFS) one level holds nodes of different depth, `pId` switches and `index` restarts at 0 (`:106-107`), so
a level-1 iteration and a level-2 iteration each create an id reading "010" as fresh objects (`pId + formatRight(index++, digits)`);
two neighbouring entries of level 2 then carry equal-content, distinct-object ids, Java resets `index` between them and a content
comparison keeps counting. The rows `stops/bfs/cyc79n7/searchOrder=BFS` of `mrtree-extra.json` exposed it (`n5.ID` expected
"0100", port "0101"). The fix creates one token per iteration, stores it on the node (`:114`) and on its children (`:118`), reads
an unset `ID` as the one shared default token, and compares tokens. Only `:114` and `:118` write `ID` in the bundle. An audit of
every `==` and `!=` on `String`, boxed or value-like operands in the three bundles found no further site; radial and vertiflex
have none.

**Null unboxing.** Java throws `NullPointerException` where a null box is unboxed; JS coerces a null to 0. The sweep found the
silent case: `NodeComparator.java:45-46` unboxes `NODE_MODEL_ORDER`, null for subtree nodes reached through hierarchy-crossing
edges (`VertiFlexLayoutProvider.java:99-103` sets it on `graph.getChildren()` only), and the port's `integerCompare(null, null)`
returned 0. `src/java/lang/Unbox.ts` (`unboxInteger`, `unboxDouble`, `unboxBoolean`) makes a null box a `TypeError`
(elkgraph-model D10; JLS 5.1.8, the class mapping `NullPointerException` to `TypeError`). `NodeComparator.ts` and
`RelativeXPlacerSorting.ts` (`addTwoByModelOrder`, `RelativeXPlacer.java:455-456`, where `null > null` was silently false)
use it; `BendEdgeRouter` unboxes `EDGE_BEND_HEIGHT` explicitly (`:70`). An audit of every unboxing of a possibly-null box in the
three bundles found no other silent site.

## 6. Shims {#alg-trees-shims}

**`DoubleStream.average`** (`EdgeRouter.java:313-315, 328-330`: a sequential stream over a `LinkedList`,
`mapToDouble(Double::doubleValue).average().getAsDouble()`). The Javadoc says the implementation "may use compensated
summation"; the exact algorithm was settled by 2,170 JVM vectors (`mrtree-units.json`, `average`), implemented from the Javadoc
and the vectors only (AD-9) in `src/alg/mrtree/p4route/DoubleStreamAverage.ts`. Bit-exact matches:

| Candidate                                                                                            | Matches of 2,170 |
| ---------------------------------------------------------------------------------------------------- | ---------------: |
| plain left-to-right sum                                                                              |            1,603 |
| Kahan returning `sum`                                                                                |            2,139 |
| Kahan returning `sum - c`                                                                            |            2,136 |
| Kahan `sum` with the simple-sum fallback                                                             |            2,167 |
| Neumaier (with the fallback)                                                                         |    1,471 (1,505) |
| **Kahan `sum - c`, the simple sum when the compensated sum is NaN and the simple sum is non-finite** |        **2,170** |

An empty stream throws `NoSuchElementException`. The first port (Kahan `sum - c` without the fallback) differed on 34
non-finite vectors only.

**`Unbox`** is described in § 5.

## 7. Recursion {#alg-trees-recursion}

Recursion was ported verbatim (TR7; core-engine C7). Issue #67 then turned the recursions that kept the port below the
oracle's depth into explicit-stack loops (AC6), each proven against a verbatim recursive twin. The input-depth recursions at
the pin:

| Algorithm | Method (Java)                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mrtree    | `DFSTreeifyer.java:140`, `ComponentsProcessor.java:129`, `NodePlacer.java:137, 319` (`firstWalk`, `secondWalk`), the level recursions of `NeighborsProcessor`, `LevelHeightProcessor`, `LevelProcessor` |
| radial    | `RadiusExtensionOverlapRemoval.java:57` (`extend`), the radial compactors, `AnnulusWedgeByNodeSpace.java:39` (`calculateWedgeSpace`)                                                                    |
| vertiflex | `RelativeXPlacer.java:156, 295`, `StraightEdgeRouter.java:71` (`routeEdges`)                                                                                                                            |

**Probe (T19).** A 2,000-deep path and a 2,000-deep caterpillar per algorithm: the oracle (default `-Xss`) completes all six,
the port completes all six with and without `--jitless`, layouts equal at 1e-6 (mrtree jitless 762 s and 1,116 s, with JIT
20 s and 34 s). No port overflow where the oracle completes at the probe depth, so no site was converted then.

**Explicit-stack loops (issue #67, AC6).** The oracle's depth was measured again: one JVM per shape over 2,000 to 10,000 in
steps of 500, twice. It completed 10,000 for all six shapes. Its limit moves with JIT warm-up: the vertiflex path threw
`StackOverflowError` at 4,000 to 5,500 and completed 6,000 to 10,000 in the same JVM. The unconverted port overflowed at
3,000 to 5,000 in all six. The sites below were converted in the order the probes named them. Each keeps its name,
signature, visit order, side-effect order and floating-point accumulation order, and each has a test file beside it with a
verbatim recursive twin, 60 or more seeded trees compared on every effect (raw double bits) and a 15,000-deep case.

| Algorithm | Explicit-stack sites                                                                                                                                                                                                                            | Test files (`*.explicit-stack.test.ts`)                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| mrtree    | `ComponentsProcessor.dfs`, `DFSTreeifyer.dfs`, `NodePlacer.firstWalk` and `secondWalk`; as loops over the levels: `FanProcessor.calculateFan`, `LevelProcessor.setLevel`, the `setNeighbors` of `NeighborsProcessor` and `LevelHeightProcessor` | `ComponentsProcessor`, `DFSTreeifyer`, `NodePlacer`, `FanProcessor`, `LevelProcessor`, `NeighborsProcessor`, `LevelHeightProcessor` |
| radial    | `AnnulusWedgeByNodeSpace.calculateWedgeSpace`, `EadesRadial.positionNodes`, `StraightLineEdgeRouter.routeEdges`; as a loop over the levels: `RadiusExtensionOverlapRemoval.extend`                                                              | `AnnulusWedgeByNodeSpace`, `EadesRadial`, `StraightLineEdgeRouter`, `RadiusExtensionOverlapRemoval`                                 |
| vertiflex | `VertiFlexLayoutProvider.checkVerticalConstraintValidity`, `NodeYPlacer.setYLevels`, `RelativeXPlacer.recursiveStraightlinePlacement`, `AbsoluteXPlacer.findMinimalX` and `absoluteTreeCoords`, `StraightEdgeRouter.routeEdges`                 | `VertiFlexLayoutProvider`, `NodeYPlacer`, `RelativeXPlacer`, `AbsoluteXPlacer`, `StraightEdgeRouter`                                |

Result at 10,000, on Node's default stack: all six shapes complete, equal the oracle at 1e-6, and are byte-identical to the
output of the unconverted port run on a raised stack (`node --stack-size=7000`; mrtree also needed
`--max-old-space-size=48000`, because the recursive `calculateFan` kept one map per level alive). All 2,718 tree cases of the
corpus sweep classify the same before and after.

**The depth check.** A Java recursion that never ends throws `StackOverflowError`: a cyclic successor structure that passes
`findRoot` (173 sweep cases: vertiflex 171, radial 2), or a node that is its own right sibling (`NodePlacer.java:341`, four
`mrtree-extra.json` rows). The recursive port threw V8's `RangeError` there. A loop has no such end, so every converted site
calls `checkStackDepth` (`src/java/lang/StackDepth.ts`) with the number of activations the Java would hold, and it throws that
`RangeError` beyond 100,000. The oracle's deepest completed tree in the probes was 15,000. Whether a fixed limit is the right
model is issue #167 (`needs-ruling`).

**Still verbatim.** The recursions only other options reach (vertiflex `layoutStrategy` `BEND`, the radial compactors, sorters
and `wedgeCriteria` `LEAF_NUMBER`, mrtree `weighting` other than `MODEL_ORDER`) and `TreeUtil.getLeftMost`, which the six
shapes keep shallow: issue #166 (`follow-up`).

## 8. Known divergences and open issues {#alg-trees-open}

| Item                                                                                                       | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| radial `stops/i30/rand-chain-big` and `full/i30/rand-chain-big` (issue #64, `needs-ruling`)                | the level-2 and level-3 next-level sets hold 12 identity-hashed nodes each and share one bin of the oracle's `HashSet` under `-XX:hashCode=2`; the bin's tree order sets the cyclic neighbour pairs `overlapLayer` tests and so the number of extension steps. 449 of 3,000 seeded permutations reproduce the oracle stop at 1e-6. Left as recorded and classified in `TREEIFIED_DIVERGENCES` (`RadialVectors.test.ts`), which asserts the stops row equals the oracle up to the step before `RadiusExtensionOverlapRemoval` and differs at it |
| radial `…/splines/sloppy_overlaps_2` in the sweep                                                          | last-ulp: `Math.sin(1.6073462520335293)` is ...4177 in V8 and `StrictMath`, ...4178 in HotSpot's `Math.sin` (`EadesRadial.java:102`); visible only as the string `layoutOptions.childAreaHeight`; geometry agrees within 1e-13                                                                                                                                                                                                                                                                                                                 |
| 8 residual sweep cases and the three layered-labelled goldens (issue #68, `needs-ruling`)                  | see § 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| upstream defects the ports copy (issue #65, `needs-ruling`)                                                | BFS two-parent trees, `edgeRoutingMode=NONE` with an edge, the boxed and `String` comparisons, `EadesRadial.java:108`, cyclic graphs that pass the tree checks; drafts only, nothing filed upstream                                                                                                                                                                                                                                                                                                                                            |
| recorder rows for unobserved mutants and unrecorded arms (issue #66, `follow-up`)                          | `RADIUS` below 0, `RADIAL_COMPACTION` with `sorter=ID`, mutants R1, R5, V5, M9, M12                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| recursions left verbatim after #67 (issue #166, `follow-up`); the depth check (issue #167, `needs-ruling`) | § 7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The oracle throws the ports reproduce: mrtree `ElkUtil.java:938` (`IllegalArgumentException`, `edgeRoutingMode=NONE` with an
edge, 9 rows), `FanProcessor.java:128` (`StringIndexOutOfBoundsException`; JS `substring` clamps where Java throws, so
`FanProcessor.substring` checks the range), `NodePlacer.java:219` (NPE), `NodePlacer.java:341` (`StackOverflowError`, BFS rows
with a node of two parents); the vertiflex `:65`, `:72`, `:151`, `:147` (a `ClassCastException` for an edge to a port) and
`BendEdgeRouter.java:70` throws. The conformance page lists the kept quirks.

## 9. Runbook {#alg-trees-runbook}

Check `uptime` first (a one-minute load above 12: wait) and run JVM work under `nice -n 10`. `$ELK_ORACLE_DIR` must hold the
oracle built by `tools/oracle/build.sh` at the stamp in `oracle-build.json`.

```bash
# re-record each ref; ELK_VECTORS_CACHE=off forces a cold run; the output must be cmp-identical to the committed ref
ELK_VECTORS_CACHE=off bash tools/vectors/mrtree-vectors.sh      "$TMPDIR/mrtree"      # mrtree.json, mrtree-extra.json, mrtree-extra2.json
ELK_VECTORS_CACHE=off bash tools/vectors/radial-vectors.sh      "$TMPDIR/radial"      # radial.json, radial-extra.json
ELK_VECTORS_CACHE=off bash tools/vectors/vertiflex-vectors.sh   "$TMPDIR/vertiflex"   # vertiflex.json, vertiflex-extra.json
ELK_VECTORS_CACHE=off bash tools/vectors/mrtree-unit-vectors.sh "$TMPDIR/mrtree-units" # mrtree-units.json

# regenerate the goldens; the refs must not change
for s in default algorithms layered trees; do tools/oracle/regen-goldens.sh --set "$s"; done
git diff --exit-code test/golden/refs/

# regenerate the options; src/ must not change
npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex && git diff --exit-code src/

# replays and goldens
npx vitest run src/alg/mrtree src/alg/radial src/alg/vertiflex test/golden/tree-goldens.test.ts
```

**Re-run the sweep.** Per algorithm, the oracle then the TS side:

```bash
JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" \
  nice -n 10 tools/oracle/sweep.sh --filter /mrtree/ --out "$TMPDIR/sweep-mrtree"
npx tsx tools/corpus/ts-layout-compare.ts --algorithms mrtree --sweep-dir "$TMPDIR/sweep-mrtree" --out "$TMPDIR/mrtree.json"
```

Run the three algorithms one after another (three at once peaked the load at 51). Expect the numbers of § 3 only with layered
registered; without it the options-only mismatches of the second table appear.

**The Java baseline.** `tools/oracle/java-tests.sh` carries the `alg.mrtree.test` and `alg.radial.test` bundles (issue #97), so the
landed script runs both classes; the scratch-copy recipe of the mission is in
[java-baseline.md](../../plans/alg-trees/java-baseline.md) as history:

```bash
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash tools/oracle/java-tests.sh \
  org.eclipse.elk.alg.mrtree.test.MrTreeGraphSizeTest org.eclipse.elk.alg.radial.test.CenterOnRootTest
```

Expect `MrTreeGraphSizeTest` runs 6 failures 0 and `CenterOnRootTest` runs 2 failures 0; any difference is a stop.

**Failures.** A row that differs: instrument the oracle and dump actual values before changing the port (the T16 `FanProcessor`
defect and the T4 golden mislabel were both found by a row, and both journal a mechanism). A radial row that differs only in
a treeified set: compare with `TREEIFIED_DIVERGENCES` before suspecting the port. A replay that times out only under coverage:
add the explicit timeout, never raise the default. A sweep case that reports `missing layoutOptions.<x>`: a provider the tool
does not register.
