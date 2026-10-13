<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Gson reader, writer; `JsonAdapter`

Three independent tasks on the T6 model; write-sets disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | Gson reader + parser (strict, lenient) | typescript-pro | src/gson/stream/{JsonReader,JsonToken,MalformedJsonException}.ts, src/gson/{JsonParser,JsonIOException,JsonSyntaxException,JsonParseException}.ts (+ tests) | T1, T6 | [x] |
| T8 | Gson writer | typescript-pro | src/gson/stream/JsonWriter.ts, src/gson/internal/Streams.ts (+ tests) | T1, T6 | [x] |
| T9 | `JsonImportException` + `JsonAdapter` | typescript-pro | src/graph/json/{JsonImportException,JsonAdapter}.ts (+ tests) | T3, T6 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
