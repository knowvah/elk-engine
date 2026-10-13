<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Gson reader and parser

**Agent:** typescript-pro · **Commit:** `feat(T7): add the gson json reader and parser`

## Context
`ElkGraphJson.forGraph(String)` reads with a lenient `JsonReader` and
`Gson.getAdapter(JsonElement).read` (`ElkGraphJson.java:115-140`); tests use
`JsonParser.parseString`. Lenient Gson accepts sloppy JSON (`GraphTest.xtend:83-88`) that
`JSON.parse` rejects, and keeps number literals' text (J2).

## Task
TDD. `stream/JsonReader` (token reader over a string: `setLenient`/`setStrictness` as 2.11 exposes,
`beginObject/endObject/beginArray/endArray/hasNext/peek/nextName/nextString/nextBoolean/nextNull/
skipValue`, number tokens returned with raw text), `JsonToken`, `MalformedJsonException`,
exception classes `JsonParseException` ← `JsonSyntaxException`, `JsonIOException`; an element-
building read (the `TypeAdapter<JsonElement>.read` behaviour) exported from a module T10 imports;
`JsonParser.parseString`/`parseReader`. Every `parse` row of `gson.json` must reproduce: the tree,
or the exception class **and message** (Gson messages include line/column/path — match them).

## Write-set
`src/gson/stream/{JsonReader,JsonToken,MalformedJsonException}.ts`,
`src/gson/{JsonParser,JsonIOException,JsonSyntaxException,JsonParseException}.ts` and colocated
tests. If the element-building read needs its own file, name it `src/gson/internal/JsonElementReader.ts`
(in the write-set).

## Read-set
- `test/golden/refs/java/gson.json` `parse` section; Gson 2.11.0 Javadoc (`JsonReader`, `Strictness`,
  `JsonParser`)
- `src/gson/*` (T6), `src/java/lang/JavaString.ts`, `../decisions.md#j1--gson-subset`

## Interface contract (consumed by T10, T15, T16–T19)
`JsonParser.parseString(text): JsonElement`; `new JsonReader(text)`, `setLenient(b)` (or the 2.11
`setStrictness`), element read `readElement(reader): JsonElement` (name it as Gson's internal
adapter would; journal).

## Acceptance criteria
- Given every `parse` row, then the produced tree (raw number text, key order) or the thrown class +
  message equals the row.
- Given the `GraphTest` sloppy graph, lenient, then the tree has the root id and children `c`, `c1`.
- Given a 1 MB generated JSON, then parsing completes in < 200 ms (no quadratic string building).

## Quality bar
README gates; ≥ 95% branch coverage; complexity limits (a token switch splits per arm, standing rule).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No Gson source (J1). No `JSON.parse` in the reader.
