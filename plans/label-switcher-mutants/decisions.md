<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: label-switcher-mutants (issue #48)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D7 were auto-confirmed at
planning (unattended run, 2026-11-19). The evidence and the rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. A fixed, reproducible mutant set replaces the lost A-labels

[mutants.md](mutants.md) M1-M18 is the mutant set: one single-token or single-statement edit per decision point of
`LabelDummySwitcherSpaceEfficient.ts`, which covers every comparison, every loop bound, every initial value, the
comparator and both early exits. Done means every M is `killed` or `equivalent` (D6). This set contains any
single-edit mutant 7f2 could have labelled A3/A6/A7/A9/A10, so killing it satisfies #48. If T1 finds a decision point
the table misses, T1 adds `M19+` rows (push-forward).

## D2. Kill suite

The kill suite is `src/alg/layered/intermediate/LabelDummySwitcher*.test.ts` plus
`src/alg/layered/LayeredLabelsVectors.test.ts`, which replays every labels row, including the new sites rows, through
the real pipeline. Run it with the nine sweep dirs set to `/nonexistent`. No other suite counts toward a kill, so that
T3's rerun is cheap and repeatable.

## D3. Mutation runs happen in a scratch copy

As at 7f2: copy the repository to `$TMPDIR/lsm-mutants/` (`rsync -a --exclude .git --exclude coverage`, with
`node_modules` symlinked), apply one mutant, run D2 there, and restore. A small driver script under `$TMPDIR` applies
each row by exact-string replacement and fails loudly if its anchor text does not match exactly once. The worktree is
never mutated. Keep the driver and its log under `$TMPDIR`, quote the log's summary in the journal, and commit neither.

## D4. New rows are sites rows in the labels recorder, appended to the landed ref

Add `site(...)` calls to `labelSites()` in `tools/vectors/LayeredLabelsVectors.java`, after Sc13, with ids
`sites/LabelDummySwitcher/spaceEfficient-<arm>` (siblings of the landed id, never children of it), options
`edgeLabels.centerLabelPlacementStrategy=SPACE_EFFICIENT_LAYER`, and the stop `LABEL_DUMMY_SWITCHER` as Sc13 has. Use
as few rows as kill every killable mutant: one row may serve several mutants.

The ref `test/golden/refs/java/layered-labels.json` is the one ref this brief names (queue gate 7). The change is
**append-only**: a script compares every pre-existing row by id, byte for byte, against the base. `full`, `models`
and `scenarios` must be identical, and the old sites rows too. Only `rowCounts.sites` and the new rows may differ. The
file stays under the recorder's 16 MiB cap (14,315,720 bytes at planning).

The assertion `expect(header.rowCounts).toEqual({ … sites: 42 })` (`LayeredLabelsVectors.test.ts:123`) counts the
ref's own header, which the oracle recorder writes. This brief names that one literal: it becomes the header's new
value. The change is journaled as kind `ad13` with old and new values, following layered-compound T14's precedent.
No other existing assertion changes.

## D5. Anchored cases: new cases in `LabelDummySwitcherSites.test.ts`

For each new row, add a `describe` that asserts the recorded layer of every label dummy, with literals copied from the
row and a comment naming the row and the Java line. Where a mutant changes only the order or the target of
`assignLayer` calls, so that the layers dump does not discriminate it, add a spy twin on `assignLayer` (the T17a
pattern in the same file), with row literals. Existing cases stay as they are. No assertion the Java lacks.

## D6. Proof standard for `equivalent`

A mutant is `equivalent` only with an argument from the code that holds for **every** input. Example: M1, where an
empty list makes the sort and the loop no-ops. An argument that rests on a runtime fact is valid only after that fact
is shown on the oracle. Planning's open fact: `Layer.getSize().x` is 0 when `LABEL_DUMMY_SWITCHER` runs, because Java
writes layer sizes only in phase 4/5 (`LGraphUtil.java:267`, `SimpleNodePlacer.java:70,86`). If so,
`assignToWiderLayer` (`:455-480`) assigns only labels of width ≤ 0. T1 shows this with an instrumented oracle run, a
single-file `java` probe on the oracle classpath that prints each layer's `getSize().x` and each label dummy's width at
the processor's entry, before M5/M6/M7 are classified. "No recorded row distinguishes it" is never a proof: that was
7f2's state.

## D7. No `src/` change unless a port defect is diagnosed

The mission adds rows and tests. If a new row does not replay, diagnosis mode applies: instrument the oracle and the
port, and find where the port first departs from the oracle. A fix in `LabelDummySwitcher*.ts` is allowed only with the
full artifact (mechanism, origin, causal chain, ruled out) and stays Java-faithful. See stop 5.

## Auto-confirmed (unattended)

Recorded by `/plan-mission --unattended` on 2026-11-19. Evidence was retrieved during this run.

- **D1.** Rejected: (a) reconstructing A3/A6/A7/A9/A10. The labels appear only in
  `plans/layered-labels/decision-journal.md:91` ("A3, A6, A7, A9, A10 … survive"). The T17a brief
  (`batch-8/T17a-label-anchored-tests.md:27`) names no mutant list, and the scratch copy was not kept, so the labels
  cannot be recovered. (b) Parking #48 for a ruling on what "those five" means. D1's superset satisfies the stated
  done criterion for any reading of the labels, so no ruling is needed.
- **D2.** Rejected: running the full suite per mutant. 18 mutants × ~120-230 s is too slow, and only these files reach
  the class (`unreached.md:153` lists the site row as the class's only `SPACE_EFFICIENT_LAYER` evidence).
- **D3.** Rejected: StrykerJS. It would be a new devDependency (licence review, YAGNI), and the project's precedent is
  scratch copies (7f, 7f2, 7g).
- **D4.** Rejected: (a) a new scenario under `test/golden/inputs/labels/`. It needs a vendored input and an update to
  the recorder's SHA-256 table, and it still changes `rowCounts.scenarios`. Sites rows are T16's shape for exactly this
  strategy (Sc13). (b) A separate ref file. That needs a new loader path and splits one recorder's output. The
  `rowCounts` literal change is unavoidable once #48's "add the replay rows" is followed. #48 asks for the rows, the
  value comes from the oracle's header, and the append-only proof keeps every other expected value frozen.
- **D5.** Follows T17a's pattern in the same file (`LabelDummySwitcherSites.test.ts:54-104`).
- **D6.** From diagnosis rules and 7f2's journal ("equivalent on the one row" is a row limitation, not an
  equivalence). The layer-size fact is Medium confidence from reading the Java (grep for layer `getSize()` writes) and
  must be checked on the oracle before anything relies on it.
- **D7.** CLAUDE.md "The Java Is Sacred" and the queue's diagnosis rule.
