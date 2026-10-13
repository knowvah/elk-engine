<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — elk-json-adapter (mission 4)

## Observation: ELK cannot re-import its own layout export

- **Context**: T5 oracle `parse` of the committed layout goldens
- **Finding**: the layout export writes `resolvedAlgorithm` (type `LayoutAlgorithmData`, a
  programmatic option) into `layoutOptions`; `JsonImporter.xtend:465` → `LayoutOptionData.java:155`
  throws `IllegalStateException("IDataType class expected for layout option …")`, uncaught.
- **Impact**: any round-trip that feeds a layout output back to the importer must strip that key
  (J7 amendment); the TS importer must throw the same exception on unstripped input.
- **Confidence**: High

## Observation: Gson 2.11.0 behaviours the port must reproduce

- **Context**: T1 `gson.json`
- **Finding**: duplicate keys — last value wins, first position kept (strict accepts it); lenient
  `NaN`/`Infinity`/bare words read as strings, never numbers; strict reader accepts BOM, raw
  control chars and lone-surrogate escapes; `TypeAdapter.read` ignores trailing input but
  `JsonParser.parseString` throws `JsonSyntaxException`; `parseString("")` → `JsonNull` while the
  readers throw `EOFException`; `toJson` writes `NaN`/`Infinity` doubles, drops `JsonNull` object
  members, keeps `JsonNull` array elements; `JsonPrimitive.equals` on parsed numbers compares by
  double (`9007199254740993` equals `…992`; `1` equals `1.0` but hash codes differ).
- **Impact**: the `src/gson` port follows the vectors, not intuition about JSON.
- **Confidence**: High

## Observation: graph.json exception classes differ from what the Xtend suggests

- **Context**: T3 `graph-json.json`
- **Finding**: an export edge endpoint outside the graph fails with a message-less
  `NullPointerException` from `JsonPrimitive(String)` (not `IllegalArgumentException`); exporting
  an imported graph with linked sections NPEs whenever sections are exported (`incomingSections +=`
  back-links an unregistered section); a lenient trailing comma in an array yields a `null` element
  → `IllegalStateException: Not a JSON Object: null`; `{"id":3}` and `{"id":3.0}` are equal JSON
  values, so `HashBiMap` rejects them; JDK helpful-NPE messages embed compiled local names.
- **Impact**: TS NPE rows compare exception class only (`TypeError`, D10); `docs/conformance.md`
  lists these quirks (T20).
- **Confidence**: High

## Observation: vector fixtures must be kept out of Prettier

- **Context**: Batch 1 format gate
- **Finding**: malformed/lenient JSON fixtures either fail to parse or would be rewritten;
  `.prettierignore` now excludes `tools/vectors/{graph-json,transfer}-scenarios/`.
- **Impact**: future fixture directories with byte-meaningful JSON need the same entry up front.
- **Confidence**: High

## Observation: `random` layouts need an explicit seed for replay vectors

- **Context**: T4 transfer vectors
- **Finding**: `randomSeed` 0 (the default) is time-seeded; T4 sets 42 after import. Layered with
  `INCLUDE_CHILDREN` moves edges between containers, so `transferLayout` writes `container`.
  Layout-created sections have a null identifier; transfer names them `<edgeId>_s<i>`.
- **Impact**: T16 replay must apply post-layout containment as recorded.
- **Confidence**: High

## Observation: vector generators reading escaped text must decode it

- **Context**: T6 found `gson.json` write rows holding literal `\u0000` text
- **Finding**: `GsonVectors` read `gson-cases.txt` string cases verbatim, so 71 rows recorded
  backslash text instead of control chars / U+2028 / surrogates; the gap surfaced only when a port
  agent filled it with throwaway JVM probes. Fixed in place (user decision).
- **Impact**: when a generator takes escaped data, assert at least one decoded control character in
  its output; port agents must report missing rows rather than probe the JVM (J1/AD-13).
- **Confidence**: High
