<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Writer JVM vectors (`graph-text-write.json`)

**Agent:** java-architect · **Commit:** `test(T5): record elkt serializer output from the jvm`

## Context
The writer (T19 sequencer, T12/T21 formatter, T22 `serialize`) is verified byte for byte against these
recordings (G1, G2, AD-13). They are the evidence for the two risky decisions of G1: that a grammar-specific
sequencer plus the small `formatting2` subset reproduces the generated serializer, and that
`ElkGraphSemanticSequencer.isQuotingNecessary` always returns `false`. Each row records the formatted and the
unformatted output (the latter tests the sequencer alone) and a re-parse of the formatted text.

## Task
1. **Scenarios** under `tools/vectors/elkt-write-scenarios/`: `<family>-<what>.elkt` (parsed with the oracle's
   own reader, so the source's comments and blank lines must *vanish*: there is no node model after
   `EcoreUtil.copy`) and `<family>-<what>.json` (`ElkGraphJson.forGraph(text).toElk()`, lenient as the oracle
   reads it). `.json` scenarios must already be Prettier-clean (`npx prettier --write` them): `.prettierignore`
   belongs to T6, not to this task. ~60 `.elkt`, ~15 `.json`, each ≤ 40 lines. Families:
   - **Shape layouts:** empty; position only; size only; both; zero coordinates (`eIsSet` is false for 0.0:
     `x=0,y=0`; half-set `x=5,y=0` and `x=0,y=5`, `width=10,height=0`: record whether the generic sequencer emits,
     omits or fails), negative, fractional; on root, node, port, label.
   - **Properties:** none, 1, 2, 3 on every owner (root, node, port, label, edge, section); properties **last**
     vs **followed by** children/labels/ports/edges (formatter `new_lines` vs `new_line`,
     `ElkGraphFormatter.xtend:170-177`); known keys written as shortest unambiguous suffix with the "group"
     rule (`PropertyKeyValueConverter.xtend:39-58`); unknown keys; keys with keyword segments.
   - **Property values** (`PropertyValueValueConverter.xtend:35-66`, `ElkGraphSemanticSequencer.xtend:35-45`):
     integral double (`Integer.toString(intValue)`, incl. ≥ 2^31 and `-0.0`), non-integral, small/large exponent,
     `Integer`, `Boolean`, enums, `EnumSet`, `KVector`/`ElkPadding` (`toString` text), strings of every kind:
     plain id, `a.b`, `a.b.c`, `a..b`, `a b`, empty, `true`, `false`, `null`, `1.5`, `1e3`, `NaN`, `Infinity`,
     `0x1p3`, `1d`, `1abc`, `node` and other keywords (`^`-escaping), `^x`, text with `"`, `'`, `\`, newline,
     tab, non-ASCII, a very long text; unresolved `LayoutOptionProxy` values; `null` values (JSON
     `"k": null` if the importer admits it, otherwise a `java` scenario).
   - **The `isQuotingNecessary` quirk** (`ElkGraphSemanticSequencer.xtend:53-60`): the method always returns
     `false`, so every non-Boolean, non-Number value goes through `QualifiedIdValue`, never `StringValue`.
     Mechanism, confirmed from the generated Java at
     `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/…/serializer/ElkGraphSemanticSequencer.java`:
     the `ListExtensions.map(...)` call is commented out by the Xtend compiler (value unused), so `return false`
     is all that remains. Scenarios whose string would need quoting but travel the QualifiedId path (text with
     `"`, `\`, newline, spaces, `1abc`, empty): the output is whatever `PropertyValueValueConverter.quoteIfNecessary`
     (44-51) makes of it, **unescaped**; the `reparse` field shows whether it reads back.
   - **Labels:** with and without id, text needing STRING escapes, nested labels (labels in labels, 3 deep), in
     node/port/edge, label order among other children.
   - **Edges:** with/without id, 1 and many sources/targets, endpoints that need qualified names (port of a
     nested node `a.p`, ancestors' ports, edge declared in a child container, ids shadowed at two levels, `^`
     segments, endpoints whose id is a keyword), edges in root vs nested; **sections:** count 0, 1 (single
     `ElkSingleEdgeSection` form, no identifier, every subset of `incoming/outgoing/start/end`, with and without
     bend points and properties), several (`section s -> t [..]` with identifiers, outgoing-section lists,
     sections with no content `section s [ ]`, with only bends, with only properties), bend points 0/1/many
     including `(0,0)` points, sections with `incoming`/`outgoing` shapes that are ports vs nodes;
     `incomingSections` back-links must not be written (`ElkGraphTransientValueService.xtend:11-21`).
     Note for T21: the formatter branch `sectionCount == 0` (`ElkGraphFormatter.xtend:208-210`) is not reachable
     through serialization (the `EdgeLayout?` fragment is omitted for no sections); record that scenario anyway.
   - **Containers:** root with and without identifier (`graph <id>`), nested nodes 3 deep, ports with and
     without body, nodes with only an identifier (no `{}`), mixed child kinds in one node (labels, ports, children,
     edges: record the order of the output, which follows the semantic sequencer's feature order), many siblings.
   - **Source hygiene:** `.elkt` inputs with comments (`//`, `/* */`), blank lines and odd spacing, proving
     they vanish; input with unordered-group permutations proving canonical order out.
2. **`java` scenarios** for graphs that no file reader can produce, built in `ElktWriteVectors.java` from the
   public ElkGraph API (`ElkGraphUtil`), ≤ 10, ids `java-<name>`: node without identifier, port without
   identifier, label without text, edge section without identifier in a multi-section edge, edge whose
   endpoint lies outside the graph, edge with no sources/targets, a property with a `null` key. Their
   construction is documented in the Java header precisely enough to rebuild them in TS (T22 does).
3. **`tools/vectors/ElktWriteVectors.java`** (self-contained, schema in the header). First statement
   `LayoutMetaDataService.getInstance(new ClassLoader(null) { })`; then the injector from
   `ElkGraphStandaloneSetup` (`ElkGraphStandaloneSetup.xtend:22-24`) and `XtextResourceSet` from it. Per input:
   `EcoreUtil.copy(root)` placed in a fresh `XtextResource`
   (`resourceSet.createResource(URI.createURI("synthetic:/x.elkt"))`, then `getContents().add(copy)`; check
   the injector registered the `elkt` factory, otherwise obtain `IResourceFactory` from the injector), then
   `ISerializer.serialize(copy, SaveOptions.newBuilder().format().getOptions())` and
   `ISerializer.serialize(copy)`. Record, per input,
   `{id, source: "elkt"|"json"|"java", formatted, unformatted, reparse}`:
   - `formatted` / `unformatted`: the output string exactly (JSON-escaped, newline style preserved) or
     `{error: {cls, msg}}` (`cls` = binary class name of the thrown exception, `msg` identity-hash-normalised);
     the error rows match by presence only (G2) but are recorded exactly.
   - `reparse`: load the formatted text again with the same setup: `{errors: <count>, json: <export text>|null}`
     (`json` = `ElkGraphJson` export with the oracle flags, `CaseRunner.java:70-78`, seed property
     `org.eclipse.elk.graph.json.exportSeed=1`); `null` when the formatted output is an error.
4. Output `<outDir>/graph-text-write.json`: `{ elkCommit, xtextVersion, registry: "core", cases: [ … ] }`, one
   compact case per line, sorted by id, trailing newline. Run twice; byte-identical. Existing refs unchanged.

## Write-set
`tools/vectors/ElktWriteVectors.java`, `tools/vectors/elkt-write-scenarios/*`,
`test/golden/refs/java/graph-text-write.json`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`: `ElkGraph.xtext:20-120`, `formatting2/ElkGraphFormatter.xtend:15-234`, `serializer/{ElkGraphSemanticSequencer,ElkGraphTransientValueService,ElkGraphSyntacticSequencer}.xtend`, `conversion/{PropertyKeyValueConverter,PropertyValueValueConverter,NumberValueConverter}.xtend`, `naming/*.xtend`
- `src-gen/…/graph/text/serializer/AbstractElkGraphSemanticSequencer.java:28-246` (constraint comments = assignment order), `AbstractElkGraphSyntacticSequencer.java:40-70` (the single ambiguity `('{' '}')?` on `ElkEdge`)
- `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/` (compiled Java of the Xtend; EPL)
- `tools/oracle/harness/{ElkModelReader,CaseRunner}.java`, `tools/vectors/GraphJsonVectors.java:1-40`
- Xtext 2.36.0 EPL source: `serializer/ISerializer.java`, `serializer/impl/Serializer.java`, `serializer/tokens/CrossReferenceSerializer.java`, `resource/SaveOptions.java`

## Decisions
- [G1](../decisions.md#g1--writer-architecture), [G2](../decisions.md#g2--writer-input-and-oracle-contract), [G3](../decisions.md#g3--option-registry-for-refs), [G7](../decisions.md#g7--evidence-layout)
- AD-9, AD-13; J-series exporter settings for the `reparse` field (`plans/elk-json-adapter/decisions.md`)

## Interface contract (consumed by T12, T19, T21, T22)
`graph-text-write.json` as in step 4. T22 builds each input in TS (`.elkt` via `load`, `.json` via `ElkGraphJson`,
`java-*` per the header) and compares `serialize` output byte for byte; `error` rows by presence.

## Acceptance criteria
- Given each family above, then at least one row exists; the `isQuotingNecessary` rows show strings that need
  quoting emitted through the QualifiedId path, with the `reparse` outcome.
- Given an input with source comments and blank lines, then the formatted output contains none of them.
- Given the `java-*` rows, then node-without-identifier is an `{error}` row for formatted and unformatted.
- Given two runs of `elkt-vectors.sh`, then `graph-text-write.json` is byte-identical; existing refs unchanged.

## Quality bar
README gates; `format:check` passes on the `.json` scenarios; lizard clean on the Java (≤ 500 lines, CCN ≤ 10;
the `java` scenario builders live in a table of small methods inside the single file).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK/Guava/ANTLR-runtime source. The serializer is **called**, never reimplemented, in the recorder. Do
not edit `.prettierignore`, `elkt-vectors.sh`, other tasks' programs or any existing ref. Agents never commit;
the orchestrator commits per task.
