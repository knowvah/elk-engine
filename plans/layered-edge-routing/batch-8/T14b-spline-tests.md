<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14b — Anchored unit tests: splines

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T14b): anchor spline tests on oracle routing rows`

## Context

As T14a (read its Context), for `src/alg/layered/p5edges/splines/**` and `FinalSplineBendpointsCalculator*`: the
`calls/*` rows (NURBS, geometry helpers, self-loop factories) and the `sites/*` rows of the spline router and the
calculator (segment summaries, bend points, `SLOPPY` arms, inverted-edge arms).

## Task

As T14a's steps 1–4 over this task's files; `calls` rows through `runCall` and `compareCall`, asserting the summary
field the branch decides (a control point, a knot, the outer box, a bend point).

## Write-set

`src/alg/layered/p5edges/splines/*.test.ts`, `src/alg/layered/intermediate/FinalSplineBendpointsCalculator*.test.ts`.

## Read-set

As T14a, for the spline classes; `src/alg/layered/p5edges/splines/*.ts` (T6–T8), `FinalSplineBendpointsCalculator*.ts`
(T9).

## Architecture decisions

R12, R14, 6c D1, X5.

## Acceptance criteria

As T14a, for the spline rows; per-class branch coverage of `NubSpline*`, `NubsSelfLoop`, `SplinesMath`, `Rectangle`,
`SplineSegment*`, `SplineEdgeRouter*`, `FinalSplineBendpointsCalculator*` ≥ 90 % or U-explained.

## Observability / Rollback

N/A. Reversible.
