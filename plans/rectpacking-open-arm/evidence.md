<!-- SPDX-License-Identifier: EPL-2.0 -->

# Evidence: rectpacking-open-arm (issue #81)

The proof, the `ast-grep` hit lists and the scratch harness behind the journal rows of T1. The journal
([decision-journal.md](decision-journal.md)) holds one row per lemma and per run and points here for the text a table cell
cannot hold. All Java paths are below
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/` at `8bca22f4`.

## 1. The claim

`p2packing/Compaction.java:364-365`, in `placeBeside`:

```java
boolean shouldRowHeigthBeReevalauted = nextBlock.getMinHeight() > row.getHeight() && rowHeightReevaluation; // :355
double nextBlockHeight = nextBlock.getHeightForTargetWidth(targetWidthOfNextBlock);                          // :361
if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) {                            // :364
    return false;                                                                                            // :365
}
```

At `8bca22f4` the `return false` at `:365` runs for no input. `rowHeightReevaluation` is
`layoutGraph.getProperty(PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION)` (`RowFillingAndCompaction.java:105-106`), "the flag"
below. With the flag off, `shouldRowHeigthBeReevalauted` is false (`:355`). With the flag on, L1 to L5 show that
`nextBlockHeight > nextBlock.getMinHeight()` is false.

## 2. Proof

Scope: one call of `RowFillingAndCompaction.start(rectangles, monitor, layoutGraph, padding)` (`:87`) with the flag on. Its
callers are `Compactor.java:62` (the graph) and `:81` (a clone of it); each call builds its rows and blocks anew
(`InitialPlacement.place`, `RowFillingAndCompaction.java:96`), so nothing carries over from one call to the next.

### L1. `InitialPlacement.place` gives every block at most one rect

- `place` is called with `layoutGraph.getChildren()` (`RowFillingAndCompaction.java:96`; the `rectangles` parameter of `start`
  is not read). Every element's `getParent()` is `layoutGraph`: the child list is an EMF containment list, and
  `Compactor.clone` sets the parent itself (`Compactor.java:174`). `U` row 8 of `plans/alg-packing/unreached.md` rests on the
  same fact.
- So `rect.getParent().getProperty(PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION)` at `InitialPlacement.java:72` reads the flag
  from the node `RowFillingAndCompaction.java:106` reads it from. Nothing in the bundle writes that option (enumeration E7).
- With the flag on, the condition at `InitialPlacement.java:71-73` is `block.getChildren().isEmpty()`: `addChild` at `:75`
  runs only on an empty block; otherwise a new block is built (`:78`) and gets the one rect (`:81`).
- **Correction to the planning hypothesis.** "Exactly one rect" is "at most one": the first block (`:52`) stays empty when
  there are no rects or the first rect has `IN_NEW_ROW`. An empty `nextBlock` never reaches `placeBeside`
  (`Compaction.java:109` sends it to `:117`, `break`).

**Holds.**

### L2. Only a block of the row being compacted gains rects

- `Block.children` is `private final` (`Block.java:51`). It is written at `:110`, `:116` (add) and `:132` (remove) only (E5).
  `getChildren()` (`:435`) hands the list out, and no caller adds to it: the only `getChildren().add` of the bundle is
  `Compactor.java:178`, on an `ElkNode` (E4).
- `addChild` is called at `InitialPlacement.java:75`, `:81` (`place`) and `:105` (`placeRectInBlock`); `addChildInNewRow` at
  `:110` (`placeRectInBlock`) (E1).
- `placeRectInBlock` is called only at `Compaction.java:266` (`absorbBlocks`), whose only call is `:113` with
  `block = blocks.get(blockId)` (`:69`), `blocks = row.getChildren()` (`:60`) and `row = rows.get(rowIdx)` (`:59`) (E1).
- `RectRow.children` is `private final` (`RectRow.java:36`) and `getChildren()` returns it (`:221-223`), so `blocks` is the
  row's own list for the whole call. Between `:69` and `:113` nothing takes `block` out of `row`: `:75` removes an empty
  block and continues, `:82-92` only touch the stack.

**Holds.**

### L3. A row after `rowIdx` holds only blocks `place` put there, each with at most one rect

- The row list is filled by `place` (`InitialPlacement.java:64`, `:85`) before the loop. Nothing adds, sets or reorders it
  later: its other writes are `Compaction.java:132` (`rows.remove(rows.get(nextRowIndex))`), `:328` and `:419`
  (`rows.remove(nextRowIndex)`), all at index `rowIdx + 1` (E3, E6). `:132` removes by object; `RectRow` has no `equals`
  (E8) and each row is in the list once, so it removes index `nextRowIndex`.
- The loop at `RowFillingAndCompaction.java:99` goes up by one per pass; `rowIdx--` (`:117`) repeats the same row. So a row at
  an index above `rowIdx` has never been `row` of `Compaction.compact` (`:59`).
- A block enters a row's `children` only through `RectRow.addBlock` (`RectRow.java:144`, the only `children.add`, E5). Its
  callers are `InitialPlacement.java:52`, `:67`, `:80` and `Compaction.java:323`, `:412`; the two in `Compaction` add to
  `row = rows.get(rowIdx)` (E2; the other `addBlock` hits are `BlockStack.addBlock`).
- With L1 and L2: during `compact(rowIdx, ...)` every block of a row above `rowIdx` was put there by `place`, has gained no
  rect since, and so holds at most one.

**Holds.**

### L4. In `placeBeside`, `nextBlock` is the first block of `rows.get(nextRowIndex)`

Invariant **I**: a block in `R.getChildren()` has `getParentRow() == R`, and no block is in two rows or twice in one.

- Base. The constructor sets `parentRow` (`Block.java:89`), and `place` adds each new block to the row it passed
  (`InitialPlacement.java:52`, `:66-67`, `:78-80`).
- `parentRow` is written at `Block.java:89` and `:467` (`setParentRow`) only; `setParentRow` is called at
  `Compaction.java:165`, `:324`, `:413` (E2).
- `wasFromNextRow` is `!nextBlock.getParentRow().equals(row)` (`:101`), an identity test (E8). When it is true, **I** gives
  `nextBlock` not in `row.getChildren()`, so the first arm of `getNextBlock` (`:216`, a block of `row`) did not return it:
  it is `rows.get(nextRowIndex).getChildren().get(0)` (`:219`).
- Between `:98` and the calls at `:147` and `:158`, the row list and the next row's children change only when `nextBlock`
  becomes empty (`:126-134`), and then the pass continues (`:135-137`).
- Step. `row.addBlock(nextBlock)` runs at `:323` (inside `if (wasFromNextRow)`, `:322`) and at `:412` (`placeBeside`, called
  only at `:158` inside `if (wasFromNextRow)`, `:152`). In both, `nextBlock` is in `rows.get(nextRowIndex)` and not in
  `row`; it is added to `row`, gets `row` as parent (`:324`, `:413`) and is removed from the next row (`:326`, `:417`). **I**
  holds afterwards. `:165` runs after `placeBeside` returned true, so `:413` already set the same value. `removeBlock`
  (`:75`, `:117`, `:128`, `:278`, `:326`, `:417`) only removes.
- Before eclipse-elk/elk#1239 (`3f5e4f97`) the line `:413` did not exist and **I** failed there: a block moved by
  `placeBeside` kept its old parent row, so a block of the current row, possibly holding several rects by then, read as
  `wasFromNextRow`. That is the state 8c measured at `8aaa3c14` (section 5, mutant control).

So in `placeBeside` the `nextBlock` is the first block of a row above `rowIdx`. By L3 it holds at most one rect, and
`:109` and `:126` let only a non-empty one through: exactly one rect, added by one `addChild` in `place`. Nothing has
recomputed its sizes since: `resetBlock` is called only at `RowFillingAndCompaction.java:113` on the current row's blocks,
and `removeChild` only at `Compaction.java:269`, which empties a one-rect block (E6).

**Holds.**

### L5. A block of one rect never satisfies `nextBlockHeight > nextBlock.getMinHeight()`

Let `h` be the rect's height and `m = Math.max(0.0, h)`.

- `minHeight` is a field that starts at `0.0` (`Block.java:41`) and is written at `:188`, `:362` and `:369` only (E6). After
  the one `addChild`: `minHeight = Math.max(0.0, h) = m` (`:188`).
- `getHeightForTargetWidth(w)` (`:239-242`) runs `placeRectsIn(w, false)`. `maxHeightInRow` starts at `0` (`:258`), so the
  wrap test at `:268-269` (`... > width && maxHeightInRow > 0`) is false for the first rect at every `w`, NaN and the
  infinities included. Then `maxHeightInRow = Math.max(0, h) = m` (`:285`) and the result is `0 + m` (`:257`, `:293`).
- `m` is NaN, or at least `+0.0`. In both cases `0.0 + m > m` is false. That covers a negative `h`, `-0.0`, NaN and the
  infinities; the spacing is not read on this path (`index > 0` is false at `:268`, `:284`, `:289`).
- The rect's height does not change during `start`: the bundle's only `rect.setHeight` is `BlockRow.java:138` (`expand`,
  reached from `RectangleExpansion.expand`, phase 3), and `setDimensions` is called at `Compactor.java:175` (building the
  clone) and `:191` (`copyPosition`, after `start` returned) (E6).

**Holds.**

### Result

With the flag on, L4 gives a one-rect `nextBlock` at every `placeBeside` call and L5 makes the second operand of `:364`
false. With the flag off the first operand is false. `Compaction.java:365` is dead at `8bca22f4`.

Side result, not used here: by L4, `rows.size() > nextRowIndex` holds at `Compaction.java:325` and `:416` whenever they
run. Those are the arms of issue #107, which this mission does not work.

## 3. Enumerations

Run in `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src` (HEAD `8bca22f4`) with
`ast-grep run -p '<pattern>' -l java .` (ast-grep 0.51.3). Paths are shortened to the part below
`org/eclipse/elk/alg/rectpacking/`. A pattern with hits is its own positive control (it finds the calls the proof names); a
pattern with no hit names the control that shows the same pattern shape matching. A text search of `$ELK_SOURCE_DIR/plugins`
and `$ELK_SOURCE_DIR/test` for `addChild`, `addChildInNewRow`, `setParentRow` and `placeRectInBlock` outside the bundle's
`src` found nothing in rectpacking code: the only test file that imports the packing classes is `Issue583Test.java`, which
imports `PackingStrategy`.

**E1. Who adds a rect to a block.**

| Pattern | Hits |
| ------- | ---- |
| `$R.addChild($A)` | `p2packing/InitialPlacement.java:75`, `:81`, `:105` |
| `$R.addChildInNewRow($A)` | `p2packing/InitialPlacement.java:110` |
| `$R.placeRectInBlock($$$A)` | `p2packing/Compaction.java:266` |
| `placeRectInBlock($$$A)` (unqualified) | none. Control: `isSimilarHeight($$$A)` finds `p2packing/InitialPlacement.java:73`, `:101` |
| `$R.place($$$A)` | `p2packing/SimplePlacement.java:66`, `p2packing/RowFillingAndCompaction.java:96` |
| `$R.compact($$$A)` | `p2packing/RowFillingAndCompaction.java:105` |
| `absorbBlocks($$$A)`, `placeBelow($$$A)`, `placeBeside($$$A)`, `getNextBlock($$$A)` (unqualified, private helpers) | `p2packing/Compaction.java:113`; `:147`; `:158`; `:98` |
| `$R.start($$$A)` | `p2packing/Compactor.java:62`, `:81` |
| `$R::$M` (method references) | none. Control: the same pattern in `org.eclipse.elk.alg.layered/src` finds `intermediate/wrapping/BreakingPointProcessor.java:241` |

**E2. Who adds a block to a row, and who sets a parent row.**

| Pattern | Hits |
| ------- | ---- |
| `$R.addBlock($A)` | on a `RectRow`: `p2packing/InitialPlacement.java:52`, `:67`, `:80`, `p2packing/Compaction.java:323`, `:412`; on a `BlockStack`: `p2packing/SimplePlacement.java:77`, `util/RectRow.java:103`, `:106`, `p2packing/Compaction.java:90`, `:318` |
| `$R.setParentRow($A)` | `p2packing/Compaction.java:165`, `:324`, `:413` |
| `this.parentRow = $A` | `util/Block.java:89`, `:467` |
| `parentRow = $A` (unqualified) | none. Control: `this.parentRow = $A` above |
| `new Block($$$A)` | `p2packing/InitialPlacement.java:52`, `:66`, `:78` |
| `new RectRow($$$A)` | `p2packing/InitialPlacement.java:50`, `:65` |

**E3. Writes to lists (`$R.add($A)`).** All 22 hits: `intermediate/InteractiveNodeReorderer.java:54`;
`p1widthapproximation/AreaFilter.java:44`, `AspectRatioFilter.java:47`, `ScaleMeasureFilter.java:49`,
`AreaApproximation.java:74`, `:103`; `util/BlockRow.java:87`; `p2packing/SimplePlacement.java:78`; `util/Block.java:108`,
`:110`, `:116`, `:118`, `:263`, `:279`, `:349`; `util/RectRow.java:102`, `:144`; `p2packing/InitialPlacement.java:64`, `:85`;
`util/BlockStack.java:80`; `p2packing/Compactor.java:178`; `p2packing/Compaction.java:89`. Of these, the row list of `start`
is written at `InitialPlacement.java:64`, `:85` only, a row's `children` at `RectRow.java:144` only, and a block's `children`
at `Block.java:110`, `:116` only.

| Pattern | Hits |
| ------- | ---- |
| `$R.add($A, $B)` | `intermediate/InteractiveNodeReorderer.java:75` |
| `$R.set($A, $B)` | none. Control: `$R.add($A, $B)` above |
| `rows.$M($$$A)` | 43 matches on 39 lines; the writes are `p2packing/InitialPlacement.java:64`, `:85` (`add`), `p2packing/Compaction.java:132`, `:328`, `:419` (`remove`) on the row list, and `util/Block.java:108`, `:118`, `:137`, `:262`, `:263`, `:279`, `:356` on a block's `BlockRow` list |

**E4. Writes through `getChildren()`.**

| Pattern | Hits |
| ------- | ---- |
| `$R.getChildren().add($$$A)` | `p2packing/Compactor.java:178` (`clone.getChildren()`, an `ElkNode`) |
| `$R.getChildren().addAll($$$A)` | none. Control: `$R.getChildren().add($$$A)` above |
| `$R.getChildren().set($$$A)` | none. Control: as above |

**E5. The `children` fields.**

| Pattern | Hits |
| ------- | ---- |
| `this.children.$M($$$A)` | 19 matches on 16 lines; the writes are `util/RectRow.java:144` (`add`), `:152` (`remove`), `util/Block.java:110`, `:116` (`add`), `:132` (`remove`) |
| `children.$M($$$A)` (unqualified) | none. Control: `rows.$M($$$A)` in E3 |

**E6. Removals, resets and sizes.**

| Pattern | Hits |
| ------- | ---- |
| `$R.remove($A)` | `intermediate/InteractiveNodeReorderer.java:58`, `p2packing/Compaction.java:132`, `:328`, `:419`, `util/RectRow.java:152`, `util/BlockRow.java:99`, `util/Block.java:132`, `:137` |
| `$R.removeBlock($A)` | `p2packing/Compaction.java:75`, `:117`, `:128`, `:278`, `:326`, `:417` |
| `$R.removeChild($A)` | `p2packing/Compaction.java:269` |
| `$R.resetBlock()` | `p2packing/RowFillingAndCompaction.java:113` |
| `this.minHeight = $A` | `util/Block.java:188`, `:362`, `:369` |
| `minHeight = $A` (unqualified) | none. Control: `this.minHeight = $A` above |
| `$R.setHeight($A)` | `util/BlockRow.java:138` (a rect), `p2packing/RowFillingAndCompaction.java:193` (a row), `p2packing/Compaction.java:402` (a block) |
| `$R.setDimensions($$$A)` | `p2packing/Compactor.java:175`, `:191` |
| `$R.expand($$$A)` | `p3whitespaceelimination/RectangleExpansion.java:53`, `EqualWhitespaceEliminator.java:45`, `util/Block.java:391`, `util/BlockStack.java:180`, `util/RectRow.java:90` |

**E7. Option writes.** `$R.setProperty($$$A)`: 28 calls, in `p3whitespaceelimination/ToAspectratioNodeExpander.java:45`, `:48`,
`:49`; `intermediate/MinSizePostProcessor.java:43`; `InteractiveRectPackingGraphVisitor.java:48`;
`intermediate/InteractiveNodeReorderer.java:80`; `p1widthapproximation/GreedyWidthApproximator.java:69`;
`RectPackingLayoutProvider.java:98`; `p2packing/NoPlacement.java:61-63`; `p2packing/SimplePlacement.java:86-89`;
`p1widthapproximation/TargetWidthWidthApproximator.java:44`; `intermediate/MinSizePreProcessor.java:61-62`;
`p2packing/Compactor.java:104`, `:105`, `:116-119`, `:148`, `:156`; `p2packing/RowFillingAndCompaction.java:170`, `:171`. None
names `PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION`. `$R.copyProperties($A)`: `p2packing/Compactor.java:171`, `:179`, which
copy the graph's options to the clone before `start` runs on it, so the clone carries the graph's flag.

**E8. Identity.** `grep -n "equals\|hashCode\| extends \| implements "` over `util/{Block,RectRow,BlockStack,BlockRow}.java`
prints nothing, and `grep -rn "extends \(Block\|RectRow\|Compaction\|InitialPlacement\)\b"` over `plugins` and `test` prints
nothing: `RectRow.equals` is `Object.equals`, and no subclass overrides a method the proof reads.

## 4. Search of the instrumented port

Scratch under `$TMPDIR/rectpacking-open-arm/` (never committed); the texts are in section 6. The snapshot is
`git archive HEAD src package.json tsconfig.json` of the brief commit `677c606a` (its `src` equals the base `e8ae1428`), with
two probes and bundled by esbuild.

- **Probe at `placeBeside`** (after `nextBlockHeight`): counts calls, flag-on calls, calls with
  `shouldRowHeigthBeReevalauted`, arm hits, and with the flag on the violations `vMulti` (`nextBlock` not one rect),
  `vNotFromNext` (`nextBlock.getParentRow() === row`) and `vNotFirst` (`nextBlock` not the first block of
  `rows[nextRowIndex]`).
- **Probe at every block step of `compact`** (not asked by D2, added as support for L2 to L4): `vParent` (a block whose parent
  row is not the row holding it), `vDup` (a block held twice), `vLaterMulti` (flag on, a block of a row above `rowIdx` with
  more than one rect).
- **Generator** (`gen.mjs`, mulberry32 on the seed): 2 to 14 children; six size families (integers 1 to 120, multiples of 10,
  a small set, tall, wide, two-decimal fractions), 3 % zero widths and 3 % zero heights; `spacing.nodeNode` absent (25 %),
  0 (15 %), positive (25 %), negative from -1 to -50 (25 %), fractional from -5 to 20 (10 %); `TARGET_WIDTH` (65 %, target
  widths random, a fraction of the width sum, near the widest node, or 0, -10, 1) or `GREEDY` with a random goal and
  `lastPlaceShift`; 2, 3 or 5 compaction iterations (40 %); the three whitespace strategies; aspect ratio, padding, minimum
  size, `orderBySize`, `trybox`; `inNewRow` on 15 % of the children of 35 % of the inputs.
- **Kill timer.** Six child processes share the seed range. Before each input a child writes its seed and running totals to
  a progress file; the parent kills a child whose seed has not changed for 10 s, counts that seed as a timeout and restarts
  after it. (D2 says one child process per input; a watchdog per input over batch children gives the same guard at 5,000
  inputs per second. Push-forward: the harness.)

| Run | Command | Result |
| --- | ------- | ------ |
| Forged-block control | `node bin/control.mjs` | `{"result":false,"probe":{"calls":1,"multiAnyFlag":1,"flagOn":1,"reeval":1,"vMulti":1,"vNotFromNext":0,"vNotFirst":0,"arm":1}}`: the arm counter and `vMulti` fire |
| Watchdog control | `HANG_SEED=150 node bin/search.mjs hangctl 0 400 on 2 3000` | 399 inputs, one timeout, `{"seed":150,"killed":true}`; the run resumed at 151 |
| Flag-off detector control | `node bin/search.mjs offctl 0 5000 off 4 10000` | 5,000 inputs, 22,249 `placeBeside` calls, 3,855 with a multi-rect `nextBlock`, 24,838 multi-rect blocks seen in later rows: the detectors fire on states the pipeline builds |
| **Main search** | `nice -n 10 node bin/search.mjs main 0 1000000 on 6 10000` | seeds 0 to 999,999, flag on: **1,000,000 inputs, 0 timeouts, 0 throws; 739,625 inputs called `placeBeside`; 4,717,461 flag-on calls, 1,418,504 of them with `shouldRowHeigthBeReevalauted` true (412,364 inputs); violations `vMulti` 0, `vNotFromNext` 0, `vNotFirst` 0, `vParent` 0, `vDup` 0, `vLaterMulti` 0; arm hits 0**; 15,905,585 block steps checked, 7,517,837 multi-rect blocks seen in the current row; 187 s |
| Mutant control (#1239 reverted in the snapshot) | `INST=./inst-pre1239.mjs node bin/search.mjs pre1239 0 40000 on 6 5000` | seeds 0 to 39,999, flag on: 58 inputs killed by the timer (the hang of #73), 39,942 completed; 188,165 flag-on calls; `vMulti` 86, `vNotFirst` 484, `vParent` 139,696, `vDup` 2,784; arm hits 0 |

The mutant control removes the one line of #1239 (`nextBlock.setParentRow(row)` in `placeNextBeside`) from the instrumented
snapshot. Multi-rect `nextBlock`s then reach `placeBeside` with the flag on, as 8c saw at `8aaa3c14` (299 in 40,000 of its
inputs), and the hang of #73 returns. It is evidence from the port, not from an oracle built at `8aaa3c14`; no such build
was made.

## 5. Oracle cross-check

- **Inputs.** The first 1,200 seeds of the main search, in ascending order, whose run set `shouldRowHeigthBeReevalauted` in
  `placeBeside` (seeds 1 to 2,926 of 412,364 candidates), written as ELK JSON by `bin/xc-select.mjs 1200`.
- **Oracle.** `nice -n 10 tools/oracle/run.sh --cases xc/cases.jsonl xc/oracle` (load 11.87 at the start; oracle
  `8bca22f4`, patches 0001-0004): 1,200 `ok`, exit 0.
- **Port.** The unmodified port of this worktree through `npx tsx bin/xc-compare.ts`: import, engine, `exportLikeOracle`
  (`test/helpers/graph-json-oracle.ts`), then `compareLayout` at 1e-6 (`test/golden/compare-json.ts`).
- **Result.** 1,200 of 1,200 equal; the largest absolute difference of any number is 0.
- **Comparator control.** With `children[0].x` of one oracle file moved by 0.001, the run reports that one case
  (`value children[id=n0].x: expected 15.001, actual 15`) and 1,199 equal; the file was restored.
- **A harness fault on the way (not a port difference).** The first comparison reported 557 cases, all with the same two
  lines: `missing layoutOptions.compaction.iterations`, `extra layoutOptions.iterations`. The script had registered the
  rectpacking provider alone. The exporter shortens an option id to its shortest suffix that is unique in the registry;
  with every provider registered, as the oracle harness does (`ElkOracle.java:218-221`), `iterations` is also the suffix of
  force's and stress's options, so the key is `compaction.iterations`. The script now calls `registerTreeAlgorithms`
  (`tools/corpus/ts-layout-pipeline.ts`). No coordinate differed in either run, and no input was dropped.

## 6. Harness texts

Directory layout: `snap/` (the instrumented snapshot), `snap-pre1239/` (the mutant), `bin/` (the scripts and the two
bundles), `logs/`, `xc/`.

### 6.1 Setup

```sh
R="${TMPDIR%/}/rectpacking-open-arm"
mkdir -p "$R/snap" "$R/logs" "$R/bin" "$R/xc/in" "$R/xc/oracle"
git archive HEAD src package.json tsconfig.json | tar -x -C "$R/snap"
ln -s "$PWD/node_modules" "$R/snap/node_modules"
# insert the two probes (6.2) and write snap/src/probe-entry.ts (6.3), then:
(cd "$R/snap" && ./node_modules/.bin/esbuild src/probe-entry.ts --bundle --format=esm --platform=node \
  --outfile="$R/bin/inst.mjs")
# mutant: cp -R snap snap-pre1239; delete `nextBlock.setParentRow(row);` after `row.addBlock(nextBlock);` in
# snap-pre1239/src/alg/rectpacking/p2packing/CompactionPlacement.ts; bundle to bin/inst-pre1239.mjs
```

### 6.2 Probes

In `snap/src/alg/rectpacking/p2packing/CompactionPlacement.ts`, after
`const nextBlockHeight = nextBlock.getHeightForTargetWidth(targetWidthOfNextBlock);`:

```ts
  // PROBE (scratch, rectpacking-open-arm D2.2): counts and invariants at every placeBeside call.
  const P = ((globalThis as unknown as { __pb?: Record<string, number> }).__pb ??= {
    calls: 0, multiAnyFlag: 0, flagOn: 0, reeval: 0, vMulti: 0, vNotFromNext: 0, vNotFirst: 0, arm: 0,
  });
  P.calls = (P.calls ?? 0) + 1;
  if (nextBlock.getChildren().length !== 1) P.multiAnyFlag = (P.multiAnyFlag ?? 0) + 1;
  if (ctx.rowHeightReevaluation) {
    P.flagOn = (P.flagOn ?? 0) + 1;
    if (shouldRowHeigthBeReevalauted) P.reeval = (P.reeval ?? 0) + 1;
    if (nextBlock.getChildren().length !== 1) P.vMulti = (P.vMulti ?? 0) + 1;
    if (nextBlock.getParentRow() === row) P.vNotFromNext = (P.vNotFromNext ?? 0) + 1;
    if (rows[nextRowIndex]?.getChildren()[0] !== nextBlock) P.vNotFirst = (P.vNotFirst ?? 0) + 1;
  }
  if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) P.arm = (P.arm ?? 0) + 1;
```

In `snap/src/alg/rectpacking/p2packing/Compaction.ts`, as the first statement of `processBlock`:

```ts
    // PROBE (scratch, rectpacking-open-arm D2.2): the invariants of L2-L4 at every block step.
    {
      const P = ((globalThis as unknown as { __inv?: Record<string, number> }).__inv ??= {
        steps: 0, stepsFlagOn: 0, vParent: 0, vDup: 0, vLaterMulti: 0, laterMultiAnyFlag: 0, curMultiFlagOn: 0,
      });
      P.steps = (P.steps ?? 0) + 1;
      if (ctx.rowHeightReevaluation) P.stepsFlagOn = (P.stepsFlagOn ?? 0) + 1;
      const seen = new Set<Block>();
      ctx.rows.forEach((r, idx) => {
        for (const b of r.getChildren()) {
          if (b.getParentRow() !== r) P.vParent = (P.vParent ?? 0) + 1;
          if (seen.has(b)) P.vDup = (P.vDup ?? 0) + 1;
          seen.add(b);
          const multi = b.getChildren().length > 1;
          if (idx >= ctx.nextRowIndex && multi) {
            P.laterMultiAnyFlag = (P.laterMultiAnyFlag ?? 0) + 1;
            if (ctx.rowHeightReevaluation) P.vLaterMulti = (P.vLaterMulti ?? 0) + 1;
          }
          if (idx === ctx.nextRowIndex - 1 && multi && ctx.rowHeightReevaluation) {
            P.curMultiFlagOn = (P.curMultiFlagOn ?? 0) + 1;
          }
        }
      });
    }
```

### 6.3 `snap/src/probe-entry.ts`

```ts
// Scratch entry of the instrumented snapshot: the public layout plus the classes the forged control needs.
export { layout } from './layout.js';
export { Block } from './alg/rectpacking/util/Block.js';
export { RectRow } from './alg/rectpacking/util/RectRow.js';
export { BlockStack } from './alg/rectpacking/util/BlockStack.js';
export { placeBeside } from './alg/rectpacking/p2packing/CompactionPlacement.js';
export { ElkGraphUtil } from './graph/util/ElkGraphUtil.js';
```

### 6.4 `bin/control.mjs`

```js
// Positive control: the instrumented arm counter fires on a forged multi-rect nextBlock (a state the pipeline cannot build).
import { Block, RectRow, BlockStack, placeBeside, ElkGraphUtil } from './inst.mjs';
const node = (w, h) => { const n = ElkGraphUtil.createNode(null); n.setDimensions(w, h); return n; };
const spacing = 0;
const row = new RectRow(0, spacing);
const block = new Block(0, 0, row, spacing);
row.addBlock(block);
block.addChild(node(10, 10));
const stack = new BlockStack(0, 0, spacing);
stack.addBlock(block);
row.getStacks().push(stack);
const next = new RectRow(10, spacing);
const nextBlock = new Block(0, 10, next, spacing);
next.addBlock(nextBlock);
nextBlock.addChild(node(30, 20)); // minHeight 20 > row height 10
nextBlock.addChild(node(30, 20)); // two rects: 40 high when wrapped into a width below 60
const ctx = { rows: [row, next], row, boundingWidth: 50, nodeNodeSpacing: spacing, rowHeightReevaluation: true,
  nextRowIndex: 1, somethingWasChanged: false, compactRowAgain: false, currentStack: stack, blockId: 0 };
const result = placeBeside(ctx, block, nextBlock);
console.log(JSON.stringify({ result, probe: globalThis.__pb }));
```

### 6.5 `bin/gen.mjs`

```js
// Seeded input generator (mulberry32). gen(seed, flag) returns an ELK JSON graph for org.eclipse.elk.rectpacking.
const P = 'org.eclipse.elk.rectpacking.';
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
function sizes(r, n) {
  const fam = r();
  const out = [];
  for (let i = 0; i < n; i++) {
    let w, h;
    if (fam < 0.35) [w, h] = [int(r, 1, 120), int(r, 1, 120)];
    else if (fam < 0.55) [w, h] = [10 * int(r, 1, 10), 10 * int(r, 1, 10)];
    else if (fam < 0.7) [w, h] = [pick(r, [10, 20, 40]), pick(r, [10, 30, 90])];
    else if (fam < 0.8) [w, h] = [int(r, 1, 30), int(r, 1, 200)];
    else if (fam < 0.9) [w, h] = [int(r, 1, 200), int(r, 1, 30)];
    else [w, h] = [Math.round(r() * 10000) / 100, Math.round(r() * 10000) / 100];
    if (r() < 0.03) w = 0;
    if (r() < 0.03) h = 0;
    out.push([w, h]);
  }
  return out;
}
function spacing(r, o) {
  const k = r();
  if (k < 0.25) return;
  let v;
  if (k < 0.4) v = 0;
  else if (k < 0.65) v = pick(r, [1, 5, 10, 30]);
  else if (k < 0.9) v = pick(r, [-1, -2, -5, -10, -20, -50]);
  else v = Math.round((r() * 25 - 5) * 100) / 100;
  o['org.eclipse.elk.spacing.nodeNode'] = String(v);
}
function width(r, o, wh) {
  if (r() < 0.65) {
    o[P + 'widthApproximation.strategy'] = 'TARGET_WIDTH';
    const sum = wh.reduce((s, x) => s + x[0], 0);
    const max = wh.reduce((s, x) => Math.max(s, x[0]), 0);
    const k = r();
    let t;
    if (k < 0.4) t = Math.round(r() * 400);
    else if (k < 0.75) t = Math.round(sum * r());
    else if (k < 0.95) t = max + int(r, -5, 60);
    else t = pick(r, [0, -10, 1]);
    o[P + 'widthApproximation.targetWidth'] = String(t);
  } else {
    if (r() < 0.6) o[P + 'widthApproximation.optimizationGoal'] = pick(r, ['ASPECT_RATIO_DRIVEN', 'MAX_SCALE_DRIVEN', 'AREA_DRIVEN']);
    if (r() < 0.3) o[P + 'widthApproximation.lastPlaceShift'] = String(r() < 0.5);
  }
}
export function gen(seed, flag) {
  const r = rng(seed);
  const n = int(r, 2, 14);
  const wh = sizes(r, n);
  const o = { 'org.eclipse.elk.algorithm': 'org.eclipse.elk.rectpacking' };
  o[P + 'packing.compaction.rowHeightReevaluation'] = String(flag);
  spacing(r, o);
  width(r, o, wh);
  if (r() < 0.4) o[P + 'packing.compaction.iterations'] = String(pick(r, [2, 3, 5]));
  if (r() < 0.6) o[P + 'whiteSpaceElimination.strategy'] = pick(r, ['EQUAL_BETWEEN_STRUCTURES', 'TO_ASPECT_RATIO', 'NONE']);
  if (r() < 0.3) o['org.eclipse.elk.aspectRatio'] = String(Math.round((r() * 3 + 0.2) * 100) / 100);
  if (r() < 0.2) o['org.eclipse.elk.padding'] = `[top=${int(r, 0, 30)},left=${int(r, 0, 30)},bottom=${int(r, 0, 30)},right=${int(r, 0, 30)}]`;
  if (r() < 0.1) {
    o['org.eclipse.elk.nodeSize.constraints'] = '[MINIMUM_SIZE]';
    o['org.eclipse.elk.nodeSize.minimum'] = `(${int(r, 0, 500)},${int(r, 0, 500)})`;
  }
  if (r() < 0.15) o[P + 'orderBySize'] = 'true';
  if (r() < 0.1) o[P + 'trybox'] = 'true';
  const newRows = r() < 0.35;
  const children = wh.map(([w, h], i) => {
    const c = { id: `n${i}`, width: w, height: h };
    if (newRows && r() < 0.15) c.layoutOptions = { [P + 'inNewRow']: 'true' };
    return c;
  });
  return { id: 'root', layoutOptions: o, children };
}
```

### 6.6 `bin/worker.mjs`

```js
// Runs seeds [from, to) through the instrumented port. Before each input it writes the seed and the running totals to the
// progress file (sync), so the parent can kill a hung input and resume after it. Usage: worker.mjs from to flag progress hits
import { openSync, writeSync, ftruncateSync, appendFileSync } from 'node:fs';
const { layout } = await import(process.env.INST ?? './inst.mjs'); // INST: the mutant control's bundle
import { gen } from './gen.mjs';
const [from, to, flagArg, progressFile, hitsFile] = process.argv.slice(2);
const flag = flagArg === 'on';
console.error = () => {};
const fd = openSync(progressFile, 'w');
const totals = { inputs: 0, throws: 0, pbInputs: 0, reevalInputs: 0 };
const add = (probe) => { for (const [k, v] of Object.entries(probe ?? {})) totals[k] = (totals[k] ?? 0) + v; };
const save = (seed) => { const s = JSON.stringify({ seed, totals }); ftruncateSync(fd, 0); writeSync(fd, s, 0); };
for (let seed = Number(from); seed < Number(to); seed++) {
  save(seed);
  if (process.env.HANG_SEED === String(seed)) for (;;) {} // watchdog control only
  globalThis.__pb = undefined;
  globalThis.__inv = undefined;
  try {
    await layout(gen(seed, flag));
  } catch (e) {
    totals.throws++;
    appendFileSync(hitsFile, JSON.stringify({ seed, throws: `${e?.constructor?.name}: ${String(e?.message).slice(0, 80)}` }) + '\n');
  }
  totals.inputs++;
  const pb = globalThis.__pb, inv = globalThis.__inv;
  add(pb); add(inv);
  if (pb?.calls) totals.pbInputs++;
  if (pb?.reeval) totals.reevalInputs++;
  const bad = (pb?.arm ?? 0) + (pb?.vMulti ?? 0) + (pb?.vNotFromNext ?? 0) + (pb?.vNotFirst ?? 0)
    + (inv?.vParent ?? 0) + (inv?.vDup ?? 0) + (inv?.vLaterMulti ?? 0);
  if (bad > 0 || pb?.reeval) appendFileSync(hitsFile, JSON.stringify({ seed, bad, reeval: pb?.reeval ?? 0, pb, inv: bad > 0 ? inv : undefined }) + '\n');
}
save(Number(to));
process.exit(0);
```

### 6.7 `bin/search.mjs`

```js
// Parent: splits [from, to) over W child processes; a watchdog kills a child whose current seed has not changed for
// TIMEOUT_MS (#73 guard) and restarts after that seed. Usage: search.mjs name from to on|off [workers] [timeoutMs]
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const [name, fromArg, toArg, flag, wArg, tArg] = process.argv.slice(2);
const dir = path.dirname(new URL(import.meta.url).pathname);
const logs = path.join(dir, '..', 'logs');
const from = Number(fromArg), to = Number(toArg), W = Number(wArg ?? 6), TIMEOUT_MS = Number(tArg ?? 10000);
const sum = {}; const timeouts = [];
const add = (t) => { for (const [k, v] of Object.entries(t)) sum[k] = (sum[k] ?? 0) + v; };
const read = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
function runRange(id, a, b) {
  return new Promise((resolve) => {
    const progress = path.join(logs, `${name}.progress.${id}`);
    const hits = path.join(logs, `${name}.hits.${id}.jsonl`);
    const start = (s) => {
      if (s >= b) return resolve();
      const child = spawn(process.execPath, [path.join(dir, 'worker.mjs'), String(s), String(b), flag, progress, hits], { stdio: 'ignore' });
      let lastSeed = -1, lastChange = Date.now(), killed = false;
      const timer = setInterval(() => {
        const p = read(progress);
        if (p && p.seed !== lastSeed) { lastSeed = p.seed; lastChange = Date.now(); }
        else if (Date.now() - lastChange > TIMEOUT_MS) { killed = true; child.kill('SIGKILL'); }
      }, 500);
      child.on('exit', (code) => {
        clearInterval(timer);
        const p = read(progress);
        if (p) add(p.totals);
        if (killed || code !== 0) {
          const at = p ? p.seed : s;
          timeouts.push({ seed: at, killed, code });
          start(at + 1);
        } else resolve();
      });
    };
    start(a);
  });
}
const step = Math.ceil((to - from) / W);
const t0 = Date.now();
await Promise.all(Array.from({ length: W }, (_, i) => runRange(i, from + i * step, Math.min(to, from + (i + 1) * step))));
const out = { name, from, to, flag, workers: W, timeoutMs: TIMEOUT_MS, seconds: Math.round((Date.now() - t0) / 1000), timeouts, totals: sum };
writeFileSync(path.join(logs, `${name}.summary.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
```

### 6.8 `bin/xc-select.mjs`

```js
// Writes the first N searched inputs (ascending seed) whose run set shouldRowHeigthBeReevalauted in placeBeside.
// Usage: xc-select.mjs N  (reads logs/main.hits.*.jsonl; writes xc/in/s<seed>.json and xc/cases.jsonl)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gen } from './gen.mjs';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const n = Number(process.argv[2]);
const seeds = [];
for (const f of readdirSync(path.join(root, 'logs')).filter((x) => /^main\.hits\.\d+\.jsonl$/.test(x))) {
  for (const line of readFileSync(path.join(root, 'logs', f), 'utf8').split('\n')) {
    if (line === '') continue;
    const row = JSON.parse(line);
    if (row.reeval > 0) seeds.push(row.seed);
  }
}
seeds.sort((a, b) => a - b);
const chosen = seeds.slice(0, n);
const cases = chosen.map((seed) => {
  const input = path.join(root, 'xc', 'in', `s${seed}.json`);
  writeFileSync(input, JSON.stringify(gen(seed, true)));
  return JSON.stringify({ id: `s${seed}`, input, mode: 'layout' });
});
writeFileSync(path.join(root, 'xc', 'cases.jsonl'), cases.join('\n') + '\n');
console.log(JSON.stringify({ candidates: seeds.length, chosen: chosen.length, first: chosen[0], last: chosen.at(-1) }));
```

### 6.9 `bin/xc-compare.ts`

`<worktree>` is the absolute path of this worktree.

```ts
// Lays every cross-check input out on the unmodified port (this worktree's src) and compares with the oracle's output
// at 1e-6 (AD-4). Usage: tsx xc-compare.ts <scratch root>
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import '<worktree>/src/core/options/CoreOptions.js';
import { registerTreeAlgorithms } from '<worktree>/tools/corpus/ts-layout-pipeline.js';
import { RecursiveGraphLayoutEngine } from '<worktree>/src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '<worktree>/src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '<worktree>/src/graph/json/ElkGraphJson.js';
import { exportLikeOracle } from '<worktree>/test/helpers/graph-json-oracle.js';
import { compareLayout, formatDiffs } from '<worktree>/test/golden/compare-json.js';

const root = process.argv[2] as string;
// Every provider the oracle harness registers (ElkOracle.java:218-221): the exporter shortens option ids against the registry.
registerTreeAlgorithms();
console.error = () => {};
const results = new Map<string, { status: string; exception?: { class: string } }>();
for (const line of readFileSync(path.join(root, 'xc', 'results.jsonl'), 'utf8').split('\n')) {
  if (line.startsWith('{')) {
    const r = JSON.parse(line) as { id: string; status: string };
    results.set(r.id, r);
  }
}
const count = { cases: 0, equal: 0, differ: 0, bothThrow: 0, oracleOnlyThrow: 0, tsOnlyThrow: 0, oracleOther: 0, maxAbs: 0 };
const maxAbs = (a: unknown, b: unknown): number => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b);
  if (a !== null && typeof a === 'object' && b !== null && typeof b === 'object') {
    let m = 0;
    for (const k of Object.keys(a)) m = Math.max(m, maxAbs((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
    return m;
  }
  return 0;
};
for (const line of readFileSync(path.join(root, 'xc', 'cases.jsonl'), 'utf8').split('\n')) {
  if (line === '') continue;
  const c = JSON.parse(line) as { id: string; input: string };
  count.cases++;
  const oracle = results.get(c.id);
  let ts: string | null = null;
  let thrown: unknown = null;
  try {
    const graph = ElkGraphJson.forGraph(readFileSync(c.input, 'utf8')).toElk();
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
    ts = exportLikeOracle(graph);
  } catch (e) {
    thrown = e;
  }
  const out = path.join(root, 'xc', 'oracle', `${c.id}.json`);
  if (oracle?.status === 'ok' && ts !== null && existsSync(out)) {
    const expected = JSON.parse(readFileSync(out, 'utf8')) as unknown;
    const actual = JSON.parse(ts) as unknown;
    const cmp = compareLayout(expected, actual, { tol: 1e-6 });
    count.maxAbs = Math.max(count.maxAbs, maxAbs(expected, actual));
    if (cmp.ok) count.equal++;
    else {
      count.differ++;
      console.log(`DIFF ${c.id}\n${formatDiffs(cmp.diffs, 5)}`);
    }
  } else if (oracle?.status === 'throws' && ts === null) {
    count.bothThrow++;
    console.log(`BOTH-THROW ${c.id} oracle ${oracle.exception?.class ?? '?'} ts ${(thrown as Error).constructor.name}`);
  } else if (oracle?.status === 'throws') {
    count.oracleOnlyThrow++;
    console.log(`ORACLE-ONLY-THROW ${c.id}`);
  } else if (ts === null && oracle?.status === 'ok') {
    count.tsOnlyThrow++;
    console.log(`TS-ONLY-THROW ${c.id} ${String(thrown)}`);
  } else {
    count.oracleOther++;
    console.log(`ORACLE-OTHER ${c.id} ${oracle?.status ?? 'no result'}`);
  }
}
console.log(JSON.stringify(count));
```
