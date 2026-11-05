<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12c — Processor, full-layout and S1 suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12c): port processor and full-layout suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T12c/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks; never relax an assertion (stop 3).

## Context

Mission 7f, F7, F8, S1, the 7b/7c hand-offs. What remains after T12a and T12b, as the allocation places it.

## Task

Port, where the allocation places them here:

1. `JT/OverallLayoutTest.java` (4) → `src/alg/layered/OverallLayoutTest.test.ts`; `JT/intermediate/{InLayerConstraintProcessorTest,LongEdgeJoinerTest,NorthSouthPortPostprocessorTest,NodeMarginCalculatorTest,LabelAndNodeSizeProcessorOffsetTest}.java` → colocated. Corpus-driven suites (550 oracle runs) use the vendored inputs and `PIPELINE_SUITES_FULL=1`; state the scope in the header. `NodeMarginCalculatorTest` may need 7g (self loops), and label suites belong to 7f2: the allocation rules.
2. S1: `InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest` (`test/org.eclipse.elk.alg.common.test/.../nodespacing/`) → `src/alg/common/nodespacing/*.test.ts` (test files only, stop 1 otherwise).
3. Un-skip `LayeredSpacingTest.AfterLayoutTest.testSpacingNodeNodeBetweenLayers` (`src/alg/layered/LayeredSpacingTest.test.ts:105`) and add `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId` to `src/core/RecursiveGraphLayoutEngine.test.ts` (test file only; it needs a registered `LayeredMetaDataProvider`, as the Java does). Un-skipping or adding is not an assertion change; the assertion text stays the Java's.
4. Report the case count per suite against `java-baseline.md`.

## Write-set

The named test files, new colocated suites, test-local helpers new to this task.

## Read-set

The Java suites, `test/helpers/layout-test-runner.ts`, `src/alg/layered/LayeredSpacingTest.test.ts:25-40,100-125`, `src/core/RecursiveGraphLayoutEngine.test.ts:1-20`, `plans/layered-pipeline/suite-allocation.md`, `decisions.md` F7, F8, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given each allocated suite, when run, then every case passes and its count matches `java-baseline.md` for its stated scope.
- Given `AfterLayoutTest` and `testEmptyAlgorithmId`, when run, then they pass unskipped.
- Given a comparison with the Java, when reviewed, then no assertion is added or dropped.

## Observability / Rollback

N/A — no new observable operations. Reversible.
