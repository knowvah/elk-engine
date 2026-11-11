<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `CompoundGraphPostprocessor` (sections behind the facade)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port compound graph postprocessor`
Scratch: `$TMPDIR/7h/T7/`.

## Context

Mission 7h, H1, H3, H11. `J/compound/CompoundGraphPostprocessor.java` (259 lines) reads `CROSS_HIERARCHY_MAP` (`:82`), iterates
its keys (`:89`, H3), sorts each key's segments with `CrossHierarchyEdgeComparator` (`:93`), joins bend points and junction
points across levels into the original edge (`clearJunctionPoints` `:204`, `copyJunctionPoints` `:226`), copies labels back
(`copyLabelsBack` `:240`, writing `TARGET_OFFSET` at `:174`), and removes the dummy edges collected in a `HashSet` (`:86`,
`:117`, H3). The anonymous `Predicate` is at `:66`. The facade is staged, and its `process` keeps throwing until T8 (H11).

## Task

1. Port the logic into `CompoundGraphPostprocessorSections.ts` (split further at the Java's private static helpers if the limits
   require), exporting `processCompoundGraphPostprocessor(graph, monitor, order?: 'java' | 'reversed')`. Keys and `dummyEdges` use
   insertion order (`Set<LEdge>`), and `reversed` reverses both iterations and each key's values before the sort. Write an `ad10`
   journal row for `dummyEdges`.
2. Tests: after T6 is committed, replay every T1 `models` row whose stop is `CompoundGraphPostprocessor` and every `full` row of
   a small vendored model. Run `doCompoundLayout` with `vi.spyOn` replacing both facades' `process` by the section entries
   (`HIERARCHICAL_NODE_RESIZER`'s `create` spied to return T5's class), and compare `expected.tree` or the exported layout. Run
   each also with `order: 'reversed'` on the postprocessor and record (do not assert) the result for T9.

## Write-set

`src/alg/layered/compound/CompoundGraphPostprocessorSections*.ts` and their tests. Not the facade files (T8).

## Read-set

`J/compound/CompoundGraphPostprocessor.java` (whole), `J/compound/CrossHierarchyEdgeComparator.java`, T4's and T6's
interface contracts, T2's helpers, `decisions.md` H3, H11, F11, F16.

## Interface contract (consumed by T8, T9)

`processCompoundGraphPostprocessor(graph: LGraph, monitor: IElkProgressMonitor, order?: 'java' | 'reversed'): void`.

## Acceptance criteria

- Given every T1 `models` row stopping after `CompoundGraphPostprocessor`, when replayed with both sections injected, then
  `expected.tree` matches at AD-4.
- Given the chosen `full` rows, when replayed the same way, then the exported layout matches at AD-4.
- Given `doCompoundLayout` without the spies, then it still throws the staged preprocessor message.

## Observability / Rollback

N/A. Reversible.
