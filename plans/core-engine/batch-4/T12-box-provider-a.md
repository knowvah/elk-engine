<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — `BoxLayoutProvider` part A; un-hold Box; Box tripwires

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T12): port the box layout provider core and register it`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
`BoxLayoutProvider.java` is 810 lines; T12 ports `:1-361` (`layout`, both `placeBoxes`, `sort`, `areaStdDev`,
`placeBoxesGrouping`), T13 the group-packing helpers `:362-810` (`placeInnerBoxes`, `areaStdDev2`,
`mergeAndPlaceDec/Mixed/Inc`). Until T13, each of those five is a private method whose body throws an
`UnsupportedOperationException`-style error whose message contains `BOX_GROUPING_PLACEHOLDER` (stop 11: no test may
assert it, and no task before T13 may need a grouping `PackingMode`). `PackingMode` already lives in
`src/core/util/PackingMode.ts` (C3; Java nested enum). Java collections: `PriorityQueue` → `src/java/util/PriorityQueue.ts`
(tie order vector-proven), `Collections.sort` / `Arrays.sort` (stable) → `src/java/util/Collections.ts` or a stable
`Array.prototype.sort` with the Java comparator. Third link of the codegen chain: un-hold and tripwires as in T8.

## Task
1. Port `J/util/BoxLayoutProvider.java:1-361` (fields, nested types, every branch of the SIMPLE mode path and the
   grouping entry), placeholders for the five group helpers.
2. Remove `BoxLayoutProvider` from `PENDING_TYPES`; `npm run melk:generate`; commit generated `BoxLayouterOptions.ts`
   and `CoreOptions.ts`.
3. Tripwires (M9), `box` only — same files as T8. Journal each edit with T12.
4. Tests for SIMPLE packing (sorting by priority/size, aspect ratio, interactive, expand nodes, padding, spacing),
   expected values traced from the Java with line refs.

## Write-set
`src/core/util/BoxLayoutProvider.ts` (+ test), `tools/melk/config.ts`, `src/core/options/BoxLayouterOptions.ts` and
`src/core/options/CoreOptions.ts` (generated only), `test/melk/**`, `src/graph/json/JsonMetaDataConverter.test.ts`,
`test/helpers/mission5-stand-ins.ts`.

## Read-set
`J/util/BoxLayoutProvider.java:1-361`; `src/core/util/PackingMode.ts`; `src/java/util/{PriorityQueue,Collections,
LinkedList,ListIterator}.ts`; everything in T8's read-set for the codegen part.

## Interface contracts (outputs)
`class BoxLayoutProvider extends AbstractLayoutProvider` with the Java private method boundaries (T13 fills five of
them); generated `BoxLayouterOptions` (`ALGORITHM_ID = "org.eclipse.elk.box"`). Consumed by T13, T16–T19.

## Acceptance criteria
- Given five nodes of different sizes and priorities in SIMPLE mode, when box layout runs, then positions and the
  parent size equal the values traced from `placeBoxes` (`:181-282`).
- Given `interactive = true`, when sorting, then the Java comparator order (position-based) is used.
- Given `npm run melk:generate`, then `org.eclipse.elk.box` and its supports equal the JVM metadata dump.
- `grep -n BOX_GROUPING_PLACEHOLDER src/core/util/BoxLayoutProvider.ts` shows exactly the five helper bodies.

## Observability / Rollback
N/A. Reversible: revert the commit (it re-holds Box).
