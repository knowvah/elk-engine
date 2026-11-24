<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: record the result

**Owner:** orchestrator. **Budget:** 40 min (D3 or D5), 90 min (D4, recorder included).

## Context

T1's `result` row names the branch. The records per branch are fixed by
[D3](../decisions.md#d3-where-a-proof-is-recorded), [D4](../decisions.md#d4-if-the-proof-breaks-record-the-input-in-a-new-ref-file)
and [D5](../decisions.md#d5-if-neither-holds-within-the-budget).

## Write-set

| Branch | Files |
| ------ | ----- |
| all | `plans/alg-packing/unreached.md` (appended addendum only); `plans/alg-packing/decision-journal.md` (one appended row); `docs/conformance.md` (`:2279`, `:2403-2404`); `docs/architecture/alg-packing.md` (`:23`, `:260`, `:534`); this mission's journal |
| D4 only | `tools/vectors/RectPackingVectors.java` (a second plan and output; existing plan untouched); `tools/vectors/rectpacking-vectors.sh` (header); `test/golden/refs/java/rectpacking-extra.json` (new, by script); `src/alg/rectpacking/RectPackingExtraVectors.test.ts` (new); `test/helpers/rectpacking-replay-rows.ts` (an optional file parameter, old default kept) |

Line numbers are from planning. Find the sentences by their text (`Compaction.java:364`, `#81`) if the lines have moved.

## Steps

1. Write the addendum to `unreached.md` (D3 shape; for D4, an "arms closed by oracle evidence" row; for D5, the narrowed state).
   Check with `git diff plans/alg-packing/unreached.md | grep '^-'` that no earlier line changed. The output must be empty, apart
   from the file header lines of the diff.
2. Append the closing row to `plans/alg-packing/decision-journal.md` (the `#76` row at `:82` is the model). Run the same `grep '^-'`
   check.
3. Update the five doc sentences. For D3, `conformance.md` § "Open arm" becomes a closed statement that points at `U` row 19. The
   `alg-packing.md` issue table row for #81 says "proven dead at the pin (`U` 19)", or the D4 or D5 equivalent.
4. **D4 only.** Add the recorder plan and output, record by script (`uptime` first, `nice -n 10`), then `cmp` `rectpacking.json`
   against the base. Write the replay test and run it, together with the landed rectpacking tests
   (`npx vitest run src/alg/rectpacking test/helpers/rectpacking-replay-dump.test.ts`). Journal a `regen` row.
5. Run `npx prettier --check` on the changed files and `npm run docs:build`.
6. Comment on #81 with the result, the lemma list (or the input), the counts and the path of the addendum.
7. Commit: `docs(rectpacking): prove the open compaction arm dead at the pin` (D3), or `test(rectpacking): record the compaction
   arm of #81 on the oracle` (D4), or `docs(rectpacking): narrow the open compaction arm` (D5). Use
   `git -c commit.gpgsign=false commit -F <file>`.

## Acceptance criteria

- Given the branch D3, when T2 commits, then `unreached.md` ends with an addendum holding `U` row 19 with L1-L5 and their Java
  lines. No earlier line of `unreached.md` or of `plans/alg-packing/decision-journal.md` is changed or removed.
- Given the docs, when T2 commits, then `grep -n "neither reached nor proven dead\|Open arm" docs/conformance.md
  docs/architecture/alg-packing.md` finds no sentence that still calls `Compaction.java:364` open. Under D5, the sentences say
  "narrowed".
- Given the branch D4, when the recorder runs twice cold, then `rectpacking-extra.json` is byte-identical across the two runs,
  `rectpacking.json` is byte-identical to the base, and the new replay test passes with literal row counts.
- Given any branch, when T2 commits, then no non-test `src/` file is in `git diff --stat <base>`.

## Observability

N/A beyond the journal rows and the #81 comment.

## Rollback

Reversible: docs, plans text and, under D4, an additive ref, test and recorder plan. Reverting the commit restores the earlier
state.
