<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: restore asserts in core, grandom, alg.common, mrtree, force

## Context

Part of #45. A `devAssert` helper (`src/java/lang/DevAssert.ts`) now exists. Assertions are off in production and on in
the test suite. This lane restores the omitted Java `assert` statements whose TS port lives under its directories.
Follow the [shared rules](overview.md#shared-rules-every-lane-pass-this-section-with-the-task-file) and
[D5](../decisions.md#d5-site-convention).

## Write-set

`src/core/**`, `src/alg/common/**`, `src/alg/mrtree/**`, `src/alg/force/**` (non-test files only).

## Read-set

The lane's T3 rows of `plans/dev-assert/inventory.md`; the Java files they cite. Known sites at planning:
`KVector.java` (TS `KVector.ts:290`), `BoxLayoutProvider.java` ×2 (`BoxLayoutProviderGroup.ts:66,80`), `ElkSpacings.java`
×2 (`ElkSpacingsElkCoreSpacingsBuilder.ts`, § 6.8 cites `ElkSpacings.java:80`), `AbstractNormalizedMatcher.java`
(`AbstractNormalizedMatcher.ts:76`), `InstancePool`, `ElkUtil`, `BasicProgressMonitor`, grandom `RandomGraphGenerator` and
`GeneratorOptions`, `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`,
`PortLabelPlacementCalculator.java:208` (the three "stays a comment (NS5)" sites; NS5 is superseded by this mission),
`RectangleStripOverlapRemover`, mrtree `RootProcessor.java` (`RootProcessor.ts:54`), force `StressMajorization.java:213`
(`StressMajorization.ts:224`).

## Acceptance criteria

- Given each T3 row, when the lane is done, then its status is `restored`, `restored (throw kept)` or
  `not-portable: <reason>`.
- Given `npx vitest run src/core src/alg/common src/alg/mrtree src/alg/force test/golden` with assertions on, then it is
  green, or every failure is reported with the site and values.
- Given `npm run typecheck` and `npm run complexity`, then both are clean.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the lane commit.
