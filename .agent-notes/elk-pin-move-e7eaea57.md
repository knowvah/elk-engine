<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: ELK pin move 8aaa3c14 → e7eaea57 (issue #99, 2026-11-16)

Runbook: `docs/architecture/elk-upgrade.md`. Ruling: the maintainer comment of 2026-11-16 on #99.

## Observation: the "before" side lives outside both checkouts

- **Context**: runbook section 5 step 1, before the old oracle worktree is removed.
- **Finding**: copied to `~/git/knowvah/elk-upgrade-before/` (not `$TMPDIR`, which a reboot clears). The seven older
  phase sweeps' `results.jsonl` were in the main checkout, `loops` and `compound` in the queue worktree; corpus, elkt,
  elkj and label sizing under `../elk-oracle/sweep/`.
- **Impact**: sections 9 and 10 compare against that directory.
- **Confidence**: High

## Observation: Java line references shift in the changed files

- **Context**: porting the 13 changed Java files.
- **Finding**: upstream inserted lines mid-file in `InteractiveLayeredGraphVisitor.java` (+8 after old 525, +15 after
  old 874), both model order layerers (+2 imports, +25 after `monitor.done()`), `EndLabelSorter.java` (−1 after 193),
  `AreaApproximation.java` (+2 after 153) and `RecursiveGraphLayoutEngine.java` (+4 after 615). Every `<Name>.java:N`
  reference in `src/`, `test/` and `docs/` after those points was renumbered from the `git diff -U0` hunks (spot-checked
  line by line against both commits); references into a changed line were edited by hand. `plans/` keeps the old
  numbers (archaeology).
- **Impact**: a pin move that ports Java should renumber references in the same commit; issue #96's single-source sha
  does not cover this.
- **Confidence**: High

## Observation: a `pgrep -f` wait loop can match its own shell

- **Context**: chaining `elkj-sweep` to start when `elkj-vectors.sh` exits.
- **Finding**: `pgrep -f 'bash tools/vectors/elkj-vectors.sh'` inside a `bash -c` whose command line contained that
  same string returned the waiting shell's own pid, so `kill -0` never failed and the chain waited on itself.
- **Impact**: wait on a pid captured with `$!` when starting the job, or filter `$$` out of the `pgrep` result.
- **Confidence**: High

## Observation: ref-count assertions also live under `test/helpers/`

- **Context**: the coverage gate after re-recording `rectpacking.json` and `layered-phases.json`.
- **Finding**: besides the colocated `src/**` tests, `test/helpers/rectpacking-replay-dump.test.ts` and
  `test/helpers/layered-phase-replay-pre-state.test.ts` assert row counts of those refs. Running only the touched
  algorithm directories missed them.
- **Impact**: after a ref's row set changes, `git grep` the old counts across `src/` and `test/`, or run the full suite,
  before listing the AD-13 sites for the maintainer.
- **Confidence**: High
