<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: delete STRESS_PENDING; both suites run every case (ruling item 1, D2, D3, D7)

## Context

Both suites build their sources through `withoutStressPending` (`test/helpers/stress-pending.ts`). The ruling
authorises deleting that helper and its pin test. The suites keep the Java's assertions unchanged.

## Read-set

`src/alg/layered/issues/Issue665Test.test.ts`, `Issue700Test.test.ts`, `Issue628Test.test.ts:20-24` (the twin pattern),
`test/helpers/stress-pending.ts`, the Java `Issue665Test.java` and `Issue700Test.java` under
`$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/`,
`plans/layered-compound/java-baseline.md:17-18`.

## Write-set

- Delete `test/helpers/stress-pending.ts` and `test/helpers/stress-pending.test.ts`.
- `Issue665Test.test.ts`: inline `GRAPHS` as D2 describes: `{ path: 'compound/tickets/layered/**', filter: /665.+\.elkt/ }`
  and `{ path: 'tickets/layered/**', filter: /665.+\.elkt/ }`. Drop the `it.skip` branch and call `defineLayoutTest(SPEC)`.
  Add a count test of 1 (D3). Rewrite the H13 header paragraph to state the current behaviour and cite #58's ruling.
- `Issue700Test.test.ts`: inline the three Java sources and their `compound/` twins (six entries, as in
  `ISSUE700_GRAPHS` plus `vendored`). Change the count test and `seen.runs` from 2 to 4, and its title to "runs 4 cases
  (the oracle runs)". Rewrite the header paragraph. `testEdgeRouted`/`testEdgesRouted` stay byte-identical.

## Steps

1. Make the edits. `grep -rn "stress-pending\|STRESS_PENDING" src test tools` must find nothing.
2. Default mode: `npx vitest run src/alg/layered/issues/Issue665Test.test.ts src/alg/layered/issues/Issue700Test.test.ts`
   gives 1 + 1 (count) and 4 + 2 (count, non-vacuity) passing, none skipped.
3. D7 modes: rerun with `PIPELINE_SUITES_FULL=1`, then with `PIPELINE_SUITES_FULL=1 ELK_TEST_TEXT_MEASURER=fixed`. Both
   give the same counts, all passing. The fixed mode checks the same counts, though non-vacuity values may differ.
4. Oracle (D7): `uptime` must be at most 12 (wait otherwise). Then, detached, under `nice -n 10`:
   `tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.issues.Issue665Test org.eclipse.elk.alg.layered.issues.Issue700Test`.
   It must give `runs=1 failures=0` and `runs=4 failures=0` (stop 6 otherwise). First check that `oracle-build.json`
   still names the pin and 0001-0004.
5. A failing case in step 2 or 3 is stop 3: diagnose, never restore the filter. Journal the D3 count change as
   ruling-authorised.

## Acceptance criteria

- Given the deleted helper, when the repository is grepped, then no `STRESS_PENDING` or `stress-pending` reference
  remains outside `plans/` and the dated docs D6 keeps.
- Given the default vendored inputs, when both suites run, then `Issue665Test` runs 1 layout case and `Issue700Test` 4,
  all passing, with the Java assertions unchanged.
- Given `PIPELINE_SUITES_FULL=1`, with and without the fixed measurer, then the same 1 and 4 cases pass.
- Given the oracle, when `java-tests.sh` runs both classes, then the counts are 1/0 and 4/0, equal to TS's.

## Observability

N/A. Evidence: the vitest summaries of the three modes and the two `java-tests.sh` lines, in the journal.

## Rollback

Reversible: revert the commit, which restores the filter files from history.
