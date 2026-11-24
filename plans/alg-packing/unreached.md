<!-- SPDX-License-Identifier: EPL-2.0 -->

# Unreached branches of mission alg-packing (8c)

Stop condition 7: every branch of `src/alg/{rectpacking,spore,topdownpacking}/**` that no replay row or unit test reaches is either
provably dead from the Java (a `U` row below, with its Java line) or listed under "Neither reached nor proven dead". Measured by T14b
with `npx vitest run src/alg/<bundle> --coverage --coverage.include='src/alg/<bundle>/**'`, one bundle at a time (T14b changed the
rectpacking and spore refs, so "before" is the state at the start of T14b and "after" the state at its end).

## Coverage

| Bundle | When | Statements | Branches | Functions | Lines | Replay-alone branches |
|--------|------|-----------:|---------:|----------:|------:|----------------------:|
| `rectpacking` | before | 99.24 | 97.18 | 98.46 | 99.23 | 368 / 426 (86.38) |
| `rectpacking` | after | 99.38 | 98.12 (418 / 426) | 98.46 | 99.37 | 373 / 426 (87.56) |
| `spore` | before | 99.21 | 100 | 98.48 | 99.20 | 63 / 85 (74.12) |
| `spore` | after | 99.21 | 100 (85 / 85) | 98.48 | 99.20 | 64 / 85 (75.29) |
| `topdownpacking` | before | 98.61 | 96.42 | 99.07 | 98.57 | n/a (unchanged) |
| `topdownpacking` | after | 98.61 | 96.42 (54 / 56) | 99.07 | 98.57 | n/a (unchanged) |
| `common/spore` (`DepthFirstCompaction` etc.) | before = after | 99.44 | 97.56 | 94.59 | 99.44 | n/a |

"Replay-alone" is the whole-ref replay files of the bundle without any unit test (`RectPackingVectors`, `p2packing.replay`,
`widthApproximation.replay`, `whitespaceElimination.replay` for rectpacking; `SporeLayoutVectors` for spore): the measure of which arms
an oracle row ran (a green replay is evidence only for code it ran).

## Arms closed by oracle evidence (T14b recorder extension)

A seeded search of the port (scratch, child processes under `timeout`, issue #73 inputs discarded by a step counter; about 900,000
inputs over small flat graphs) found inputs for the arms below; each was added at the END of the scenario list and re-recorded
(`rectpacking.json` 1,343 -> 1,356 rows; `spore-layout.json` 274 -> 276 rows; the old rows byte-identical and in the same order,
two cold runs `cmp`-identical).

| Scenario row ids | Arm reached | Java |
|------------------|-------------|------|
| `throws/arm/noBestCandidate` | `findBestCandidate` returns null (more than two tied options) and the caller dereferences it | `AreaApproximation.java:157`, `:98` |
| `full|stops/arm/tieLprWdb/default`, `.../tieLpbWdr/default` | `checkSpecialCases` falls through to `return drawing1` (ties LPR/WDB and LPB/WDR) | `AreaApproximation.java:235` |
| `full|stops/arm/fixedBlockSkip/default`, `.../fixedBlockSkipSpaced/default` | the block loop skips a fixed block | `Compaction.java:70` |
| `full|stops/arm/staleParentRow/default`, `.../staleParentRowNoSpacing/default` | `placeBelow` with `wasFromNextRow` while `rows.size() <= nextRowIndex` (a block that `placeBeside` appended keeps its old `parentRow`) | `Compaction.java:322-325` |
| `full|stops/compaction/maxRootUnknown/treeMaxRootFixedUnknown` (spore) | `MaxSTPhase` root is `vertices.get(0)` when the fixed preferred root names no child | `MaxSTPhase.java:44-46` |

Of the "reachable, no oracle evidence" sites the T10 journal row named, the `rowIdx--` retry (`Compaction.java:164-172`,
`RowFillingAndCompaction.java:103-117`) and `:401-403` were already reached by the recorded rows (replay-alone coverage of the retry
arm was 100 % before T14b); `:70` and `:322-325` are closed by the rows above; `:192` is `U` row 9 and `:364` is the one open arm below.
Zero-size nodes and a non-positive `spacing.nodeNode` are what make two options tie (width `x + w` equals
`drawingWidth + spacing + w`): degenerate inputs, but accepted by the engine.

## `U` rows

"Unit test" says whether a colocated test forces the arm (by calling the member directly or forging an input) despite the arm being
dead through the public API; "Coverage" says whether the T14b coverage run still shows the arm as not reached.

| # | Task | Java file:line | Reason | Unit test | Coverage |
|---|------|----------------|--------|-----------|----------|
| 1 | T6 | `util/Block.java:176` (`rows.size() > 0 ? ... : 0` else arm, `Block.ts:144`) | `getLastRow()` at `:168` already threw on an empty list. | no | not reached |
| 2 | T9 | `p1widthapproximation/AreaApproximation.java:139`, `:143` (`default` of the goal switch; `filters == null` for-each, `AreaApproximation.ts:167`, `:205`) | `OptimizationGoal` has three constants, all handled. | yes (forged goal) | reached |
| 3 | T9 | `AreaApproximation.java:301-302` (`IllegalArgumentException` default of `calcValuesForOpt`, `.ts:319`) | The private method is called only with the four literal options. | yes | reached |
| 4 | T14b | `AreaApproximation.java:193`, `:200`, `:213`, `:224`, `:228` (`drawing1` is WDB / WDR in the tie branches; `drawing1` is not LPR in the LPR/LPB branch; `drawing1` is LPB; `.ts:241`, `:247`, `:275`, `:284`, `:289`) | `findBestCandidate` builds `[opt1 LPR, opt2 LPB, opt3 WDR, opt4 WDB]` (`:81-93`) and `AreaFilter`, `ScaleMeasureFilter`, `AspectRatioFilter` return a sub-list in iteration order, so `drawing1` always has the lower index: a pair is never `(WDB, LPB)`, `(WDR, LPR)` or `(LPB, LPR)`. Support: every two-candidate pair of the search (six kinds) had that order. | yes (`AreaApproximation.test.ts`, minimal geometry) | reached |
| 5 | T10 | `p2packing/Compactor.java:193-194` (`copyPosition` child loop, `Compactor.ts:200`) | `clone()` copies only the direct children, so the clone's children have none. | no | not reached (statement) |
| 6 | T10 | `Compactor.java:91` (NaN arm of `newSM >= oldSM && newSM == (double) newSM`) | `newSM >= oldSM` is already false for NaN. | no | no TS branch |
| 7 | T10 | `p2packing/SimplePlacement.java:69` (`rows == null`, `SimplePlacement.ts:43`) | `InitialPlacement.place` never returns null. | no | not reached |
| 8 | T10 | `p2packing/InitialPlacement.java:72` (`rect.getParent()` null, `InitialPlacement.ts:19`; the journal said `:68`) | Every rect is a child of the layout graph. TS-only `TypeError` for Java's NPE. | no | not reached |
| 9 | T14b | `p2packing/Compaction.java:192` (`nextBlock != null` in Optimization 2, `Compaction.ts:105-106`) | Optimization 2 runs with a non-null `nextBlock` only after `useRowHeight(row, block)` returned false in the same pass (`:169`, `:174`; `:181` continues when `somethingWasChanged`, so these are the only fall-through exits of the `nextBlock != null` section; Optimization 2 is `:188`), and nothing between changes the state it reads: a false return means `block.getHeight() >= row.getHeight()`, or the stack width is `<=` the target, or `placeRectsIn(target)` left the width unchanged; `Block.placeRectsIn(width)` re-lays out all children from scratch (`Block.java:251-307`), so the second call computes the same target and the same width and returns false again. Support: `Optimization 2` ran with a non-null `nextBlock` for 67,131 of 100,000 searched inputs and `useRowHeight` was never true there. A reading of the Java and a search, not a vector. | no | not reached |
| 10 | T14b | `p2packing/RowFillingAndCompaction.java:96-153` `rows.get(i)` and `InitialPlacement`'s / `Block`'s / `RectRow`'s `List.get(i)` (`RowFillingAndCompaction.ts:19`, `InitialPlacement.ts:10`) | The TS `listGet` guards stand for `IndexOutOfBoundsException`; every call site indexes by a loop bounded by the list size or after a size test. | no | not reached |
| 11 | T14b | `Compaction.java:197`, `:233-238`, `:251`, `:281` (`block.getStack()` null, `CompactionContext.ts:36`) and `Compaction.java:132` (`rows.remove(rows.get(i))` not found, `CompactionContext.ts:47`) | `setPositionFixed(true)` is always paired with `stack.addBlock(block)` (`Compaction.java:90-91`, `:317-318`), and a block that is not position-fixed gets a stack at the top of its iteration; the removed row was just fetched from the list. | yes (`CompactionContext.test.ts`: `stackOf` TypeError text, `removeRowObject` with `List.remove(Object)` semantics) | reached |
| 12 | T12 | `intermediate/IntermediateProcessorStrategy.java:61-64` (trailing `default` / `return null`, `.ts:106`, `:109`) | All four constants are handled. | no | not reached |
| 13 | T14b | `util/Block.java:132`, `:134` (`children.remove(rect)` of a non-child; a rect in no `BlockRow`) and `util/BlockRow.java:98` (`removeRectangle` of an absent rect; `update == false`) | `absorbBlocks` removes `nextBlock.getChildren().get(0)`, the first rect of the first `BlockRow`; the only caller passes `update == true`. Support: 23,036 searched inputs without a deviation. | yes (`Block.test.ts`, `BlockRow.test.ts`) | reached |
| 14 | T14b | `util/RectRow.java:98-108` (`calculateBlockStacks`) | No code in the repository calls it (`grep` over `$ELK_SOURCE_DIR`); the unit test rebuilds stacks on recorded rows. On four of the T14b rows (`stops/arm/{fixedBlockSkip,fixedBlockSkipSpaced,staleParentRow,staleParentRowNoSpacing}/default`) the rebuilt stacks differ from the recorded ones because a moved block is appended out of x order; a JVM probe shows the Java method gives the same counts as the port (3, 3, 5, 4 against 2, 2, 4, 3 recorded). The rows are classified in `RectRow.test.ts` (`CHILDREN_NOT_X_GROUPED_ROWS`); `needs-ruling` issue #78. | yes | reached |
| 15 | T8 | `NodeArrangementStrategy.java:38-40`, `WhitespaceEliminationStrategy.java:40-42` (`default` arms, `NodeArrangementStrategy.ts:71`, `WhitespaceEliminationStrategy.ts:70`) | Single-constant enums (PK11). | no | not reached |
| 16 | T5 | generated option classes (`RectPackingOptions`, `TopdownpackingOptions`, `SporeCompactionOptions`, `SporeOverlapRemovalOptions`): `destroy`, unread property getters | Generated code (`tools/melk`), excluded by the testing rule; nothing in the Java reads them either. | no | not reached |
| 17 | T14b | private constructors of `Calculations`, `Compaction`, `InitialPlacement`, `RectangleExpansion`, `DepthFirstCompaction` | Java `private X() { }` of a static-only class; no logic. | no | not reached (function) |
| 18 | T11 | `spore/ElkGraphImporter.java:154` (childless root, replay-alone only), `:144`, `:218` (switch defaults); `MaxSTPhase.java:48` (`DEBUG_SVG` arm) | The engine never calls a provider for a childless graph; the enums have no further constants; `DEBUG_SVG` is a programmatic option that writes files. | yes (all) | reached |

Not mine to change but measured: `common/spore/ScanlineOverlapCheck.ts:32-33` (`!p1.low && p2.low` arm) and
`ScanlineOverlapCheckHandler.ts:60` are landed `alg.common` branches not reached by the spore bundle's tests; they are reached by the
`alg.common` suites.

## Neither reached nor proven dead

One arm.

| Java file:line | Arm | What was tried | Why it is not closed |
|----------------|-----|----------------|----------------------|
| `p2packing/Compaction.java:364` (`if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) return false;` in `placeBeside`, `CompactionPlacement.ts:117-118`) | the early `return false` | Several hundred thousand `placeBeside` calls with `rowHeightReevaluation = true` (21,968 of them in one 100,000-input run) (always a single-rect `nextBlock`, whose height at any width is its minimum height), then a hill-climb of 160 restarts of up to 400 steps toward "multi-rect `nextBlock` whose `minHeight` exceeds the row height" (best score: `minHeight == row.getHeight()`, never greater; multi-rect `nextBlock`s with the flag on occur: 299 in 40,000 inputs). | With the flag on, `InitialPlacement.java:72` makes every block a single rect, so the arm needs a multi-rect block created later by `absorbBlocks`, whose rects satisfy `rect.getHeight() <= row.getHeight()` except when the row holds one block (`InitialPlacement.java:103`, `:108`); a proof that such a block can never have `minHeight > row.getHeight()` when it is the next block needs the history of `RectRow.removeBlock` and `adjustWidthAndHeight` (row heights can shrink), which was not done. No input found; the arm is also not forceable from a unit test without hand-building a `Block` whose `minHeight` the Java cannot produce. |

## Addendum 2026-11-24 (#81)

Mission `rectpacking-open-arm` (issue #81) measured the arm of "Neither reached nor proven dead" again at the pin `8bca22f4`,
which carries eclipse-elk/elk#1239 (`3f5e4f97`); the section above was measured at `8aaa3c14`. The arm is dead at the pin: `U`
row 19 below supersedes the "Neither reached nor proven dead" row, which stays as the record of 8c. The proof, the `ast-grep`
enumerations with their positive controls and the harness are in `plans/rectpacking-open-arm/evidence.md`; the lemma rows are in
`plans/rectpacking-open-arm/decision-journal.md`.

| # | Task | Java file:line | Reason | Unit test | Coverage |
|---|------|----------------|--------|-----------|----------|
| 19 | #81 | `p2packing/Compaction.java:364-365` (`if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) return false;` in `placeBeside`, `CompactionPlacement.ts:117-118`) | With `rowHeightReevaluation` off, `shouldRowHeigthBeReevalauted` is false (`:355`). With it on: **L1** `InitialPlacement.place` gives every block at most one rect (`InitialPlacement.java:71-75`, `:78-81`; the flag read at `:72` from `rect.getParent()` is the flag `RowFillingAndCompaction.java:105-106` passes, `:96`, `Compactor.java:171`, `:174`). **L2** Only a block of the row being compacted gains rects: `addChild` and `addChildInNewRow` are called at `InitialPlacement.java:75`, `:81`, `:105`, `:110` only, `placeRectInBlock` at `Compaction.java:266` only, on `blocks.get(blockId)` of `rows.get(rowIdx)` (`:59`, `:60`, `:69`, `:113`). **L3** The row list is written by `place` (`InitialPlacement.java:64`, `:85`) and by removals at `rowIdx + 1` (`Compaction.java:132`, `:328`, `:419`); the loop only rises (`RowFillingAndCompaction.java:99`, `:117`); blocks join a row at `InitialPlacement.java:52`, `:67`, `:80` and, on the current row, at `Compaction.java:323`, `:412`: a row above `rowIdx` holds only blocks of `place`, each with at most one rect. **L4** Every site that adds a block to a row sets that row as its parent (`Block.java:89`; `Compaction.java:324`, `:413`, the latter added by #1239; `setParentRow` is called at `:165`, `:324`, `:413` only), so `wasFromNextRow` (`:101`, identity) holds only for `rows.get(nextRowIndex).getChildren().get(0)` (`:219`), and `placeBeside` is called only under it (`:152`, `:158`): its `nextBlock` holds exactly one rect (`:109`, `:126` exclude an empty one). **L5** For one rect of height `h`, `getMinHeight()` is `Math.max(0.0, h)` (`Block.java:41`, `:188`) and `getHeightForTargetWidth(w)` is `0 + Math.max(0, h)` at every `w`, since the wrap test needs `maxHeightInRow > 0` before the first rect (`:258`, `:268-269`, `:285`, `:293`): the second operand of `:364` is false for every `h`, NaN, the infinities and negative heights included. Support: 1,000,000 seeded flag-on inputs through an instrumented copy of the port (4,717,461 `placeBeside` calls, 1,418,504 with `shouldRowHeigthBeReevalauted`): no multi-rect `nextBlock`, no invariant violation, no arm hit, no timeout; 1,200 of those inputs equal to the oracle at 1e-6. Before #1239 a block moved by `placeBeside` kept its old parent row, which is how 8c saw multi-rect `nextBlock`s with the flag on (with that one line removed from the instrumented copy: 86 in 40,000 inputs, and the hang of #73 on 58). | no (a forged two-rect `nextBlock`, which the Java cannot build, takes it: scratch control only) | not reached |
