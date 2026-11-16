<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Wire the 9 arms; unstage; unpin

**Agent:** typescript-pro (sonnet), reviewed by the orchestrator · **Commit:** `feat(T15): wire the self-loop, wrapping and compaction arms`
Scratch: `$TMPDIR/7g/T15/`.

## Context

W4, W9, W13, W14 (F10's E1 recipe). `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts:97,123,153,159,163,181,229,231,235`
throw `notPorted(<Class>, '7g')` for `SELF_LOOP_PREPROCESSOR`, `BREAKING_POINT_INSERTER`, `BREAKING_POINT_PROCESSOR`,
`SELF_LOOP_PORT_RESTORER`, `SINGLE_EDGE_GRAPH_WRAPPER`, `SELF_LOOP_ROUTER`, `SELF_LOOP_POSTPROCESSOR`, `BREAKING_POINT_REMOVER`,
`HORIZONTAL_COMPACTOR`. Staged files (W13): `components/ComponentsCompactor.ts`, `intermediate/loops/{SelfLoopEdge,SelfLoopHolder,SelfLoopPort}.ts`,
`intermediate/wrapping/{BreakingPointInserter,BreakingPointInserterBPInfo}.ts`, each with `// @staged 7g` on line 2 and a row in
`test/architecture/staged-classes.json`.

## Task

1. Replace the nine throws with the constructors (E1: the enum's `create` chain imports the classes; no entry-order import).
2. Remove the six markers and the six registry rows together.
3. Append the new classes to `test/architecture/layered-entry-points.fitness.test.ts` (fresh-process import of each).
4. W9's T15 changes, each journaled as an `ad13` row with old and new:
   - `IntermediateProcessorStrategy.test.ts`: the 9 arms ported; tally 58 ported, 1 pending (7h);
   - `test/helpers/layered-pipeline-pinned-rows.ts`: delete the `ptolemy-sinewaveoptimization` entry (and the now-unused
     constant) — W4; `LayeredPipelineVectors.test.ts` `pins exactly the 1 models row of FX7` → 0 (title and count);
   - `ComponentsProcessor.test.ts:356-379`: the staged-compactor throw becomes a comparison of the combined graph with the
     matching `layered-loops.json` row (or, if no row stops there, an assertion that `combine` completes and the graph equals
     a `full/components-compaction/*` row after the pipeline); no hand-derived literal;
   - `layout-test-runner.test.ts:189-201`: the `SelfLoopPreProcessor … 7g` throw becomes a completed run of the self-loop graph
     (the test's title changes to say so).
5. Run the formerly pinned row: it must replay its recorded expectation from the landed `layered-pipeline.json`. A mismatch:
   diagnosis mode at the 7g classes first (port defect); a non-port mechanism is stop 19.

## Write-set

As the batch table; nothing else without a journal row (driver rule).

## Read-set

`IntermediateProcessorStrategyCreate.ts`, `IntermediateProcessorStrategy.test.ts:110-180`, `test/architecture/staged-classes.json`,
`layered-entry-points.fitness.test.ts`, the four test files above at the cited lines, `.agent-notes/layered-labels.md` (marker on
line 2), `decisions.md` W4, W9, W13.

## Acceptance criteria

- Given `npx vitest run test/architecture`, when run, then the staged-classes and entry-point tests pass with no 7g row.
- Given `IntermediateProcessorStrategy.test.ts`, when run, then only `HIERARCHICAL_NODE_RESIZER` throws (naming 7h).
- Given `LayeredPipelineVectors.test.ts`, when run, then all rows replay, the formerly pinned row included, and 0 rows are pinned.
- Given `env $SWEEPS npm test`, when run, then green; no assertion outside W9's list changed (`git diff` reviewed by the
  orchestrator).

## Observability / Rollback

N/A. Reversible.
