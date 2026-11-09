<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17b — Anchored unit tests: comments, unzipper, debug utilities, visitor

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T17b): anchor comment, unzipper and debug tests on rows`
Scratch: a private subdirectory `<scratchpad>/T17b/`.

**Rules (F16).** Every behavioural literal is an oracle row or a twin comparison; a hand-derived expectation is stop 3.

## Context

Mission 7f2, G3, G5, G12, F12. Same pattern as T17a. Classes: `CommentPreprocessor`, `CommentNodeMarginCalculator`,
`CommentPostprocessor`, `AlternatingLayerUnzipper`, `DotDebugUtil`, `JsonDebugUtil`, `InteractiveLayeredGraphVisitor` (`DebugUtil` was
covered by T9's G11 rewrite and has three overloads only). The debug utilities compare through T2's `compareLogged` (DOT exact, JSON per
G3); the visitor through the two-run `interactive` op (G5).

## Task

1. For every S and J item of `unreached.md` in this task's classes: load the row, run it with the real classes, assert the field the
   branch decides with literals copied from the row, one case per row, `// oracle: <row id>; <Java file:line>`, existing cases untouched.
2. `DotDebugUtil`/`JsonDebugUtil`: cases for the segment-graph and hypernode overloads (`J/DotDebugUtil.java:128-157`,
   `J/JsonDebugUtil.java:145-190`), nested graphs (`:436`), `TARGET_OFFSET` edges (`:471`), `getValueRepresentation` for `PROCESSORS`
   (`:598`), `NORTH_SOUTH_PORT` names (`:641`); the strings are row literals, never hand-written (a J item with no row gets a
   structural case that asserts a property of the output, with the Java line).
3. `InteractiveLayeredGraphVisitor`: cases per `LayerConstraint` arm and `Direction` arm of `:107-118` and `:476-520`, the chain and circle
   helpers (`:781-835`, `:898-960`), from `interactive` rows.
4. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact.
5. Mutation check in a scratch copy for at least three anchored branches per class group (comments; unzipper; debug utilities; visitor);
   a row whose fields do not discriminate its arm gets a structural twin on internal state (with row literals).
6. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/intermediate/Comment{Preprocessor,NodeMarginCalculator,Postprocessor}*.test.ts`,
`src/alg/layered/intermediate/unzipping/**/*.test.ts`, `src/alg/layered/{DotDebugUtil,JsonDebugUtil,InteractiveLayeredGraphVisitor}*.test.ts`.

## Read-set

`plans/layered-labels/unreached.md`, the rows by id, the Java per branch, `test/helpers/layered-labels-replay-*.ts`,
`decisions.md` G3, G5, G12, F12, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given every S and J item here, when run, then a case cites its row or Java line and passes.
- Given three flipped branches per class group in a scratch copy, when run, then the matching case fails.
- Given the classes' coverage, when measured, then shortfalls are U-explained (stop 10 otherwise).

## Observability / Rollback

N/A — no new observable operations. Reversible.
