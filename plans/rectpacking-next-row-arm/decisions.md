<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: rectpacking-next-row-arm (issue #107)

These are locked for this mission. A contradiction found during execution fires stop 6 ([stop-conditions.md](stop-conditions.md)).

The arm: the false arm of `if (rows.size() > nextRowIndex)` at `p2packing/Compaction.java:325` (in `placeBelow`, inside
`if (wasFromNextRow)`, `:322`) and at `:416` (in `placeBeside`, unguarded inside the method). The port has one shared helper,
`removeFromNextRow` (`src/alg/rectpacking/p2packing/CompactionPlacement.ts:53-61`, the `if` at `:55`), called at `:43` and `:179`.

## D0: what done means

#107 asks for one of two results, as for #81: "a constructive input that reaches the arm at `8bca22f4` (then an additive recorder
row), or a proof from the Java that it is dead (then a `U` row in `plans/alg-packing/unreached.md`)". Both are measured **at the
pin** `8bca22f4`. The proof must cover both Java sites and both values of `rowHeightReevaluation`, because the guard does not read
the flag. If the mission ends with neither result, it is a partial (D5), not a done.

## D1: prove first, from invariant I

**Context.** Until `e7eaea57` the rows `stops/arm/staleParentRow/default` and `.../staleParentRowNoSpacing/default`
(`tools/vectors/RectPackingVectors.java:1559-1561`) reached the arm: a block that `placeBeside` had moved kept its old parent row,
so `wasFromNextRow` read true for a block of the current row while the next row was gone. #1239 (`3f5e4f97`) added
`nextBlock.setParentRow(row)` at `:413`. Mission `rectpacking-open-arm` proved invariant **I** at the pin
(`plans/rectpacking-open-arm/evidence.md` § 2 L4): a block in `R.getChildren()` has `getParentRow() == R`, and no block is in
two rows or twice in one. **I**'s proof does not use the flag; T1 confirms that before relying on it.

**Hypothesis (to be proven or broken by T1, not assumed).** At `8bca22f4` both guards are always true:

- **N1. `wasFromNextRow` means a next row existed.** By **I**, `wasFromNextRow` (`:101`, identity, `RectRow` has no `equals`)
  is true only when `getNextBlock` took its second arm (`:217-219`), whose condition includes `nextRowIndex < rows.size()`.
- **N2. Nothing shortens `rows` between `:217` and the calls.** The only writes to the list are `:132`, `:328` and `:419`
  (`rectpacking-open-arm` E3, E6). Between `:98` and the calls at `:147` and `:158`, `:132` runs only when `nextBlock` became
  empty (`:126-134`), and that path ends in `continue` (`:135-137`). `absorbBlocks` (`:113`) and `useRowWidth` (`:111`) do not
  receive `rows`; `absorbBlocks`'s `removeBlock` (`:278`) changes a row's children, not the list, and runs only when `nextBlock`
  is empty. T1 also enumerates every call that receives `rows`, and every read or write of `InternalProperties.ROWS`, to rule out
  an alias of the list.
- **N3. `placeBelow`.** `:325` runs only under `if (wasFromNextRow)` (`:322`), and `:303-:324` do not write `rows`.
  With N1 and N2, `rows.size() > nextRowIndex` holds at `:325`.
- **N4. `placeBeside`.** It is called only at `:158`, inside `if (wasFromNextRow)` (`:152`). `:353-:413` only read `rows`
  (`:391-392`). With N1 and N2, `rows.size() > nextRowIndex` holds at `:416`.

No numeric operand enters the guard, so NaN, the infinities and negative spacings do not matter; a throw before the guard never
reaches it.

**Decision.** T1 proves or breaks N1-N4 against the Java at the pin, with file:line, and reuses the #81 enumerations where they
cover a claim (cite them by id, rerun them once to confirm they still hold). Each new "only" claim gets an `ast-grep` enumeration
plus a positive control (the #75 and #80 rulings). Random search comes after the proof, as support only (D2).

**Rejected.**

- (a) A search first. A search alone can never yield a `U` row, and the stale-parent route that reached the arm is the one #1239
  removed.
- (b) Calling `removeFromNextRow` in a unit test with a short `rows`. That shows the port's `if` works, not that the Java reaches
  it. The `U` table records such arms as "Unit test: no".

## D2: supporting evidence

1. **Enumerations** over `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src` at the pin: the #81 patterns E2, E3, E6 and
   E8 rerun, plus every call with `rows` as an argument and every `InternalProperties.ROWS` access. Journal the patterns verbatim,
   with hit lists and controls, in `evidence.md`.
2. **Instrumented port search** (scratch, never committed), with the harness shape of `plans/rectpacking-open-arm/evidence.md` § 6
   (a `git archive` snapshot under `$TMPDIR/rectpacking-next-row-arm/`, an esbuild bundle, batch child processes under a
   per-input watchdog). Instrument the snapshot to count, per call site (`placeBelow`, `placeBeside`) and per flag value, the
   calls of `removeFromNextRow` and its false-arm hits. Also assert at every `getNextBlock` with a non-null result:
   `wasFromNextRow` implies `nextBlock === rows[nextRowIndex].getChildren()[0]` and `nextRowIndex < rows.length`, and
   `rows.length` is the same at the `placeBelow` or `placeBeside` call. Run at least 100,000 seeded inputs, about half with
   `rowHeightReevaluation` on, with spacings drawn from negative, zero and positive values and with `IN_NEW_ROW` children. The bar:
   zero violations and zero false-arm hits, with each site reached at least 1,000 times under each flag value.
3. **Mutant control.** In a second snapshot, delete the port's equivalent of `:413` (`CompactionPlacement.ts:176`,
   `nextBlock.setParentRow(row)` in `placeBeside`). Run the two `staleParentRow` inputs (`RectPackingVectors.java:1559-1561`)
   through it under the watchdog: the false-arm counter must read at least 1. If it reads 0, journal it and run the mutant over
   the search's seed range instead; if that also reads 0, use a forged call as the control and say so (not a stop).
4. **Oracle cross-check.** Take at least 1,000 searched inputs that reach at least one of the two sites, both flag values
   represented. Lay them out on the oracle (`tools/oracle/run.sh --cases`, as #81 did) and on the unmodified port, and require them
   equal at 1e-6. Register every provider and export like the oracle (`.agent-notes/rectpacking-open-arm.md`, third observation).

## D3: where a proof is recorded

- **`evidence.md`** in this brief holds the proof, the enumerations and the harness texts (the #81 brief added the same file as a
  deviation; here it is planned).
- **`plans/alg-packing/unreached.md`.** Append only: `## Addendum <date> (#107)` at the end, with `U` row 20 in the columns of the
  `U` table. `Task` = `#107`; `Java file:line` = both sites and `CompactionPlacement.ts:55`; `Reason` = N1-N4 in one cell, with
  the support counts and the mutant control; `Unit test` = no; `Coverage` = not reached. Add one sentence: the T14 table row for
  the `staleParentRow` rows (`:38`) records the reach before #1239 and stays as written. No earlier line changes.
- **`plans/alg-packing/decision-journal.md`.** Append one closing row (the `#81` row is the model).
- **Current docs.** `docs/conformance.md` (the coverage sentence at `:2279-2283`, a `#107` bullet next to "Dead arm (issue #81)"
  at `:2414`) and `docs/architecture/alg-packing.md` (§ 2 coverage paragraph `:259-264`, issue-table row `#107` at `:547`) say the
  arm is `U` row 20. These are live docs, not archaeology.
- **No source change.** `CompactionPlacement.ts:55` keeps the Java's `if` verbatim (dead upstream branches stay). No comment is
  added to the port.
- **No upstream issue.** A redundant guard is dead code, which is not filed (the #51 precedent).

## D4: if the proof breaks, record the input in a new ref file

This applies when T1 finds a lemma false, or the search hits the arm.

- Shrink the input until removing any node or option misses the arm. Confirm on the oracle that it reaches the false arm at
  `:325` or `:416`, with a scratch reflection or `jdb` probe on the oracle jars, journaled. Port coverage alone is not oracle
  evidence.
- **Ref layout** (tree-recorder-gaps D1, #66). Do not append to `rectpacking.json`: its counts are pinned in
  `RectPackingVectors.test.ts`, `rectpacking-replay-dump.test.ts` and others (`plans/alg-packing/decision-journal.md:72`), so
  appending is an AD-13 STOP (#156). Instead:
  - `tools/vectors/RectPackingVectors.java` gains a second plan and a second output, `rectpacking-extra.json`, written after
    `rectpacking.json`, with its own scenario list. The existing plan, its seeds, lists and output stay byte-identical.
  - `tools/vectors/rectpacking-vectors.sh` names the new file in its header.
  - A new `src/alg/rectpacking/RectPackingExtraVectors.test.ts` replays every row of the new file with the existing helpers and
    asserts the file's row counts with literals from the recording. A helper that hardcodes `rectpacking.json`
    (`test/helpers/rectpacking-replay-rows.ts`) gains an optional file parameter with the old default.
- Record by script, under `nice -n 10`, after checking `uptime`. Journal the regeneration. Prove `rectpacking.json` byte-identical
  (`cmp` against the base).
- `unreached.md` gets the same addendum shape, as an "Arms closed by oracle evidence" row instead of a `U` row.
- A reachable arm at the pin may also mean **I** fails, which would reopen `U` row 19 of #81. Then file a `needs-ruling` issue
  naming row 19 and the input; do not edit row 19.

## D5: if neither holds within the budget

A lemma stays unproven while no input is found. The mission lands the addendum with the narrowed state (which lemmas hold, the open
one, the search counts), the journal rows and the doc text "still open, narrowed to …", and posts the same on #107. The summary
says **partial**. Labels stay as they are. This is not a halt.

## D6: what does not change

No change to any non-test `src/` file, on every branch. No change to any landed test, vector, golden or expected value, any oracle
patch, `ELK_COMMIT`, `U` row 19 or anything under `~/git/knowvah/elk`. `Compaction.java:127` is not worked.

## Auto-confirmed (unattended)

Planned 2026-11-24 by `/plan-mission --unattended next --branch chore/issue-queue`.

- **Selection.** `next` resolved to #107, the lowest-numbered open `queue:ready` issue. No open issue is `queue:planned`. #107 has
  no "Blocked by" line and no `needs-ruling` label.
- **D0/D1, proof first, from I.** Evidence: the planning read of `Compaction.java:54-425` at `8bca22f4`: `:325` sits inside
  `if (wasFromNextRow)` (`:322`); `placeBeside` is called only at `:158` under `:152`; `git grep` lists the list writes `:132`,
  `:328`, `:419` only; `RectRow` has no `equals` override. `plans/rectpacking-open-arm/evidence.md` § 2 L4 proves **I** without
  the flag. `.agent-notes/rectpacking-open-arm.md` names this issue as following from L4. Rejected: a search first, and a forged
  unit test (neither can yield a `U` row).
- **D2, mutant control on recorded inputs.** Evidence: #107's body (the two `staleParentRow` rows reached the arm until
  `e7eaea57`); the #81 mutant control (the line of #1239 removed) restored stale parent rows. Rejected: a forged call as the only
  control (it does not exercise the search's counters on a real path).
- **D4, a new ref file.** Evidence: tree-recorder-gaps D1 (#66); #156; the pinned counts at
  `plans/alg-packing/decision-journal.md:72`. Rejected: appending to `rectpacking.json`.
- **D3, append-only addendum and a planned `evidence.md`.** Evidence: CLAUDE.md ("never delete or rewrite" `plans/`); the #81
  addendum; the #81 `deviation` row that created `evidence.md`. Rejected: editing earlier rows of `unreached.md`.
- **D3, no upstream issue.** Evidence: the `fork-issue-standard` memory ("pure dead code is not filed", #51).
- **One executor, no subagents.** Sequential work over few files.
- **No `.claude/settings.autonomous.json`.** The queue driver supplies permissions.
