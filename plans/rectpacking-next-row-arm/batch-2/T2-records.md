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
| all | `plans/alg-packing/unreached.md` (appended addendum only); `plans/alg-packing/decision-journal.md` (one appended row); `docs/conformance.md` (`:2279-2283`, a bullet after `:2414-2419`); `docs/architecture/alg-packing.md` (`:259-264`, `:547`); this mission's journal |
| D4 only | `tools/vectors/RectPackingVectors.java` (a second plan and output; existing plan untouched); `tools/vectors/rectpacking-vectors.sh` (header); `test/golden/refs/java/rectpacking-extra.json` (new, by script); `src/alg/rectpacking/RectPackingExtraVectors.test.ts` (new); `test/helpers/rectpacking-replay-rows.ts` (an optional file parameter, old default kept) |

Line numbers are from planning. Find the sentences by their text (`U` row 19, `#107`, `Dead arm (issue #81)`) if they moved.

## Steps

1. Append the addendum to `unreached.md` (D3 shape; for D4, an "arms closed by oracle evidence" row; for D5, the narrowed state).
   Check with `git diff plans/alg-packing/unreached.md | grep '^-'` that only the diff header lines print.
2. Append the closing row to `plans/alg-packing/decision-journal.md` (the `#81` row is the model). Same `grep '^-'` check.
3. Update the docs. For D3: the coverage sentences say `U` rows 19 and 20 close the bundle's open arms; a `**Dead arm (issue
   #107).**` bullet follows the #81 bullet in `docs/conformance.md`; the `alg-packing.md` issue-table row for #107 says
   "proven dead at the pin (`U` 20)". Use the D4 or D5 equivalent on those branches.
4. **D4 only.** Add the recorder plan and output, record by script (`uptime` first, `nice -n 10`), then `cmp` `rectpacking.json`
   against the base. Write the replay test and run it with the landed rectpacking tests
   (`npx vitest run src/alg/rectpacking test/helpers/rectpacking-replay-dump.test.ts`). Journal a `regen` row.
5. Run `npx prettier --check` on the changed files and `npm run docs:build`.
6. Comment on #107: the result, the lemma list (or the input), the counts, the mutant control and the path of the addendum.
   Leave the labels to the driver.
7. Commit: `docs(rectpacking): prove the next-row guards of compaction true` (D3), `test(rectpacking): record the next-row arm
   of #107 on the oracle` (D4), or `docs(rectpacking): narrow the next-row arm of compaction` (D5). Use
   `git -c commit.gpgsign=false commit -F <file>`.

## Acceptance criteria

- Given the branch D3, when T2 commits, then `unreached.md` ends with a `#107` addendum holding `U` row 20 with N1-N4 and their
  Java lines, and no earlier line of `unreached.md` or `plans/alg-packing/decision-journal.md` is changed or removed.
- Given the docs, when T2 commits, then `grep -n "#107" docs/architecture/alg-packing.md docs/conformance.md` finds no text that
  still asks for "an input or a proof". Under D5, the sentences say "narrowed".
- Given the branch D4, when the recorder runs twice cold, then `rectpacking-extra.json` is byte-identical across the runs,
  `rectpacking.json` is byte-identical to the base, and the new replay test passes with literal row counts.
- Given any branch, when T2 commits, then no non-test `src/` file is in `git diff --stat <base>`.

## Observability

N/A — no new observable operations; the journal rows and the #107 comment are the record.

## Rollback

Reversible: docs, plans text and, under D4, an additive ref, test and recorder plan. Reverting the commit restores the earlier
state.
