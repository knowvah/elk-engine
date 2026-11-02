<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Count audit and coverage record

**Agent:** main session · **Commit:** `docs(T9): record the 7c-tests coverage of the crossing-minimization classes`

## Task

1. **Count audit (stop 7).** Run `bash tools/oracle/java-tests.sh` over the fourteen suites and
   `npx vitest run --reporter=json` over the ported files; tabulate per suite Java runs vs TS passed, `@Ignore`
   methods × parameters vs TS skipped. Every row must agree with the [baseline](../decisions.md#baseline).
2. **Coverage (T9 decision).** Measure the 7c classes with the T9 include list of 7c
   (`plans/layered-crossing-min/unreached.md` header) over the ported suites plus
   `src/alg/layered/LayeredOrderVectors.test.ts`; diff the untaken arms against 7c's post-T11 list. Write
   `coverage.md`: totals before (7c after T12: replay + anchored cases) and now; the arms the suites newly reach,
   grouped by 7c category (U nested, U dead, unreached with mechanism, J); any 7c "dead by construction" arm a Java
   suite reaches is listed as a correction to 7c's classification (with the suite and test name), not edited into 7c's
   map.
3. If any T7 fix landed during batches 2–3, re-run the 813-row order replay and the stride-2 order sweep and record
   them in the journal.

## Write-set

`plans/layered-crossing-min-tests/coverage.md`.

## Acceptance criteria

- Given the audit table, when read, then every suite's counts match the baseline.
- Given `coverage.md`, when read, then every newly reached arm names the suite and test that reaches it, and the totals
  equal the measurement.

## Observability / Rollback

N/A. Reversible.
