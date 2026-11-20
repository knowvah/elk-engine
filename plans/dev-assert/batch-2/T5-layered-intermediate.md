<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: restore asserts in the layered intermediate processors

## Context

Part of #45. A `devAssert` helper (`src/java/lang/DevAssert.ts`) now exists. Assertions are off in production and on in
the test suite. This lane restores the omitted Java `assert` statements of the intermediate processors outside
`loops/`. Several are null checks immediately followed by a use (`EndLabelPreprocessorPlacement.ts:33`:
`assert labelCell != null; assert labelCell.hasLabels()`). Keep them as two separate `devAssert` calls in Java order,
because the thunks keep the second from running when assertions are off (D1). Follow the
[shared rules](overview.md#shared-rules-every-lane-pass-this-section-with-the-task-file) and
[D5](../decisions.md#d5-site-convention).

## Write-set

`src/alg/layered/intermediate/*.ts` and every `src/alg/layered/intermediate/` subdirectory except `loops/`
(non-test files).

## Read-set

The lane's T5 rows of `plans/dev-assert/inventory.md`; the Java files they cite. At planning: `LabelDummySwitcher` ×8,
`LabelSideSelector` ×7, `EndLabelPreprocessor` ×5, `NorthSouthPortPreprocessor` ×4, `SingleEdgeGraphWrapper` ×4,
`InvertedPortProcessor` ×3, `HighDegreeNodeLayeringProcessor` ×2, `EndLabelPostprocessor` ×2,
`EdgeAndLayerConstraintEdgeReverser` ×2, and one each in `SelfLoopPreProcessor`, `SelfLoopPortRestorer`,
`PartitionPreprocessor`, `LongEdgeSplitter`, `LayerConstraintPostprocessor`, `InteractiveExternalPortPositioner`,
`HierarchicalPortOrthogonalEdgeRouter`, `FinalSplineBendpointsCalculator`, `ModelOrderNodeComparator`.

## Acceptance criteria

- Given each T5 row, when the lane is done, then its status is `restored`, `restored (throw kept)` or
  `not-portable: <reason>`.
- Given `npx vitest run src/alg/layered/intermediate test/golden` with assertions on, then it is green, or every
  failure is reported with the site and values.
- Given `npm run typecheck` and `npm run complexity`, then both are clean.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the lane commit.
