<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12a — Model-order suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12a): port the model order full-layout suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T12a/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks; never relax an assertion (stop 3).

## Context

Mission 7f, F7, F8, SC2, T8 of 7c-tests, the 7c hand-off. Allocation: `plans/layered-pipeline/suite-allocation.md`.

## Task

Port, where the allocation places them here:

1. `JT/intermediate/ConcreteSortByInputModelTest.java` (2,136 lines, 32 runs) → `src/alg/layered/intermediate/ConcreteSortByInputModelTest.test.ts`; the graph builders stay in the test or a test-local helper; split into sections to meet the file limit (a split in two agents is push-forward).
2. `JT/intermediate/AllowNonFlowPortsToSwitchSidesTest.java` (6 runs) → colocated.
3. `JT/p2layers/ModelOrderLayerAssignmentTest.java` (450 lines, 7 runs) → `src/alg/layered/p2layers/ModelOrderLayerAssignmentTest.test.ts`.
4. `JT/intermediate/PartitionTest.java` (5 runs), `JT/issues/Issue871Test.java` (3 runs) → colocated (`src/alg/layered/issues/`).
5. `SortByInputModelProcessorTest.test.ts`: add the `preserve_order` models the 7c recorder refused, only those without edge labels; models with edge labels are 7f2 (allocation row). Landed cases stay.
6. `PortListSorterTest.test.ts`: add `testMonotonicalCoordinates` (`@TestAfterProcessor(LongEdgeJoiner)`), the `@Configurator` of per-node `FIXED_ORDER` + `PORT_INDEX` (7c flag); update only the header comment that says it is not ported.

For the corpus-driven ones, state the vendored scope and the Java's run count in a header comment.

## Write-set

The named test files, test-local helpers under `test/helpers/` new to this task, `test/golden/inputs/**` additions (journaled, T1's `MODEL_TABLE` rule does not apply to inputs only a suite reads; the `algorithm-refs.test.ts` list is the orchestrator's edit).

## Read-set

The Java suites above, `test/helpers/layout-test-runner.ts`, `src/alg/layered/intermediate/SortByInputModelProcessorTest.test.ts:1-20`, `src/alg/layered/intermediate/PortListSorterTest.test.ts:1-20`, `plans/layered-pipeline/suite-allocation.md`, `decisions.md` F7, F8, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given each ported suite, when run, then every case passes and the case count matches `java-baseline.md` for its stated scope.
- Given a comparison with the Java, when reviewed, then no assertion is added or dropped.
- Given a landed test file, when diffed, then only additive cases and the named comment changed.

## Observability / Rollback

N/A — no new observable operations. Reversible.
