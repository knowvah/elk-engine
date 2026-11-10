<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Wrapping cut heuristics and graph statistics

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the wrapping cut heuristics and graph statistics`
Scratch: `$TMPDIR/7g/T6/`.

## Context

W1, W14. `J/intermediate/wrapping/{ICutIndexCalculator (66), ARDCutIndexHeuristic (67), MSDCutIndexHeuristic (121),
CuttingUtils (165), GraphStats (358)}.java`. `GraphStats` computes widths, heights and cut costs with `double` and integer
arithmetic: `int` through `Int32`, `(int)` casts through `d2i`, `Math.round` through the shim (translation rules). The classes
have no Java suite; they are proven by T1's `full/wrapping/*` and `models/*/BREAKING_POINT_INSERTER` and
`SINGLE_EDGE_GRAPH_WRAPPER` rows once T11 runs them, and here by unit tests whose literals come from the Java's own constants
or from rows (L4).

## Task

1. Port the five types under `src/alg/layered/intermediate/wrapping/` (interface as a TS interface plus the Java's static members
   if any; one class per file).
2. Tests: structure and branch tests that need no invented numeric literal (e.g. `CuttingUtils` on cut index lists given by
   the Java's `MANUAL` contract; `GraphStats` values asserted against a row's recorded layout widths after T11 is a T21 task).

## Write-set

`src/alg/layered/intermediate/wrapping/{GraphStats,ICutIndexCalculator,ARDCutIndexHeuristic,MSDCutIndexHeuristic,CuttingUtils}.ts`
(plus sections) and their `.test.ts` files.

## Read-set

The five Java files, `src/java/lang/{Int32,JavaMath}.ts`, `docs/translation-rules.md`, the wrapping options in
`src/alg/layered/options/LayeredOptions.ts` (`WRAPPING_*`), `decisions.md` W14.

## Acceptance criteria

- Given `npm run typecheck` and `npm run complexity`, when run, then both are clean.
- Given each `int` expression of the Java, when ported, then it uses the `Int32` ops (journal any deliberate `number` with the
  bound that makes it safe).
- Given a fresh process, when each module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A. Reversible.
