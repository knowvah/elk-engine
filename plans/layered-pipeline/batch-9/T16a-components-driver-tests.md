<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16a — Anchored unit tests: components and driver

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T16a): anchor components and driver tests on oracle rows`
Scratch: a private subdirectory `<scratchpad>/T16a/`.

**Rules (F16).** Every behavioural literal is an oracle row or a twin comparison; a hand-derived expectation is stop 3.

## Context

Mission 7f, F12, 6c D1. 7e's T14a is the pattern (`plans/layered-edge-routing/batch-8/T14a-router-tests.md`). Each colocated test gains cases whose literals equal a row, with `// oracle: <row id>; <Java file:line>`; J items get structural cases from the Java; U items get nothing. A scratch copy for mutation needs copies of `test/helpers` and `test/corpus`, not symlinks (`.agent-notes/layered-edge-routing.md`).

## Task

1. For every S and J item of `unreached.md` in this task's files: load the row through T3's loader, run it with the real classes, assert the field the branch decides with literals copied from the row, one case per row, existing cases untouched. Coordinates compare at AD-4, everything else exactly.
2. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact.
3. Mutation check in a scratch copy for at least three anchored branches per class group; a row whose fields do not discriminate its arm gets a structural twin on internal state (with row literals).
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/components/**/*.test.ts`, `src/alg/layered/{ElkLayered,GraphConfigurator}*.test.ts`.

## Read-set

`plans/layered-pipeline/unreached.md`, the rows by id, the Java per branch, `test/helpers/layered-pipeline-replay-*.ts`, `decisions.md` F12, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given every S and J item here, when run, then a case cites its row or Java line and passes.
- Given three flipped branches in a scratch copy, when run, then the matching case fails.
- Given the classes' coverage, when measured, then shortfalls are U-explained.

## Observability / Rollback

N/A — no new observable operations. Reversible.
