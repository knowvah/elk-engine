<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16b — Anchored unit tests: processors

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T16b): anchor processor tests on oracle rows`
Scratch: a private subdirectory `<scratchpad>/T16b/`.

**Rules (F16).** Every behavioural literal is an oracle row or a twin comparison; a hand-derived expectation is stop 3.

## Context

Mission 7f, F12, 6c D1. Same procedure as T16a over `GraphTransformer`, `HierarchicalPortOrthogonalEdgeRouter`, `EndLabelSorter`, `HypernodesProcessor`, `ConstraintsPostprocessor`. `EndLabelSorter`'s sort body is U → 7f2 (no end labels before `EndLabelPreprocessor`) unless T13 lists it as S with a chain-forced row.

## Task

1. For every S and J item of `unreached.md` in this task's files: load the row, run it with the real classes, assert the field the branch decides with literals from the row, one case per row, existing cases untouched. Coordinates compare at AD-4, everything else exactly.
2. No `src/` non-test edit; a disagreeing literal is a stop with the diagnosis artifact.
3. Mutation check in a scratch copy for at least three anchored branches per class; a row whose fields do not discriminate its arm gets a structural twin.
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/intermediate/{GraphTransformer,HierarchicalPortOrthogonalEdgeRouter,EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.test.ts`.

## Read-set

`plans/layered-pipeline/unreached.md`, the rows by id, the Java per branch, `test/helpers/layered-pipeline-replay-*.ts`, `decisions.md` F12, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given every S and J item here, when run, then a case cites its row or Java line and passes.
- Given three flipped branches per class in a scratch copy, when run, then the matching case fails.
- Given the classes' coverage, when measured, then shortfalls are U-explained.

## Observability / Rollback

N/A — no new observable operations. Reversible.
