<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13c — Hand-off suites: margin hooks, `preserve_order`, `testEdgesPointTowardsNextLayers`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T13c): close the label hand-offs of earlier suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T13c/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks; landed assertions stay frozen, new cases
are additions only (stop 3). L4 applies.

## Context

Mission 7f2, G1, G10, F7. Three hand-offs from earlier missions. (1) `NodeMarginCalculatorTest` has four hooks
(`JT/intermediate/NodeMarginCalculatorTest.java:63-79`); the landed port (`src/alg/layered/intermediate/NodeMarginCalculatorTest.test.ts`)
covers `InnermostNodeMarginCalculator` only and its header promises the `CommentNodeMarginCalculator` (`:73-74`) and
`EndLabelPreprocessor` (`:78-79`) hooks with 7f2, "using the same `testNodeMargins` body"; `SelfLoopRouter` stays 7g's.
(2) `SortByInputModelProcessorTest` (`JT/intermediate/SortByInputModelProcessorTest.java:43-`, `tests/layered/preserve_order/**`,
`@TestAfterProcessor(LayerSweepCrossingMinimizer.class)` at `:74`): 7c's port replays two label-free local graphs because all 15
models carry edge labels whose plans run `LABEL_DUMMY_INSERTER` (`.agent-notes/layered-crossing-min.md:51-57`); the models' node
names `l<layer>p<position>` count the label-dummy layers. (3) 7b found that on oracle-identical BF/DF model-order layerings
`testEdgesPointTowardsNextLayers` fails on 23 rows, a test the Java never runs on those layerers
(`.agent-notes/layered-cycles-layers.md:131-139`): can the full pipeline reproduce it (G10)?

## Task

1. In `NodeMarginCalculatorTest.test.ts` add two `afterProcessor` entries to the existing `defineLayoutTest`:
   `testNodeMarginsAfterCommentNodeMarginCalculator` (`cls: CommentNodeMarginCalculator`) and
   `testNodeMarginsAfterEndLabelPreprocessor` (`cls: EndLabelPreprocessor`), both `check: testNodeMargins`; update the header prose
   (scope and count) only. Journal which hooks fire over the vendored `PTOLEMY_GRAPHS` scope (no `@FailIfNotExecuted` in the Java,
   so a hook that never fires passes, as in the Java); the existing Innermost entry is untouched.
2. In `SortByInputModelProcessorTest.test.ts` add a new `describe` that runs the Java method over the 15 vendored
   `tests/layered/preserve_order/**` models (T1 vendors them; `test/golden/inputs/**`) through `defineLayoutTest` with the Java's
   configuration (`CROSSING_MINIMIZATION_STRATEGY = LAYER_SWEEP`, `CONSIDER_MODEL_ORDER_STRATEGY = NODES_AND_EDGES`),
   `@TestAfterProcessor(LayerSweepCrossingMinimizer)`, the Java assertion body: 15 cases. The two existing local-graph cases stay.
   Update the header's "no rows" paragraph (prose only).
3. **The 7b question (no committed test, the Java has none).** In scratch, run the full pipeline through the runner over the models of
   the 23 failing 7b rows, with `layering.strategy` BF_MODEL_ORDER and DF_MODEL_ORDER, hooking the layerer and applying the body of
   `JT/p2layers/BasicLayerAssignmentTest.java`'s `testEdgesPointTowardsNextLayers`. Hand back: reproduces or not, the failing
   models, and the Java mechanism traced to a `file:line` in `J/p2layers/` if reproduced (diagnosis artifact: mechanism, origin,
   causal chain, ruled out). T18 turns a reproduction into an issue report; nothing is filed (stop 22).
4. Counts: item 2 gives 15 cases; item 1 gives the vendored-scope case counts per hook, stated in the header.
5. Missing label texts go to the orchestrator (T3's append-only procedure), never into the table from here.

## Write-set

`src/alg/layered/intermediate/{NodeMarginCalculatorTest,SortByInputModelProcessorTest}.test.ts` (new cases and header prose only);
scratch only for item 3.

## Read-set

`JT/intermediate/{NodeMarginCalculatorTest,SortByInputModelProcessorTest}.java`, `JT/p2layers/BasicLayerAssignmentTest.java`,
the two landed test files, `test/helpers/{layout-test-runner,ptolemy-suite-sources}.ts`, `.agent-notes/layered-crossing-min.md:51-57`,
`.agent-notes/layered-cycles-layers.md:131-139`, `decisions.md` G1, G10, F7, F16.

## Architecture decisions

G1 (hand-offs), G10 (the report is T18's, the question is answered here), F7 (runner), F16.

## Interface contract (consumed by T18)

The hand-back states the reproduction answer and, if yes, the diagnosis artifact.

## Acceptance criteria

- Given the two new hook entries, when run, then they pass over the vendored scope and the journal says which hooks fire.
- Given the 15 `preserve_order` models, when run, then all 15 cases pass with the Java's assertion.
- Given the landed assertions of both files, when diffed, then none changed.
- Given the 7b question, when answered, then the hand-back says reproduced or not with the evidence.

## Observability / Rollback

N/A — no new observable operations. Reversible.
