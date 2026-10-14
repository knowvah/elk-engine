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

## Observation: hot loops under vitest pay for imported bindings

- **Context**: T7 1 MB parse benchmark
- **Finding**: reading imported module bindings inside the reader's inner loop cost ~2× under vitest's
  module transform; copying them into local `const`s and indexing stacks by a size counter took the
  parse from 350–450 ms to 57–134 ms. V8 coverage instrumentation adds ~3×.
- **Impact**: performance-sensitive ports (layout inner loops) should hoist imports into locals;
  timing assertions need a separate budget under coverage.
- **Confidence**: Medium

## Observation: Gson strict-mode locations come from `isLiteral`

- **Context**: T7 parse rows
- **Finding**: `isLiteral` calls `checkLenient()` on `/ \ ; # =`, so strict `[1;2]` reports column 2
  (the number start), not the `;`; `consumeNonExecutePrefix` does not count the `\n` of `)]}'\n`.
- **Impact**: location text in messages cannot be derived from "where the bad char is"; use rows.
- **Confidence**: High

## Observation: lizard silently skips several TypeScript constructs

- **Context**: Batch 4 gate; a file reporting 340 NLOC over 9 functions
- **Finding**: lizard 1.x (a) never sees `#private` methods; (b) stops parsing a class after a
  `new X()` default parameter value; (c) loses the rest of a file after a regex literal containing
  `'` or `"`; (d) drops a function whose parameter type is `readonly (A | B)[]`. Exit code stays 0.
  Fixes: `?? new X()` in the body, `new RegExp(String.raw\`…\`)`, `ReadonlyArray<A | B>`; measure
`#`methods on a copy with`#`renamed to`_`.
- **Impact**: every lizard gate must compare function counts with declarations; a low count means
  the gate checked nothing. The complexity hook has the same blind spots.
- **Confidence**: High

## Observation: EMF `BasicEMap.map()` iterates hash buckets, not the entry list

- **Context**: T11/T12 property order
- **Finding**: `entryData` is created on first `put` at capacity 1 (`2*size+1`), grows to
  `2*old+4` (1, 6, 16, 36, …) with ordered rehash; iteration scans buckets
  `(hash & 0x7FFFFFFF) % capacity`. `getAllProperties()` of every ElkGraph element follows it.
- **Impact**: any test or port that reads ElkGraph properties in "insertion order" is wrong for ≥ 2
  properties; read `getProperties().entryList()` for list order.
- **Confidence**: High
