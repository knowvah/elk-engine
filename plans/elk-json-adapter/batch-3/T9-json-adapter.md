<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `JsonImportException` and `JsonAdapter`

**Agent:** typescript-pro · **Commit:** `feat(T9): add jsonadapter and jsonimportexception`

## Context
`JsonAdapter` is the Gson access layer every other `graph.json` class uses through Xtend
`extension`; its whole public surface is ELK API kept in sync with elkjs (J9).

## Task
TDD. Port `JsonImportException` (4 constructors → one TS constructor `(message?, cause?)` per §6.5,
`extends` the runtime-exception base the port uses — check `src/java/lang`) and `JsonAdapter` with
**every** method of `JsonAdapter.xtend:36-224` (`getId`, `asId`, `getIdSave`, `implementationError`,
`formatError`, `toJsonObject`, `toJsonArray`, `stringVal`, the `optString`/`optDouble`/
`optJSONArray`/`optJSONObject` overloads, `sizeJsonArr`, `hasJsonObj`, `keysJsonObj`, `getJsonObj`,
`getJsonArr`, `newJsonObject`, `newJsonArray`, `toJson` x2, the five `addJsonObj` overloads,
`removeJsonObj`, the two `addJsonArr` overloads, `isInt`). Overloads and type `switch`es per
translation-rules §6.5/§8 (`docs/translation-rules.md:363-376,450-478`); `addJsonObj(Number)` vs
`(Object)` dispatch on a JS number follows the Java static types at the call sites — journal how.
`asId`: integral number → `intValue()` (saturating), string kept, else `formatError`.

## Write-set
`src/graph/json/{JsonImportException,JsonAdapter}.ts`, colocated tests.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/{JsonAdapter,JsonImportException}.xtend`
- `test/golden/refs/java/graph-json.json` (id rows), `src/gson/*` (T6)
- `../decisions.md#j2--number-text`, `#j9--jsonadapter`

## Interface contract (consumed by T11–T16)
`class JsonAdapter` with the Xtend method names; `class JsonImportException`.

## Acceptance criteria
- Given `IdTest`'s inputs (`{}`, `{id:1.2}`, `{id:{}}`, `{id:[]}`, `{id:true}`, `{id:'foo'}`,
  `{id:3}`), then `getId` throws/returns as the vectors record, with exact messages.
- Given `{id: 3.0}` and `{id: 2147483648}`, then `getIdSave`/`asId` match the vectors.
- Given `addJsonObj` with an unsupported type, then `implementationError`'s `Error` text.

## Quality bar
README gates; 100% coverage; `@see` on both classes.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No importer/exporter code.
