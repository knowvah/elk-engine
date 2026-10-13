<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Gson writer

**Agent:** typescript-pro · **Commit:** `feat(T8): add the gson json writer`

## Context
`ElkGraphJson.ExportBuilder.toJson` writes with
`GsonBuilder().disableHtmlEscaping()[.setPrettyPrinting()].create().toJson(JsonElement)`
(`ElkGraphJson.java:222-241`). Output text is compared byte for byte (J8).

## Task
TDD. `stream/JsonWriter` (`setIndent`, `setHtmlSafe`, `setLenient`/strictness as needed,
`setSerializeNulls`, `beginObject/…/name/value(string|boolean|number-text)/nullValue/flush`), string
escaping per the vectors (control chars, `"`, `\`, U+2028/U+2029; HTML chars untouched when
disabled), number output = the element's text (raw literal for parsed numbers; `DoubleToString` /
integer text for created ones — T6's API), NaN/Infinity per the vectors; `internal/Streams.write`
(element → writer, dropping `JsonNull` members when `serializeNulls` is false, as recorded).

## Write-set
`src/gson/stream/JsonWriter.ts`, `src/gson/internal/Streams.ts`, colocated tests.

## Read-set
- `test/golden/refs/java/gson.json` `write` section; Gson 2.11.0 Javadoc (`JsonWriter`)
- `src/gson/*` (T6), `src/java/lang/DoubleToString.ts`

## Interface contract (consumed by T10, T12, T13)
`new JsonWriter()`, setters above, `toString()`/a string sink; `Streams.write(element, writer)`.

## Acceptance criteria
- Given every `write` row, compact and pretty, then the text is byte-identical.
- Given a tree with `JsonNull` members, then they are dropped (or kept) exactly as recorded.
- Given `NaN`/`Infinity` primitives, then the recorded output or exception.

## Quality bar
README gates; ≥ 95% branch coverage; complexity limits.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No Gson source (J1). No `JSON.stringify` for output text.
