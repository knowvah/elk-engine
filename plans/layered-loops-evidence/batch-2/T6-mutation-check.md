<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: rerun the ten mutants against the recorded rows

## Context

[D1](../decisions.md#d1) fixes the mutant set (M1-M10 in [mutants.md](../mutants.md)), the kill suite and the scratch
method. [D4](../decisions.md#d4) fixes the proof standard.

## Task

1. Build the scratch copy `$TMPDIR/layered-loops-evidence/mutants/` from the T5 tree. Write the driver there:
   - apply one mutant by exact-string replacement, and fail if the anchor does not match exactly once;
   - run the kill suite with the nine sweep dirs set to `/nonexistent`;
   - restore the file and log the failing test titles.
   First run a sanity mutant that a landed row is known to kill (any T21-killed edit), to prove the copy sees its edits.
2. Run M1-M10. A mutant is `killed` if any kill-suite test fails. Record which row's test failed.
3. For each surviving mutant:
   - If T2/T3 handed back a proof draft, finish it to the D4 standard. Run the oracle probes it names with single-file
     `java` programs under `$TMPDIR`, journal their output, and classify it `equivalent`.
   - Otherwise classify it `open` with the shapes tried.
4. Fill the Verdicts table of `mutants.md`. Write the `equivalent` proofs and the `open` summaries into the "Mutant
   proofs" section of `unreached.md`.
5. If any mutant is `open`, file one `needs-ruling` issue (stop 4) naming each open mutant, the file:line, the
   candidates tried and the partial argument, and link it from `mutants.md`.
6. Commit: `docs(plans): record the 7g mutant verdicts`.

## Write-set

`plans/layered-loops-evidence/mutants.md`, `plans/layered-loops-evidence/unreached.md` (the "Mutant proofs" section
only). Scratch: `$TMPDIR/layered-loops-evidence/mutants/`.

## Read-set

[mutants.md](../mutants.md); the T2/T3 hand-backs; `plans/layered-loops-wrapping-compaction/decision-journal.md` (T21
rows: method precedent).

## Acceptance criteria

- Given the sanity mutant, when the driver runs it, then the kill suite fails (the copy sees edits).
- Given M1 and M2, when the driver runs them, then each is `killed` by a new row's replay test.
- Given every other mutant, when T6 ends, then it is `killed`, `equivalent` with a D4 proof whose oracle facts are
  journaled, or `open` and listed in the `needs-ruling` issue.

## Observability

N/A: test evidence only.

## Rollback

Reversible: revert the two plan files. Close the issue if it was filed in error.
