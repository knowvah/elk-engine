<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `GraphTransformer`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the direction graph transformer`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T5/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal;
a hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line;
everything else stays verbatim.

## Context

Mission 7f, F1, F5. `intermediate/GraphTransformer.java` (867 lines) is both `DIRECTION_PREPROCESSOR` and
`DIRECTION_POSTPROCESSOR` (`Mode` constructor argument, `:67`). Every non-RIGHT layout runs it first and last.

## Task

1. `src/alg/layered/intermediate/GraphTransformer.ts` (facade with `process`, `:72`, and the `Mode` nested type in a prefixed file per M15)
   and section modules for the mirror X (`:187-398`), mirror Y (`:399-588`) and transpose (`:589-867`) groups. Java overloads
   (`mirrorX(nodes, graph)`, `mirrorX(v, offset)`, `mirrorX(spacing)`, and their Y and transpose twins) get names per
   `alg-common.md` §6.5. Keep the private helpers' order and every branch.
2. Replay the `scenarios/GraphTransformer/*` and `models/*/DIRECTION_*` rows with the class injected.
3. Confirm no module-level read of an enum constant (F10); the `@see`s cite the Java file.

## Write-set

`src/alg/layered/intermediate/GraphTransformer*.ts` and their tests.

## Read-set

`J/intermediate/GraphTransformer.java`, `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts:55-62,235-240`, `docs/translation-rules.md`,
`test/helpers/layered-pipeline-replay-*.ts`, `decisions.md` F1, F5, F10, F16.

## Interface contract (consumed by T8)

`new GraphTransformer(mode)` where `mode` is the ported `Mode`; implements `ILayoutProcessor<LGraph>`.

## Acceptance criteria

- Given a `DIRECTION_PREPROCESSOR` or `DIRECTION_POSTPROCESSOR` row for each of LEFT, DOWN, UP, when replayed, then geometry and layer
  constraints equal the row within 1e-6.
- Given every `Mode` value and side, when the helpers run, then `getMirroredPortSideX`/`Y` and `transposePortSide` match the rows' port sides.
- Given `npm run complexity`, when run, then clean; every file under 500 lines.

## Observability / Rollback

N/A — no new observable operations. Reversible.
