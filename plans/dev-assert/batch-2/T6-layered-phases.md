<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: restore asserts in the layered phases, graph, compound, components and options

## Context

Part of #45. A `devAssert` helper (`src/java/lang/DevAssert.ts`) now exists. Assertions are off in production and on in
the test suite. This lane restores the omitted Java `assert` statements in `src/alg/layered/` outside `intermediate/`.
Two kinds of site need supporting code (D5.3). The `ThresholdStrategy` asserts read `EPSILON`
(`ThresholdStrategySimpleThresholdStrategy.ts:17` says it was dropped with them), and `ForsterConstraintResolver`
tracks `lastValue` only for its assert (`ForsterConstraintResolver.ts:289`). Follow the
[shared rules](overview.md#shared-rules-every-lane-pass-this-section-with-the-task-file) and
[D5](../decisions.md#d5-site-convention).

## Write-set

`src/alg/layered/**` outside `src/alg/layered/intermediate/` (non-test files): `p1cycles/`, `p3order/` (with
`counting/`), `p4nodes/` (with `bk/`), `p5edges/` (with `orthogonal/`, `splines/`), `graph/` (with `transform/`),
`compound/`, `components/`, `options/`.

## Read-set

The lane's T6 rows of `plans/dev-assert/inventory.md`; the Java files they cite. At planning: the four cycle breakers,
`ForsterConstraintResolver` ×4, `CrossingsCounter`, `SweepCopy.java:140`, `ThresholdStrategy` ×3 (`:373`, `:395`,
`:403`), `NetworkSimplexPlacer` ×2 (`:1131` and the `fuzzyEquals` one), `LinearSegmentsNodePlacer` ×2 (`:292`, `:798`),
`NubsSelfLoop` ×3 (`:239`, `:273`, `:305`), `SplineEdgeRouter.java:582`, `HyperEdgeSegmentSplitter.java:440`,
`HyperEdgeCycleDetector`, `LGraphUtil` ×2, `LNode`, layered `ElkGraphImporter` ×4 (`graph/transform/`),
`CompoundGraphPreprocessor.java:513`, `ComponentsCompactor`, the three graph placers, `LayeredSpacings` ×2,
`EdgeLabelSideSelection`.

## Acceptance criteria

- Given each T6 row, when the lane is done, then its status is `restored`, `restored (throw kept)` or
  `not-portable: <reason>`.
- Given the `ThresholdStrategy` and `ForsterConstraintResolver` sites, when restored, then their supporting constant or
  local is ported from the Java and read only by the thunk.
- Given `npx vitest run src/alg/layered test/golden` with assertions on, then it is green, or every failure is reported
  with the site and values.
- Given `npm run typecheck` and `npm run complexity`, then both are clean.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the lane commit.
