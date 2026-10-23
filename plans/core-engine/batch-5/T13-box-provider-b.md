<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — `BoxLayoutProvider` part B (group packing)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T13): port box layout group packing`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
T12 left five private helpers throwing `BOX_GROUPING_PLACEHOLDER`. This task replaces them with the Java
(`BoxLayoutProvider.java:362-810`): `placeInnerBoxes`, `areaStdDev2`, `mergeAndPlaceDec`, `mergeAndPlaceMixed`,
`mergeAndPlaceInc`. Java `PriorityQueue` → `src/java/util/PriorityQueue.ts`, `LinkedList`/`ListIterator` → the
`src/java/util` shims where Java mutates during iteration.

## Task
Replace the five placeholders with verbatim ports (method boundaries and statement order kept; complexity splits at
section boundaries only). Tests per `PackingMode` (`GROUP_DEC`, `GROUP_MIXED`, `GROUP_INC`) with expected values
traced from the Java with line refs; equal-priority and equal-area ties follow the Java comparators.

## Write-set
`src/core/util/BoxLayoutProvider.ts` (+ test).

## Read-set
`J/util/BoxLayoutProvider.java:362-810` (and `:305-361` for the call site); `src/core/util/PackingMode.ts`;
`src/java/util/{PriorityQueue,LinkedList,ListIterator}.ts`.

## Interface contracts (outputs)
None new; `BoxLayoutProvider` complete. Consumed by T16–T19.

## Acceptance criteria
- `grep -rn BOX_GROUPING_PLACEHOLDER src/` is empty.
- Given six boxes and each grouping mode, when box layout runs, then positions equal the Java-traced values.
- Given boxes with equal area, when merged, then the `PriorityQueue` tie order matches the Java comparator.

## Observability / Rollback
N/A. Reversible: revert the commit (restores the placeholders).

## Amendment (M15 — user, 2026-10-23)
Write-set becomes `src/core/util/BoxLayoutProvider.ts`, `src/core/util/BoxLayoutProviderGroup.ts`,
`src/core/util/BoxLayoutProviderGrouping.ts` (+ colocated tests). Move T12's file-local `Group` (fields and both
constructors) into `BoxLayoutProviderGroup.ts` and add its Java methods; the five group-packing methods live in
`BoxLayoutProviderGrouping.ts`; the provider's private methods delegate. Keep T12's `PlacementSettings` signatures.
