<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13a — Label suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T13a): port the layered label suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T13a/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks in a ported case; never relax an assertion
(stop 3). A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the CodeQL collapse rule). L4 applies.

## Context

Mission 7f2, G1, G8, F7, F8. Allocation: `plans/layered-pipeline/suite-allocation.md:25,26,22,41,45,49,66`. The runner is
`test/helpers/layout-test-runner.ts` (`defineLayoutTest`, 7f T11); label sizes come from `layered-label-metrics.json` through
`test/helpers/layout-test-labels.ts` (FX8: the Java framework sizes labels before layout; an unsized label makes overlap checks
vacuous). Inputs are vendored by T1 under `test/golden/inputs/**` (`$ELK_MODELS_DIR` only when `PIPELINE_SUITES_FULL=1`, F7); the
ptolemy suites use `PTOLEMY_GRAPHS` of `test/helpers/ptolemy-suite-sources.ts`, as the landed `NodeMarginCalculatorTest` does. Java
run counts: 550, 551, 4, 1, 1, 2, 2 (`java-baseline.md`; `Issue445Test` runs once).

## Task

1. `intermediate/LabelDummyRemoverTest.test.ts` from `JT/intermediate/LabelDummyRemoverTest.java:38-67` (`@DefaultConfiguration(edgeLabels
   = true)`, `@TestAfterProcessor(LabelDummyRemover.class) testRemovedNodes`, ptolemy `*.elkg`); `LabelSideSelectorTest.test.ts` from
   `JT/intermediate/LabelSideSelectorTest.java:47-116` (the `@Configurator` at `:69` switching every edge-label side selection,
   `testRemovedNodes` at `:105`); `EndLabelSorterTest.test.ts` from `JT/intermediate/EndLabelSorterTest.java:46-114`
   (`tests/layered/labels_ordering/**`, `testCorrectOrder` at `:64`).
2. `issues/Issue445Test.test.ts`, `Issue471Test.test.ts`, `Issue541Test.test.ts`, `Issue905Test.test.ts` from
   `JT/issues/Issue{445,471,541,905}Test.java`, through `defineLayoutTest` where the Java uses `LayoutTestRunner`, directly where it
   calls the provider. Hooks (`@TestAfterProcessor`) attach to the processor classes of T4a, T5, T6 by identity.
3. **Counts.** Each suite's case count equals `java-baseline.md` over the vendored scope; for the two ptolemy suites the vendored
   scope is the vendored ptolemy models (count stated in the file header and journaled). Attempt the full 550/551 once with
   `PIPELINE_SUITES_FULL=1` and `ELK_MODELS_DIR` and report the tally: a model whose plan names a 7g member fails naming `SelfLoop…`
   and 7g, reported and never skipped silently, and not a gate.
4. **Non-vacuity** lives in a separate `it` titled `(non-vacuity)` outside the ported cases: the hooked processor ran on at least one
   graph, and the labels the checks inspect have non-zero size. A missing label text: report it to the orchestrator (T3's append-only
   procedure); never edit the table from here.
5. A suite that throws naming 7g or 7h moves: one journal row, one correction row for `suite-allocation.md` through the orchestrator;
   report the tally against `java-baseline.md`.

## Write-set

`src/alg/layered/intermediate/{LabelDummyRemoverTest,LabelSideSelectorTest,EndLabelSorterTest}.test.ts`,
`src/alg/layered/issues/Issue{445,471,541,905}Test.test.ts`.

## Read-set

The seven Java suites, `test/helpers/{layout-test-runner,layout-test-labels,ptolemy-suite-sources}.ts`,
`src/alg/layered/issues/Issue587Test.test.ts` (the runner pattern), `plans/layered-pipeline/suite-allocation.md:17-30,41-66`,
`decisions.md` G8, F7, F8, F16.

## Architecture decisions

G1 (suites), G8 (metrics), F7 (runner, vendored scope), F8 (allocation), F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given each suite, when run, then every case passes and the count equals `java-baseline.md` (or the stated vendored scope).
- Given the independent reviewer's comparison with the Java, when read, then no assertion is added or dropped.
- Given `LabelSideSelectorTest`, when run, then each `@Configurator` value runs against sized labels.
- Given a suite that needs a later mission, when found, then it moved with a journal row, not a skip.

## Observability / Rollback

N/A — no new observable operations. Reversible.
