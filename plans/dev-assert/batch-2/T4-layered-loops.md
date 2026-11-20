<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: restore asserts in the layered self-loop package

## Context

Part of #45. A `devAssert` helper (`src/java/lang/DevAssert.ts`) now exists. Assertions are off in production and on in
the test suite. This lane restores the omitted Java `assert` statements under `intermediate/loops/`. Most are
`assert false` arms of switches over port or label sides (D5.4). Three in `OrthogonalSelfLoopRouter.ts` (lines 200, 283,
396) and one in `OrthogonalSelfLoopRouterSlotPositions.ts:119` already throw an `Error` in place of `assert false;
return …`. Keep each throw after the new `devAssert` (`restored (throw kept)`). Follow the
[shared rules](overview.md#shared-rules-every-lane-pass-this-section-with-the-task-file) and
[D5](../decisions.md#d5-site-convention).

## Write-set

- `src/alg/layered/intermediate/loops/**` (non-test files)
- `src/alg/layered/intermediate/loops/SelfLoopHolderTest.test.ts`: **only** D6, replacing the local
  `class AssertionError extends Error {}` (line 11) with an import of `src/java/lang/AssertionError.ts`. Change no
  assertion, no expected value and no other line.

## Read-set

The lane's T4 rows of `plans/dev-assert/inventory.md`; the Java files they cite (`SelfLoopHolder.java`,
`SelfLoopEdge.java`, `SelfLoopPort.java`, `SelfHyperLoop.java`, `SelfHyperLoopLabels.java`, `routing/LabelPlacer.java`,
`OrthogonalSelfLoopRouter.java`, `RoutingDirector.java`, `RoutingSlotAssigner.java`, `PolylineSelfLoopRouter.java`,
`SplineSelfLoopRouter.java`, `ordering/PortRestorer.java`, `ordering/PortSideAssigner.java`);
`test/helpers/SelfLoopTestGraphCreator.ts` (for D6); [D6](../decisions.md#d6-selfloopholdertesttestts-uses-the-shim).

## Acceptance criteria

- Given each T4 row, when the lane is done, then its status is `restored`, `restored (throw kept)` or
  `not-portable: <reason>`.
- Given `SelfLoopHolder.install`'s restored assert (`SelfLoopHolder.java:87`, `assert needsSelfLoopProcessing(lNode)`)
  and D6, when `SelfLoopHolderTest.test.ts` runs with assertions on, then `testNonSelfLoopGraph` passes through the
  shim's `AssertionError` thrown by `install`, not by `fail()`. Show it by temporarily running with
  `ELK_DEV_ASSERTIONS=off`: then the test passes through `fail()`.
- Given `npx vitest run src/alg/layered/intermediate/loops test/golden` with assertions on, then it is green, or every
  failure is reported with the site and values.
- Given `npm run typecheck` and `npm run complexity`, then both are clean.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the lane commit.
