<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: rectpacking-open-arm (issue #81)

These are locked for this mission. A contradiction found during execution fires stop 6 ([stop-conditions.md](stop-conditions.md)).

The arm: `p2packing/Compaction.java:364`, inside `placeBeside`:
`if (shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()) return false;`. The port has it at
`src/alg/rectpacking/p2packing/CompactionPlacement.ts:117`.

## D0: what done means

#81 asks for one of two results: "a constructive input (then an additive recorder row, as T14 did for five other arms) or a proof
from the Java (then a `U` row)". Both are measured **at the pin** `8bca22f4`, the commit the oracle and the port follow. 8c measured
at `8aaa3c14`, before eclipse-elk/elk#1239 (D1). If the mission ends with neither result, it is a partial (D5), not a done.

## D1: try the proof first, from a planning hypothesis

**Context.** 8c ran about 900,000 random inputs and a hill-climb at `8aaa3c14`. In that search, multi-rect `nextBlock`s occurred
with the flag on (299 in 40,000 inputs). On 2026-11-19 the pin moved to `8bca22f4`, which contains #1239
(`3f5e4f97`, "Set the parent row of a block that compaction places beside another", merged as `647007e8`). Before #1239,
`placeNextBeside` added a block to the current row without setting that block's `parentRow`. A block could then sit in the current
row while `wasFromNextRow` (`Compaction.java:101`) still read true. That is the only route the planning read found to a
multi-rect `nextBlock` in `placeBeside`.

**Hypothesis (to be proven or broken by T1, not assumed).** At `8bca22f4` the arm is dead:

- **L1. Single rects.** With `rowHeightReevaluation = true`, `InitialPlacement.place` gives every block exactly one rect
  (`InitialPlacement.java:74-82`; the flag is read from `rect.getParent()`, which is the layout graph, the same node
  `RowFillingAndCompaction.java:105` reads).
- **L2. Only the current row gains rects.** `Block.addChild` and `addChildInNewRow` are called only from `InitialPlacement.place`
  and from `placeRectInBlock` (`:105`, `:110`). `placeRectInBlock` is called only from `absorbBlocks`, on `block = blocks.get(blockId)`
  of the row being compacted (`Compaction.java:69`).
- **L3. Later rows are not compacted yet.** `RowFillingAndCompaction.start` compacts the rows in index order. `rowIdx--`
  (`:117`) repeats the same row, and `rows.remove` only removes indices after the current row. So every row after `rowIdx` holds
  only blocks built by `InitialPlacement`, minus removed rects.
- **L4. `wasFromNextRow` means the next row.** Every site that adds a block to a row's `children` also sets its `parentRow` to
  that row (`InitialPlacement` constructors; `Compaction.java:165`, `:324`, `:413`). So `wasFromNextRow` holds only for the second
  arm of `getNextBlock` (`:217`), the first block of `rows.get(nextRowIndex)`. `placeBeside` is called only under
  `if (wasFromNextRow)` (`:152`).
- **L5. A single rect never takes the arm.** For a block of one rect with height `h`, `getHeightForTargetWidth(w)` is
  `Math.max(0, h)` at any `w`: the wrap test needs `maxHeightInRow > 0` before the first rect (`Block.java:269`, `:285`, `:293`).
  `getMinHeight()` is also `Math.max(0, h)` (`:188`, `:369`). So `nextBlockHeight > minHeight` is false for every value of `h`,
  including NaN (then `shouldRowHeigthBeReevalauted` is false as well), the infinities, `-0.0` and negative heights. Negative
  `nodeNodeSpacing` does not enter a one-rect placement.

**Decision.** T1 proves or breaks each lemma against the Java source at the pin, with file:line. Each "only" claim (L2, L4) gets an
`sg` enumeration plus a positive control, the maintainer's standard for "no caller" claims (#75 and #80 rulings). Random search
comes after the proof, as support only (D2).

**Rejected.**

- (a) Another, larger random search or a better hill-climb first. 900,000 inputs did not settle it. If L1 to L5 hold, no search can
  succeed, and a search alone can never yield a `U` row.
- (b) Hand-forging a `Block` in a unit test to force the arm. That only shows the port's `if` works, which nobody doubts. The
  `U` table already records "Unit test: no" for such arms.

## D2: supporting evidence for a proof

A `U` row rests on the proof. Three supports make it auditable:

1. **`sg` enumerations** (L2, L4) over `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src` at the pin. List every call of
   `addChild`, `addChildInNewRow`, `placeRectInBlock`, `addBlock`, `setParentRow` and `new Block(`. For each, show a positive control:
   the same pattern finds a known call. Journal the patterns verbatim.
2. **Instrumented port search** (scratch, never committed). Extract a snapshot with `git archive HEAD src package.json
   tsconfig.json` under `$TMPDIR/rectpacking-open-arm/`, and link `node_modules` into it. A `git worktree add` would write to
   the main checkout's `.git`, so it is not used. In the snapshot, instrument `placeBeside` to count calls and to assert the
   following at every call with the flag on: `nextBlock.getChildren().length === 1`, `wasFromNextRow`, and `nextBlock` being the
   first block of `rows[nextRowIndex]`. Also count arm hits. Run at least 100,000 seeded inputs with the flag on, with spacings
   drawn from negative, zero and positive values, including `IN_NEW_ROW` children. Each input runs in a child process under a kill
   timer (#73's non-terminating inputs). The bar: zero violations and zero arm hits, with the number of flag-on `placeBeside` calls
   reported. As a positive control, the instrumented snapshot of the arm's `if` must hit on a forged block.
3. **Oracle cross-check.** Take at least 1,000 of the searched inputs that call `placeBeside` with `shouldRowHeigthBeReevalauted`
   true. Lay them out on the oracle (`tools/oracle/run.sh`, or the JSON sweep `tools/oracle/json-sweep.sh`) and on the unmodified
   port, and require them equal at 1e-6. The port's invariant counts then hold for the JVM too. The choice of tool is a
   push-forward.

## D3: where a proof is recorded

- **`plans/alg-packing/unreached.md`.** Append only (the archaeology rule): at the end, add `## Addendum 2026-11-24 (#81)`, or the
  execution date, holding `U` row 19 in the same columns as the `U` table. Fill `Task` = `#81`; `Java file:line` = the arm; `Reason`
  = L1-L5 in one cell; `Unit test` = no; `Coverage` = not reached. Add one sentence saying the row supersedes the "Neither reached
  nor proven dead" row. No earlier line changes.
- **`plans/alg-packing/decision-journal.md`.** Append one closing row (the `#76` row at `:82` is the precedent).
- **Current docs.** `docs/conformance.md:2279` and `:2403-2404`, and `docs/architecture/alg-packing.md:23`, `:260` and `:534`, now say
  that the arm is a `U` row (proven dead at the pin since #1239), not open. These are live docs, not archaeology.
- **No source change.** `CompactionPlacement.ts:117` keeps the Java's `if` verbatim (the Java is sacred; dead upstream branches stay).
  No comment is added to the port.
- **No upstream issue.** Pure dead code is not filed (the #51 precedent, `fork-issue-standard`). The proof is journaled.

## D4: if the proof breaks, record the input in a new ref file

This applies when T1 finds a lemma false, or the search hits the arm.

- Shrink the input until removing any node or option misses the arm. Confirm on the oracle that it reaches `Compaction.java:364`,
  with a scratch reflection or `jdb` probe on the oracle jars, journaled. Port coverage alone is not oracle evidence.
- **Ref layout** (the tree-recorder-gaps D1 precedent, #66). Do not append to `rectpacking.json`: its counts are pinned in
  `RectPackingVectors.test.ts`, `rectpacking-replay-dump.test.ts` and others (`plans/alg-packing/decision-journal.md:72`), so
  appending to it is an AD-13 STOP (#156). Instead:
  - `tools/vectors/RectPackingVectors.java` gains a second plan and a second output, `rectpacking-extra.json`, written after
    `rectpacking.json`. Give it its own scenario list. The existing plan, its seeds, lists and output stay byte-identical.
  - `tools/vectors/rectpacking-vectors.sh` names the new file in its header.
  - A new `src/alg/rectpacking/RectPackingExtraVectors.test.ts` replays every row of the new file with the existing helpers. It
    asserts the file's row counts with literals from the recording. A helper that hardcodes `rectpacking.json`
    (`test/helpers/rectpacking-replay-rows.ts:195`) gains an optional file parameter with the old default.
- Record by script, under `nice -n 10`, after checking `uptime`. Journal the regeneration. Prove `rectpacking.json` byte-identical
  (`cmp` against the base).
- `unreached.md` gets the same addendum shape, as an "Arms closed by oracle evidence" row instead of a `U` row.

## D5: if neither holds within the budget

A lemma may stay unproven while no input is found. Then the mission lands the addendum with the narrowed state: which lemmas hold,
the open one, and the search counts. It also lands the journal rows and the doc text "still open, narrowed to …". It posts the
same as a comment on #81. The mission summary says **partial**. Labels stay as they are. This is not a halt: the evidence is new and
lands.

## D6: what does not change

No change to any non-test `src/` file, on every branch: D4 adds only a recorder plan, a ref, a test file and an optional helper
parameter. No change to any landed test,
vector, golden or expected value, any oracle patch, `ELK_COMMIT`, or anything under `~/git/knowvah/elk`. #73 is not touched: the
search only guards against it.

## Auto-confirmed (unattended)

Planned 2026-11-24 by `/plan-mission --unattended next --branch chore/issue-queue`.

- **Selection.** `next` resolved to #81, the lowest-numbered open `queue:ready` issue. No open issue is `queue:planned`. #81 has
  no "Blocked by" line and no `needs-ruling` label.
- **D0/D1, proof first.** Evidence: the planning read of `Compaction.java`, `RowFillingAndCompaction.java`,
  `InitialPlacement.java`, `Block.java` and `RectRow.java` at `8bca22f4`. `git -C ~/git/knowvah/elk log 8aaa3c14..8bca22f4 --
  plugins/org.eclipse.elk.alg.rectpacking` lists #1239 (`3f5e4f97`), which removes the stale-parent route 8c's multi-rect
  `nextBlock`s needed. `grep` lists exactly three `setParentRow` calls, and `addChild` callers only in `InitialPlacement`.
  Rejected: a search first (8c's 900,000 inputs), and a forged unit test (it proves nothing about reachability).
- **D4, a new ref file.** Evidence: tree-recorder-gaps D1 (#66); #156 (appending to a pinned ref is an AD-13 STOP); the pinned
  counts listed at `plans/alg-packing/decision-journal.md:72`. Rejected: appending to `rectpacking.json`.
- **D3, append-only addendum.** Evidence: CLAUDE.md ("never delete or rewrite" `plans/`); spore-recursion-depth appended a row to
  `plans/alg-packing/decision-journal.md`. Rejected: editing the "Neither reached" row in place.
- **D3, no upstream issue.** Evidence: the `fork-issue-standard` memory ("pure dead code is not filed", #51).
- **One executor, no subagents.** The work is sequential (proof, then search, then records) and touches few files.
- **No `.claude/settings.autonomous.json`.** The queue driver supplies permissions.
