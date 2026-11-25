<!-- SPDX-License-Identifier: EPL-2.0 -->

# Evidence: rectpacking-next-row-arm (issue #107)

The proof, the `ast-grep` hit lists and the scratch harness behind the journal rows of T1. The journal
([decision-journal.md](decision-journal.md)) holds one row per lemma and per run and points here for the text a table cell
cannot hold. All Java paths are below
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/` at `8bca22f4`.

## 1. The claim

`p2packing/Compaction.java`, in `placeBelow` and `placeBeside`:

```java
            if (wasFromNextRow) {                                   // :322
                row.addBlock(nextBlock);                            // :323
                nextBlock.setParentRow(row);                        // :324
                if (rows.size() > nextRowIndex) {                   // :325
                    ...
            row.addBlock(nextBlock);                                // :412
            nextBlock.setParentRow(row);                            // :413
            // Delete empty rows if needed.
            if (rows.size() > nextRowIndex) {                       // :416
```

At `8bca22f4` both conditions are true whenever they run, for both values of `rowHeightReevaluation`, so their false arms are
dead. The port keeps both as one helper, `removeFromNextRow` (`src/alg/rectpacking/p2packing/CompactionPlacement.ts:53-61`,
the `if` at `:55`), called at `:43` (`placeBelow`) and `:179` (`placeBeside`, through `placeNextBeside`).

## 2. Proof

Scope: one call of `Compaction.compact(rowIdx, rows, boundingWidth, nodeNodeSpacing, rowHeightReevaluation)` (`:54`). Its only
caller is `RowFillingAndCompaction.java:105` (E9); `rows` there is the list `InitialPlacement.place` built for this call of
`start` (`RowFillingAndCompaction.java:96`). The guard reads `rows.size()` and `nextRowIndex` only, so no numeric operand
(spacing, sizes, NaN, the infinities) enters it, and `rowHeightReevaluation` is not read by it.

### N0. Invariant I holds for both flag values

Invariant **I** (`plans/rectpacking-open-arm/evidence.md` § 2 L4): a block in `R.getChildren()` has `getParentRow() == R`, and
no block is in two rows or twice in one.

- L4's proof uses: the constructor and `place` (`Block.java:89`; `InitialPlacement.java:52`, `:66-67`, `:78-80`), the writes of
  `parentRow` (`Block.java:89`, `:467`; `setParentRow` at `Compaction.java:165`, `:324`, `:413`), the identity test at `:101`
  (E8), the `continue` of the empty-`nextBlock` path (`:126-137`), and the two `addBlock` sites on the current row (`:323`,
  `:412`), each followed by `setParentRow(row)` and the removal from the next row.
- None of these reads `rowHeightReevaluation`. The flag enters `compact` only as the parameter passed on to `placeBeside`
  (`:158-159`), where it is read at `:355` alone. In `place` it is read at `InitialPlacement.java:72`, where it only decides
  whether a rect joins the last block or a new block (`:75` or `:78-81`); both arms add the block to the row they pass as
  parent (`:78-80`). L4 does not use L1-L3's flag-on facts: those are used after L4 ("So in `placeBeside` the `nextBlock`
  ... By L3 it holds at most one rect"), for #81's corollary only.
- The enumerations L4 rests on (E2, E3, E6, E8) were rerun at the pin and give the hit lists of #81 (§ 3).

**Holds for both flag values.**

### N1. `wasFromNextRow` means a next row existed at `getNextBlock`

- `wasFromNextRow` is set only at `:101`, to `!nextBlock.getParentRow().equals(row)`, inside `if (nextBlock != null)`
  (`:100`); it is `false` otherwise (`:99`). `RectRow` has no `equals` (E8): the test is identity.
- `nextBlock` is set at `:98` by `getNextBlock` (`nextBlock = $A` gives `:98`, `:130`, `:216`, `:219`, E10; `:130` sets null
  and is followed by `continue`, `:135-137`).
- `getNextBlock` (`:212-222`) returns either `row.getChildren().get(blockId + 1)` (`:216`, first arm) or
  `rows.get(nextRowIndex).getChildren().get(0)` (`:219`), the latter only when `nextRowIndex < rows.size()` (`:217`).
- When `wasFromNextRow` is true, `nextBlock.getParentRow() != row`, so by **I** `nextBlock` is not in `row.getChildren()`; the
  first arm returns a block of `row.getChildren()`, so it did not return `nextBlock`. Hence `:219` returned it and
  `nextRowIndex < rows.size()` held at `:217`.

**Holds.**

### N2. Nothing shortens `rows` or moves `nextRowIndex` between `:217` and the guard

- `rows` is a `final` parameter in all four methods (`:54`, `:212`, `:298`, `:348`), so it names one list from `:54` to `:416`.
  `nextRowIndex` is declared once (`:58`, `rowIdx + 1`) and never assigned (`nextRowIndex = $A`, `nextRowIndex++`,
  `nextRowIndex--`: no hit; controls `nextBlock = $A` and `$X--`, E10); in `placeBelow` and `placeBeside` it is a parameter
  passed the same value (`:147`, `:158`), likewise never assigned.
- The list is written only at `InitialPlacement.java:64`, `:85` (`add`, inside `place`, before the loop) and
  `Compaction.java:132`, `:328`, `:419` (`remove`) (E3, E6). The other list writes of the bundle (`add`, `add(int, E)`,
  `remove`, `removeAll`, `clear`) are on other lists (E3, E6, E11); `set`, `addAll`, `subList`, `iterator`, `sort` on a row
  list, `retainAll` and `removeIf` have no hit (E11).
- No alias of the list exists while `compact` runs. It is created at `InitialPlacement.java:49`, returned at `:86`, held in the
  local `rows` of `start` (`RowFillingAndCompaction.java:96`), and passed out only to `Compaction.compact` (`:105`, in the loop),
  `DrawingUtil.calculateDimensions` (`:165`) and `setProperty(InternalProperties.ROWS, ...)` (`:171`), the last two after the
  loop (E9). `InternalProperties.ROWS` is set at `RowFillingAndCompaction.java:171` and `SimplePlacement.java:89` and read only
  at `EqualWhitespaceEliminator.java:44-45`, in phase 3 (E12). Inside `Compaction`, `rows` is passed only to `getNextBlock`
  (`:98`), `placeBelow` (`:147`) and `placeBeside` (`:158`) (E9).
- Between `:98` and the calls at `:147` and `:158`: `:113` (`absorbBlocks`) and `:111` (`useRowWidth`) do not receive `rows`;
  `absorbBlocks`'s `removeBlock` (`:278`) writes a row's `children`, not the list, and runs only when `nextBlock` became empty.
  `:132` runs only on that same empty-`nextBlock` path (`:126-134`), which ends in `continue` (`:135-137`): no call follows.
- Between `:147` and `:158`: `placeBelow` writes the list (`:328`) only inside the `if` at `:311`, whose body sets
  `somethingWasChanged = true` (`:319`), so it then returns true (`:333`) and `compact` continues at `:149`; a `placeBelow` that
  returns false made no write. So `placeBeside` never runs after a list write of the same pass.

**Holds.**

### N3. The guard at `:325` is true whenever it runs

`:325` runs only inside `if (wasFromNextRow)` (`:322`), in the `placeBelow` called at `:147` with the `wasFromNextRow` of `:101`
(`placeBelow($$$A)` has one hit, E9). `:303-:324` call `getHeightForTargetWidth`, `getMinWidth`, `placeRectsIn`, `setFixed`,
`setLocation`, `setPositionFixed`, `BlockStack.addBlock`, `RectRow.addBlock` and `setParentRow`; none receives `rows`, and
`RectRow.addBlock` (`RectRow.java:140-145`) writes the row's own `children`, not the list. By N1, `nextRowIndex < rows.size()`
held at `:217`; by N2 neither changed up to `:325`.

**Holds.**

### N4. The guard at `:416` is true whenever it runs

`placeBeside` is called only at `:158` (`placeBeside($$$A)` has one hit, E9), inside `if (wasFromNextRow)` (`:152`). `:353-:413`
read `rows` only at `:391-392` (`size`, `get`); the other calls (`getWidthForFixedHeight`, `getMinHeight`,
`getHeightForTargetWidth`, `getStacks`, `getMinWidth`, `setHeight`, `placeRectsIn`, `getWidthForTargetHeight`, `setFixed`,
`setLocation`, `RectRow.addBlock`, `setParentRow`) do not receive the list. By N1 and N2, `rows.size() > nextRowIndex` at `:416`.

**Holds.**

### Result

`Compaction.java:325` and `:416` are true whenever they run, at `8bca22f4`, for both values of `rowHeightReevaluation`: their
false arms are dead, and so is the false arm of the port's shared `if` at `CompactionPlacement.ts:55`.

Before eclipse-elk/elk#1239 (`3f5e4f97`) the line `:413` did not exist, **I** failed after a `placeBeside`, and N1 failed with
it: a block of the current row could read as `wasFromNextRow` while the next row was gone, which is how the
`stops/arm/staleParentRow*` rows reached the arm until `e7eaea57` (the mutant control, § 4).

## 3. Enumerations

Run in `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src` (HEAD `8bca22f4`) with
`ast-grep run -p '<pattern>' -l java --json=compact .` (ast-grep 0.51.3). Paths are shortened to the part below
`org/eclipse/elk/alg/rectpacking/`. A pattern with hits is its own positive control (it finds the calls the proof names); a
pattern with no hit names the control that shows the same pattern shape matching.

**Reruns of #81** (`plans/rectpacking-open-arm/evidence.md` § 3). Each hit list equals #81's:

| Id | Pattern | Hits at the pin |
| -- | ------- | --------------- |
| E2 | `$R.addBlock($A)` | 10: on a `RectRow` `p2packing/InitialPlacement.java:52`, `:67`, `:80`, `p2packing/Compaction.java:323`, `:412`; on a `BlockStack` `p2packing/SimplePlacement.java:77`, `util/RectRow.java:103`, `:106`, `p2packing/Compaction.java:90`, `:318` |
| E2 | `$R.setParentRow($A)` | `p2packing/Compaction.java:165`, `:324`, `:413` |
| E2 | `this.parentRow = $A` | `util/Block.java:89`, `:467` |
| E2 | `parentRow = $A` (unqualified) | none. Control: `this.parentRow = $A` |
| E2 | `new Block($$$A)` | `p2packing/InitialPlacement.java:52`, `:66`, `:78` |
| E2 | `new RectRow($$$A)` | `p2packing/InitialPlacement.java:50`, `:65` |
| E3 | `$R.add($A)` | 22 hits, the list of #81; the row list is written at `p2packing/InitialPlacement.java:64`, `:85` only |
| E3 | `$R.add($A, $B)` | `intermediate/InteractiveNodeReorderer.java:75` (a node list) |
| E3 | `$R.set($A, $B)` | none. Control: `$R.add($A, $B)` |
| E3 | `rows.$M($$$A)` | 43 matches; the writes are `p2packing/InitialPlacement.java:64`, `:85` (`add`), `p2packing/Compaction.java:132`, `:328`, `:419` (`remove`) on the row list, and `util/Block.java:108`, `:118`, `:137`, `:262`, `:263`, `:279`, `:356` on a block's `BlockRow` list |
| E6 | `$R.remove($A)` | `intermediate/InteractiveNodeReorderer.java:58`, `p2packing/Compaction.java:132`, `:328`, `:419`, `util/RectRow.java:152`, `util/BlockRow.java:99`, `util/Block.java:132`, `:137` |
| E6 | `$R.removeBlock($A)` | `p2packing/Compaction.java:75`, `:117`, `:128`, `:278`, `:326`, `:417` (each a `RectRow.removeBlock`, which writes only `children`, `width` and `height`: `util/RectRow.java:151-160`) |
| E6 | `$R.removeChild($A)` | `p2packing/Compaction.java:269` |
| E8 | `grep -n "equals\|hashCode\| extends \| implements " util/{Block,RectRow,BlockStack,BlockRow}.java` | nothing (exit 1); `grep -rn "extends \(Block\|RectRow\|Compaction\|InitialPlacement\)\b"` over `plugins` and `test`: nothing (exit 1) |

**New enumerations.**

| Id | Pattern | Hits |
| -- | ------- | ---- |
| E9 | `$F($$$A, rows, $$$B)` (unqualified calls) | `p2packing/Compaction.java:98` (`getNextBlock`), `:147` (`placeBelow`), `:158` (`placeBeside`) |
| E9 | `$R.$F($$$A, rows, $$$B)` (qualified calls) | `p2packing/RowFillingAndCompaction.java:105` (`Compaction.compact`), `:165` (`DrawingUtil.calculateDimensions`), `p2packing/SimplePlacement.java:81` (`calculateDimensions`, its own list) |
| E9 | `$R.$F($$$A, rows)` | `p2packing/RowFillingAndCompaction.java:171`, `p2packing/SimplePlacement.java:89` (both `setProperty(InternalProperties.ROWS, rows)`) |
| E9 | `$F($$$A, rows)` (unqualified, last argument) | none. Control: `$F($$$A, rows, $$$B)` above (the list is never last in an unqualified call) |
| E9 | `$R::$M` (method references) | none. Control (#81 E1): the same pattern in `org.eclipse.elk.alg.layered/src` finds `intermediate/wrapping/BreakingPointProcessor.java:241` |
| E9 | `getNextBlock($$$A)`, `placeBelow($$$A)`, `placeBeside($$$A)`, `absorbBlocks($$$A)`, `useRowWidth($$$A)` | one hit each: `p2packing/Compaction.java:98`, `:147`, `:158`, `:113`, `:111` |
| E9 | `$R.compact($$$A)` | `p2packing/RowFillingAndCompaction.java:105` |
| E9 | `$R.start($$$A)` | `p2packing/Compactor.java:62`, `:81` |
| E9 | `$R.place($$$A)` | `p2packing/RowFillingAndCompaction.java:96`, `p2packing/SimplePlacement.java:66` |
| E9 | `List<RectRow> $X = $Y` (local list variables) | `p2packing/InitialPlacement.java:49` (`new ArrayList`), `p2packing/RowFillingAndCompaction.java:96`, `p2packing/SimplePlacement.java:66` (each `= InitialPlacement.place(...)`) |
| E9 | `rows = $A`, `$A = rows` | none. Control: `currentStack = $A` finds `p2packing/Compaction.java:86` |
| E9 | `return rows` | `p2packing/InitialPlacement.java:86` (the new list), `util/Block.java:537` (a block's `BlockRow` list) |
| E9 | text `List<RectRow>` over `plugins` and `test` | `options/InternalProperties.java:42`, `util/DrawingUtil.java:61`, `p2packing/SimplePlacement.java:66`, `p2packing/InitialPlacement.java:48`, `:49`, `p2packing/Compaction.java:54`, `:212`, `:298`, `:348`, `p3whitespaceelimination/RectangleExpansion.java:48`, `p2packing/RowFillingAndCompaction.java:96`: no other bundle and no test holds a row list |
| E10 | `nextRowIndex = $A`, `nextRowIndex++`, `nextRowIndex--` | none. Controls: `nextBlock = $A` finds `p2packing/Compaction.java:98`, `:130`, `:216`, `:219`; `$X--` finds `RectPackingLayoutProvider.java:99`, `p2packing/Compaction.java:76`, `:136`, `p2packing/Compactor.java:101`, `p2packing/RowFillingAndCompaction.java:117` |
| E11 | `$R.removeAll($A)`, `$R.clear()` | `util/Block.java:356`, `:262` (a block's `BlockRow` list) |
| E11 | `$R.addAll($$$A)`, `$R.subList($$$A)`, `$R.iterator()`, `$R.retainAll($$$A)`, `$R.removeIf($$$A)` | none. Control: `$R.removeAll($A)` above |
| E11 | `$R.sort($$$A)` | `intermediate/InteractiveNodeReorderer.java:63`, `intermediate/NodeSizeReorderer.java:43` (node lists) |
| E12 | `$R.setProperty(InternalProperties.ROWS, $A)` | `p2packing/RowFillingAndCompaction.java:171`, `p2packing/SimplePlacement.java:89` |
| E12 | `$R.getProperty(InternalProperties.ROWS)` | `p3whitespaceelimination/EqualWhitespaceEliminator.java:45` |
| E12 | `$R.hasProperty(InternalProperties.ROWS)` | `p3whitespaceelimination/EqualWhitespaceEliminator.java:44` |
| E12 | `$R.getProperty(InternalProperties.$P)` (control for the shape) | 27 hits, among them `EqualWhitespaceEliminator.java:45` |
| E12 | text `\bROWS\b` over `plugins` and `test` (`*.java`, `*.xtend`, `*.melk`) | the four hits above, `options/InternalProperties.java:42`, two Javadoc lines (`SimplePlacement.java:45`, `Compactor.java:44`), and an unrelated constant of `alg.common`'s `GridContainerCell` |

A bare `InternalProperties.ROWS` pattern gives no hit even where the `getProperty` form does: `--debug-query=pattern` shows that
ast-grep parses a bare `X.Y` Java pattern as a type name (`scoped_type_identifier`), never as a field access (`$A.ROWS` and
`foo(InternalProperties.ROWS)` give no hit either). The three call forms and the text search above cover every access.

## 4. Search, mutant control and side count

Scratch under `$TMPDIR/rectpacking-next-row-arm/` (never committed); the texts are in § 6. The snapshot is
`git archive HEAD src package.json tsconfig.json` of the brief commit `5f66323e` (its `src` equals the base `35916b90`), with
the probes of § 6.2, bundled by esbuild. The generator is #81's `gen.mjs` unchanged (`plans/rectpacking-open-arm/evidence.md`
§ 6.5; `diff` against it is empty): 2 to 14 children, six size families with 3 % zero widths and heights, `spacing.nodeNode`
absent, zero, positive, negative (-1 to -50) or fractional, both width-approximation strategies, 2, 3 or 5 compaction
iterations, the three whitespace strategies, aspect ratio, padding, minimum size, `orderBySize`, `trybox`, and `inNewRow` on
15 % of the children of 35 % of the inputs. The flag is set explicitly on every input. #81's `search.mjs` is reused unchanged
(§ 6.7 there): six batch children, a watchdog that kills a child whose seed has not changed for 10 s, and resumes after it.

Counter names: `calls_<site>_<flag>` counts the guards of `removeFromNextRow` (`site` is `below` or `beside`, `flag` is `on` or
`off`), `arm_<site>_<flag>` the false-arm hits, `enter_<site>_<flag>` the calls of `placeBelow` and `placeBeside`;
`fromNext_<flag>` and `sameRow_<flag>` split the non-null `getNextBlock` results by `wasFromNextRow`. The violations are
`vParent` and `vDup` (**I**), `vRowDup` (a row held twice in the list), `vNoNextRow` and `vNotFirst` (N1, at a
`wasFromNextRow` block), `vNotSameRow` (the first arm of `getNextBlock`), and `vLenAtCall`, `vLenAtGuard` (N2: the list length
at the call and at the guard against the length at `getNextBlock`).

| Run | Command | Result |
| --- | ------- | ------ |
| Watchdog control | `HANG_SEED=150 node bin/search.mjs hangctl 0 400 on 2 3000` | 399 inputs, one timeout `{"seed":150,"killed":true}`; the run resumed at 151 |
| Mutant control, unmodified bundle | `node bin/stale.mjs` | both inputs: `calls_beside_off` 2, no `arm_*`, no violation |
| **Mutant control** (`CompactionPlacement.ts:176` removed) | `INST=./inst-mutant.mjs node bin/stale.mjs` | both inputs: **`arm_beside_off` 1**, `vNoNextRow` 2, `vNotFirst` 2, `vParent` 9, `vDup` 3; no throw |
| **Main search, flag on** | `nice -n 10 node bin/search.mjs mainOn 0 500000 on 6 10000` | seeds 0 to 499,999: 500,000 inputs, 0 timeouts, 0 throws, 94 s; `calls_below_on` 200,405 (85,713 inputs), `calls_beside_on` 455,108 (163,593 inputs); `arm_*` 0; violations 0; 7,954,750 block steps, 6,860,566 non-null `getNextBlock` results (3,146,211 `wasFromNextRow`) |
| **Main search, flag off** | `nice -n 10 node bin/search.mjs mainOff 0 500000 off 6 10000` | seeds 0 to 499,999: 500,000 inputs, 0 timeouts, 0 throws, 91 s; `calls_below_off` 186,741 (79,395 inputs), `calls_beside_off` 311,450 (133,066 inputs); `arm_*` 0; violations 0; 5,919,465 block steps, 4,824,953 non-null `getNextBlock` results (2,850,685 `wasFromNextRow`) |

The mutant shows the route #1239 closed: with the parent row left stale, a block of the current row reads as `wasFromNextRow`
after the next row was removed (`vNoNextRow`), and the guard of `placeBeside` takes its false arm. That is the reach the two
`staleParentRow` rows recorded before the pin.

**Side count of `Compaction.java:127`** (push-forward, not worked here): `rows.size() > nextRowIndex` in `deleteEmptyNextBlock`
(`Compaction.ts:181`) is true 1,422,441 times (flag on) and 106,745 (off), false 491,141 (on) and 5,329 (off). Both arms are
reached, so no `follow-up` is filed.

## 5. Oracle cross-check

- **Inputs.** For each flag value, the first 600 seeds of the main search, in ascending order, whose run reached the guard
  of `placeBelow` or `placeBeside` (flag on: seeds 3 to 1,534 of 16,644 candidates below seed 40,000, 264 reaching `placeBelow`'s
  guard, 469 `placeBeside`'s; flag off: seeds 3 to 1,688 of 14,682 candidates, 259 and 439), written as ELK JSON by
  `bin/xc-select.mjs 600` (1,200 cases).
- **Oracle.** `nice -n 10 tools/oracle/run.sh --cases xc/cases.jsonl xc/oracle > xc/results.jsonl` (started at load 12.04 after a
  wait from 145; oracle `8bca22f4`, patches 0001-0004): 1,200 `ok`, 0 failed, exit 0.
- **Port.** The unmodified port of this worktree through `npx tsx bin/xc-compare.ts`, #81's script unchanged
  (`plans/rectpacking-open-arm/evidence.md` § 6.9: every provider registered, `exportLikeOracle`, `compareLayout` at 1e-6).
- **Result.** 1,200 of 1,200 equal; the largest absolute difference of any number is 0. No stop 7.
- **Comparator control.** With `children[0].x` of `xc/oracle/on-s3.json` moved by 0.001, the run reports that one case
  (`value children[id=n0].x: expected 15.001, actual 15`) and 1,199 equal; the file was restored (`cmp` identical).

## 6. Harness texts

Directory layout: `snap/` (the instrumented snapshot), `snap-mutant/` (the same with `CompactionPlacement.ts:176`,
`nextBlock.setParentRow(row);`, removed), `bin/` (scripts and bundles), `logs/`, `xc/`.

### 6.1 Setup

```sh
R="${TMPDIR%/}/rectpacking-next-row-arm"; O="${TMPDIR%/}/rectpacking-open-arm"
mkdir -p "$R/snap" "$R/logs" "$R/bin" "$R/xc/in" "$R/xc/oracle"
git archive HEAD src package.json tsconfig.json | tar -x -C "$R/snap"
ln -s "$PWD/node_modules" "$R/snap/node_modules"
cp "$O/bin/gen.mjs" "$O/bin/search.mjs" "$R/bin/"
# insert the probes (6.2) and write snap/src/probe-entry.ts (`export { layout } from './layout.js';`), then copy the snapshot
# to snap-mutant and delete `nextBlock.setParentRow(row);` after `row.addBlock(nextBlock);` in placeNextBeside; bundle both:
(cd "$R/snap" && ./node_modules/.bin/esbuild src/probe-entry.ts --bundle --format=esm --platform=node --outfile="$R/bin/inst.mjs")
(cd "$R/snap-mutant" && ./node_modules/.bin/esbuild src/probe-entry.ts --bundle --format=esm --platform=node \
  --outfile="$R/bin/inst-mutant.mjs")
```

### 6.2 Probes

All counters live in `globalThis.__nr`, reset per input by the worker. In
`snap/src/alg/rectpacking/p2packing/CompactionPlacement.ts`, before `removeFromNextRow`:

```ts
// PROBE (scratch, rectpacking-next-row-arm D2.2): per site and flag value, the calls of removeFromNextRow and the hits of
// its false arm; and the list length against the one recorded at getNextBlock.
type NR = Record<string, number>;
const nr = (): NR => ((globalThis as unknown as { __nr?: NR }).__nr ??= {});
const bump = (k: string): void => {
  const P = nr();
  P[k] = (P[k] ?? 0) + 1;
};
export function probeCall(ctx: CompactContext, site: string): void {
  const len = (globalThis as unknown as { __step?: { len: number } }).__step?.len;
  bump(`enter_${site}_${ctx.rowHeightReevaluation ? 'on' : 'off'}`);
  if (len !== ctx.rows.length) bump('vLenAtCall');
}
function probeGuard(ctx: CompactContext, site: string): void {
  const len = (globalThis as unknown as { __step?: { len: number } }).__step?.len;
  const k = `${site}_${ctx.rowHeightReevaluation ? 'on' : 'off'}`;
  bump(`calls_${k}`);
  if (!(ctx.rows.length > ctx.nextRowIndex)) bump(`arm_${k}`);
  if (len !== ctx.rows.length) bump('vLenAtGuard');
}
```

`probeCall(ctx, 'below')` and `probeCall(ctx, 'beside')` are the first statements of `placeBelow` and `placeBeside`;
`probeGuard(ctx, 'below')` and `probeGuard(ctx, 'beside')` precede the two `removeFromNextRow(ctx, nextBlock)` calls.

In `snap/src/alg/rectpacking/p2packing/Compaction.ts`, as the first statement of `processBlock` (invariant **I**):

```ts
    {
      const P = ((globalThis as unknown as { __nr?: Record<string, number> }).__nr ??= {});
      P.steps = (P.steps ?? 0) + 1;
      const seen = new Set<Block>();
      for (const r of ctx.rows) {
        for (const b of r.getChildren()) {
          if (b.getParentRow() !== r) P.vParent = (P.vParent ?? 0) + 1;
          if (seen.has(b)) P.vDup = (P.vDup ?? 0) + 1;
          seen.add(b);
        }
      }
      if (new Set(ctx.rows).size !== ctx.rows.length) P.vRowDup = (P.vRowDup ?? 0) + 1;
    }
```

After `const nextBlock = Compaction.getNextBlock(...)` (N1):

```ts
    if (nextBlock !== null) {
      const P = ((globalThis as unknown as { __nr?: Record<string, number> }).__nr ??= {});
      const flag = ctx.rowHeightReevaluation ? 'on' : 'off';
      P.next = (P.next ?? 0) + 1;
      if (nextBlock.getParentRow() !== ctx.row) {
        P[`fromNext_${flag}`] = (P[`fromNext_${flag}`] ?? 0) + 1;
        if (!(ctx.nextRowIndex < ctx.rows.length)) P.vNoNextRow = (P.vNoNextRow ?? 0) + 1;
        if (ctx.rows[ctx.nextRowIndex]?.getChildren()[0] !== nextBlock) P.vNotFirst = (P.vNotFirst ?? 0) + 1;
      } else {
        P[`sameRow_${flag}`] = (P[`sameRow_${flag}`] ?? 0) + 1;
        if (ctx.row.getChildren()[ctx.blockId + 1] !== nextBlock) P.vNotSameRow = (P.vNotSameRow ?? 0) + 1;
      }
      (globalThis as unknown as { __step?: { len: number } }).__step = { len: ctx.rows.length };
    }
```

At the start of `deleteEmptyNextBlock` (side count of `Compaction.java:127`):

```ts
    {
      const P = ((globalThis as unknown as { __nr?: Record<string, number> }).__nr ??= {});
      const k = `g127_${ctx.rows.length > ctx.nextRowIndex}_${ctx.rowHeightReevaluation ? 'on' : 'off'}`;
      P[k] = (P[k] ?? 0) + 1;
    }
```

### 6.3 `bin/worker.mjs`

```js
// Runs seeds [from, to) through the instrumented port (rectpacking-next-row-arm D2.2). Before each input it writes the seed and
// the running totals to the progress file (sync), so the parent can kill a hung input and resume after it.
// Usage: worker.mjs from to on|off progress hits   (env INST: the bundle; env REACH_MAX: log reaching seeds below it)
import { openSync, writeSync, ftruncateSync, appendFileSync } from 'node:fs';
const { layout } = await import(process.env.INST ?? './inst.mjs');
import { gen } from './gen.mjs';
const [from, to, flagArg, progressFile, hitsFile] = process.argv.slice(2);
const flag = flagArg === 'on';
const REACH_MAX = Number(process.env.REACH_MAX ?? 40000);
console.error = () => {};
const fd = openSync(progressFile, 'w');
const totals = { inputs: 0, throws: 0, belowInputs: 0, besideInputs: 0, reachInputs: 0 };
const add = (probe) => { for (const [k, v] of Object.entries(probe ?? {})) totals[k] = (totals[k] ?? 0) + v; };
const save = (seed) => { const s = JSON.stringify({ seed, totals }); ftruncateSync(fd, 0); writeSync(fd, s, 0); };
const sum = (p, re) => Object.entries(p).filter(([k]) => re.test(k)).reduce((s, [, v]) => s + v, 0);
for (let seed = Number(from); seed < Number(to); seed++) {
  save(seed);
  if (process.env.HANG_SEED === String(seed)) for (;;) {} // watchdog control only
  globalThis.__nr = undefined;
  globalThis.__step = undefined;
  try {
    await layout(gen(seed, flag));
  } catch (e) {
    totals.throws++;
    appendFileSync(hitsFile, JSON.stringify({ seed, throws: `${e?.constructor?.name}: ${String(e?.message).slice(0, 80)}` }) + '\n');
  }
  totals.inputs++;
  const p = globalThis.__nr ?? {};
  add(p);
  const below = sum(p, /^calls_below_/), beside = sum(p, /^calls_beside_/);
  if (below) totals.belowInputs++;
  if (beside) totals.besideInputs++;
  if (below || beside) totals.reachInputs++;
  const bad = sum(p, /^arm_/) + sum(p, /^v/);
  if (bad > 0 || ((below || beside) && seed < REACH_MAX)) {
    appendFileSync(hitsFile, JSON.stringify({ seed, flag: flagArg, bad, below, beside, p: bad > 0 ? p : undefined }) + '\n');
  }
}
save(Number(to));
process.exit(0);
```

### 6.4 `bin/stale.mjs`

```js
// Mutant control (D2.3): the two staleParentRow inputs of RectPackingVectors.java:1559-1561 through a bundle.
// Usage: INST=./inst-mutant.mjs node stale.mjs
const { layout } = await import(process.env.INST ?? './inst.mjs');
console.error = () => {};
const g = (ws, hs, o) => ({ id: 'root', layoutOptions: { 'org.eclipse.elk.algorithm': 'org.eclipse.elk.rectpacking', ...o },
  children: ws.map((w, i) => ({ id: `n${i}`, width: w, height: hs[i] })) });
const inputs = {
  staleParentRow: g([10, 10, 10, 20, 10], [10, 10, 40, 10, 60], {}),
  staleParentRowNoSpacing: g([20, 20, 10, 10, 10], [10, 10, 30, 10, 40], { 'org.eclipse.elk.spacing.nodeNode': '0' }),
};
for (const [id, input] of Object.entries(inputs)) {
  globalThis.__nr = undefined; globalThis.__step = undefined;
  let err = null;
  try { await layout(input); } catch (e) { err = `${e?.constructor?.name}: ${e?.message}`; }
  console.log(JSON.stringify({ id, err, probe: globalThis.__nr }));
}
```

### 6.5 Cross-check scripts

`bin/xc-compare.ts` is #81's `bin/xc-compare.ts` (`plans/rectpacking-open-arm/evidence.md` § 6.9) with `<worktree>` replaced
by this worktree's path; the cases are named `<on|off>-s<seed>`.

`bin/xc-select.mjs`:

```js
// Writes the first N searched inputs per flag value (ascending seed) whose run reached placeBelow's or placeBeside's guard.
// Usage: xc-select.mjs N  (reads logs/main{On,Off}.hits.*.jsonl; writes xc/in/<on|off>-s<seed>.json and xc/cases.jsonl)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gen } from './gen.mjs';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const n = Number(process.argv[2]);
const cases = [];
const info = {};
for (const [name, flag] of [['mainOn', 'on'], ['mainOff', 'off']]) {
  const seeds = [];
  let below = 0, beside = 0;
  const rows = new Map();
  for (const f of readdirSync(path.join(root, 'logs')).filter((x) => new RegExp(`^${name}\\.hits\\.\\d+\\.jsonl$`).test(x))) {
    for (const line of readFileSync(path.join(root, 'logs', f), 'utf8').split('\n')) {
      if (line === '') continue;
      const row = JSON.parse(line);
      if (row.below > 0 || row.beside > 0) { seeds.push(row.seed); rows.set(row.seed, row); }
    }
  }
  seeds.sort((a, b) => a - b);
  const chosen = seeds.slice(0, n);
  for (const seed of chosen) {
    const id = `${flag}-s${seed}`;
    const input = path.join(root, 'xc', 'in', `${id}.json`);
    writeFileSync(input, JSON.stringify(gen(seed, flag === 'on')));
    cases.push(JSON.stringify({ id, input, mode: 'layout' }));
    if (rows.get(seed).below) below++;
    if (rows.get(seed).beside) beside++;
  }
  info[flag] = { candidates: seeds.length, chosen: chosen.length, first: chosen[0], last: chosen.at(-1), below, beside };
}
writeFileSync(path.join(root, 'xc', 'cases.jsonl'), cases.join('\n') + '\n');
console.log(JSON.stringify(info));
```
