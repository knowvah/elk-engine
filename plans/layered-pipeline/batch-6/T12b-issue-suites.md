<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12b — `Issue*` suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12b): port the layered issue suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T12b/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks; never relax an assertion (stop 3).

## Context

Mission 7f, F7, F8, R10's `Issue680/682`. Every `JT/issues/Issue*Test.java` the allocation assigns to this brief (planning's grep flagged
`Issue433/444/463/548/552/562` for self loops and `Issue316` for `INCLUDE_CHILDREN`, the plan dump decides). Each ticket's inputs are vendored by T1 and backed by `full/issues/*` rows.

## Task

1. `src/alg/layered/issues/IssueNNNTest.test.ts` per suite, through `defineLayoutTest` where the Java uses `LayoutTestRunner`, directly where it calls the provider; `Issue701Test` (541 lines, 6 runs) may hold its graphs in a test-local helper.
2. A suite that throws naming 7f2, 7g or 7h moves: one journal row, one correction row in `suite-allocation.md` through the orchestrator.
3. Report the final tally per mission against `java-baseline.md`.

## Write-set

`src/alg/layered/issues/**/*.test.ts` except `Issue587Test` and `Issue726Test`, test-local helpers new to this task.

## Read-set

The Java suites, `test/helpers/layout-test-runner.ts`, `src/alg/layered/issues/Issue587Test.test.ts`, `plans/layered-pipeline/suite-allocation.md`, `decisions.md` F7, F8, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given each allocated suite, when run, then every case passes and the count equals `java-baseline.md` (or a stated vendored scope).
- Given a comparison with the Java, when reviewed, then no assertion is added or dropped.
- Given a suite that needs a later mission, when found, then it moved with a journal row, not a skip.

## Observability / Rollback

N/A — no new observable operations. Reversible.
