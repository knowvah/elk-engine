<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — `JsonMetaDataConverter`

**Agent:** typescript-pro · **Commit:** `feat(T13): add the jsonmetadataconverter`

## Context
`JsonMetaDataConverter.xtend` (91 lines) turns layout metadata into JSON. Nothing in ELK calls it,
but it is public API of the bundle (in scope, Phase 2).

## Task
TDD. Port `createCommon` (private static) and the three `toJson` dispatch overloads
(`LayoutAlgorithmData`, `LayoutCategoryData`, `LayoutOptionData`) as one static `toJson(data)`
dispatching with `instanceof` in the Xtend dispatcher's order (§6.5/§8), using `JsonAdapter`
statically (`static extension`). Test against every `converter` row of `graph-json.json`: register
`CoreOptions` (J10), convert each option/category/algorithm, write compact with T8, compare text.

## Write-set
`src/graph/json/JsonMetaDataConverter.ts`, `src/graph/json/JsonMetaDataConverter.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonMetaDataConverter.xtend`
- `test/golden/refs/java/graph-json.json` (`converter`), `src/graph/json/JsonAdapter.ts`,
  `src/core/data/{LayoutOptionData,LayoutAlgorithmData,LayoutCategoryData,LayoutMetaDataService}.ts`

## Interface contract
`class JsonMetaDataConverter { static toJson(data: ILayoutMetaData): JsonObject }`.

## Acceptance criteria
- Given every `converter` row, then the compact text is byte-identical.
- Given an `ILayoutMetaData` of none of the three types, then the Xtend dispatcher's failure
  (`IllegalArgumentException` "Unhandled parameter types…" — confirm the exact text from a vector
  row; if T3 did not record one, stop 7).

## Quality bar
README gates; 100% coverage; `@see` on the class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
None beyond the write-set.
