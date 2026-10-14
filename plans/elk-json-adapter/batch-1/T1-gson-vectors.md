<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Gson 2.11.0 JVM vectors (`gson.json`)

**Agent:** java-architect · **Commit:** `test(T1): record gson 2.11.0 behaviour from the jvm`

## Context
`src/gson/` (T6–T10) is specified by the Gson Javadoc plus these recordings, never by Gson source
(J1). The oracle runs Gson **2.11.0** from the p2 cache. Every Gson behaviour `graph.json` relies on
must have a row here; a behaviour without one is stop 7 for the port tasks.

## Task
1. `tools/vectors/GsonVectors.java` (single-file source launcher, style of `GraphVectors.java`) +
   `gson-vectors.sh <outDir>` (structure of `metadata-vectors.sh`: pinned-commit check, classpath =
   the Gson jar from `$P2_BUNDLES`, **assert its version is 2.11.0** from the jar manifest — stop 6
   otherwise). Write `test/golden/refs/java/gson.json`; sorted keys, 2-space indent, trailing
   newline (write it with your own minimal writer, not with Gson, so the recording is independent
   of the recorded library).
2. Sections (rows are data; the schema goes in the Java file header):
   - **parse** — `{input, lenient, tree | throws{class, message}}` for strict and lenient
     `JsonReader` + `TypeAdapter<JsonElement>.read` (the path `ElkGraphJson.java:115-140` uses) and
     `JsonParser.parseString`. Trees encode every primitive with its kind and **raw text**
     (`{"num":"10.0"}`, `{"str":"…"}`, `{"bool":true}`, `null`), objects as ordered key lists.
     Inputs must include: the `GraphTest` sloppy graph (`GraphTest.xtend:83-88`), unquoted keys,
     single quotes, `//` and `/* */` comments, `;` and `=`/`=>` separators, trailing garbage, top-level
     array/primitive, empty input, deep nesting, numbers `1`, `1.0`, `-0`, `1e2`, `1E+2`, `0.1`,
     `9007199254740993`, `2147483648`, `NaN`/`Infinity` tokens (lenient), unicode and escape
     sequences, duplicate keys.
   - **primitive** — `{value, op, result | throws}` for `getAsString`, `getAsDouble`, `getAsInt`,
     `isNumber`, `isString`, `isBoolean`, `getAsNumber().intValue()`, `toString()` over number
     literals (as parsed), strings (`"12"`, `" 12 "`, `"NaN"`, `"Infinity"`, `"1d"`, `"0x1p3"`,
     `"abc"`), booleans and `JsonNull`; `new JsonPrimitive((String) null)`.
   - **write** — `{tree, pretty, text | throws}` through
     `new GsonBuilder().disableHtmlEscaping()[.setPrettyPrinting()].create().toJson(JsonElement)`
     (`ElkGraphJson.java:222-241`): `JsonPrimitive(Number)` with doubles `40.0`, `1.0E-5`, `1.2345E7`,
     `-0.0`, `NaN`, `Infinity`, ints; strings with `< > & = '`, `"`, `\`, control chars, U+2028/U+2029,
     non-BMP; `JsonNull` members (dropped?) and `JsonNull` array elements; empty object/array in
     pretty mode; nested pretty indentation.
   - **objectOps** — `{ops, keys, equals?}`: `add`/`addProperty` of an existing key (position),
     `remove` then `add` (moves to end), `entrySet` order, `equals` between objects with the same
     members in different order, `has`/`get` of missing keys.
3. Run twice; byte-identical. Rerun `JavaVectors.java`, `graph-vectors.sh`, `metadata-vectors.sh`:
   no diff.

## Write-set
`tools/vectors/GsonVectors.java`, `tools/vectors/gson-vectors.sh`, `test/golden/refs/java/gson.json`.

## Read-set
- `tools/vectors/metadata-vectors.sh` (whole), `tools/vectors/GraphVectors.java` (JSON writer style)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/{JsonAdapter.xtend,ElkGraphJson.java}`
  (which Gson calls matter), `…/test/…/GraphTest.xtend:80-94`
- Gson 2.11.0 **Javadoc** only (`https://javadoc.io/doc/com.google.code.gson/gson/2.11.0/`). No source.

## Interface contract (consumed by T6, T7, T8, T10)
```json
{ "gsonVersion": "2.11.0",
  "parse": [ { "id": "…", "input": "…", "via": "reader|parseString", "lenient": true,
               "tree": <T> } | { …, "throws": { "class": "…", "message": "…" } } ],
  "primitive": [ { "id": "…", "value": <T>, "op": "getAsDouble", "result": "<Java toString>" | "throws": {…} } ],
  "write": [ { "id": "…", "tree": <T>, "pretty": false, "text": "…" } ],
  "objectOps": [ { "id": "…", "ops": [ ["add","k",<T>], ["remove","k"] ], "keys": ["…"], "equalsTo": <T>? } ] }
// <T> = null | {"num":"<raw>"} | {"str":"…"} | {"bool":b} | {"arr":[<T>…]} | {"obj":[["k",<T>]…]}
```
Doubles in `result` use Java `Double.toString` text.

## Acceptance criteria
- Given two script runs, then `gson.json` is byte-identical and `gsonVersion` is `2.11.0`.
- Given the `GraphTest` sloppy input, then the lenient row has a tree with root id and two children
  and the strict row records the exception class and message.
- Given every Gson API listed in J1, then at least one row exercises it.
- Given the three existing vector scripts rerun, then `test/golden/refs/` is unchanged.

## Quality bar
README gates; `shellcheck` clean; lizard clean on the Java (≤ 30 NLOC, CCN ≤ 10, ≤ 500 lines — split
cases into a data file under `tools/vectors/` if needed, journal it).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Never read Gson, OpenJDK or Guava source (J1, AD-9). No edits to existing vector files or scripts.
