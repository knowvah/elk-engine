<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Issue suites, `NodeMarginCalculatorTest` hook, corpus-wide runs

**Agent:** test-automator (sonnet) · **Commit:** `test(T17): port the self-loop issue suites and run the corpus suites`
Scratch: `$TMPDIR/7g/T17/`.

## Context

W8, W9. `JT/issues/Issue{433 (72), 444 (59), 463 (57), 870 (57)}Test.java` lay out `tickets/layered/{433_graphSizeWithSelfLoopLabel,
444_selfLoopsNPE,463_aioobe_with_self_loops,870_networkSimplexNodePlacer}` (vendored by T1 under `test/golden/inputs/loops/`)
through F7's runner subset (`test/helpers/layout-test-runner.ts`). 433 has a self-loop label: a missing label text is stop 20's
push-forward (append under G8's proof). `NodeMarginCalculatorTest.test.ts` scopes out its `SelfLoopRouter` hook (header lines 8–15).

## Task

1. Port the four issue suites to `src/alg/layered/issues/` with the Java's assertions.
2. `NodeMarginCalculatorTest.test.ts`: add the `SelfLoopRouter` `@TestAfterProcessor` hook and the self-loop model of N1 to the
   vendored scope; the header's exclusion text changes (W9, journaled with old and new). Measure on how many vendored models the
   hook fires, as the header does for the other hooks.
3. Corpus-wide runs (W8): `PIPELINE_SUITES_FULL=1 ELK_MODELS_DIR=… npx vitest run` over `InLayerConstraintProcessorTest`,
   `LongEdgeJoinerTest`, `NodeMarginCalculatorTest`, `LabelDummyRemoverTest`, `LabelSideSelectorTest`: 0 failures (195 + 132
   failed before, all on `SelfLoopPreProcessor`); journal the counts. A failure: diagnosis mode, fix at origin through the
   orchestrator.

## Write-set

The four issue suites, `NodeMarginCalculatorTest.test.ts` (and `layout-test-labels` texts only under stop 20's push-forward).

## Read-set

The four Java suites, `JT/intermediate/NodeMarginCalculatorTest.java`, `test/helpers/layout-test-runner.ts`,
`ptolemy-suite-sources.ts`, an existing issue suite (`src/alg/layered/issues/Issue445Test.test.ts`), `decisions.md` W8, W9.

## Acceptance criteria

- Given each issue suite, when run, then it passes with the Java's assertions; its case count equals [java-baseline.md](../java-baseline.md).
- Given `NodeMarginCalculatorTest`, when run, then the `SelfLoopRouter` hook runs on at least one vendored model.
- Given the five corpus-wide runs, when run with `PIPELINE_SUITES_FULL=1`, then 0 failures.

## Observability / Rollback

N/A. Reversible.
