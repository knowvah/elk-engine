<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg-trees: branches and functions no recorded scenario reaches (`U` rows)

Mission 8a, T19. Measured by the scoped run
`npx vitest run src/alg/radial src/alg/vertiflex test/helpers/radial-* test/helpers/vertiflex-* --coverage --coverage.include='src/alg/radial/**' --coverage.include='src/alg/vertiflex/**'`
(replay tests, class tests and the T19 coverage tests together). Java paths are relative to `$ELK_SOURCE_DIR` at the pin.

Classes:

- **D** dead from the Java: no caller, a closed `switch` default, or a guard the callers make always true.
- **P** unreachable through the pipeline: reachable only by calling a class directly, or with a value no ELK JSON input can carry.
- **R** reachable but unrecorded: an engine run reaches it; no recorded row does. Covered by a Java-traced test where noted.

## radial

Still uncovered after T19 (scoped run):

| File | Java | TS | Class | Reason |
|------|------|----|-------|--------|
| `RadialUtil.ts` | `RadialUtil.java:42` | `:22` | D | `private RadialUtil()` of a static-only class; nothing constructs it |
| `InternalProperties.ts` | none (implicit default constructor) | `:16` | D | TS `private constructor() {}` of a static-only class; Java never constructs it either |
| `RadialLayoutPhases.ts` | `RadialLayoutPhases.java:41` | `:65-71` | D | `create()` `default:` over both constants of a closed enum |
| `IntermediateProcessorStrategy.ts` | `IntermediateProcessorStrategy.java:59` | `:89-101` | D | `create()` `default:` over every constant of a closed enum |
| `AnnulusWedgeCriteria.ts` | `AnnulusWedgeCriteria.java:47` | `:65-71` | D | `create()` `default:` over every constant of a closed enum |
| `OverlapRemovalStrategy.ts` | `OverlapRemovalStrategy.java:37` | `:59-63` | D | `create()` `default:` over every constant of a closed enum |
| `RadialTranslationStrategy.ts` | `RadialTranslationStrategy.java:52` | `:80-90` | D | `create()` `default:` over every constant of a closed enum |
| `SortingStrategy.ts` | `SortingStrategy.java:47` | `:68-76` | D | `create()` `default:` over every constant of a closed enum |
| `RadiusExtensionOverlapRemoval.ts` | `RadiusExtensionOverlapRemoval.java:73` | `:93` false arm | D | `removeLevelOverlaps` is called only from `extend`, which guards `!nodes.isEmpty()` at `:57` |
| `PolarCoordinateSorter.ts` | `PolarCoordinateSorter.java:84` | `:69` false arm | P | `arc <= DEGREE_135` is false only for a NaN arc (the three earlier arms cover every other angle in [0, 2 PI]); NaN needs NaN coordinates, which ELK JSON cannot carry |

Reached by tests but by no recorded row (replay-alone gap; scoped numbers include them):

| File | Java | TS | Class | Reason |
|------|------|----|-------|--------|
| `RadialUtil.shiftClosestEdgeToRadi` | `RadialUtil.java:277` | `RadialUtil.ts:253` | D | no caller anywhere in `../elk`; `RadialUtil.test.ts` |
| `AbstractRadiusExtensionCompaction.getCompactionStep` | `AbstractRadiusExtensionCompaction.java:184` | `AbstractRadiusExtensionCompaction.ts:160` | D | no caller in `../elk`; its test |
| `EadesRadial.wedgeStart`, `tau < maxAlpha - minAlpha` true arm | `EadesRadial.java:108-113` | `EadesRadial.ts:110-112` | R | tau is NaN for the root call (0/0) and for every child call while RADIUS > 0 (acos of 1 + RADIUS), i.e. in every recorded row. A negative RADIUS in [-2, 0) reaches it through the engine (`RadialLayoutProvider.java:59-62` replaces only RADIUS == 0). Covered by `EadesRadial.coverage.test.ts` (acos evaluated at 0 through the engine; `wedgeStart` statements). Scratch oracle run, 13-node tree with RADIUS -1 and -30 (the NaN control): TS and oracle layouts agree at 1e-6. A later recorder scenario or the tree sweep should cover it |
| `RadialCompaction`, `sorter != null` true arms | `RadialCompaction.java:50, 73` | `RadialCompaction.ts:33, 59` | R | needs `compactor=RADIAL_COMPACTION` with `sorter=ID` or `POLAR_COORDINATE`; the radial ref's counts are pinned by committed tests, so no row was added. Covered by `RadialCompaction.coverage.test.ts` (ID sorter on the 16 recorded RADIAL_COMPACTION states: sorted first level, sorted next levels, result equals the recorded stop, since an ID sort over equal ORDER_IDs is a stable no-op). Scratch oracle run, 13-node tree: `sorter=ID` agrees with TS at 1e-6; `sorter=POLAR_COORDINATE` throws `NullPointerException` in the oracle (`RadialUtil.java:154`, the node `POSITION` is null) and `TypeError` at the same site in TS. A later recorder scenario or the tree sweep should cover the ID arm |
| `RadialOptions.ts` factory `destroy`, generated | `RadialOptions.java` (src-gen) `destroy` | `RadialOptions.ts:33` | R | never called by a row; `RadialOptions.coverage.test.ts` |

## vertiflex

Still uncovered after T19 (scoped run):

| File | Java | TS | Class | Reason |
|------|------|----|-------|--------|
| `RelativeXPlacer.ts` | `RelativeXPlacer.java:55-62` | `:52-60` `default:` | D | `switch` over both `EdgeRoutingStrategy` constants (STRAIGHT, BEND) |
| `RelativeXPlacerBentSteps.ts` `setBendHeightsLeft` | `RelativeXPlacer.java:352` | `:98` false arm | D | `i` starts at `childrenSize - 1` and only decreases, so `i < childrenSize` is always true |
| `RelativeXPlacerSorting.ts` `splitGroup` | `RelativeXPlacer.java:529-531` | `:193-194` (loop body, second operand of `&&`) | D | needs `desiredLeft < 0`; `desiredLeft = (totalNewWidth - widthLeft + widthRight) / 2` with `widthLeft <= 0 <= widthRight` and non-negative node widths is never negative (T8 row) |
| `RelativeXPlacerSorting.ts` `splitGroup` | `RelativeXPlacer.java:537-538` | `:201-202` `resultIndex = i` | D | `exceed > under` is false whenever the loop above does not run (`newLeftWidth` stays 0, `i` stays 0) |

Reached by tests but by no recorded row:

| File | Java | TS | Class | Reason |
|------|------|----|-------|--------|
| `RelativeXPlacerStraightSteps.computeRootMove`, `pos > 0` false arm | `RelativeXPlacer.java:192` | `RelativeXPlacerStraightSteps.ts:39-40` | R | needs a first child with y < 0 (a negative `VERTICAL_CONSTRAINT`); `RelativeXPlacerStraightSteps.coverage.test.ts` asserts the statements (pos 0, moveRoot 0.0). Not run through the oracle |
| `VertiFlexOptions.ts` getters `SPACING_NODE_NODE`, `PADDING`, `EDGE_LABELS_INLINE`; factory `destroy` (generated) | `VertiFlexOptions.java` (src-gen) `:44, :56, :83, :144` | `:54, :73, :110, :30` | R | no recorded step reads them; `VertiFlexOptions.coverage.test.ts` asserts the declared defaults and `dispose` |
| the four `!graph.getChildren().isEmpty()` false arms (`NodeYPlacer.java:44`, `AbsoluteXPlacer.java:34`, `BendEdgeRouter.java:39`, `StraightEdgeRouter.java:41`) | as named | `NodeYPlacer.ts:28`, `AbsoluteXPlacer.ts:19`, `BendEdgeRouter.ts:20`, `StraightEdgeRouter.ts:22` | P | the engine skips a childless root; unit-tested directly (T11 row) |
| `p2relative` replay-alone leftovers (`OutlineNode.print`, `RelativeXPlacerStrategy`, `NodeComparator` constructor default) | `OutlineNode.java:97-100` and others | as named | R | unit-tested (T8 row) |

## mrtree

Scoped run (T19 second run): `npx vitest run src/alg/mrtree test/helpers/mrtree-* --coverage --coverage.include='src/alg/mrtree/**' --coverage.reportOnFailure --testTimeout=60000`.
Recorded evidence alone (`MrTreeVectors.test.ts` over both refs, `EdgeRouter.vectors.test.ts`, the isolated `FanProcessor` and
`CompactionProcessor` replays) reaches 86.7 % lines, 81.8 % branches, 83.0 % functions, 86.6 % statements; with the class tests and the
T19 tests 99.6 / 98.7 / 99.5 / 99.6. The journal's T1 note says the recorder agent also "argues dead" some arms and lists only
`EdgeRouter.java:368` by name; every claim below was re-derived from the Java here.

Still uncovered after T19 (scoped run), all class D:

| File | Java | TS | Class | Reason / invariant |
|------|------|----|-------|--------------------|
| `ElkGraphImporter.ts` | `ElkGraphImporter.java:127` | `:99` false arm | D | `source != null && target != null` fails only for an endpoint missing from `elemMap`. `transformNodes` (`:81-102`) puts every child of `parentNode` into the map without a `continue`, and `transformEdges` reaches an edge only through `!isHierarchical()` (`:122`), which means all incident shapes share one parent (`ElkEdgeImpl.isHierarchical`), here `parentNode` |
| `TreeUtil.ts` | `TreeUtil.java:45` | `:53` | D | `private TreeUtil()` of a static-only class |
| `InternalProperties.ts` | `options/InternalProperties.java:135` | `:118` | D | `private InternalProperties()` of a static-only class |
| `FanProcessor.ts` | `FanProcessor.java:109-112` | `:139-142` | D | the `pId == null` arm: `pId` is read from the `ID` property, whose default is `""` (`InternalProperties.java:117`) and which only `:108` and `:115` write, always with a concatenated `String`; `ID` has no option id, so JSON cannot set it to null |
| `GraphBoundsProcessor.ts` | `GraphBoundsProcessor.java:39-41` | `:32-33` (`streamMax` empty arm) | D | each `max().getAsDouble()` runs after the `min().getAsDouble()` of `:35-37` over the same nodes, so an empty graph has thrown at `:35` already. The `min` throw is covered by `GraphBoundsProcessor.coverage.test.ts` |
| `DFSTreeifyer.ts` | `DFSTreeifyer.java:113` | `:89` false arm | D | `switch (treeifyingOrder)` over `TreeifyingOrder`, whose only constants are `DFS` and `BFS` |
| `NodeOrderer.ts` `fillGapsWithLeaves` | `NodeOrderer.java:151-160` | `:190-196` (loop body, and the `=== 0` test at `:191`) | D | `Collections.sort(.., PropertyHolderComparator.with(sortProperty))` (`:116`) sorts ASCENDING (`compare` is `p1.compareTo(p2)`), so zero-weight leaves come first. `firstOcc` (`:122-130`) walks back from the end and stops at the first non-zero element; FAN and DESCENDANTS are counts (never negative), so when any node is non-zero the last element is non-zero and `leaves` is empty. `it.hasPrevious()` is then false at `:151`. The upstream comment ("leaves are at the end") is wrong (kept oddity of T12) |
| `NodePlacer.ts` `apportion` | `NodePlacer.java:202` | `:178` null arm | D | `apportion` is called only from `firstWalk`'s non-leaf arm (`:172-174`), where `cN.getChildren()` is non-empty (`isLeaf` is `getOutgoingEdges().isEmpty()`), so `Iterables.getFirst(.., null)` is non-null |
| `NodePlacer.ts` `meanNodeWidth` | `NodePlacer.java:285`, `:292` | `:267`, `:274` false arms | D | callers pass `lS` (non-null by the `lS != null` guards at `:147`, `:172`) and `cN`, or `leftmost` and `neighbor` inside `while (leftmost != null && neighbor != null)` (`:227`) |
| `NodePlacer.ts` `secondWalk` | `NodePlacer.java:320` | `:297` false arm | D | the root is `roots.getFirst()` (throws on empty), the child call passes the first child of a non-leaf node, the sibling call is guarded by `!= null` (`:340`) |

Reached by tests, by no recorded row (replay-alone gap):

| File | Java | TS | Class | Reason |
|------|------|----|-------|--------|
| `LevelHeightProcessor`, `NeighborsProcessor`, `NodePositionProcessor` empty-graph arm, and the missing-root arm of the first two | `LevelHeightProcessor.java:51`, `NeighborsProcessor.java:49`, `NodePositionProcessor.java:47` | `LevelHeightProcessor.ts:33`, `NeighborsProcessor.ts:32`, `NodePositionProcessor.ts:28` | P | a component graph always has a node and `RootProcessor` leaves it rooted, so the pipeline never reaches them; `NodePositionProcessor` has no `root != null` guard (NullPointerException at `:62`, a `TypeError` here). `EmptyGraphProcessors.coverage.test.ts` asserts `numberOfNodes == 1` and those outcomes. T14 row |
| `GraphBoundsProcessor` `min` throw | `GraphBoundsProcessor.java:35` | `:19-20` | P | empty component never reaches it; `GraphBoundsProcessor.coverage.test.ts` (`NoSuchElementException`) |
| `NodeOrderer` priority 3 comparator, `a < b` outcome | `NodeOrderer.java:250-254` | `NodeOrderer.ts:30` | R | the recorded rows reach `compareInts` only with `a > b`; all six orders of three constraints reach `a < b` in `NodeOrderer.coverage.test.ts` (asserts the sorted-and-filled order, no layout numbers). Ties (equal constraints) are still unrecorded (mutant M9) |
| `LevelProcessor` fallback to 0 | `LevelProcessor.java:50` (the T14 row says `:48-49`) | `LevelProcessor.ts:38` | P | needs a node absent from `gloLevelMap`; every node is a descendant of the root, so `setLevel` visits it (T14 row) |
| `MrTree.java:175-183` `monitor == null` | `MrTree.java:175` | `MrTree.ts:91-92` | P | the provider always passes a sub-task monitor; with `DEBUG_MODE` and a null monitor `themonitor.log` (`:184-188`) would fail in Java |
| `MrTree.java:193-197` `isCanceled` return | `MrTree.java:193` | `MrTree.ts:98-99` | R | needs a monitor that reports cancellation between two processors; no ELK JSON input does |
| `MrtreeFactory.destroy`, `TOPDOWN_NODE_TYPE` getter (generated) | `MrTreeOptions.java` (src-gen) `:247`, `destroy` | `MrTreeOptions.ts:37`, `:354` | R | no recorded step reads them; `MrTreeOptions.coverage.test.ts` |
| `TreeUtil` `depth`, `rootDistance`, `getSubtree`, `getNodeSizeInDirection`, `getNodeSizeVectorInDirection`, `turnRight`, `turnLeft` | `TreeUtil.java:64, 93, 132` and the three direction helpers | `TreeUtil.ts:77, 109, 152, 275, 294, 312, 330` | D | no caller anywhere in `../elk` (only self-recursion); `TreeUtil.test.ts` |
| `ElkGraphImporter.toNodeBorder` | `ElkGraphImporter.java:213` | `ElkGraphImporter.ts:198-213` | D | private and never called |
| `InteractiveMrTreeGraphVisitor` | `InteractiveMrTreeGraphVisitor.java:35-50` | `InteractiveMrTreeGraphVisitor.ts:17-31` | D | no class in `../elk` references it (the `interactive` recorder rows are inert); `InteractiveMrTreeGraphVisitor.test.ts` |
| `OrderBalance` (whole class), `EdgeRouterCyrusBeck.cyrusBeck` | `OrderBalance.java`, `EdgeRouter.java:603` | `OrderBalance.ts`, `EdgeRouterCyrusBeck.ts` | D | `TreeLayoutPhases.create` returns `NodeOrderer` for P2, so `OrderBalance` is referenced by nothing; `cyrusBeck` is private with no caller. Replayed through the unit vectors (`mrtree-units.json`: `orderBalance`, `cyrusBeck`) |
| `TLabel`, `TGraph.toString`, `TEdge.setSource/setTarget/getLabels`, `TNode.getParents/setLabel`, `CompactionMode`, `GraphProperties`, `TreeLayoutPhases` name/toString/compareTo, `IntermediateProcessorStrategy` members | as named | as named | D | importer never builds labels (`ElkGraphImporter.java` "TODO transform the edge's labels"); unused enums ported per TR9; enum members no row calls (unit tests) |
| `CompactionProcessor.getRightElement` throw | `CompactionProcessor.java:290-292` | `CompactionProcessor.ts:386-` | D | its callers guard `s.tailSet(r).size() > 1` (`:250-262`); asserted by a hand case |
| `EdgeRouter.java:368` guard `!getBendPoints().isEmpty()` (cycle-inducing edge, empty bend list) | `EdgeRouter.java:368-371` | `EdgeRouterSpecialEdges.ts:453-455` | R | the T1 note says no pipeline row reaches the false arm; scoped coverage of the recorded evidence alone (rows plus `mrtree-units.json` vectors) takes both arms, so the unit vectors do. A later recorder scenario could add a pipeline row |
| `EdgeRouter` empty-graph `NoSuchElementException` (`:169`), `DoubleStreamAverage` empty throw | `EdgeRouter.java:169`, `:313-315` | `EdgeRouterSpecialEdges.ts:154-155`, `DoubleStreamAverage.ts:17-18` | P | `EdgeRouter.process` reaches `TreeUtil.getRoot` first (`:141`) and throws there for an empty graph; unit-tested |
