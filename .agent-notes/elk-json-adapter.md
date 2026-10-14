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

## Observation: lizard silently skips or truncates TypeScript functions

- **Context**: Batch 4 gate (340 NLOC over 9 functions); review follow-up built `npm run complexity`
- **Finding**: lizard 1.22 hides every later member after a function-typed constructor parameter
  (`f: (a: A) => B`; this, not `#private`, hid most of `EcoreEMap.ts` — plain `#private` methods are
  seen) or a `new X()` default parameter (which also hides the constructor); hides what follows a
  quote-bearing regex literal inside a function; drops functions with a `readonly (A | B)[]`
  parameter; truncates a function at `(call(a) + 1) * 2 {…` or `f?.(x)`; skips files whose content
  equals an earlier file. Exit code stays 0. Old gates missed ~314 of 1876 `src` functions.
- **Impact**: use `npm run complexity` (oxc inventory, lizard direct or per-function snippet,
  AST fallback), never plain lizard's exit code, as the complexity gate.
- **Confidence**: High

## Observation: EMF `BasicEMap.map()` iterates hash buckets, not the entry list

- **Context**: T11/T12 property order
- **Finding**: `entryData` is created on first `put` at capacity 1 (`2*size+1`), grows to
  `2*old+4` (1, 6, 16, 36, …) with ordered rehash; iteration scans buckets
  `(hash & 0x7FFFFFFF) % capacity`. `getAllProperties()` of every ElkGraph element follows it.
- **Impact**: any test or port that reads ElkGraph properties in "insertion order" is wrong for ≥ 2
  properties; read `getProperties().entryList()` for list order.
- **Confidence**: High

## Observation: the CoreOptions-only registry changes export keys and option sets

- **Context**: T17 `exportLayoutOptions`, T18 golden round trips
- **Finding**: with layered registered (JVM tests, oracle), `priority.direction` makes the suffix
  `direction` ambiguous so the exporter writes `elk.direction`; layered-only options in inputs
  (`layering.layerId`, `crossingMinimization.positionId`) survive the oracle but are dropped by the
  CoreOptions-only port, and the smaller property map changes EMF bucket order of the rest.
- **Impact**: mission 7h must re-enable `exportLayoutOptions`, remove the two layered keys from
  `STRIP_KEYS` (regen-parse-refs.sh and json-roundtrip.test.ts) and regenerate the elk-parse refs;
  mission 5 must drop `MISSION5_PROVIDERS`.
- **Confidence**: High

## Observation: HotSpot identity hashes are not stable across runs

- **Context**: Batch 6 gate; `graph-json-vectors.sh` regenerated a different `outgoingSections` order
- **Finding**: ~1 in 7 runs flipped the iteration order of a `HashMultimap` keyed by identity-hashed
  `ElkEdgeSection`s; identity hashes depend on thread scheduling, not only on the program bytes.
- **Impact**: recorders must sort (or otherwise canonicalise) anything iterated from identity-keyed
  hash containers, and each generator should be rerun several times before its ref is trusted.
- **Confidence**: High
